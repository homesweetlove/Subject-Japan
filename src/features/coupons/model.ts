export type CouponAudience = "general" | "visitor";
export type CouponCategory =
  "종합쇼핑" | "백화점" | "패션" | "식음료" | "가전" | "드럭스토어";
export interface Coupon {
  id: string;
  merchant: string;
  title: string;
  benefit: string;
  audience: CouponAudience;
  category: CouponCategory;
  eligibility: string;
  registrationRequired: boolean;
  minimumSpend: string;
  validity: string;
  /** Only a published fixed end date, inclusive in Japan time. */
  expiresOn?: string;
  checkedOn: string;
  stores: string;
  steps: readonly string[];
  exclusions: readonly string[];
  stacking: string;
  officialUrl: string;
  sourceLabel?: string;
  keywords: readonly string[];
}
export const audienceLabels: Record<CouponAudience, string> = {
  general: "일반 고객용",
  visitor: "외국인·방문객용",
};
export const officialHosts = new Set([
  "japanportal.donki-global.com",
  "www.takashimaya.co.jp",
  "www.daimaru.co.jp",
  "faq.uniqlo.com",
  "www.mcdonalds.co.jp",
  "www.starbucks.co.jp",
  "livejapan.com",
  "www.sugi-net.jp",
  "global.hankyu-hanshin-dept.co.jp",
  "cp.mistore.jp",
  "satudora.jp",
  "www.edion.com",
]);
export function isOfficialCouponUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      officialHosts.has(url.hostname)
    );
  } catch {
    return false;
  }
}
export function couponStatus(
  coupon: Coupon,
  now = Date.now(),
): "expired" | "review" | "checked" {
  if (
    coupon.expiresOn &&
    now >= Date.parse(`${coupon.expiresOn}T23:59:59.999+09:00`) + 1
  )
    return "expired";
  const checked = Date.parse(`${coupon.checkedOn}T00:00:00+09:00`);
  return !Number.isFinite(checked) ||
    now < checked ||
    now - checked >= 30 * 86400000
    ? "review"
    : "checked";
}
export const statusLabels = {
  expired: "게시된 기간 종료",
  review: "최신 조건 재확인 필요",
  checked: "공식 안내 확인",
};

export type CouponDDayStatus =
  "ongoing" | "d-day" | "ending-soon" | "valid" | "expired";

export interface CouponDDayInfo {
  status: CouponDDayStatus;
  label: string;
  daysRemaining?: number;
}

export function couponDDay(coupon: Coupon, now = Date.now()): CouponDDayInfo {
  if (!coupon.expiresOn) {
    return { status: "ongoing", label: "종료일 미공개" };
  }
  const expiry = Date.parse(`${coupon.expiresOn}T23:59:59.999+09:00`);
  if (!Number.isFinite(expiry) || now > expiry) {
    return { status: "expired", label: "기간 만료" };
  }
  const japanDay = (time: number) => Math.floor((time + 9 * 3600000) / 86400000);
  const daysRemaining = japanDay(expiry) - japanDay(now);
  if (daysRemaining === 0) {
    return { status: "d-day", label: "오늘 마감 (D-Day)", daysRemaining: 0 };
  }
  if (daysRemaining <= 7) {
    return {
      status: "ending-soon",
      label: `마감 임박 (D-${daysRemaining})`,
      daysRemaining,
    };
  }
  return {
    status: "valid",
    label: `D-${daysRemaining}`,
    daysRemaining,
  };
}

export function filterCoupons(
  coupons: readonly Coupon[],
  filters: {
    query: string;
    audience: CouponAudience | "all";
    category: CouponCategory | "all";
    savedOnly: boolean;
    savedIds: readonly string[];
    validOnly?: boolean;
    now?: number;
  },
): Coupon[] {
  const query = filters.query.trim().normalize("NFKC").toLocaleLowerCase();
  const currentNow = filters.now ?? Date.now();
  return coupons.filter((c) => {
    if (filters.validOnly && couponStatus(c, currentNow) === "expired") {
      return false;
    }
    return (
      (filters.audience === "all" || c.audience === filters.audience) &&
      (filters.category === "all" || c.category === filters.category) &&
      (!filters.savedOnly || filters.savedIds.includes(c.id)) &&
      [c.merchant, c.title, c.category, ...c.keywords]
        .join(" ")
        .normalize("NFKC")
        .toLocaleLowerCase()
        .includes(query)
    );
  });
}
