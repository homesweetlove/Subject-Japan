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
  it("drops tampered records instead of trusting them", () => {
    const raw = JSON.stringify({
      version: 1,
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
    const restored = parseBackup(raw);
    expect(restored.profile.nickname).toHaveLength(24);
    expect(restored.theme).toBe("system");
    expect(restored.history.map((t) => t.id)).toEqual(["t1"]);
    expect(restored.savedCouponIds).toEqual(["ok-id"]);
  });
});
