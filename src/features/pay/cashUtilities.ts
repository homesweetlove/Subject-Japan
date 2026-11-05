export interface CoinPocket {
  yen500: number;
  yen100: number;
  yen50: number;
  yen10: number;
  yen5: number;
  yen1: number;
}

export const COIN_VALUES = [500, 100, 50, 10, 5, 1] as const;

export interface CoinMinimizerResult {
  totalToPay: number;
  payBills: number; // e.g. 1000, 2000, 5000, 10000
  payCoins: { value: number; count: number }[];
  changeReceived: number;
  changeCoinCount: number;
  tip: string;
}

/**
 * Given a price (e.g. 1,234 yen), calculates the smartest amount to hand the cashier
 * to get the fewest coins back.
 * Example: 1,234 JPY -> Pay 1,234 exact (0 change) or 1,235 JPY (get 1 yen coin)
 * or 1,250 JPY (get 16 yen back: 10 + 5 + 1) or 1,000 bill + 234 coins!
 */
export function calculateSmartPayment(
  price: number,
  userCoins?: Partial<CoinPocket>,
): CoinMinimizerResult {
  const p = Math.max(1, Math.min(1000000, Math.floor(price || 0)));

  // Lowest bill that covers the price
  const next1000 = Math.ceil(p / 1000) * 1000;
  const remainder = p % 1000;

  if (remainder === 0) {
    return {
      totalToPay: p,
      payBills: p,
      payCoins: [],
      changeReceived: 0,
      changeCoinCount: 0,
      tip: "지폐로 딱 맞추어 지불할 수 있어요.",
    };
  }

  // Smart trick: e.g. 730 yen -> pay 1,030 yen (get 300 yen back in 100-yen coins, no 10-yen coins)
  // or 1,234 yen -> pay 1,250 yen (get 16 yen back) or pay 1,234 exact
  const lastDigit = p % 10;
  const lastTwoDigits = p % 100;

  let suggestedPay = next1000;
  let tip = "";

  if (lastDigit !== 0) {
    // Pay with 1~4 or 5~9 coins to round up change to 5 or 10
    const roundedUp10 = Math.ceil(p / 10) * 10;
    const diffToRound = roundedUp10 - p;
    suggestedPay = next1000 + (10 - diffToRound);
    tip = `동전 ${10 - diffToRound}엔을 지폐와 함께 내면 10엔 단위 깔끔한 거스름돈을 받아요.`;
  } else if (lastTwoDigits !== 0) {
    const roundedUp50 = Math.ceil(p / 50) * 50;
    suggestedPay = next1000 + (roundedUp50 - p);
    tip = `잔돈을 맞춰 내면 동전 개수를 최소화할 수 있어요.`;
  } else {
    suggestedPay = next1000;
    tip = `${next1000.toLocaleString()}엔 지폐를 내면 거스름돈을 받습니다.`;
  }

  const change = Math.max(0, suggestedPay - p);
  let remainingChange = change;
  let changeCoinCount = 0;
  for (const cv of COIN_VALUES) {
    const count = Math.floor(remainingChange / cv);
    changeCoinCount += count;
    remainingChange %= cv;
  }

  return {
    totalToPay: p,
    payBills: next1000,
    payCoins:
      suggestedPay > next1000
        ? [{ value: suggestedPay - next1000, count: 1 }]
        : [],
    changeReceived: change,
    changeCoinCount,
    tip,
  };
}

export interface WarikanResult {
  totalYen: number;
  personCount: number;
  exactPerPersonYen: number;
  exactPerPersonKrw: number;
  roundedUp100Yen: number;
  roundedDown100Yen: number;
  surplusYen: number;
}

export function calculateWarikan(
  totalYen: number,
  personCount: number,
  krwPer100Jpy = 900,
): WarikanResult {
  const total = Math.max(1, Math.min(10000000, Math.floor(totalYen || 0)));
  const count = Math.max(1, Math.min(100, Math.floor(personCount || 1)));

  const exact = total / count;
  const exactKrw = Math.round((exact * krwPer100Jpy) / 100);
  const roundedUp100 = Math.ceil(exact / 100) * 100;
  const roundedDown100 = Math.floor(exact / 100) * 100;
  const surplus = roundedUp100 * count - total;

  return {
    totalYen: total,
    personCount: count,
    exactPerPersonYen: Math.round(exact * 10) / 10,
    exactPerPersonKrw: exactKrw,
    roundedUp100Yen: roundedUp100,
    roundedDown100Yen: roundedDown100,
    surplusYen: surplus,
  };
}

export interface AtmGuide {
  bank: string;
  location: string;
  feeInfo: string;
  cardTips: string;
}

/** Card and ATM fee facts re-checked on this date. Card terms change often. */
export const ATM_CHECKED_ON = "2026-11-05";

