import type { LocalState } from "../domain/models";
import { decodeState } from "./state";

/** Generous upper bound: a full state (all limits reached) is well under 1 MB. */
export const BACKUP_MAX_CHARS = 1_000_000;
/** Clipboard contents are visible to other apps and clipboard sync services. */
export const BACKUP_CLIPBOARD_TTL_MS = 60_000;

export function encodeBackup(state: LocalState): string {
  return JSON.stringify(state);
}

/**
 * Parses pasted backup text through the same validation as local storage, so a
 * tampered or foreign payload can only ever produce a well-formed state.
 */
export function parseBackup(raw: string | null | undefined): LocalState {
  const text = (raw ?? "").trim();
  if (!text) throw new Error("클립보드에 백업 데이터가 없어요.");
  if (text.length > BACKUP_MAX_CHARS)
    throw new Error(
      "백업 데이터가 너무 커요. 이 앱에서 만든 백업인지 확인해 주세요.",
    );
  let state: LocalState;
  try {
    state = decodeState(text);
  } catch {
    throw new Error("Subject Japan 백업 형식이 아니에요.");
  }
  return { ...state, onboarded: true };
}

export function backupSummary(state: LocalState): string {
  const parts: [string, number][] = [
    ["일정", state.tripItems.length],
    ["면세 영수증", state.dutyFreeReceipts.length],
    ["즐겨찾기", state.favorites.length],
    ["번역 기록", state.history.length],
    ["교통카드", state.transitCards.length],
    ["막차 타이머", state.airportReminders.length],
    ["저장한 혜택", state.savedCouponIds.length],
  ];
  return parts.map(([name, n]) => `${name} ${n}개`).join(" · ");
}
