import { describe, expect, it } from "vitest";
import { initialState } from "../src/domain/models";
import {
  analyzeCustoms,
  estimateKoreaTax,
  type DutyFreeReceipt,
} from "../src/features/pay/taxFreeTracker";
import {
  summarizeExpenses,
  toKrw,
  validExpense,
  type Expense,
} from "../src/features/pay/expenses";
import { japanHoliday, holidaysKnownFor } from "../src/features/today/holidays";
import {
  departureTime,
  validDeparture,
} from "../src/features/trip/departure";
import {
  googleDirectionsUrl,
  railInfoLinks,
  taxiPhrase,
  uberUrl,
} from "../src/features/trip/routes";
import {
  intensityLabel,
  notableQuake,
  parseQuakes,
} from "../src/features/today/quakes";
import { planNotifications } from "../src/features/today/model";
import { decodeState, deleteExpense, saveExpense } from "../src/storage/state";
import { encodeBackup, parseBackup } from "../src/storage/backup";
import { validTravelLink } from "../src/features/guides/linkPolicy";

const at = (iso: string) => Date.parse(`${iso}+09:00`);

describe("Korea entry: liquor rule and tax estimate", () => {
  const rate = {
    krwPer100Jpy: 900,
    date: "2026-11-05",
    fetchedAt: 1,
    source: "Frankfurter" as const,
    usdPerJpy: 1 / 150,
    usdDate: "2026-11-05",
  };
  const liquor = (id: string, ml: number, jpy: number): DutyFreeReceipt => ({
    id,
    storeName: "면세점",
    category: "liquor",
    jpyAmount: jpy,
    quantity: 1,
    volumeMl: ml,
    taxFreeApplied: true,
    createdAt: 1,
  });

  it("no longer limits the number of bottles, only 2 L and $400", () => {
    const three = analyzeCustoms(
      [liquor("a", 750, 9000), liquor("b", 750, 9000), liquor("c", 500, 6000)],
      rate,
    );
    expect(three.liquorCount).toBe(3);
    expect(three.isLiquorOver).toBe(false);
    const tooMuch = analyzeCustoms(
      [liquor("a", 1000, 9000), liquor("b", 1100, 9000)],
      rate,
    );
    expect(tooMuch.isLiquorOver).toBe(true);
  });

  it("estimates tax on the excess with the self-declaration discount", () => {
    // $1,000 of goods: $200 over; 1 USD = 9/ (1/150) = 1,350 won.
    const est = estimateKoreaTax({ totalUsd: 1000, usdIsEstimate: false }, rate)!;
    expect(est.krwPerUsd).toBe(1350);
    expect(est.excessUsd).toBe(200);
    expect(est.taxKrw).toBe(54000);
    expect(est.discountKrw).toBe(16200);
    expect(est.selfDeclaredKrw).toBe(37800);
    expect(est.undeclaredKrw).toBe(75600);
    // The discount stops at 200,000 won.
    const big = estimateKoreaTax({ totalUsd: 6000, usdIsEstimate: false }, rate)!;
    expect(big.discountKrw).toBe(200000);
    expect(estimateKoreaTax({ totalUsd: 700, usdIsEstimate: false }, rate)!.taxKrw).toBe(0);
    // No estimate without a fetched dollar rate.
    expect(
      estimateKoreaTax(
        { totalUsd: 1000, usdIsEstimate: true },
        { ...rate, usdPerJpy: undefined, usdDate: undefined },
      ),
    ).toBeNull();
  });
});

describe("spending log", () => {
  const e = (id: string, jpy: number, iso: string, extra: Partial<Expense> = {}): Expense => ({
    id,
    jpy,
    category: "food",
    method: "cash",
    memo: "",
    createdAt: at(iso),
    ...extra,
  });

  it("sums by Japan day, category and payment method", () => {
    const list = [
      e("a", 1200, "2026-11-20T08:00:00"),
      e("b", 3000, "2026-11-20T23:30:00", { category: "shopping", method: "card" }),
      e("c", 500, "2026-11-21T00:10:00", { category: "transport" }),
    ];
    const s = summarizeExpenses(list, at("2026-11-21T09:00:00"));
    expect(s.totalJpy).toBe(4700);
    expect(s.todayJpy).toBe(500);
    expect(s.cashJpy).toBe(1700);
    expect(s.cardJpy).toBe(3000);
    expect(s.days.map((d) => [d.day, d.jpy])).toEqual([
      ["2026-11-21", 500],
      ["2026-11-20", 4200],
    ]);
    expect(s.byCategory[0]).toEqual({ key: "shopping", label: "쇼핑", jpy: 3000 });
    expect(toKrw(1000, 900)).toBe(9000);
    expect(toKrw(1000, undefined)).toBeNull();
  });

  it("validates, saves, edits and deletes entries", () => {
    expect(validExpense(e("a", 0, "2026-11-20T08:00:00"))).toBe(false);
    expect(validExpense({ ...e("a", 100, "2026-11-20T08:00:00"), memo: "x".repeat(61) })).toBe(false);
    let state = saveExpense(initialState(), e("a", 100, "2026-11-20T08:00:00"));
    state = saveExpense(state, e("b", 200, "2026-11-20T09:00:00"));
    expect(state.expenses.map((x) => x.id)).toEqual(["b", "a"]);
    state = saveExpense(state, e("a", 150, "2026-11-20T08:00:00"));
    expect(state.expenses.find((x) => x.id === "a")!.jpy).toBe(150);
    state = deleteExpense(state, "b");
    expect(state.expenses).toHaveLength(1);
  });
});

