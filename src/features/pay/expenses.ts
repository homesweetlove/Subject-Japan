/**
 * A simple travel spending log kept only on this device. Amounts are yen as
 * paid; won totals use the saved exchange rate when one exists.
 */
export type ExpenseCategory =
  | "food"
  | "transport"
  | "shopping"
  | "stay"
  | "fun"
  | "etc";
export const expenseCategories: { key: ExpenseCategory; label: string }[] = [
  { key: "food", label: "먹거리" },
  { key: "transport", label: "교통" },
  { key: "shopping", label: "쇼핑" },
  { key: "stay", label: "숙소" },
  { key: "fun", label: "놀거리" },
  { key: "etc", label: "기타" },
];
export type PayMethod = "cash" | "card";

export interface Expense {
  id: string;
  jpy: number;
  category: ExpenseCategory;
  method: PayMethod;
  /** Optional short memo such as the shop name. */
  memo: string;
  createdAt: number;
}

export const EXPENSE_LIMIT = 1000;
export const EXPENSE_MAX_JPY = 10_000_000;
const JAPAN_OFFSET_MS = 9 * 3600000;

export function validExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object") return false;
  const e = value as Expense;
  return (
    typeof e.id === "string" &&
    e.id.length > 0 &&
    e.id.length <= 80 &&
    Number.isFinite(e.jpy) &&
    e.jpy > 0 &&
    e.jpy <= EXPENSE_MAX_JPY &&
    expenseCategories.some((c) => c.key === e.category) &&
    (e.method === "cash" || e.method === "card") &&
    typeof e.memo === "string" &&
    e.memo.length <= 60 &&
    Number.isFinite(e.createdAt) &&
    Number.isFinite(new Date(e.createdAt + JAPAN_OFFSET_MS).getTime())
  );
}

const japanDay = (timestamp: number) =>
  new Date(timestamp + JAPAN_OFFSET_MS).toISOString().slice(0, 10);

export interface ExpenseSummary {
  totalJpy: number;
  todayJpy: number;
  cashJpy: number;
  cardJpy: number;
  byCategory: { key: ExpenseCategory; label: string; jpy: number }[];
  /** Japan-time days, newest first, with their totals. */
  days: { day: string; jpy: number; items: Expense[] }[];
}

export function summarizeExpenses(
  expenses: Expense[],
  now = Date.now(),
): ExpenseSummary {
  const today = japanDay(now);
  const byDay = new Map<string, Expense[]>();
  const byCategory = new Map<ExpenseCategory, number>();
  let totalJpy = 0;
  let todayJpy = 0;
  let cashJpy = 0;
  let cardJpy = 0;
  for (const e of expenses) {
    totalJpy += e.jpy;
    if (e.method === "cash") cashJpy += e.jpy;
    else cardJpy += e.jpy;
    const day = japanDay(e.createdAt);
    if (day === today) todayJpy += e.jpy;
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.jpy);
  }
  return {
    totalJpy,
    todayJpy,
    cashJpy,
    cardJpy,
    byCategory: expenseCategories
      .map((c) => ({ ...c, jpy: byCategory.get(c.key) ?? 0 }))
      .filter((c) => c.jpy > 0)
      .sort((a, b) => b.jpy - a.jpy),
    days: [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([day, items]) => ({
        day,
        jpy: items.reduce((sum, e) => sum + e.jpy, 0),
        items: [...items].sort((a, b) => b.createdAt - a.createdAt),
      })),
  };
}

/** Won value of a yen amount, or null without a real rate. */
export function toKrw(jpy: number, krwPer100Jpy: number | undefined) {
  return krwPer100Jpy ? Math.round((jpy * krwPer100Jpy) / 100) : null;
}
