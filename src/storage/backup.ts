import type { LocalState } from "../domain/models";
import { decodeState } from "./state";

/** Full histories/favorites plus itinerary notes exceed 1 MB; allow JSON escaping. */
export const BACKUP_MAX_CHARS = 16_000_000;
/** Clipboard contents are visible to other apps and clipboard sync services. */
export const BACKUP_CLIPBOARD_TTL_MS = 60_000;

export function encodeBackup(state: LocalState): string {
  const raw = JSON.stringify(state);
  // Never report a successful export that this version cannot restore.
  parseBackup(raw);
  return raw;
}

/** Missing additive fields are allowed; supplied values must survive intact. */
function preservesValues(input: unknown, output: unknown): boolean {
  if (input === output) return true;
  if (
    !input ||
    !output ||
    typeof input !== "object" ||
    typeof output !== "object"
  )
    return false;
  if (Array.isArray(input))
    return (
      Array.isArray(output) &&
      input.length === output.length &&
      input.every((item, index) => preservesValues(item, output[index]))
    );
  if (Array.isArray(output)) return false;
  return Object.entries(input).every(
    ([key, value]) =>
      Object.prototype.hasOwnProperty.call(output, key) &&
      preservesValues(value, (output as Record<string, unknown>)[key]),
  );
}

/**
 * Restore replaces existing user data, so reject lossy sanitization instead of
 * presenting a partial or unrelated document as a usable backup.
 */
export function parseBackup(raw: string | null | undefined): LocalState {
  if ((raw?.length ?? 0) > BACKUP_MAX_CHARS)
    throw new Error(
      "백업 데이터가 너무 커요. 이 앱에서 만든 백업인지 확인해 주세요.",
    );
  const text = (raw ?? "").trim();
  if (!text) throw new Error("클립보드에 백업 데이터가 없어요.");
  let state: LocalState;
  try {
    const value = JSON.parse(text);
    // These core fields existed before all additive v1 migrations.
    if (
      !value ||
      typeof value.onboarded !== "boolean" ||
      typeof value.profile?.nickname !== "string" ||
      !["top", "bottom", "shoe"].every(
        (key) => typeof value.profile?.sizes?.[key] === "string",
      ) ||
      !["system", "light", "dark"].includes(value.theme) ||
      !Array.isArray(value.history) ||
      !Array.isArray(value.favorites)
    )
      throw new Error("Incomplete backup");
    state = decodeState(text);
    if (!preservesValues(value, state)) throw new Error("Lossy backup");
  } catch {
    throw new Error("Subject Japan 백업 형식이 아니에요.");
  }
  return { ...state, onboarded: true };
}

export function backupSummary(state: LocalState): string {
  const parts: [string, number][] = [
    ["일정", state.tripItems.length],
    ["면세 영수증", state.dutyFreeReceipts.length],
    ["지출 기록", state.expenses.length],
    ["즐겨찾기", state.favorites.length],
    ["번역 기록", state.history.length],
    ["교통카드", state.transitCards.length],
    ["멤버십", state.membershipCards.length],
    ["막차 타이머", state.airportReminders.length],
    ["저장한 혜택", state.savedCouponIds.length],
  ];
  return parts.map(([name, n]) => `${name} ${n}개`).join(" · ");
}
