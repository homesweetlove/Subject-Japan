import { describe, expect, it } from "vitest";
import {
  formatRateAge,
  isRateStale,
  quickConversions,
  type ExchangeRate,
} from "../src/features/pay/calculator";
import {
  couponDDay,
  filterCoupons,
  type Coupon,
} from "../src/features/coupons/model";
import {
  formatLiveJapanTime,
  JAPAN_DAYS_OF_WEEK,
} from "../src/features/trip/countdown";
import {
  analyzeCustoms,
  validReceipt,
  type DutyFreeReceipt,
  KOREA_CUSTOMS_LIMIT_USD,
  LIQUOR_USD_LIMIT,
  LIQUOR_VOLUME_LIMIT_ML,
  PERFUME_LIMIT_ML,
  RECEIPT_LIMIT,
  TAX_FREE_MIN_JPY,
  TOBACCO_LIMIT_CIGARETTES,
} from "../src/features/pay/taxFreeTracker";
import {
  decodeState,
  deleteDutyFreeReceipt,
  saveDutyFreeReceipt,
  setAutoRefreshRate,
} from "../src/storage/state";
import { initialState } from "../src/domain/models";
import {
  emergencyContacts,
  emergencyPhrases,
} from "../src/features/trip/emergency";
import { travelChecklistItems } from "../src/features/trip/checklist";
import {
  buildAllergenSentence,
  calculateOtoshi,
  buildRamenRequest,
} from "../src/features/trip/dining";
import {
  calculateSmartPayment,
  calculateWarikan,
  atmGuides,
  sizeChartData,
} from "../src/features/pay/cashUtilities";
import {
  comparePassVsSuica,
  calculateTaxiFare,
  transitPasses,
  shinkansenBaggageRules,
  subwayLineCodes,
} from "../src/features/trip/transit";
import { etiquetteGuides } from "../src/features/trip/etiquette";
import {
  applianceChecks,
  vjwSteps,
  esimTroubles,
} from "../src/features/trip/digitalUtilities";

describe("Exchange Rate Auto-Refresh & Utilities", () => {
  it("determines rate staleness based on max age", () => {
    const now = 1774600000000;
    expect(isRateStale(null, 6 * 3600000, now)).toBe(true);

    const freshRate: ExchangeRate = {
      krwPer100Jpy: 910,
      date: "2026-09-27",
      fetchedAt: now - 2 * 3600000, // 2 hours ago
      source: "Frankfurter",
    };
    expect(isRateStale(freshRate, 6 * 3600000, now)).toBe(false);

    const staleRate: ExchangeRate = {
      ...freshRate,
      fetchedAt: now - 7 * 3600000, // 7 hours ago
    };
    expect(isRateStale(staleRate, 6 * 3600000, now)).toBe(true);

    // Future timestamp due to clock skew
    const skewRate: ExchangeRate = {
      ...freshRate,
      fetchedAt: now + 60000,
    };
    expect(isRateStale(skewRate, 6 * 3600000, now)).toBe(true);
  });

  it("formats rate age relative to now", () => {
    const now = 1774600000000;
    expect(formatRateAge(now - 30000, now)).toBe("방금 전");
    expect(formatRateAge(now - 15 * 60000, now)).toBe("15분 전");
    expect(formatRateAge(now - 4 * 3600000, now)).toBe("4시간 전");
    expect(formatRateAge(now - 48 * 3600000, now)).toBe("2일 전");
  });

  it("calculates quick currency conversions for standard tiers", () => {
    const conversions = quickConversions(900); // 100엔당 900원
    expect(conversions).toHaveLength(8);
    expect(conversions[0]).toEqual({ jpy: 100, krw: 900 });
    expect(conversions[2]).toEqual({ jpy: 1000, krw: 9000 });
    expect(conversions[4]).toEqual({ jpy: 5000, krw: 45000 });
    expect(conversions[5]).toEqual({ jpy: 10000, krw: 90000 });

    expect(quickConversions(0)).toEqual([]);
    expect(quickConversions(-10)).toEqual([]);
  });
});

