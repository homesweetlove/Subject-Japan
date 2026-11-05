export interface TransitPassOption {
  id: string;
  name: string;
  city: "tokyo" | "osaka" | "fukuoka" | "nationwide";
  priceYen: number;
  durationLabel: string;
  breakEvenRides: number;
  description: string;
  notes: string;
}

/** Prices re-checked against operator pages on this date. */
export const TRANSIT_CHECKED_ON = "2026-11-05";

export const transitPasses: TransitPassOption[] = [
  {
    id: "tokyo-subway-24",
    name: "도쿄 서브웨이 티켓 (24시간권)",
    city: "tokyo",
    priceYen: 1000,
    durationLabel: "첫 개찰 후 24시간",
    breakEvenRides: 5,
    description: "도쿄 메트로 9개 노선 + 도에이 지하철 4개 노선 무제한 탑승",
    notes:
      "JR선·유리카모메는 이용 불가. 하루 지하철 5회 이상 타면 본전 (어린이 500엔)",
  },
  {
    id: "tokyo-subway-48",
    name: "도쿄 서브웨이 티켓 (48시간권)",
    city: "tokyo",
    priceYen: 1500,
    durationLabel: "첫 개찰 후 48시간",
    breakEvenRides: 7,
    description: "도쿄 메트로 + 도에이 지하철 48시간 무제한",
    notes: "하루 750엔 꼴(지하철 3~4회 상당)",
  },
  {
    id: "tokyo-subway-72",
    name: "도쿄 서브웨이 티켓 (72시간권)",
    city: "tokyo",
    priceYen: 2000,
    durationLabel: "첫 개찰 후 72시간",
    breakEvenRides: 10,
    description: "도쿄 메트로 + 도에이 지하철 72시간 무제한",
    notes: "하루 약 670엔 꼴로 하루 단가가 가장 낮은 패스",
  },
  {
    id: "osaka-amazing-1day",
    name: "오사카 주유패스 (1일권)",
    city: "osaka",
    priceYen: 3500,
    durationLabel: "이용일 당일 (첫차~막차)",
    breakEvenRides: 5,
    description:
      "오사카 메트로·시내버스·사철 일부 무제한 + 우메다 공중정원 등 관광지 약 40곳 무료 입장",
    notes:
      "2026년부터 스마트폰 QR 전용(카드 결제, 어른만). 2일권 5,000엔. 무료 관광지 2곳 이상 가야 이득",
  },
  {
    id: "osaka-metro-1day",
    name: "오사카 메트로 1일 승차권 (엔조이 에코 카드)",
    city: "osaka",
    priceYen: 820,
    durationLabel: "당일 유효 (주말/공휴일은 620엔)",
    breakEvenRides: 4,
    description: "오사카 메트로 전 노선 및 시내버스 무제한 (유메시마역 제외)",
    notes: "주말에는 620엔으로 할인되어 3회만 타도 본전",
  },
  {
    id: "fukuoka-subway-1day",
    name: "후쿠오카 지하철 1일권",
    city: "fukuoka",
    priceYen: 640,
    durationLabel: "구입 당일",
    breakEvenRides: 3,
    description: "후쿠오카 공항선, 하코자키선, 나나쿠마선 무제한",
    notes:
      "표를 안 사도 신용카드 터치로 타면 하루 640엔까지만 빠져나가요. 관광지 할인을 받을 때만 1일권 구입",
  },
];

export function comparePassVsSuica(
  pass: TransitPassOption,
  estimatedRides: number,
  avgFarePerRideYen = 220,
): {
  passPrice: number;
  suicaTotal: number;
  difference: number;
  recommendation: "pass" | "suica" | "equal";
  savingYen: number;
} {
  const suicaTotal = Math.max(0, estimatedRides * avgFarePerRideYen);
  const diff = pass.priceYen - suicaTotal;

  if (diff < 0) {
    return {
      passPrice: pass.priceYen,
      suicaTotal,
      difference: diff,
      recommendation: "pass",
      savingYen: Math.abs(diff),
    };
  } else if (diff > 0) {
    return {
      passPrice: pass.priceYen,
      suicaTotal,
      difference: diff,
      recommendation: "suica",
      savingYen: diff,
    };
  }
  return {
    passPrice: pass.priceYen,
    suicaTotal,
    difference: 0,
    recommendation: "equal",
    savingYen: 0,
  };
}

export interface ShinkansenBaggageRule {
  dimensionRange: string;
  reservationRequired: boolean;
  penaltyFeeYen: number;
  guide: string;
}

export const shinkansenBaggageRules: ShinkansenBaggageRule[] = [
  {
    dimensionRange: "세 변의 합 160cm 이하 (일반 캐리어 24~26인치 이하)",
    reservationRequired: false,
    penaltyFeeYen: 0,
    guide: "좌석 위 선반에 수납 가능하며 사전 예약 없이 무료 반입 가능합니다.",
  },
  {
    dimensionRange:
      "세 변의 합 160cm 초과 ~ 250cm 이하 (특대하물 / 28~32인치 캐리어)",
    reservationRequired: true,
    penaltyFeeYen: 1000,
    guide:
      "도카이도·산요·규슈·니시규슈 신칸센은 '특대 짐 공간이 딸린 좌석'을 지정석으로 미리 예약해야 합니다(추가 요금 없음, 1인 2개·30kg까지). 예약 없이 들고 타면 차내에서 1,000엔을 내고 승무원이 정한 곳으로 옮겨야 해요.",
  },
  {
    dimensionRange: "세 변의 합 250cm 초과",
    reservationRequired: false,
    penaltyFeeYen: 0,
    guide: "열차 내 반입 불가 품목입니다 (택배 배송 이용 필요).",
  },
];

