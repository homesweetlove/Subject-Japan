import type { SizeKey } from "../../domain/models";

export interface JapanSizeEstimate {
  /** Short value to show in UI, e.g. "JP 3XL / 4L" or "JP 28.5 cm". */
  display: string;
  /** Value that can be spoken/shown naturally inside a Japanese shopping phrase. */
  phrase: string;
  note: string;
}

const alphaOrder = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;

function normalizeAlpha(value: string) {
  const upper = value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace("XXXL", "3XL")
    .replace("XXL", "2XL");
  return alphaOrder.includes(upper as (typeof alphaOrder)[number]) ? upper : null;
}

function nextAlpha(value: string) {
  const normalized = normalizeAlpha(value);
  if (!normalized) return null;
  const index = alphaOrder.indexOf(normalized as (typeof alphaOrder)[number]);
  return alphaOrder[Math.min(index + 1, alphaOrder.length - 1)];
}

function japaneseLargeNotation(alpha: string) {
  const map: Record<string, string> = {
    XL: "2L",
    "2XL": "3L",
    "3XL": "4L",
    "4XL": "5L",
  };
  return map[alpha] ?? alpha;
}

function numberFrom(value: string) {
  const match = value.replace(/,/g, ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function formatCm(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function estimateTop(raw: string): JapanSizeEstimate | null {
  const alpha = normalizeAlpha(raw);
  if (alpha) {
    const suggested = nextAlpha(alpha) ?? alpha;
    const jp = japaneseLargeNotation(suggested);
    const display = jp === suggested ? `JP ${suggested} 예상` : `JP ${suggested} / ${jp} 예상`;
    return {
      display,
      phrase: jp === suggested ? suggested : `${suggested}（${jp}）`,
      note: "일본 의류는 브랜드별 편차가 커서 한 단계 큰 시작값으로 보여줘요.",
    };
  }

  const chest = numberFrom(raw);
  if (chest && chest >= 80 && chest <= 130) {
    const koreanToJapan: Array<[number, string]> = [
      [85, "XS"],
      [90, "S"],
      [95, "M"],
      [100, "L"],
      [105, "XL"],
      [110, "2XL"],
      [115, "3XL"],
      [120, "4XL"],
      [130, "4XL"],
    ];
    const base = koreanToJapan.find(([max]) => chest <= max)?.[1] ?? "4XL";
    const suggested = nextAlpha(base) ?? base;
    const jp = japaneseLargeNotation(suggested);
    return {
      display: jp === suggested ? `JP ${suggested} 예상` : `JP ${suggested} / ${jp} 예상`,
      phrase: jp === suggested ? suggested : `${suggested}（${jp}）`,
      note: `한국 ${chest} 표기를 기준으로 잡은 쇼핑 시작값이에요.`,
    };
  }
  return null;
}

function estimateBottom(raw: string): JapanSizeEstimate | null {
  const alpha = normalizeAlpha(raw);
  if (alpha) {
    const suggested = nextAlpha(alpha) ?? alpha;
    const jp = japaneseLargeNotation(suggested);
    return {
      display: jp === suggested ? `JP ${suggested} 예상` : `JP ${suggested} / ${jp} 예상`,
      phrase: jp === suggested ? suggested : `${suggested}（${jp}）`,
      note: "문자 사이즈는 브랜드별 편차가 커서 한 단계 큰 시작값으로 보여줘요.",
    };
  }

  const n = numberFrom(raw);
  if (!n) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("cm") || (n >= 60 && n <= 150)) {
    const cm = Math.round(n);
    return {
      display: `JP 허리 약 ${cm} cm`,
      phrase: `ウエスト${cm}センチ前後`,
      note: "일본 바지는 허리둘레 cm 표기가 흔해요.",
    };
  }
  if (n >= 24 && n <= 60) {
    const cm = Math.round(n * 2.54);
    return {
      display: `JP 허리 약 ${cm} cm · W${formatCm(n)}`,
      phrase: `ウエスト${cm}センチ前後`,
      note: "인치 표기를 허리둘레 cm로 함께 바꿨어요.",
    };
  }
  return null;
}

function estimateShoe(raw: string): JapanSizeEstimate | null {
  const n = numberFrom(raw);
  if (!n) return null;
  const lower = raw.toLowerCase();
  let cm: number | null = null;
  if (lower.includes("mm") || (n >= 180 && n <= 350)) cm = n / 10;
  else if (lower.includes("cm") || (n >= 18 && n <= 35)) cm = n;
  if (cm === null || cm < 18 || cm > 35) return null;
  const value = formatCm(Math.round(cm * 10) / 10);
  return {
    display: `JP ${value} cm`,
    phrase: `${value}センチ`,
    note: "일본 신발은 cm 표기를 그대로 쓰는 경우가 일반적이에요.",
  };
}

export function estimateJapanSize(
  key: SizeKey,
  raw: string,
): JapanSizeEstimate | null {
  const value = raw.trim();
  if (!value) return null;
  if (key === "top") return estimateTop(value);
  if (key === "bottom") return estimateBottom(value);
  return estimateShoe(value);
}

export function japanPhraseSize(key: SizeKey, raw: string) {
  const value = raw.trim();
  return estimateJapanSize(key, value)?.phrase ?? value;
}