describe("Coupon Live D-Day & Validity Auto-Refresh", () => {
  const baseCoupon: Coupon = {
    id: "test-coupon",
    merchant: "테스트 매장",
    title: "10% 면세 + 5% 할인",
    benefit: "5% 추가 할인",
    audience: "visitor",
    category: "종합쇼핑",
    eligibility: "단기 체류 외국인",
    registrationRequired: false,
    minimumSpend: "5,000엔 이상",
    validity: "2026-10-15까지",
    checkedOn: "2026-09-20",
    stores: "전국 매장",
    steps: ["계산 시 여권 제시"],
    exclusions: ["일부 품목 제외"],
    stacking: "면세와 중복 가능",
    officialUrl: "https://japanportal.donki-global.com",
    keywords: ["쇼핑", "할인"],
  };

  it("identifies ongoing coupons without fixed end date", () => {
    const info = couponDDay(baseCoupon, Date.now());
    expect(info.status).toBe("ongoing");
    expect(info.label).toBe("상시 혜택");
  });

  it("computes accurate D-Day status and labels", () => {
    const now = Date.parse("2026-10-10T12:00:00+09:00");

    // 5 days remaining: ending soon
    const couponSoon: Coupon = { ...baseCoupon, expiresOn: "2026-10-15" };
    const soonInfo = couponDDay(couponSoon, now);
    expect(soonInfo.status).toBe("ending-soon");
    expect(soonInfo.daysRemaining).toBe(6);
    expect(soonInfo.label).toBe("마감 임박 (D-6)");

    // Same day: D-Day
    const couponToday: Coupon = { ...baseCoupon, expiresOn: "2026-10-10" };
    const todayInfo = couponDDay(couponToday, now);
    expect(todayInfo.status).toBe("ending-soon"); // <= 7 days

    // Past date: expired
    const couponExpired: Coupon = { ...baseCoupon, expiresOn: "2026-10-09" };
    const expiredInfo = couponDDay(couponExpired, now);
    expect(expiredInfo.status).toBe("expired");
    expect(expiredInfo.label).toBe("기간 만료");
  });

  it("filters out expired coupons when validOnly is enabled", () => {
    const now = Date.parse("2026-10-10T12:00:00+09:00");
    const activeCoupon: Coupon = {
      ...baseCoupon,
      id: "active",
      expiresOn: "2026-10-20",
    };
    const expiredCoupon: Coupon = {
      ...baseCoupon,
      id: "expired",
      expiresOn: "2026-10-05",
    };
    const ongoingCoupon: Coupon = { ...baseCoupon, id: "ongoing" };

    const list = [activeCoupon, expiredCoupon, ongoingCoupon];

    const all = filterCoupons(list, {
      query: "",
      audience: "all",
      category: "all",
      savedOnly: false,
      savedIds: [],
      validOnly: false,
      now,
    });
    expect(all).toHaveLength(3);

    const validOnly = filterCoupons(list, {
      query: "",
      audience: "all",
      category: "all",
      savedOnly: false,
      savedIds: [],
      validOnly: true,
      now,
    });
    expect(validOnly).toHaveLength(2);
    expect(validOnly.map((c) => c.id)).toEqual(["active", "ongoing"]);
  });
});

describe("Live Japan Standard Time Clock", () => {
  it("formats live time in JST (UTC+9)", () => {
    // 2026-09-27 00:30:00 UTC = 2026-09-27 09:30:00 JST (Sunday)
    const fixedUtc = Date.parse("2026-09-27T00:30:00.000Z");
    const formatted = formatLiveJapanTime(fixedUtc);
    expect(formatted.date).toBe("2026-09-27");
    expect(formatted.time).toBe("09:30:00");
    expect(formatted.dayOfWeek).toBe("일");
    expect(formatted.fullText).toBe("2026-09-27 (일) 09:30:00 JST");
  });
});