export interface SubwayLineCode {
  city: "tokyo" | "osaka";
  code: string;
  nameKo: string;
  nameJa: string;
  colorHex: string;
  keyStops: string;
}

export const subwayLineCodes: SubwayLineCode[] = [
  // Tokyo
  {
    city: "tokyo",
    code: "JY",
    nameKo: "JR 야마노테선",
    nameJa: "山手線",
    colorHex: "#9ACD32",
    keyStops: "신주쿠·시부야·도쿄·우에노 순환",
  },
  {
    city: "tokyo",
    code: "G",
    nameKo: "도쿄메트로 긴자선",
    nameJa: "銀座線",
    colorHex: "#FF9500",
    keyStops: "아사쿠사·우에노·긴자·시부야",
  },
  {
    city: "tokyo",
    code: "M",
    nameKo: "도쿄메트로 마루노우치선",
    nameJa: "丸ノ内線",
    colorHex: "#E60012",
    keyStops: "이케부쿠로·도쿄·긴자·신주쿠",
  },
  {
    city: "tokyo",
    code: "H",
    nameKo: "도쿄메트로 히비야선",
    nameJa: "日比谷線",
    colorHex: "#B5B5AC",
    keyStops: "우에노·아키하바라·긴자·롯폰기",
  },
  {
    city: "tokyo",
    code: "C",
    nameKo: "도쿄메트로 치요다선",
    nameJa: "千代田線",
    colorHex: "#00BB85",
    keyStops: "하라주쿠(메이지진구마에)·오모테산도",
  },
  {
    city: "tokyo",
    code: "Z",
    nameKo: "도쿄메트로 한조몬선",
    nameJa: "半蔵門線",
    colorHex: "#8F76D6",
    keyStops: "시부야·오모테산도·오시아게(스카이트리)",
  },
  {
    city: "tokyo",
    code: "E",
    nameKo: "도에이 오에도선",
    nameJa: "大江戸線",
    colorHex: "#B6007A",
    keyStops: "신주쿠·롯폰기·츠키지시장",
  },
  {
    city: "tokyo",
    code: "A",
    nameKo: "도에이 아사쿠사선",
    nameJa: "浅草線",
    colorHex: "#E85298",
    keyStops: "하네다/나리타 직결·아사쿠사·긴자",
  },

  // Osaka
  {
    city: "osaka",
    code: "M",
    nameKo: "오사카메트로 미도스지선",
    nameJa: "御堂筋線",
    colorHex: "#E5171F",
    keyStops: "신오사카·우메다·신사이바시·난바·텐노지",
  },
  {
    city: "osaka",
    code: "T",
    nameKo: "오사카메트로 다니마치선",
    nameJa: "谷町線",
    colorHex: "#522886",
    keyStops: "히가시우메다·덴마바시·텐노지",
  },
  {
    city: "osaka",
    code: "Y",
    nameKo: "오사카메트로 요츠바시선",
    nameJa: "四つ橋線",
    colorHex: "#0078BA",
    keyStops: "니시우메다·난바·스미노에코엔",
  },
  {
    city: "osaka",
    code: "C",
    nameKo: "오사카메트로 주오선",
    nameJa: "中央線",
    colorHex: "#009944",
    keyStops: "오사카항(가이유칸)·모리노미야(오사카성)",
  },
  {
    city: "osaka",
    code: "S",
    nameKo: "오사카메트로 세니치마에선",
    nameJa: "千日前線",
    colorHex: "#E44D93",
    keyStops: "난바·닛폰바시(덴덴타운)·츠루하시",
  },
];

export interface TaxiEstimate {
  distanceKm: number;
  baseFareYen: number;
  estimatedFareYen: number;
  nightSurchargeYen: number;
  estimatedKrw: number;
}

/**
 * Upper-limit meter fares for a standard taxi (普通車).
 * Tokyo 23 wards: revised 2026-04-20. Osaka city: revised 2025-11-05.
 * Fukuoka city: revised 2023-08-01.
 */
export const taxiTariffs = {
  tokyo: {
    baseYen: 500,
    baseKm: 1.0,
    stepYen: 100,
    stepM: 232,
    since: "2026-04-20",
  },
  osaka: {
    baseYen: 600,
    baseKm: 1.2,
    stepYen: 100,
    stepM: 231,
    since: "2025-11-05",
  },
  fukuoka: {
    baseYen: 670,
    baseKm: 1.064,
    stepYen: 80,
    stepM: 268,
    since: "2023-08-01",
  },
} as const;

export function calculateTaxiFare(
  distanceKm: number,
  city: "tokyo" | "osaka" | "fukuoka" = "tokyo",
  isNight = false,
  krwPer100Jpy = 900,
): TaxiEstimate {
  const km = Math.max(0.5, Math.min(200, distanceKm || 1));
  const t = taxiTariffs[city];
  const extraM = Math.max(0, km - t.baseKm) * 1000;
  // The meter adds one step as each step distance begins.
  const steps = extraM > 0 ? Math.ceil(extraM / t.stepM) : 0;
  let fare = t.baseYen + steps * t.stepYen;

  let nightSurcharge = 0;
  if (isNight) {
    // 22:00–05:00 surcharge is 20%, applied to the meter.
    nightSurcharge = Math.round(fare * 0.2);
    fare += nightSurcharge;
  }

  const estimatedKrw = Math.round((fare * krwPer100Jpy) / 100);

  return {
    distanceKm: km,
    baseFareYen: t.baseYen,
    estimatedFareYen: fare,
    nightSurchargeYen: nightSurcharge,
    estimatedKrw,
  };
}
