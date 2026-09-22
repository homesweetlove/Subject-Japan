import type { CardRead } from "../tools/native";
export interface CardEntry {
  date: string | null;
  balance: number;
  kind: string;
  terminalCode: number;
  processCode: number;
}
export interface TransitCard {
  id: string;
  name: string;
  readAt: number;
  entries: CardEntry[];
}
const operations: Record<number, string> = {
  1: "운임 지불",
  2: "충전",
  3: "승차권 구입",
  4: "정산",
  5: "입장·정산",
  6: "창구 처리",
  7: "신규 발행",
  13: "버스 이용",
  15: "버스 충전",
  20: "자동 충전",
  70: "물품 구매",
  73: "물품 구매 취소",
};
export function decodeCard(read: CardRead, now = Date.now()): TransitCard {
  if (
    !read ||
    !/^[0-9a-f]{16}$/i.test(read.id) ||
    !Array.isArray(read.blocks) ||
    !read.blocks.length ||
    read.blocks.length > 20
  )
    throw new Error("교통카드 응답을 확인할 수 없어요.");
  const entries = read.blocks.flatMap((block): CardEntry[] => {
    if (
      block.length !== 16 ||
      block.some((b) => !Number.isInteger(b) || b < 0 || b > 255)
    )
      throw new Error("카드 기록이 완전하지 않아요. 다시 읽어 주세요.");
    if (block.every((b) => b === 0)) return [];
    const packed = block[4] * 256 + block[5];
    if (packed === 0 && block[0] === 0 && block[1] === 0) return [];
    const year = 2000 + (packed >> 9),
      month = (packed >> 5) & 15,
      day = packed & 31;
    const date = new Date(Date.UTC(year, month - 1, day));
    const validDate =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    return [
      {
        date: validDate
          ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          : null,
        balance: block[10] + block[11] * 256,
        kind: operations[block[1]] ?? "기타 카드 처리",
        terminalCode: block[0],
        processCode: block[1],
      },
    ];
  });
  if (!entries.length)
    throw new Error("저장된 카드 이용 기록이 없어요. 잔액을 확인할 수 없어요.");
  return { id: read.id.toLowerCase(), name: "교통카드", readAt: now, entries };
}
export function validCard(value: unknown): value is TransitCard {
  const c = value as TransitCard;
  return (
    !!c &&
    typeof c.id === "string" &&
    /^[0-9a-f]{16}$/.test(c.id) &&
    typeof c.name === "string" &&
    c.name.length <= 40 &&
    Number.isFinite(c.readAt) &&
    Array.isArray(c.entries) &&
    c.entries.length > 0 &&
    c.entries.length <= 20 &&
    c.entries.every(
      (e) =>
        e &&
        Number.isInteger(e.balance) &&
        e.balance >= 0 &&
        e.balance <= 65535 &&
        (e.date === null || /^\d{4}-\d{2}-\d{2}$/.test(e.date)) &&
        typeof e.kind === "string" &&
        e.kind.length < 60 &&
        Number.isInteger(e.terminalCode) &&
        Number.isInteger(e.processCode),
    )
  );
}