describe("Duty-Free & Korea Customs Allowance Tracker", () => {
  const sampleReceipt: DutyFreeReceipt = {
    id: "df-1",
    storeName: "돈키호테 긴자점",
    category: "consumable",
    jpyAmount: 8500,
    taxFreeApplied: true,
    createdAt: Date.now(),
  };

  it("validates duty-free receipt structure", () => {
    expect(validReceipt(sampleReceipt)).toBe(true);
    expect(validReceipt({ ...sampleReceipt, jpyAmount: -100 })).toBe(false);
    expect(validReceipt({ ...sampleReceipt, storeName: "" })).toBe(false);
    expect(validReceipt({ ...sampleReceipt, category: "invalid" as any })).toBe(
      false,
    );
  });

  it("analyzes customs allowance and separate limits accurately", () => {
    const receipts: DutyFreeReceipt[] = [
      {
        id: "df-1",
        storeName: "돈키호테",
        category: "consumable",
        jpyAmount: 10000,
        taxFreeApplied: true,
        createdAt: 1,
      },
      {
        id: "df-2",
        storeName: "빅카메라",
        category: "liquor",
        jpyAmount: 8000,
        quantity: 1,
        volumeMl: 700,
        taxFreeApplied: true,
        createdAt: 2,
      },
      {
        id: "df-3",
        storeName: "편의점",
        category: "general",
        jpyAmount: 3000,
        taxFreeApplied: false, // below 5000 JPY
        createdAt: 3,
      },
    ];

    const rate: ExchangeRate = {
      krwPer100Jpy: 900,
      date: "2026-09-27",
      fetchedAt: Date.now(),
      source: "Frankfurter",
    };

    const analysis = analyzeCustoms(receipts, rate);
    expect(analysis.totalJpy).toBe(21000);
    expect(analysis.totalKrw).toBe(189000); // 21000 * 9 = 189000
    expect(analysis.taxFreeTotalJpy).toBe(18000);
    expect(analysis.estimatedTaxSavedJpy).toBe(1800); // 10%

    // Within $800 limit
    expect(analysis.isOverLimit).toBe(false);
    expect(analysis.remainingUsd).toBeGreaterThan(0);

    // Liquor checks
    expect(analysis.liquorCount).toBe(1);
    expect(analysis.liquorVolumeMl).toBe(700);
    expect(analysis.isLiquorOver).toBe(false);

    // Over limit test
    const largeReceipts: DutyFreeReceipt[] = [
      {
        id: "df-large",
        storeName: "명품 매장",
        category: "general",
        jpyAmount: 150000, // ~1013 USD > $800
        taxFreeApplied: true,
        createdAt: 4,
      },
    ];
    const largeAnalysis = analyzeCustoms(largeReceipts, rate);
    expect(largeAnalysis.isOverLimit).toBe(true);
  });

  it("handles receipt state modifications and boundaries", () => {
    let state = initialState();
    expect(state.dutyFreeReceipts).toEqual([]);
    expect(state.autoRefreshRate).toBe(false);

    state = saveDutyFreeReceipt(state, sampleReceipt);
    expect(state.dutyFreeReceipts).toHaveLength(1);
    expect(state.dutyFreeReceipts[0].storeName).toBe("돈키호테 긴자점");

    // Update existing receipt
    const updatedReceipt = { ...sampleReceipt, jpyAmount: 12000 };
    state = saveDutyFreeReceipt(state, updatedReceipt);
    expect(state.dutyFreeReceipts).toHaveLength(1);
    expect(state.dutyFreeReceipts[0].jpyAmount).toBe(12000);

    // Delete receipt
    state = deleteDutyFreeReceipt(state, "df-1");
    expect(state.dutyFreeReceipts).toHaveLength(0);

    // Toggle auto refresh rate
    state = setAutoRefreshRate(state, true);
    expect(state.autoRefreshRate).toBe(true);
    state = setAutoRefreshRate(state, false);
    expect(state.autoRefreshRate).toBe(false);
  });

  it("preserves dutyFreeReceipts and autoRefreshRate across decodeState", () => {
    const raw = JSON.stringify({
      version: 1,
      onboarded: true,
      dutyFreeReceipts: [sampleReceipt],
      autoRefreshRate: false,
    });
    const decoded = decodeState(raw);
    expect(decoded.dutyFreeReceipts).toHaveLength(1);
    expect(decoded.dutyFreeReceipts[0].id).toBe("df-1");
    expect(decoded.autoRefreshRate).toBe(false);
  });

  it("keeps automatic rate requests off unless the user opted in", () => {
    const legacy = decodeState(JSON.stringify({ version: 1, onboarded: true }));
    expect(legacy.autoRefreshRate).toBe(false);
    const optedIn = decodeState(
      JSON.stringify({ version: 1, autoRefreshRate: true }),
    );
    expect(optedIn.autoRefreshRate).toBe(true);
    expect(
      decodeState(JSON.stringify({ version: 1, autoRefreshRate: "yes" }))
        .autoRefreshRate,
    ).toBe(false);
  });
});

