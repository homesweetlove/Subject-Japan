import { describe, expect, it } from "vitest";
import { initialState } from "../src/domain/models";
import {
  BACKUP_MAX_CHARS,
  backupSummary,
  encodeBackup,
  parseBackup,
} from "../src/storage/backup";

const translation = {
  id: "t1",
  source: "ko" as const,
  target: "ja" as const,
  original: "안녕하세요",
  translated: "こんにちは",
  provider: "여행 문장팩",
  createdAt: 1,
};

describe("backup", () => {
  it("round-trips a state and marks it onboarded", () => {
    const state = {
      ...initialState(),
      profile: { nickname: "민", sizes: { top: "M", bottom: "", shoe: "" } },
      favorites: [translation],
    };
    const restored = parseBackup(encodeBackup(state));
    expect(restored.onboarded).toBe(true);
    expect(restored.profile.nickname).toBe("민");
    expect(restored.favorites).toEqual([translation]);
    expect(backupSummary(restored)).toContain("즐겨찾기 1개");
  });
  it("rejects empty, foreign, oversized and wrong-version payloads", () => {
    expect(() => parseBackup("")).toThrow("백업 데이터가 없어요");
    expect(() => parseBackup(null)).toThrow();
    expect(() => parseBackup("hello")).toThrow("백업 형식이 아니에요");
    expect(() => parseBackup("[]")).toThrow("백업 형식이 아니에요");
    expect(() => parseBackup('{"version":2}')).toThrow("백업 형식이 아니에요");
    expect(() =>
      parseBackup(" ".repeat(10) + "x".repeat(BACKUP_MAX_CHARS + 1)),
    ).toThrow("너무 커요");
  });
  it("rejects tampered backups instead of offering a lossy replacement", () => {
    const raw = JSON.stringify({
      ...initialState(),
      profile: { nickname: "x".repeat(500) },
      theme: "neon",
      history: [
        translation,
        { ...translation, id: "t2", translated: "あ".repeat(5000) },
        { ...translation, id: "t3", provider: "p".repeat(200) },
        { ...translation, id: "", original: "x" },
      ],
      savedCouponIds: ["ok-id", "<script>", 42],
    });
    expect(() => parseBackup(raw)).toThrow("백업 형식이 아니에요");
  });
  it("rejects unrelated v1 JSON and unsupported additive fields", () => {
    for (const value of [
      { version: 1 },
      { version: 1, onboarded: true },
      { ...initialState(), nextVersionNotes: ["must not disappear"] },
      { ...initialState(), theme: "neon" },
      {
        ...initialState(),
        profile: { ...initialState().profile, nickname: "x".repeat(25) },
      },
      {
        ...initialState(),
        history: [{ ...translation, translated: "x".repeat(4001) }],
      },
      { ...initialState(), savedCouponIds: ["one", "one"] },
      { ...initialState(), tripItems: [{}] },
    ])
      expect(() => parseBackup(JSON.stringify(value))).toThrow();
  });
  it("continues to restore backups from before additive v1 fields", () => {
    const restored = parseBackup(
      JSON.stringify({
        version: 1,
        onboarded: true,
        profile: {
          nickname: "old user",
          sizes: { top: "M", bottom: "30", shoe: "250" },
        },
        theme: "dark",
        history: [translation],
        favorites: [translation],
      }),
    );
    expect(restored.profile.nickname).toBe("old user");
    expect(restored.history).toEqual([translation]);
    expect(restored.savedCouponIds).toEqual([]);
    expect(restored.dutyFreeReceipts).toEqual([]);
    expect(restored.notifications.enabled).toBe(false);
  });
  it("exports restorable full histories, favorites and itinerary notes", () => {
    const state = initialState();
    state.history = Array.from({ length: 100 }, (_, i) => ({
      ...translation,
      id: `history-${i}`,
      original: "\u0000".repeat(2000),
      translated: "\u0001".repeat(4000),
    }));
    state.favorites = state.history.map((t) => ({ ...t, id: `fav-${t.id}` }));
    state.tripItems = Array.from({ length: 200 }, (_, i) => ({
      id: `trip-${i}`,
      title: "trip",
      when: "2026-10-22 12:00",
      place: "",
      reservation: "",
      note: "\u0000".repeat(2000),
      done: false,
    }));
    const raw = encodeBackup(state);
    expect(raw.length).toBeGreaterThan(1_000_000);
    expect(raw.length).toBeLessThan(BACKUP_MAX_CHARS);
    expect(parseBackup(raw)).toEqual({ ...state, onboarded: true });
  });
  it("refuses exports that would be truncated or rejected on restore", () => {
    const state = {
      ...initialState(),
      history: [{ ...translation, original: "x".repeat(2001) }],
    };
    expect(() => encodeBackup(state)).toThrow();
    expect(() => parseBackup(" ".repeat(BACKUP_MAX_CHARS + 1))).toThrow(
      "너무 커요",
    );
  });
});