describe("departure, holidays and stored state", () => {
  it("validates the flight home in Japan time", () => {
    const d = { date: "2026-11-23", time: "14:30", airportId: "kix" as const };
    expect(validDeparture(d)).toBe(true);
    expect(departureTime(d)).toBe(at("2026-11-23T14:30:00"));
    expect(validDeparture({ ...d, time: "25:00" })).toBe(false);
    expect(validDeparture({ ...d, airportId: "icn" })).toBe(false);
  });

  it("knows the Japanese holidays of 2026 and 2027", () => {
    expect(japanHoliday("2026-11-23")).toContain("근로감사");
    expect(japanHoliday("2026-09-22")).toContain("국민의 휴일");
    expect(japanHoliday("2027-03-22")).toContain("대체 휴일");
    expect(japanHoliday("2026-11-24")).toBeNull();
    expect(holidaysKnownFor("2028-01-01")).toBe(false);
  });

  it("keeps expenses and departure through decode and backup", () => {
    const state = {
      ...initialState(),
      onboarded: true,
      expenses: [
        {
          id: "x",
          jpy: 980,
          category: "food" as const,
          method: "card" as const,
          memo: "라멘",
          createdAt: 5,
        },
      ],
      departure: { date: "2026-11-23", time: "14:30", airportId: "kix" as const },
    };
    const decoded = decodeState(JSON.stringify(state));
    expect(decoded.expenses).toEqual(state.expenses);
    expect(decoded.departure).toEqual(state.departure);
    expect(parseBackup(encodeBackup(state)).expenses).toHaveLength(1);
    // Older saves without the fields still load.
    const old = decodeState(JSON.stringify({ ...initialState(), expenses: undefined, departure: undefined }));
    expect(old.expenses).toEqual([]);
    expect(old.departure).toBeNull();
  });
});

describe("routes, taxi and rail info", () => {
  it("builds hand-off links with only the typed destination", () => {
    const url = googleDirectionsUrl(" 大阪城 ", "transit");
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=%E5%A4%A7%E9%98%AA%E5%9F%8E&travelmode=transit",
    );
    const uber = uberUrl("なんば駅");
    expect(uber.startsWith("https://m.uber.com/ul/?action=setPickup&pickup=my_location")).toBe(true);
    expect(uber).toContain("dropoff%5Bformatted_address%5D=%E3%81%AA%E3%82%93%E3%81%B0%E9%A7%85");
    expect(taxiPhrase.japanese("梅田駅")).toBe("梅田駅までお願いします。");
    for (const link of railInfoLinks) expect(validTravelLink(link.url)).toBe(true);
  });
});

describe("earthquakes from the JMA feed", () => {
  const now = at("2026-11-20T12:00:00");
  const feed = [
    { eid: "1", at: "2026-11-20T10:00:00+09:00", anm: "大阪府北部", mag: "4.1", maxi: "3" },
    { eid: "1", at: "2026-11-20T10:00:00+09:00", anm: "大阪府北部", mag: "4.1", maxi: "3" },
    { eid: "2", at: "2026-11-20T11:00:00+09:00", anm: "千葉県東方沖", mag: "5.0", maxi: "5-" },
    { eid: "3", at: "2026-11-20T11:30:00+09:00", anm: "トンガ諸島", mag: "6.8" },
    { eid: "4", at: "2026-11-18T09:00:00+09:00", anm: "石川県能登地方", mag: "M不明", maxi: "6+" },
    "junk",
  ];

  it("keeps one entry per domestic quake, newest first", () => {
    const list = parseQuakes(feed);
    expect(list.map((q) => q.place)).toEqual(["千葉県東方沖", "大阪府北部", "石川県能登地方"]);
    expect(list[2].magnitude).toBeNull();
    expect(parseQuakes({ not: "a list" })).toEqual([]);
  });

  it("picks the strongest intensity 3+ quake of the last 24 hours", () => {
    const q = notableQuake(parseQuakes(feed), now);
    expect(q?.place).toBe("千葉県東方沖");
    expect(intensityLabel(q!.intensity)).toBe("5약");
    expect(intensityLabel("6+")).toBe("6강");
    expect(notableQuake(parseQuakes(feed), at("2026-11-22T12:00:00"))).toBeNull();
  });
});

describe("departure reminders", () => {
  const base = {
    tripItems: [],
    airportReminders: [],
    settings: { enabled: true, tripLeadMinutes: 60 as const },
  };
  const dep = {
    at: at("2026-11-23T14:30:00"),
    airport: "간사이",
    arriveAt: at("2026-11-23T11:20:00"),
  };

  it("reminds the evening before and an hour before airport arrival", () => {
    const plan = planNotifications(
      { ...base, departure: dep, waitingReceipts: 2 },
      at("2026-11-20T12:00:00"),
    );
    expect(plan.map((p) => [p.key, p.at, p.target])).toEqual([
      ["departure:eve", at("2026-11-22T20:00:00"), "taxfree"],
      ["departure:go", at("2026-11-23T10:20:00"), "taxfree"],
    ]);
    // Lock-screen text never includes receipts' shops or amounts.
    expect(plan[0].body).toContain("2장");
    const none = planNotifications(
      { ...base, departure: dep, waitingReceipts: 0 },
      at("2026-11-20T12:00:00"),
    );
    expect(none.every((p) => p.target === "itinerary")).toBe(true);
    expect(
      planNotifications({ ...base, departure: dep }, at("2026-11-23T10:30:00")),
    ).toEqual([]);
  });
});
