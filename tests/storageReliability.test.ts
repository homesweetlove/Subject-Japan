import { describe, expect, it, vi } from "vitest";
import { initialState } from "../src/domain/models";
import { createLocalRepository } from "../src/storage/localRepository";
import {
  createMigratingDocumentStore,
  migrateToRoom,
} from "../src/storage/roomMigration";
import { decodeState } from "../src/storage/state";
import { encodeBackup, parseBackup } from "../src/storage/backup";

// Exercise repository ordering without loading React Native in Node.
vi.mock("../src/storage/documentStore", () => ({ documentStore: {} }));

const rawState = (nickname: string) =>
  JSON.stringify({
    ...initialState(),
    onboarded: true,
    profile: { nickname, sizes: { top: "M", bottom: "30", shoe: "250" } },
  });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function stores() {
  let roomRaw: string | null = null;
  let legacyRaw: string | null = rawState("existing user");
  const room = {
    read: vi.fn(async () => roomRaw),
    write: vi.fn(async (raw: string) => {
      roomRaw = raw;
    }),
  };
  const legacy = {
    read: vi.fn(async () => legacyRaw),
    write: vi.fn(async (raw: string) => {
      legacyRaw = raw;
    }),
    remove: vi.fn(async () => {
      legacyRaw = null;
    }),
  };
  return { room, legacy };
}

describe("storage reliability", () => {
  it("distinguishes absent data from an empty or truncated document", () => {
    expect(decodeState(null)).toEqual(initialState());
    for (const raw of ["", " ", "{", "null", "[]", '{"version":2}'])
      expect(() => decodeState(raw)).toThrow();
  });

  it("does not delete or rewrite an empty/corrupt legacy document", async () => {
    for (const raw of ["", "{", '{"version":2}']) {
      const { room, legacy } = stores();
      legacy.read.mockResolvedValue(raw);
      await expect(migrateToRoom(room, legacy)).rejects.toThrow();
      expect(room.write).not.toHaveBeenCalled();
      expect(legacy.remove).not.toHaveBeenCalled();
    }
  });

  it("copies original legacy bytes including newer additive fields", async () => {
    const { room, legacy } = stores();
    const original = JSON.stringify({
      ...JSON.parse(rawState("existing user")),
      extra: ["preserve"],
    });
    legacy.read.mockResolvedValue(original);
    expect(await migrateToRoom(room, legacy)).toBe(original);
    expect(await room.read()).toBe(original);
    expect(legacy.remove).toHaveBeenCalledOnce();
  });

  it("keeps a failed migration retryable without losing the legacy copy", async () => {
    const { room, legacy } = stores();
    room.write.mockRejectedValueOnce(new Error("disk full"));
    const store = createMigratingDocumentStore(room, legacy);
    await expect(store.read()).rejects.toThrow("disk full");
    expect(await legacy.read()).toBe(rawState("existing user"));
    expect(await store.read()).toBe(rawState("existing user"));
    expect(await legacy.read()).toBeNull();
  });

  it("preserves the only legacy copy when a reset before migration fails", async () => {
    const { room, legacy } = stores();
    room.write.mockRejectedValueOnce(new Error("disk full"));
    const store = createMigratingDocumentStore(room, legacy);
    await expect(store.write(JSON.stringify(initialState()))).rejects.toThrow(
      "disk full",
    );
    expect(legacy.remove).not.toHaveBeenCalled();
    expect(await store.read()).toBe(rawState("existing user"));
  });

  it("serializes concurrent first loads so migration runs only once", async () => {
    const { room, legacy } = stores();
    const store = createMigratingDocumentStore(room, legacy);
    const results = await Promise.all([
      store.read(),
      store.read(),
      store.read(),
    ]);
    expect(results).toEqual(Array(3).fill(rawState("existing user")));
    expect(room.write).toHaveBeenCalledOnce();
    expect(legacy.remove).toHaveBeenCalledOnce();
  });

  it("does not let an in-flight migration overwrite a newer reset", async () => {
    const { room, legacy } = stores();
    const gate = deferred();
    const started = deferred();
    const readLegacy = legacy.read.getMockImplementation()!;
    legacy.read.mockImplementationOnce(async () => {
      const raw = await readLegacy();
      started.resolve();
      await gate.promise;
      return raw;
    });
    const store = createMigratingDocumentStore(room, legacy);
    const load = store.read();
    await started.promise;
    const resetRaw = JSON.stringify(initialState());
    const reset = store.write(resetRaw);
    expect(room.write).not.toHaveBeenCalled();
    gate.resolve();
    await Promise.all([load, reset]);
    expect(await room.read()).toBe(resetRaw);
    expect(await legacy.read()).toBeNull();
  });

  it("does not resurrect stale legacy data after reset and restart", async () => {
    const { room, legacy } = stores();
    const store = createMigratingDocumentStore(room, legacy);
    legacy.remove.mockRejectedValueOnce(new Error("cleanup unavailable"));
    const resetRaw = JSON.stringify(initialState());
    await store.write(resetRaw);
    expect(await legacy.read()).not.toBeNull();
    const restarted = createMigratingDocumentStore(room, legacy);
    expect(await restarted.read()).toBe(resetRaw);
    expect(room.write).toHaveBeenCalledOnce();
  });

  it("does not fall back when the authoritative Room document is corrupt or unreadable", async () => {
    const { room, legacy } = stores();
    const repository = createLocalRepository(
      createMigratingDocumentStore(room, legacy),
    );
    await room.write("{");
    await expect(repository.load()).rejects.toThrow();
    room.read.mockRejectedValueOnce(new Error("read failure"));
    await expect(repository.load()).rejects.toThrow("read failure");
    expect(legacy.read).not.toHaveBeenCalled();
    expect(legacy.remove).not.toHaveBeenCalled();
  });

  it("orders loads with writes and snapshots data before queued I/O", async () => {
    const gate = deferred();
    const started = deferred();
    let raw: string | null = rawState("old");
    const store = {
      read: vi.fn(async () => raw),
      write: vi.fn(async (next: string) => {
        started.resolve();
        await gate.promise;
        raw = next;
      }),
    };
    const repository = createLocalRepository(store);
    const state = decodeState(rawState("new"));
    const save = repository.save(state);
    state.profile.nickname = "mutated later";
    await started.promise;
    const load = repository.load();
    expect(store.read).not.toHaveBeenCalled();
    gate.resolve();
    await save;
    expect((await load).profile.nickname).toBe("new");
  });

  it("keeps prior data when restore/reset fails and recovers the write queue", async () => {
    const { room, legacy } = stores();
    const repository = createLocalRepository(
      createMigratingDocumentStore(room, legacy),
    );
    const before = await repository.load();
    const replacement = parseBackup(
      encodeBackup(decodeState(rawState("restored"))),
    );
    room.write.mockRejectedValueOnce(new Error("restore full"));
    await expect(repository.save(replacement)).rejects.toThrow("restore full");
    expect(await repository.load()).toEqual(before);
    room.write.mockRejectedValueOnce(new Error("reset full"));
    await expect(repository.save(initialState())).rejects.toThrow("reset full");
    expect(await repository.load()).toEqual(before);
    await repository.save(replacement);
    expect(await repository.load()).toEqual(replacement);
    await repository.save(initialState());
    expect(await repository.load()).toEqual(initialState());
  });
});
