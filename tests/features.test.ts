import { describe, expect, it, vi } from "vitest";
import { decodeCard, validCard } from "../src/features/cards/model";
import {
  calculatePayment,
  fetchRate,
  validRate,
  type PaymentInput,
} from "../src/features/pay/calculator";
import { validTripItem } from "../src/features/trip/itinerary";
import { decodeState } from "../src/storage/state";
import { initialState } from "../src/domain/models";
import { distanceMeters, parseNearby } from "../src/features/coupons/nearby";
import {
  phrases,
  resolvePhrase,
  findPhrase,
} from "../src/features/phrases/phrases";
import { registers } from "../src/features/phrases/register";
import { estimateJapanSize } from "../src/features/profile/sizeConversion";
const payment: PaymentInput = {
  price: 11000,
  includesTax: true,
  taxRate: 10,
  discount: 0,
  coupon: 0,
  stackConfirmed: false,
  taxMode: "none",
  refundFee: 0,
  cardFee: 0,
  cashback: 0,
  cashbackCap: null,
  krwPer100Jpy: 900,
};
describe("payment order and refund timing", () => {
  it("removes included tax by division, not by subtracting ten percent", () => {
    const p = calculatePayment({ ...payment, taxMode: "immediate" });
    expect(p.paid).toBe(10000);
    expect(p.krw).toBe(90000);
  });
  it("keeps gross checkout amount for later refund", () => {
    const p = calculatePayment({
      ...payment,
      taxMode: "refund",
      cardFee: 1,
      cashback: 2,
    });
    expect(p.paid).toBe(11000);
    expect(p.laterRefund).toBe(1000);
    expect(p.cashback).toBe(200);
    expect(p.final).toBe(9910);
  });
  it("compounds discounts only when stacking is confirmed", () => {
    expect(() =>
      calculatePayment({ ...payment, discount: 5, coupon: 7 }),
    ).toThrow(/함께/);
    expect(
      calculatePayment({
        ...payment,
        discount: 5,
        coupon: 7,
        stackConfirmed: true,
      }).discounted,
    ).toBe(9718.5);
  });
  it("handles reduced tax and caps cashback", () => {
    const p = calculatePayment({
      ...payment,
      price: 10000,
      includesTax: false,
      taxRate: 8,
      taxMode: "immediate",
      refundFee: 10,
      cashback: 5,
      cashbackCap: 100,
    });
    expect(p.paid).toBe(10080);
    expect(p.cashback).toBe(100);
  });
  it.each([NaN, Infinity, -1, 0, 100000001])(
    "rejects invalid price %s",
    (price) => expect(() => calculatePayment({ ...payment, price })).toThrow(),
  );
  it("does not use missing or negative FX", () => {
    expect(() => calculatePayment({ ...payment, krwPer100Jpy: 0 })).toThrow();
    expect(validRate({ krwPer100Jpy: -1 })).toBe(false);
  });
  it("validates external exchange response and scales JPY to 100", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { base: "JPY", quote: "KRW", date: "2026-09-22", rate: 8.7 },
      ],
    });
    vi.stubGlobal("fetch", fetch);
    try {
      expect((await fetchRate()).krwPer100Jpy).toBeCloseTo(870);
      fetch.mockResolvedValue({
        ok: true,
        json: async () => [{ base: "JPY", quote: "KRW", date: "bad", rate: 0 }],
      });
      await expect(fetchRate()).rejects.toThrow();
      // Well-formed but implausible upstream values are rejected too.
      for (const rate of [0.5, 900]) {
        fetch.mockResolvedValue({
          ok: true,
          json: async () => [
            { base: "JPY", quote: "KRW", date: "2026-09-22", rate },
          ],
        });
        await expect(fetchRate()).rejects.toThrow();
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
const block = () => {
  const b = Array(16).fill(0);
  b[0] = 22;
  b[1] = 1;
  const packed = (26 << 9) | (9 << 5) | 22;
  b[4] = packed >> 8;
  b[5] = packed & 255;
  b[10] = 0x34;
  b[11] = 0x12;
  return b;
};
describe("FeliCa history decoding", () => {
  it("reads little endian balance and bit-packed dates without inferring station names", () => {
    const c = decodeCard(
      { id: "0123456789abcdef", blocks: [block(), Array(16).fill(0)] },
      123,
    );
    expect(c.entries).toHaveLength(1);
    expect(c.entries[0]).toMatchObject({
      date: "2026-09-22",
      balance: 4660,
      kind: "운임 지불",
    });
    expect(validCard(c)).toBe(true);
  });
  it("rejects partial or non-byte blocks and invalid IDs", () => {
    expect(() => decodeCard({ id: "invalid", blocks: [block()] })).toThrow();
    expect(() =>
      decodeCard({ id: "0123456789abcdef", blocks: [[1]] }),
    ).toThrow();
    const b = block();
    b[10] = 256;
    expect(() => decodeCard({ id: "0123456789abcdef", blocks: [b] })).toThrow();
  });
  it("does not invent an empty card balance or invalid date", () => {
    expect(() =>
      decodeCard({ id: "0123456789abcdef", blocks: [Array(16).fill(0)] }),
    ).toThrow();
    const b = block();
    b[4] = 0;
    b[5] = 0;
    expect(
      decodeCard({ id: "0123456789abcdef", blocks: [b] }).entries[0].date,
    ).toBeNull();
  });
});
const item = {
  id: "trip-1",
  title: "예약",
  when: "2026-10-03 00:30",
  place: "도쿄",
  reservation: "AB12",
  note: "",
  done: false,
};
describe("new local fields", () => {
  it("validates Japan calendar dates without silent rollover", () => {
    expect(validTripItem(item)).toBe(true);
    for (const when of ["2026-02-30 12:00", "2026-10-03 24:30", "bad"])
      expect(validTripItem({ ...item, when })).toBe(false);
  });
  it("migrates old state with safe defaults", () => {
    expect(
      decodeState(JSON.stringify({ version: 1, onboarded: true })),
    ).toMatchObject({ transitCards: [], tripItems: [], exchangeRate: null });
  });
  it("restores valid records, drops corruption and deduplicates IDs", () => {
    const c = decodeCard({ id: "0123456789abcdef", blocks: [block()] });
    const s = decodeState(
      JSON.stringify({
        ...initialState(),
        transitCards: [c, c, {}],
        tripItems: [item, item, {}],
        exchangeRate: {
          krwPer100Jpy: 900,
          date: "2026-09-22",
          fetchedAt: 1,
          source: "manual",
        },
      }),
    );
    expect(s.transitCards).toHaveLength(1);
    expect(s.tripItems).toEqual([item]);
    expect(s.exchangeRate?.krwPer100Jpy).toBe(900);
  });
});
describe("nearby store candidates", () => {
  const origin = { latitude: 35.68, longitude: 139.76 };
  it("matches brands, deduplicates mapped shapes and omits distant or unknown stores", () => {
    const json = {
      elements: [
        {
          id: 1,
          type: "node",
          lat: 35.68,
          lon: 139.76,
          tags: { name: "ビックカメラ 有楽町" },
        },
        {
          id: 2,
          type: "way",
          center: { lat: 35.68, lon: 139.76 },
          tags: { name: "ビックカメラ 有楽町" },
        },
        { id: 3, type: "node", lat: 34, lon: 135, tags: { name: "ユニクロ" } },
        {
          id: 4,
          type: "node",
          lat: 35.68,
          lon: 139.76,
          tags: { name: "Unrelated" },
        },
      ],
    };
    expect(parseNearby(json, origin, Date.parse("2026-09-22"))).toHaveLength(1);
    expect(parseNearby(json, origin, Date.parse("2026-12-01"))).toHaveLength(0);
  });
  it("validates response shape and distance", () => {
    expect(() => parseNearby({}, origin)).toThrow();
    expect(distanceMeters(origin, origin)).toBe(0);
    expect(
      distanceMeters(origin, { latitude: 35.69, longitude: 139.76 }),
    ).toBeGreaterThan(1000);
  });
});
describe("Japan shopping size helpers", () => {
  it("converts shoe millimeters to Japan centimeter notation", () => {
    expect(estimateJapanSize("shoe", "285")?.display).toBe("JP 28.5 cm");
  });

  it("converts waist inches to an approximate centimeter shopping size", () => {
    expect(estimateJapanSize("bottom", "38")?.display).toContain("97 cm");
  });

  it("suggests a larger Japan starting size for alphabetic tops", () => {
    expect(estimateJapanSize("top", "2XL")?.display).toContain("3XL");
  });

  it("keeps the Korean phrase raw while using the Japan estimate in Japanese", () => {
    const profile = {
      nickname: "",
      sizes: { top: "2XL", bottom: "38", shoe: "285" },
    };
    const top = resolvePhrase(phrases.find((p) => p.id === "top")!, profile)!;
    const shoe = resolvePhrase(phrases.find((p) => p.id === "shoe")!, profile)!;
    expect(top.ko).toContain("2XL");
    expect(top.ja).toContain("3XL");
    expect(shoe.ja).toContain("28.5センチ");
  });
});

describe("offline politeness", () => {
  it("has authored variants for every phrase and keeps size placeholders literal", () => {
    const profile = {
      nickname: "",
      sizes: { top: "$&", bottom: "28", shoe: "24 cm" },
    };
    expect(Object.keys(registers)).toHaveLength(phrases.length);
    for (const phrase of phrases) {
      for (const style of ["casual", "polite", "formal"] as const) {
        const pair = resolvePhrase(phrase, profile, style)!;
        expect(pair.ja).not.toContain("{size}");
        if (phrase.id === "top") expect(pair.ja).toContain("$&");
        expect(findPhrase(pair.ja, "ja", profile)?.ko).toBe(pair.ko);
      }
    }
  });
});
