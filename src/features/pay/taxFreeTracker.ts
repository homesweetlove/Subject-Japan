import type { ExchangeRate } from "./calculator";

export type DutyFreeCategory =
  "general" | "consumable" | "liquor" | "tobacco" | "perfume";

export const categoryLabels: Record<DutyFreeCategory, string> = {
  general: "일반물품 (의류·신발·가방)",
  consumable: "소모품 (의약품·화장품·식품)",
  liquor: "주류 (술)",
  tobacco: "담배",
  perfume: "향수",
};

/**
 * instant: the old counter method (until 2026-10-31), jpyAmount is the
 * tax-free price actually paid. refund: the refund method (purchases from
 * 2026-11-01), jpyAmount is the tax-inclusive price; the tax comes back
 * only after customs confirms the goods at departure.
 */
export type TaxFreeScheme = "instant" | "refund";
export type RefundStatus = "waiting" | "confirmed" | "refunded";
export const refundStatusLabels: Record<RefundStatus, string> = {
  waiting: "세관 확인 전",
  confirmed: "세관 확인 받음",
  refunded: "환급 받음",
};

export interface DutyFreeReceipt {
  id: string;
  storeName: string;
  category: DutyFreeCategory;
  jpyAmount: number;
  taxFreeApplied: boolean;
  quantity?: number;
  volumeMl?: number;
  note?: string;
  createdAt: number;
  /** Absent on receipts saved before the refund method existed. */
  scheme?: TaxFreeScheme;
  /** 8 for food and non-alcoholic drinks, otherwise 10. Absent means 10. */
  taxRate?: 8 | 10;
  refundStatus?: RefundStatus;
}

/** First instant of 2026-11-01 in Japan time. */
export const REFUND_METHOD_START = Date.parse("2026-11-01T00:00:00+09:00");
export const REFUND_WINDOW_DAYS = 90;
const DAY_MS = 86400000;

export function schemeFor(timestamp: number): TaxFreeScheme {
  return timestamp >= REFUND_METHOD_START ? "refund" : "instant";
}
export function receiptScheme(r: DutyFreeReceipt): TaxFreeScheme {
  return r.scheme ?? schemeFor(r.createdAt);
}
export function receiptTaxRate(r: DutyFreeReceipt): 8 | 10 {
  return r.taxRate === 8 ? 8 : 10;
}
/** Price before consumption tax, the basis of the 5,000 yen rule. */
export function taxExcludedJpy(r: DutyFreeReceipt): number {
  const rate = receiptTaxRate(r);
  return receiptScheme(r) === "refund"
    ? Math.round((r.jpyAmount * 100) / (100 + rate))
    : r.jpyAmount;
}
/**
 * Consumption tax on a tax-free receipt: saved at the counter (instant) or
 * owed back after customs confirmation (refund), before any refund fee.
 */
export function receiptTaxJpy(r: DutyFreeReceipt): number {
  if (!r.taxFreeApplied) return 0;
  const rate = receiptTaxRate(r);
  return receiptScheme(r) === "refund"
    ? Math.round((r.jpyAmount * rate) / (100 + rate))
    : Math.round((r.jpyAmount * rate) / 100);
}
/** Last Japan-time day on which customs can confirm this purchase. */
export function refundDeadline(r: DutyFreeReceipt): number {
  return r.createdAt + REFUND_WINDOW_DAYS * DAY_MS;
}
/** Whole days left until the deadline; negative once it has passed. */
export function refundDaysLeft(r: DutyFreeReceipt, now = Date.now()): number {
  return Math.ceil((refundDeadline(r) - now) / DAY_MS);
}
/** Japan-time calendar day (YYYY-MM-DD) of a timestamp. */
export function japanDay(timestamp: number): string {
  return new Date(timestamp + 9 * 3600000).toISOString().slice(0, 10);
}
/**
 * The 5,000 yen minimum is per store per day, before tax. Sum the receipts
 * already saved for the same store name on the same Japan-time day.
 */
export function sameStoreDayTaxExcluded(
  receipts: DutyFreeReceipt[],
  storeName: string,
  timestamp: number,
): number {
  const store = storeName.trim();
  const day = japanDay(timestamp);
  return receipts
    .filter(
      (r) => r.storeName.trim() === store && japanDay(r.createdAt) === day,
    )
    .reduce((sum, r) => sum + taxExcludedJpy(r), 0);
}

export interface RefundSummary {
  /** Tax still to come back (waiting or confirmed, deadline not passed). */
  expectedJpy: number;
  receivedJpy: number;
  /** Tax that can no longer come back because 90 days passed unconfirmed. */
  lostJpy: number;
  waitingCount: number;
  /** Earliest deadline among receipts still waiting for customs. */
  nextDeadline: number | null;
}
export function refundSummary(
  receipts: DutyFreeReceipt[],
  now = Date.now(),
): RefundSummary {
  let expectedJpy = 0;
  let receivedJpy = 0;
  let lostJpy = 0;
  let waitingCount = 0;
  let nextDeadline: number | null = null;
  for (const r of receipts) {
    if (!r.taxFreeApplied || receiptScheme(r) !== "refund") continue;
    const tax = receiptTaxJpy(r);
    const status = r.refundStatus ?? "waiting";
    if (status === "refunded") receivedJpy += tax;
    else if (status === "confirmed") expectedJpy += tax;
    else if (refundDaysLeft(r, now) < 0) lostJpy += tax;
    else {
      expectedJpy += tax;
      waitingCount += 1;
      const deadline = refundDeadline(r);
      if (nextDeadline === null || deadline < nextDeadline)
        nextDeadline = deadline;
    }
  }
  return { expectedJpy, receivedJpy, lostJpy, waitingCount, nextDeadline };
}

