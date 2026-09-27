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

export const atmGuides: AtmGuide[] = [
  {
    bank: "세븐뱅크 (Seven Bank)",
    location: "전국 세븐일레븐 편의점 및 공항·역사",
    feeInfo:
      "트래블로그·트래블월렛·토스 체크카드 이용 시 출금 수수료 무료 (기기 기본 출금)",
    cardTips:
      "한국어 화면 완벽 지원. 화면에서 '출금(Withdrawal)' 선택 후 '신용카드/Checking' 선택",
  },
  {
    bank: "이온뱅크 (AEON Bank)",
    location: "미니스톱 편의점 및 이온몰",
    feeInfo: "트래블로그(마스터) 및 주요 해외 트래블카드 출금 수수료 무료",
    cardTips: "핑크색 AEON Bank 마크 확인. 주말·야간에도 수수료 무료 지원",
  },
  {
    bank: "로손 은행 (Lawson Bank)",
    location: "로손(LAWSON) 편의점",
    feeInfo: "카드사별로 110엔~220엔의 기기 이용 수수료가 부과될 수 있음",
    cardTips: "세븐일레븐이나 미니스톱이 주변에 없을 때 비상용으로 활용 권장",
  },
  {
    bank: "JP Post (우초은행)",
    location: "전국 우체국 및 패밀리마트 일부",
    feeInfo:
      "해외 카드 이용 가능하나 영업시간(09:00~17:00) 외에는 닫힐 수 있음",
    cardTips: "녹색 우체국 ATM. 비자/마스터카드 국제현금카드 출금 가능",
  },
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
