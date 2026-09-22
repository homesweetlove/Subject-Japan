import { describe, expect, it } from "vitest";
import { couponCatalog } from "../src/features/coupons/catalog";
import {
  couponStatus,
  filterCoupons,
  isOfficialCouponUrl,
} from "../src/features/coupons/model";
import { initialState } from "../src/domain/models";
import { decodeState, toggleSavedCoupon } from "../src/storage/state";

describe("coupon catalog and eligibility", () => {
  it("contains both audiences with official sources and complete conditions", () => {
    expect(new Set(couponCatalog.map((c) => c.id)).size).toBe(
      couponCatalog.length,
    );
    expect(new Set(couponCatalog.map((c) => c.audience))).toEqual(
      new Set(["general", "visitor"]),
    );
    for (const c of couponCatalog) {
      expect(isOfficialCouponUrl(c.officialUrl)).toBe(true);
      for (const field of [
        c.eligibility,
        c.minimumSpend,
        c.validity,
        c.stores,
        c.stacking,
      ])
        expect(field.length).toBeGreaterThan(0);
      expect(c.steps.length).toBeGreaterThan(0);
      expect(Number.isFinite(Date.parse(c.checkedOn))).toBe(true);
    }
  });
  it("combines search, audience, category and saved filters", () => {
    const filters = {
      query: " ＵＮＩＱＬＯ ",
      audience: "general" as const,
      category: "패션" as const,
      savedOnly: true,
      savedIds: ["uniqlo-new-app"],
    };
    expect(filterCoupons(couponCatalog, filters).map((c) => c.id)).toEqual([
      "uniqlo-new-app",
    ]);
    expect(
      filterCoupons(couponCatalog, { ...filters, audience: "visitor" }),
    ).toEqual([]);
    expect(filterCoupons(couponCatalog, { ...filters, savedIds: [] })).toEqual(
      [],
    );
  });
  it("marks old reviews separately from actual Japan-time expiration", () => {
    const coupon = {
      ...couponCatalog[0],
      checkedOn: "2026-09-01",
      expiresOn: "2026-10-05",
    };
    expect(couponStatus(coupon, Date.parse("2026-09-22T00:00:00+09:00"))).toBe(
      "checked",
    );
    expect(
      couponStatus(coupon, Date.parse("2026-10-05T23:59:59.999+09:00")),
    ).toBe("review");
    expect(couponStatus(coupon, Date.parse("2026-10-06T00:00:00+09:00"))).toBe(
      "expired",
    );
    expect(
      couponStatus(
        { ...coupon, expiresOn: undefined },
        Date.parse("2027-01-01"),
      ),
    ).toBe("review");
  });
  it.each([
    "http://www.daimaru.co.jp/",
    "https://www.daimaru.co.jp.evil.example/",
    "https://user:pass@www.daimaru.co.jp/",
    "javascript:alert(1)",
    "https://www.daimaru.co.jp:8443/",
    "not a URL",
  ])("rejects non-official destination %s", (url) => {
    expect(isOfficialCouponUrl(url)).toBe(false);
  });
});
describe("local coupon persistence", () => {
  it("reads existing v1 profiles without losing sizes or onboarding", () => {
    const previous = {
      ...initialState(),
      onboarded: true,
      savedCouponIds: undefined,
    };
    previous.profile.sizes.top = "44";
    expect(decodeState(JSON.stringify(previous))).toMatchObject({
      onboarded: true,
      profile: { sizes: { top: "44" } },
      savedCouponIds: [],
    });
  });
  it("round trips saved IDs, removes individually, and clears on reset", () => {
    const state = toggleSavedCoupon(initialState(), "donki-visitor");
    expect(decodeState(JSON.stringify(state)).savedCouponIds).toEqual([
      "donki-visitor",
    ]);
    expect(toggleSavedCoupon(state, "donki-visitor").savedCouponIds).toEqual(
      [],
    );
    expect(initialState().savedCouponIds).toEqual([]);
  });
  it("sanitizes corrupt IDs and preserves bookmarks when reaching the limit", () => {
    expect(
      decodeState(
        JSON.stringify({
          version: 1,
          savedCouponIds: [
            null,
            42,
            "",
            "bad id",
            "donki-visitor",
            "donki-visitor",
          ],
        }),
      ).savedCouponIds,
    ).toEqual(["donki-visitor"]);
    const state = {
      ...initialState(),
      savedCouponIds: Array.from({ length: 200 }, (_, i) => `coupon-${i}`),
    };
    expect(() => toggleSavedCoupon(state, "new-coupon")).toThrow("200개");
    expect(toggleSavedCoupon(state, "coupon-1").savedCouponIds).toHaveLength(
      199,
    );
  });
});
