import { describe, expect, it } from "vitest";
import { initialState } from "../src/domain/models";
import {
  barcodeModules,
  ean13CheckDigit,
} from "../src/features/membership/barcode";
import {
  makeMembershipCard,
  validMembershipCard,
  MEMBERSHIP_LIMIT,
} from "../src/features/membership/model";
import { estimateJapanSize } from "../src/features/profile/sizeConversion";
import { phrases, resolvePhrase } from "../src/features/phrases/phrases";
import {
  couponSourceStatusLabel,
  parseCouponSourceStatuses,
} from "../src/features/coupons/liveStatus";
import {
  decodeState,
  deleteMembership,
  saveMembership,
} from "../src/storage/state";
import { travelChecklistItems } from "../src/features/trip/checklist";

describe("merged membership wallet", () => {
  const make = (name = "Ponta") =>
    makeMembershipCard({ name, barcodeValue: "ABC123456", now: 123 });
  it("creates valid local barcode cards and rejects unsafe URLs", () => {
    const card = make();
    expect(validMembershipCard(card)).toBe(true);
    expect(() =>
      makeMembershipCard({ name: "Bad", link: "http://example.com" }),
    ).toThrow(/https/);
    expect(() =>
      makeMembershipCard({ name: "Bad", link: "https://u:p@example.com" }),
    ).toThrow(/https/);
  });
  it("renders correct EAN-13 and CODE 128 module streams", () => {
    expect(ean13CheckDigit("400638133393")).toBe(1);
    expect(barcodeModules("4006381333931")).toMatchObject({
      kind: "ean13",
      value: "4006381333931",
    });
    expect(barcodeModules("4006381333931").modules).toHaveLength(95);
    expect(barcodeModules("ABC123").kind).toBe("code128");
  });
  it("preserves previously saved membershipCards and filters corrupt data", () => {
    const old = decodeState(JSON.stringify({ version: 1, onboarded: true }));
    expect(old.membershipCards).toEqual([]);
    const card = make();
    expect(
      decodeState(
        JSON.stringify({
          ...initialState(),
          membershipCards: [card, card, {}],
        }),
      ).membershipCards,
    ).toEqual([card]);
  });
  it("enforces limits and updates by ID without dropping other fields", () => {
    let state = saveMembership(initialState(), make());
    const updated = { ...state.membershipCards[0], note: "offline" };
    state = saveMembership(state, updated);
    expect(state.membershipCards).toEqual([updated]);
    expect(deleteMembership(state, updated.id).membershipCards).toEqual([]);
    expect(MEMBERSHIP_LIMIT).toBe(40);
  });
});

describe("merged shopping helpers", () => {
  it("uses advisory JP cm shoe units and approximate clothing units", () => {
    expect(estimateJapanSize("shoe", "285")?.display).toBe("JP 28.5 cm");
    expect(estimateJapanSize("bottom", "38")?.display).toContain("97 cm");
    expect(estimateJapanSize("top", "2XL")?.display).toContain("3XL");
    expect(estimateJapanSize("shoe", "unknown")).toBeNull();
  });
  it("keeps the user's actual size in both shopping phrases", () => {
    const profile = {
      nickname: "",
      sizes: { top: "2XL", bottom: "38", shoe: "285" },
    };
    const top = resolvePhrase(
      phrases.find((p) => p.id === "top")!,
      profile,
    )!;
    expect(top.ko).toContain("2XL");
    expect(top.ja).toContain("2XL");
  });
  it("adds official Visit Japan link and offline readiness items", () => {
    expect(travelChecklistItems.find((x) => x.id === "prep-vjw")?.url).toBe(
      "https://www.vjw.digital.go.jp/",
    );
    expect(travelChecklistItems.some((x) => x.id === "prep-offline-qr")).toBe(
      true,
    );
    expect(
      travelChecklistItems.some((x) => x.id === "prep-hotel-contact"),
    ).toBe(true);
  });
  it("maps only known coupon source statuses", () => {
    const statuses = parseCouponSourceStatuses({
      items: [
        {
          id: "donki-coupon",
          status: "fresh",
          checkedAt: "2026-09-28T01:00:00Z",
          changed: false,
        },
        { id: "hankyu-service", status: "stale", changed: true },
        { id: "edion-taxfree", status: "fresh", checkedAt: "2026-09-28T01:00:00Z" },
        { id: "wrong", status: "unsupported" },
      ],
    }, Date.parse("2026-09-28T02:00:00Z"));
    expect(statuses["donki-visitor"]?.state).toBe("fresh");
    expect(statuses["edion-taxfree"]?.state).toBe("fresh");
    expect(() => parseCouponSourceStatuses({ invalid: true })).toThrow();
    expect(statuses["hankyu-vip"]?.changed).toBe(true);
    expect(couponSourceStatusLabel(statuses["hankyu-vip"])).toMatch(/변경/);
    expect(statuses.wrong).toBeUndefined();
  });
});
