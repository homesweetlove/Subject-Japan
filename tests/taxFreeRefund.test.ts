import { describe, expect, it } from "vitest";
import {
  analyzeCustoms,
  japanDay,
  receiptScheme,
  receiptTaxJpy,
  REFUND_METHOD_START,
  refundDaysLeft,
  refundSummary,
  sameStoreDayTaxExcluded,
  schemeFor,
  taxExcludedJpy,
  validReceipt,
  type DutyFreeReceipt,
} from "../src/features/pay/taxFreeTracker";

const nov5 = Date.parse("2026-11-05T12:00:00+09:00");
const DAY = 86400000;
const receipt = (over: Partial<DutyFreeReceipt>): DutyFreeReceipt => ({
  id: "r1",
  storeName: "돈키호테 도톤보리점",
  category: "consumable",
  jpyAmount: 11000,
  taxFreeApplied: true,
  createdAt: nov5,
  ...over,
});

describe("refund method (purchases from 2026-11-01)", () => {
  it("switches scheme at midnight Japan time on November 1", () => {
    expect(schemeFor(REFUND_METHOD_START - 1)).toBe("instant");
    expect(schemeFor(REFUND_METHOD_START)).toBe("refund");
    // Old receipts without a scheme keep the method of their date.
    expect(receiptScheme(receipt({ createdAt: 1 }))).toBe("instant");
    expect(receiptScheme(receipt({}))).toBe("refund");
    expect(receiptScheme(receipt({ scheme: "instant" }))).toBe("instant");
  });

  it("takes tax out of the tax-inclusive price for refunds", () => {
    expect(receiptTaxJpy(receipt({}))).toBe(1000);
    expect(taxExcludedJpy(receipt({}))).toBe(10000);
    // Food and soft drinks are taxed at 8%.
    expect(receiptTaxJpy(receipt({ jpyAmount: 10800, taxRate: 8 }))).toBe(800);
    // The old method saved tax on top of the tax-free price.
    expect(receiptTaxJpy(receipt({ scheme: "instant", jpyAmount: 10000 }))).toBe(
      1000,
    );
    expect(receiptTaxJpy(receipt({ taxFreeApplied: false }))).toBe(0);
  });

  it("counts the 90 day window and sums the same store and day", () => {
    expect(refundDaysLeft(receipt({}), nov5)).toBe(90);
    expect(refundDaysLeft(receipt({}), nov5 + 89.5 * DAY)).toBe(1);
    expect(refundDaysLeft(receipt({}), nov5 + 91 * DAY)).toBeLessThan(0);
    expect(japanDay(Date.parse("2026-11-05T23:30:00+09:00"))).toBe(
      "2026-11-05",
    );
    const list = [
      receipt({ id: "a", jpyAmount: 3300 }),
      receipt({ id: "b", storeName: " 돈키호테 도톤보리점 ", jpyAmount: 2200 }),
      receipt({ id: "c", createdAt: nov5 + DAY, jpyAmount: 9900 }),
      receipt({ id: "d", storeName: "빅카메라", jpyAmount: 9900 }),
    ];
    expect(sameStoreDayTaxExcluded(list, "돈키호테 도톤보리점", nov5)).toBe(
      5000,
    );
  });

  it("summarises waiting, confirmed, received and lost refunds", () => {
    const list = [
      receipt({ id: "a" }),
      receipt({ id: "b", refundStatus: "confirmed", jpyAmount: 5500 }),
      receipt({ id: "c", refundStatus: "refunded", jpyAmount: 22000 }),
      receipt({ id: "d", createdAt: nov5 - 100 * DAY + 1 }),
      receipt({ id: "e", taxFreeApplied: false }),
      receipt({ id: "f", scheme: "instant" }),
    ];
    const s = refundSummary(list, nov5);
    expect(s.expectedJpy).toBe(1500);
    expect(s.receivedJpy).toBe(2000);
    expect(s.waitingCount).toBe(1);
    expect(s.nextDeadline).toBe(nov5 + 90 * DAY);
    // Receipt d was bought before the change, so it is the old method.
    expect(s.lostJpy).toBe(0);
    const late = refundSummary(
      [receipt({ id: "g" })],
      nov5 + 91 * DAY,
    );
    expect(late.lostJpy).toBe(1000);
    expect(late.expectedJpy).toBe(0);
    expect(late.nextDeadline).toBeNull();
  });

  it("validates the new optional receipt fields", () => {
    expect(validReceipt(receipt({ taxRate: 8, refundStatus: "confirmed" }))).toBe(
      true,
    );
    expect(validReceipt(receipt({ taxRate: 5 as 8 }))).toBe(false);
    expect(validReceipt(receipt({ scheme: "later" as "refund" }))).toBe(false);
    expect(
      validReceipt(receipt({ refundStatus: "paid" as "refunded" })),
    ).toBe(false);
  });

  it("hides won totals until a real rate exists", () => {
    const analysis = analyzeCustoms([receipt({})], null);
    expect(analysis.totalKrw).toBeNull();
    expect(analysis.estimatedTaxSavedJpy).toBe(1000);
  });
});

