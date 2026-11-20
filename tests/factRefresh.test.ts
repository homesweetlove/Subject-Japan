import { describe, expect, it } from "vitest";
import {
  EMERGENCY_CHECKED_ON,
  emergencyContacts,
} from "../src/features/trip/emergency";
import {
  calculateTaxiFare,
  taxiTariffs,
  transitPasses,
  TRANSIT_CHECKED_ON,
} from "../src/features/trip/transit";
import { atmGuides, travelCardNotes } from "../src/features/pay/cashUtilities";
import { travelChecklistItems } from "../src/features/trip/checklist";
import { couponCatalog } from "../src/features/coupons/catalog";
import { couponStatus } from "../src/features/coupons/model";

// Facts re-checked against official pages on 2026-11-05.
describe("2026-11-05 fact refresh", () => {
  it("uses the corrected JNTO visitor hotline", () => {
    const jnto = emergencyContacts.find((c) => c.id === "japan-visitor-hotline");
    expect(jnto?.phone).toBe("050-3816-2787");
    expect(EMERGENCY_CHECKED_ON).toBe("2026-11-05");
  });

  it("gives every Korean mission an after-hours line", () => {
    const missions = emergencyContacts.filter(
      (c) => c.id.startsWith("embassy-") || c.id.startsWith("consulate-"),
    );
    expect(missions.length).toBe(7);
    for (const m of missions) {
      expect(m.afterHoursPhone, m.id).toMatch(/^\+8[12]-/);
      expect(m.afterHoursPhone).not.toBe(m.phone);
    }
  });

  it("matches current pass prices", () => {
    const price = (id: string) => transitPasses.find((p) => p.id === id)?.priceYen;
    expect(price("tokyo-subway-24")).toBe(1000);
    expect(price("tokyo-subway-48")).toBe(1500);
    expect(price("tokyo-subway-72")).toBe(2000);
    expect(price("osaka-amazing-1day")).toBe(3500);
    expect(price("fukuoka-subway-1day")).toBe(640);
    expect(TRANSIT_CHECKED_ON).toBe("2026-11-05");
  });

  it("charges the base fare inside the base distance in each city", () => {
    for (const city of ["tokyo", "osaka", "fukuoka"] as const) {
      const t = taxiTariffs[city];
      expect(calculateTaxiFare(t.baseKm, city).estimatedFareYen).toBe(t.baseYen);
      expect(calculateTaxiFare(t.baseKm + 0.001, city).estimatedFareYen).toBe(
        t.baseYen + t.stepYen,
      );
    }
  });

  it("does not claim Travel Wallet is free at Seven Bank", () => {
    const seven = atmGuides.find((g) => g.bank.includes("세븐뱅크"))!;
    expect(seven.feeInfo).not.toContain("트래블월렛");
    const aeon = atmGuides.find((g) => g.bank.includes("이온뱅크"))!;
    expect(aeon.feeInfo).toContain("트래블월렛");
    expect(travelCardNotes.some((n) => n.includes("5회"))).toBe(true);
  });

  it("states the 2026 power bank and departure tax rules", () => {
    const battery = travelChecklistItems.find((i) => i.id === "prep-battery");
    expect(battery?.description).toContain("160Wh");
    const tax = travelChecklistItems.find((i) => i.id === "prep-departure-tax");
    expect(tax?.description).toContain("3,000엔");
  });

  it("tracks the renewed partner coupons and the November review", () => {
    const now = Date.parse("2026-11-20T12:00:00+09:00");
    for (const [id, end] of [["biccamera-livejapan", "2027-04-30"], ["edion-taxfree", "2027-12-31"]]) {
      const c = couponCatalog.find((x) => x.id === id)!;
      expect(c.expiresOn).toBe(end);
      expect(couponStatus(c, now)).toBe("checked");
    }
    for (const id of ["donki-visitor", "takashimaya-shoppers", "daimaru-tokyo"]) {
      const c = couponCatalog.find((x) => x.id === id)!;
      expect(couponStatus(c, now)).toBe("checked");
    }
  });
});