describe("Emergency Directory & Travel Checklist Integrity", () => {
  it("includes all essential emergency numbers and consulates", () => {
    expect(emergencyContacts.length).toBeGreaterThanOrEqual(8);
    const police = emergencyContacts.find((c) => c.phone === "110");
    const ambulance = emergencyContacts.find((c) => c.phone === "119");
    const consult = emergencyContacts.find((c) => c.phone === "#7119");
    const mofa = emergencyContacts.find((c) => c.id === "mofa-call-center");

    expect(police).toBeDefined();
    expect(ambulance).toBeDefined();
    expect(consult).toBeDefined();
    expect(mofa).toBeDefined();
  });

  it("includes emergency phrase cards with Japanese text and readings", () => {
    expect(emergencyPhrases.length).toBeGreaterThanOrEqual(6);
    for (const phrase of emergencyPhrases) {
      expect(phrase.titleKo.length).toBeGreaterThan(0);
      expect(phrase.japanese.length).toBeGreaterThan(0);
      expect(phrase.reading.length).toBeGreaterThan(0);
    }
  });

  it("includes curated travel checklist items across all categories", () => {
    expect(travelChecklistItems.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(travelChecklistItems.map((i) => i.category));
    expect(categories.has("prep")).toBe(true);
    expect(categories.has("drugstore")).toBe(true);
    expect(categories.has("donki")).toBe(true);
    expect(categories.has("fashion")).toBe(true);
  });
});

describe("Dining & Gourmet Utilities", () => {
  it("generates allergen warning sentences correctly", () => {
    const empty = buildAllergenSentence([]);
    expect(empty.japanese).toContain("アレルギーはありません");

    const withShrimp = buildAllergenSentence([
      { id: "al-shrimp", nameKo: "새우", nameJa: "エビ", reading: "에비" },
    ]);
    expect(withShrimp.japanese).toContain("エビ");
    expect(withShrimp.reading).toContain("에비");
    expect(withShrimp.korean).toContain("새우");
  });

  it("calculates Otoshi table charge accurately", () => {
    const otoshi = calculateOtoshi(3, 400, 900);
    expect(otoshi.personCount).toBe(3);
    expect(otoshi.perPersonYen).toBe(400);
    expect(otoshi.totalYen).toBe(1200);
    expect(otoshi.totalKrw).toBe(10800);
  });

  it("builds custom ramen order phrases", () => {
    const req = buildRamenRequest({
      noodle: "katame",
      broth: "kotteri",
      garlic: "extra",
    });
    expect(req.japanese).toContain("麺硬め");
    expect(req.japanese).toContain("こってり");
    expect(req.japanese).toContain("ニンニクマシマシ");
  });
});

describe("Cash, Coin Minimizer & Warikan Utilities", () => {
  it("calculates smart coin payment to minimize change", () => {
    // 1234 JPY -> bill 2000 or bill 1000 + 240/250 etc.
    const result = calculateSmartPayment(1234);
    expect(result.totalToPay).toBe(1234);
    expect(result.changeReceived).toBeGreaterThanOrEqual(0);
    expect(result.tip.length).toBeGreaterThan(0);

    const exact = calculateSmartPayment(3000);
    expect(exact.changeReceived).toBe(0);
    expect(exact.tip).toContain("지폐로 딱 맞추어");
  });

  it("calculates Warikan (Dutch pay) per person and rounded tiers", () => {
    const warikan = calculateWarikan(8500, 3, 900);
    expect(warikan.totalYen).toBe(8500);
    expect(warikan.personCount).toBe(3);
    expect(warikan.exactPerPersonYen).toBeCloseTo(2833.3, 1);
    expect(warikan.roundedUp100Yen).toBe(2900);
    expect(warikan.roundedDown100Yen).toBe(2800);
    expect(warikan.surplusYen).toBe(2900 * 3 - 8500); // 8700 - 8500 = 200
  });

  it("verifies ATM guide and size conversion data completeness", () => {
    expect(atmGuides.length).toBeGreaterThanOrEqual(3);
    expect(atmGuides.some((g) => g.bank.includes("세븐뱅크"))).toBe(true);

    expect(sizeChartData.length).toBeGreaterThanOrEqual(10);
    const shoe = sizeChartData.find(
      (s) => s.category === "shoes" && s.kr === "270 mm",
    );
    expect(shoe?.jp).toBe("27.0 cm");
  });
});

describe("Transit Pass & Taxi Utilities", () => {
  it("compares transit pass vs Suica fares accurately", () => {
    const tokyo24 = transitPasses.find((p) => p.id === "tokyo-subway-24")!;
    expect(tokyo24.priceYen).toBe(1000);
    // 2 rides @ 220 = 440 JPY < 1,000 JPY -> Suica is cheaper
    const lowRides = comparePassVsSuica(tokyo24, 2, 220);
    expect(lowRides.recommendation).toBe("suica");
    expect(lowRides.savingYen).toBe(560);

    // 6 rides @ 220 = 1,320 JPY > 1,000 JPY -> Pass is cheaper
    const highRides = comparePassVsSuica(tokyo24, 6, 220);
    expect(highRides.recommendation).toBe("pass");
    expect(highRides.savingYen).toBe(320);
  });

  it("calculates taxi fares with base fare and night surcharge", () => {
    const dayTaxi = calculateTaxiFare(3.0, "tokyo", false, 900);
    expect(dayTaxi.distanceKm).toBe(3.0);
    expect(dayTaxi.nightSurchargeYen).toBe(0);
    expect(dayTaxi.estimatedFareYen).toBeGreaterThan(dayTaxi.baseFareYen);

    // Tokyo 2026-04-20 tariff: 500 yen for 1.0 km, then 100 yen per 232 m.
    // 2,000 m extra -> ceil(2000/232) = 9 steps -> 1,400 yen.
    expect(dayTaxi.estimatedFareYen).toBe(1400);
    expect(calculateTaxiFare(1.0, "tokyo", false).estimatedFareYen).toBe(500);
    // Osaka: 600 yen for 1.2 km, 100 yen per 231 m.
    expect(calculateTaxiFare(1.2, "osaka", false).estimatedFareYen).toBe(600);

    const nightTaxi = calculateTaxiFare(3.0, "tokyo", true, 900);
    expect(nightTaxi.estimatedFareYen).toBe(1680);
    expect(nightTaxi.nightSurchargeYen).toBeGreaterThan(0);
    expect(nightTaxi.estimatedFareYen).toBeGreaterThan(
      dayTaxi.estimatedFareYen,
    );
  });

  it("verifies Shinkansen baggage rules and subway line data", () => {
    expect(shinkansenBaggageRules.length).toBe(3);
    const oversized = shinkansenBaggageRules.find((r) => r.reservationRequired);
    expect(oversized?.penaltyFeeYen).toBe(1000);

    expect(subwayLineCodes.length).toBeGreaterThanOrEqual(10);
    expect(subwayLineCodes.some((l) => l.code === "JY")).toBe(true);
    expect(subwayLineCodes.some((l) => l.code === "G")).toBe(true);
  });
});

describe("Culture, Etiquette & Digital Utilities", () => {
  it("verifies etiquette guides coverage", () => {
    expect(etiquetteGuides.length).toBe(4);
    for (const g of etiquetteGuides) {
      expect(g.dos.length).toBeGreaterThan(0);
      expect(g.donts.length).toBeGreaterThan(0);
    }
  });

  it("verifies appliance voltage warnings and digital troubleshooting", () => {
    expect(applianceChecks.length).toBeGreaterThanOrEqual(3);
    const dryer = applianceChecks.find((a) => a.name.includes("헤어드라이기"));
    expect(dryer?.voltageType).toBe("danger");

    expect(vjwSteps.length).toBe(4);
    expect(esimTroubles.length).toBeGreaterThanOrEqual(2);
  });
});