export const RECEIPT_LIMIT = 100;
export const TAX_FREE_MIN_JPY = 5000;
/** Old-method cap for consumables; abolished for purchases from 2026-11-01. */
export const TAX_FREE_CONSUMABLE_MAX_JPY = 500000;
export const KOREA_CUSTOMS_LIMIT_USD = 800;
export const LIQUOR_BOTTLE_LIMIT = 2;
export const LIQUOR_VOLUME_LIMIT_ML = 2000;
export const LIQUOR_USD_LIMIT = 400;
export const TOBACCO_LIMIT_CIGARETTES = 200;
export const PERFUME_LIMIT_ML = 100;

// Reference default conversion if external FX not yet available: 1 USD ≈ 148 JPY, 100 JPY ≈ 900 KRW
export const DEFAULT_USD_PER_JPY = 1 / 148;

export function validReceipt(value: unknown): value is DutyFreeReceipt {
  if (!value || typeof value !== "object") return false;
  const r = value as DutyFreeReceipt;
  return (
    typeof r.id === "string" &&
    r.id.length > 0 &&
    r.id.length <= 80 &&
    typeof r.storeName === "string" &&
    r.storeName.length > 0 &&
    r.storeName.length <= 60 &&
    ["general", "consumable", "liquor", "tobacco", "perfume"].includes(
      r.category,
    ) &&
    Number.isFinite(r.jpyAmount) &&
    r.jpyAmount > 0 &&
    r.jpyAmount <= 100000000 &&
    typeof r.taxFreeApplied === "boolean" &&
    Number.isFinite(r.createdAt) &&
    (r.scheme === undefined || ["instant", "refund"].includes(r.scheme)) &&
    (r.taxRate === undefined || r.taxRate === 8 || r.taxRate === 10) &&
    (r.refundStatus === undefined ||
      ["waiting", "confirmed", "refunded"].includes(r.refundStatus))
  );
}

export interface CustomsAnalysis {
  totalJpy: number;
  /** null until the user enters or fetches a real rate. */
  totalKrw: number | null;
  totalUsd: number;
  customsLimitUsd: number;
  remainingUsd: number;
  isOverLimit: boolean;
  taxFreeTotalJpy: number;
  estimatedTaxSavedJpy: number;
  liquorCount: number;
  liquorVolumeMl: number;
  liquorUsd: number;
  isLiquorOver: boolean;
  tobaccoCount: number;
  isTobaccoOver: boolean;
  perfumeVolumeMl: number;
  isPerfumeOver: boolean;
}

export function analyzeCustoms(
  receipts: DutyFreeReceipt[],
  rate: ExchangeRate | null,
): CustomsAnalysis {
  let totalJpy = 0;
  let taxFreeTotalJpy = 0;
  let liquorCount = 0;
  let liquorVolumeMl = 0;
  let liquorJpy = 0;
  let tobaccoCount = 0;
  let perfumeVolumeMl = 0;
  let estimatedTaxSavedJpy = 0;

  for (const r of receipts) {
    totalJpy += r.jpyAmount;
    if (r.taxFreeApplied) {
      taxFreeTotalJpy += r.jpyAmount;
      estimatedTaxSavedJpy += receiptTaxJpy(r);
    }
    if (r.category === "liquor") {
      liquorCount += r.quantity ?? 1;
      liquorVolumeMl += r.volumeMl ?? 700;
      liquorJpy += r.jpyAmount;
    } else if (r.category === "tobacco") {
      tobaccoCount += r.quantity ?? 200;
    } else if (r.category === "perfume") {
      perfumeVolumeMl += r.volumeMl ?? 50;
    }
  }

  // No guessed fallback rate: won amounts stay hidden until a rate exists.
  const totalKrw = rate
    ? Math.round((totalJpy * rate.krwPer100Jpy) / 100)
    : null;

  // Conversion from JPY to USD (approximate: 1 USD ≈ 148 JPY or derived from KRW/USD ~1400)
  const usdRate = DEFAULT_USD_PER_JPY;
  const totalUsd = Math.round(totalJpy * usdRate * 10) / 10;
  const liquorUsd = Math.round(liquorJpy * usdRate * 10) / 10;

  const remainingUsd = Math.max(0, KOREA_CUSTOMS_LIMIT_USD - totalUsd);
  const isOverLimit = totalUsd > KOREA_CUSTOMS_LIMIT_USD;


  const isLiquorOver =
    liquorCount > LIQUOR_BOTTLE_LIMIT ||
    liquorVolumeMl > LIQUOR_VOLUME_LIMIT_ML ||
    liquorUsd > LIQUOR_USD_LIMIT;
  const isTobaccoOver = tobaccoCount > TOBACCO_LIMIT_CIGARETTES;
  const isPerfumeOver = perfumeVolumeMl > PERFUME_LIMIT_ML;

  return {
    totalJpy,
    totalKrw,
    totalUsd,
    customsLimitUsd: KOREA_CUSTOMS_LIMIT_USD,
    remainingUsd,
    isOverLimit,
    taxFreeTotalJpy,
    estimatedTaxSavedJpy,
    liquorCount,
    liquorVolumeMl,
    liquorUsd,
    isLiquorOver,
    tobaccoCount,
    isTobaccoOver,
    perfumeVolumeMl,
    isPerfumeOver,
  };
}