export const atmGuides: AtmGuide[] = [
  {
    bank: "세븐뱅크 (Seven Bank)",
    location: "전국 세븐일레븐 편의점 및 공항·역",
    feeInfo:
      "트래블로그(하나)는 세븐뱅크 출금 수수료 면제 대상. 단, 일본 기계 이용료(약 110엔)가 화면에 뜨면 그대로 붙을 수 있어요.",
    cardTips:
      "한국어 화면 지원, 대부분 24시간. '출금' → 계좌 종류는 보통 '예금(Savings)'이나 '당좌(Checking)' 중 카드에 맞는 쪽 선택",
  },
  {
    bank: "이온뱅크 (AEON Bank)",
    location: "이온몰·미니스톱 일부 편의점",
    feeInfo:
      "트래블월렛은 이온뱅크 기계 출금이 수수료 면제 대상(세븐뱅크가 아님에 주의).",
    cardTips: "분홍색 AEON Bank 표시 확인. 기계마다 이용 시간이 달라 밤에는 꺼져 있을 수 있음",
  },
  {
    bank: "로손 은행 (Lawson Bank)",
    location: "로손(LAWSON) 편의점",
    feeInfo: "카드에 따라 110엔~220엔의 기계 이용료가 붙을 수 있음",
    cardTips: "세븐일레븐이나 이온뱅크 기계가 근처에 없을 때 비상용으로 활용",
  },
  {
    bank: "유초은행 (우체국 ATM)",
    location: "전국 우체국",
    feeInfo:
      "해외 카드 출금 가능하지만 우체국 영업시간 밖에는 기계가 닫혀 있을 수 있음",
    cardTips: "초록색 우체국 기계. 비자·마스터 국제 현금카드 출금 가능",
  },
];

/** Things to check on Korean travel cards before relying on one. */
export const travelCardNotes: string[] = [
  "토스뱅크 외화통장 체크카드는 2026년 7월부터 해외 출금이 한 달 5회를 넘으면 수수료가 붙어요. 한 번에 넉넉히 뽑으세요.",
  "카드 혜택(면제 기계, 횟수, 한도)은 자주 바뀌니 출국 전 카드 앱 공지를 꼭 확인하세요.",
  "출금 화면에서 '원화로 결제(원화 환산)'를 고르면 환율이 나빠져요. 반드시 엔화로 진행하세요.",
];

export interface SizeChartEntry {
  category: "shoes" | "women-clothing" | "men-clothing";
  kr: string;
  jp: string;
  us: string;
  eu: string;
}

export const sizeChartData: SizeChartEntry[] = [
  // Shoes (mm vs cm vs US vs EU)
  {
    category: "shoes",
    kr: "230 mm",
    jp: "23.0 cm",
    us: "US 6 (W)",
    eu: "EU 36",
  },
  {
    category: "shoes",
    kr: "240 mm",
    jp: "24.0 cm",
    us: "US 7 (W)",
    eu: "EU 38",
  },
  {
    category: "shoes",
    kr: "250 mm",
    jp: "25.0 cm",
    us: "US 7 (M)",
    eu: "EU 40",
  },
  {
    category: "shoes",
    kr: "260 mm",
    jp: "26.0 cm",
    us: "US 8 (M)",
    eu: "EU 41",
  },
  {
    category: "shoes",
    kr: "270 mm",
    jp: "27.0 cm",
    us: "US 9 (M)",
    eu: "EU 42.5",
  },
  {
    category: "shoes",
    kr: "280 mm",
    jp: "28.0 cm",
    us: "US 10 (M)",
    eu: "EU 44",
  },

  // Women clothing
  {
    category: "women-clothing",
    kr: "44 (XS)",
    jp: "7호 (S)",
    us: "0-2",
    eu: "32-34",
  },
  {
    category: "women-clothing",
    kr: "55 (S)",
    jp: "9호 (M)",
    us: "4-6",
    eu: "36-38",
  },
  {
    category: "women-clothing",
    kr: "66 (M)",
    jp: "11호 (L)",
    us: "8-10",
    eu: "40-42",
  },
  {
    category: "women-clothing",
    kr: "77 (L)",
    jp: "13호 (XL)",
    us: "12-14",
    eu: "44",
  },

  // Men clothing
  { category: "men-clothing", kr: "90 (S)", jp: "S / 1호", us: "36", eu: "46" },
  { category: "men-clothing", kr: "95 (M)", jp: "M / 2호", us: "38", eu: "48" },
  {
    category: "men-clothing",
    kr: "100 (L)",
    jp: "L / 3호",
    us: "40",
    eu: "50",
  },
  {
    category: "men-clothing",
    kr: "105 (XL)",
    jp: "LL / 4호",
    us: "42",
    eu: "52",
  },
  {
    category: "men-clothing",
    kr: "110 (XXL)",
    jp: "3L / 5호",
    us: "44",
    eu: "54",
  },
];
