import { describe, expect, it, vi } from "vitest";
import { initialState } from "../src/domain/models";
import { airportRoutes, regions } from "../src/features/trip/airports";
import {
  countdown,
  createReminder,
  duration,
  japanDateTime,
  parseJapanDateTime,
  validReminder,
} from "../src/features/trip/countdown";
import { guestGuides, ticketGuides } from "../src/features/guides/catalog";
import { decodeState } from "../src/storage/state";
import { migrateToRoom } from "../src/storage/roomMigration";
const now = Date.parse("2026-09-22T20:00:00+09:00");
const input = {
  id: "train-1",
  routeId: "narita-keisei",
  origin: "게이세이우에노",
  terminal: "T1",
  date: "2026-09-22",
  time: "23:30",
  buffer: "30",
  confirmed: true,
};
describe("airport countdown", () => {
  it("covers all five requested regions", () => {
    expect(new Set(airportRoutes.map((r) => r.region))).toEqual(
      new Set(regions),
    );
    expect(new Set(airportRoutes.map((r) => r.id)).size).toBe(6);
  });
  it("parses Japan time regardless of device timezone", () => {
    expect(parseJapanDateTime("2026-09-23", "00:30")).toBe(
      Date.parse("2026-09-22T15:30:00Z"),
    );
    expect(japanDateTime(Date.parse("2026-09-22T15:30:00Z"))).toBe(
      "2026-09-23 00:30",
    );
  });
  it.each([
    ["2026-02-29", "12:00"],
    ["2026-04-31", "12:00"],
    ["2026-09-22", "24:30"],
    ["2026-9-22", "12:00"],
    ["2026-09-22", "23:60"],
  ])("rejects invalid calendar input %s %s", (date, time) =>
    expect(() => parseJapanDateTime(date, time)).toThrow(),
  );
  it("validates confirmation, future date, buffer and route", () => {
    expect(() => createReminder({ ...input, confirmed: false }, now)).toThrow(
      "공식 시간표",
    );
    expect(() => createReminder({ ...input, time: "19:00" }, now)).toThrow(
      "지난",
    );
    expect(() => createReminder({ ...input, buffer: "0" }, now)).toThrow(
      "5~180",
    );
    expect(() => createReminder({ ...input, routeId: "missing" }, now)).toThrow(
      "노선",
    );
    expect(() => createReminder({ ...input, terminal: "" }, now)).toThrow(
      "터미널",
    );
  });
  it("recalculates on resume without rolling expired trains to tomorrow", () => {
    const r = createReminder(input, now);
    expect(countdown(r, now).phase).toBe("upcoming");
    expect(countdown(r, r.departureAt - 30 * 60000).phase).toBe("leave-now");
    expect(countdown(r, r.departureAt).phase).toBe("departed");
    expect(countdown(r, r.departureAt + 86400000).phase).toBe("departed");
    expect(countdown(r, now + 86400000).needsReview).toBe(true);
    expect(duration(-1)).toBe("00:00:00");
    expect(duration(3601000)).toBe("01:00:01");
  });
  it("upgrades old profiles and validates round trips", () => {
    const old = {
      ...initialState(),
      airportReminders: undefined,
      guideChecks: undefined,
    };
    old.profile.sizes.top = "44";
    expect(decodeState(JSON.stringify(old))).toMatchObject({
      profile: { sizes: { top: "44" } },
      airportReminders: [],
      guideChecks: [],
    });
    const r = createReminder(input, now);
    const state = {
      ...initialState(),
      airportReminders: [r],
      guideChecks: ["ticket-start-official"],
    };
    expect(decodeState(JSON.stringify(state))).toEqual(state);
    expect(validReminder({ ...r, departureAt: 9e18 })).toBe(false);
    expect(
      decodeState(
        JSON.stringify({
          version: 1,
          airportReminders: [null, {}, r, r],
          guideChecks: [null, {}, "bad key", "guest-ready", "guest-ready"],
        }),
      ),
    ).toMatchObject({ airportReminders: [r], guideChecks: ["guest-ready"] });
  });
  it("uses distinct persistent checklist IDs", () => {
    const guides = [...ticketGuides, ...guestGuides];
    const ids = guides.flatMap((g) =>
      g.checklist.map((item) => `${g.id}-${item.id}`),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9-]{1,100}$/.test(id))).toBe(true);
    for (const g of guides) expect(g.links.length).toBeGreaterThan(0);
  });
});
describe("safe Android Room migration", () => {
  const stores = () => ({
    room: {
      read: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
      write: vi.fn<(raw: string) => Promise<void>>().mockResolvedValue(),
    },
    legacy: {
      read: vi.fn().mockResolvedValue(JSON.stringify(initialState())),
      write: vi.fn(),
      remove: vi.fn<() => Promise<void>>().mockResolvedValue(),
    },
  });
  it("writes Room before removing the old store", async () => {
    const { room, legacy } = stores();
    const raw = await migrateToRoom(room, legacy);
    expect(room.write).toHaveBeenCalledWith(raw);
    expect(legacy.remove).toHaveBeenCalledOnce();
    expect(room.write.mock.invocationCallOrder[0]).toBeLessThan(
      legacy.remove.mock.invocationCallOrder[0],
    );
  });
  it("preserves old data when Room write fails", async () => {
    const { room, legacy } = stores();
    room.write.mockRejectedValue(new Error("disk full"));
    await expect(migrateToRoom(room, legacy)).rejects.toThrow("disk full");
    expect(legacy.remove).not.toHaveBeenCalled();
  });
  it("rejects corrupt data before writing", async () => {
    const { room, legacy } = stores();
    legacy.read.mockResolvedValue("{");
    await expect(migrateToRoom(room, legacy)).rejects.toThrow();
    expect(room.write).not.toHaveBeenCalled();
    expect(legacy.remove).not.toHaveBeenCalled();
  });
  it("does not fall back to stale data after Room read failure", async () => {
    const { room, legacy } = stores();
    room.read.mockResolvedValue("room data");
    expect(await migrateToRoom(room, legacy)).toBe("room data");
    expect(legacy.read).not.toHaveBeenCalled();
    room.read.mockRejectedValue(new Error("read failure"));
    await expect(migrateToRoom(room, legacy)).rejects.toThrow("read failure");
    expect(legacy.read).not.toHaveBeenCalled();
  });
  it("keeps successful migration even if legacy cleanup fails", async () => {
    const { room, legacy } = stores();
    legacy.remove.mockRejectedValue(new Error("cleanup"));
    expect(await migrateToRoom(room, legacy)).toBe(
      JSON.stringify(initialState()),
    );
  });
});
