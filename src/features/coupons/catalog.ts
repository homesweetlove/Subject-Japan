import bundled from "./catalog.v1.json";
import { isOfficialCouponUrl, type Coupon } from "./model";

export interface CouponFeed {
  revision: number;
  items: Coupon[];
}
const hasText = (v: unknown) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= 2000;
const isDay = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
function validCoupon(value: unknown): value is Coupon {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    /^[a-z0-9-]{1,80}$/.test(c.id) &&
    (c.audience === "general" || c.audience === "visitor") &&
    typeof c.category === "string" &&
    ["종합쇼핑", "백화점", "패션", "식음료", "가전", "드럭스토어"].includes(
      c.category,
    ) &&
    typeof c.registrationRequired === "boolean" &&
    isDay(c.checkedOn) &&
    (c.expiresOn === undefined || isDay(c.expiresOn)) &&
    typeof c.officialUrl === "string" &&
    isOfficialCouponUrl(c.officialUrl) &&
    (c.sourceLabel === undefined || hasText(c.sourceLabel)) &&
    [
      "merchant",
      "title",
      "benefit",
      "eligibility",
      "minimumSpend",
      "validity",
      "stores",
      "stacking",
    ].every((k) => hasText(c[k])) &&
    [c.steps, c.exclusions, c.keywords].every(
      (v) => Array.isArray(v) && v.length <= 60 && v.every(hasText),
    )
  );
}
export function parseCouponFeed(value: unknown): CouponFeed {
  const feed = value as CouponFeed | null;
  if (
    !feed ||
    !Number.isSafeInteger(feed.revision) ||
    feed.revision < 1 ||
    !Array.isArray(feed.items) ||
    !feed.items.length ||
    feed.items.length > 200 ||
    !feed.items.every(validCoupon) ||
    new Set(feed.items.map((c) => c.id)).size !== feed.items.length
  )
    throw new Error("쿠폰 목록 형식을 확인하지 못했어요.");
  return feed;
}
export const bundledFeed = parseCouponFeed(bundled);
export const couponCatalog: readonly Coupon[] = bundledFeed.items;
