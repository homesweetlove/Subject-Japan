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
}

export const RECEIPT_LIMIT = 100;
export const TAX_FREE_MIN_JPY = 5000;
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
    Number.isFinite(r.createdAt)
  );
}

export interface CustomsAnalysis {
  totalJpy: number;
  totalKrw: number;
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

  for (const r of receipts) {
    totalJpy += r.jpyAmount;
    if (r.taxFreeApplied) {
      taxFreeTotalJpy += r.jpyAmount;
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

  // 100 JPY to KRW rate
  const krwPer100Jpy = rate?.krwPer100Jpy ?? 900;
  const totalKrw = Math.round((totalJpy * krwPer100Jpy) / 100);

  // Conversion from JPY to USD (approximate: 1 USD ≈ 148 JPY or derived from KRW/USD ~1400)
  const usdRate = DEFAULT_USD_PER_JPY;
  const totalUsd = Math.round(totalJpy * usdRate * 10) / 10;
  const liquorUsd = Math.round(liquorJpy * usdRate * 10) / 10;

  const remainingUsd = Math.max(0, KOREA_CUSTOMS_LIMIT_USD - totalUsd);
  const isOverLimit = totalUsd > KOREA_CUSTOMS_LIMIT_USD;

  // Japan consumption tax is 10% (calculated as tax included 10/110 or added 10%)
  const estimatedTaxSavedJpy = Math.round(taxFreeTotalJpy * 0.1);

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