import {
  isBusyDeparture,
  recommendedArrival,
  taxFreeAirports,
} from "../src/features/pay/airportTaxFree";
import { validTravelLink } from "../src/features/guides/linkPolicy";

describe("airport tax-free planning", () => {
  const at = (iso: string) => Date.parse(`${iso}+09:00`);

  it("marks Narita's busy security hours in Japan time", () => {
    expect(isBusyDeparture(at("2026-11-20T09:30:00"))).toBe(true);
    expect(isBusyDeparture(at("2026-11-20T13:00:00"))).toBe(false);
    expect(isBusyDeparture(at("2026-11-20T17:10:00"))).toBe(true);
    expect(isBusyDeparture(at("2026-11-20T22:00:00"))).toBe(false);
  });

  it("adds customs, busy-hour and holiday time to the 2 hour base", () => {
    const quiet = recommendedArrival({
      departure: at("2026-11-20T14:00:00"),
      receipts: 0,
      holiday: false,
    });
    expect(quiet.minutes).toBe(120);
    const busy = recommendedArrival({
      departure: at("2026-11-20T10:00:00"),
      receipts: 5,
      holiday: true,
    });
    // 120 base + (30 + 2 extra receipts * 5) + 20 busy + 30 holiday
    expect(busy.minutes).toBe(210);
    expect(busy.arriveAt).toBe(at("2026-11-20T06:30:00"));
    // Very many receipts are capped at one extra hour for customs.
    const many = recommendedArrival({
      departure: at("2026-11-20T14:00:00"),
      receipts: 40,
      holiday: false,
    });
    expect(many.minutes).toBe(180);
  });

  it("only links to allowed official pages", () => {
    for (const airport of taxFreeAirports) {
      if (airport.guideUrl) expect(validTravelLink(airport.guideUrl)).toBe(true);
      if (airport.liveWaitUrl)
        expect(validTravelLink(airport.liveWaitUrl)).toBe(true);
      expect(airport.kiosk.length).toBeGreaterThan(0);
    }
  });
});

import { fetchRate, validRate } from "../src/features/pay/calculator";

describe("dollar rate for the Korea $800 limit", () => {
  const base = {
    krwPer100Jpy: 900,
    date: "2026-11-05",
    fetchedAt: 1,
    source: "Frankfurter" as const,
  };

  it("uses the fetched dollar rate and flags the fallback", () => {
    const item = {
      id: "u",
      storeName: "빅카메라",
      category: "general" as const,
      jpyAmount: 150000,
      taxFreeApplied: true,
      createdAt: 1,
    };
    const guess = analyzeCustoms([item], base);
    expect(guess.usdIsEstimate).toBe(true);
    expect(guess.totalUsd).toBe(1013.5);
    // At 160 yen per dollar the same purchase is still over $800.
    const real = analyzeCustoms([item], {
      ...base,
      usdPerJpy: 1 / 160,
      usdDate: "2026-11-05",
    });
    expect(real.usdIsEstimate).toBe(false);
    expect(real.totalUsd).toBe(937.5);
    // At 200 yen per dollar it is under.
    const cheap = analyzeCustoms([item], {
      ...base,
      usdPerJpy: 1 / 200,
      usdDate: "2026-11-05",
    });
    expect(cheap.isOverLimit).toBe(false);
  });

  it("validates stored dollar rates", () => {
    expect(validRate(base)).toBe(true);
    expect(validRate({ ...base, usdPerJpy: 1 / 150, usdDate: "2026-11-05" })).toBe(
      true,
    );
    expect(validRate({ ...base, usdPerJpy: 1 / 150 })).toBe(false);
    expect(validRate({ ...base, usdPerJpy: 0.5, usdDate: "2026-11-05" })).toBe(
      false,
    );
  });

  it("reads USD next to KRW but never fails because of it", async () => {
    const original = globalThis.fetch;
    const respond = (body: unknown) =>
      (globalThis.fetch = (async () => ({
        ok: true,
        json: async () => body,
      })) as unknown as typeof fetch);
    try {
      respond([
        { base: "JPY", quote: "KRW", date: "2026-11-05", rate: 9.1 },
        { base: "JPY", quote: "USD", date: "2026-11-05", rate: 0.0065 },
      ]);
      const both = await fetchRate();
      expect(both.krwPer100Jpy).toBeCloseTo(910);
      expect(both.usdPerJpy).toBe(0.0065);
      expect(both.usdDate).toBe("2026-11-05");
      respond([
        { base: "JPY", quote: "KRW", date: "2026-11-05", rate: 9.1 },
        { base: "JPY", quote: "USD", date: "2026-11-05", rate: 5 },
      ]);
      const odd = await fetchRate();
      expect(odd.usdPerJpy).toBeUndefined();
      expect(validRate(odd)).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });
});
