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

export const transitPasses: TransitPassOption[] = [
  {
    id: "tokyo-subway-24",
    name: "도쿄 서브웨이 티켓 (24시간권)",
    city: "tokyo",
    priceYen: 800,
    durationLabel: "첫 개찰 후 24시간",
    breakEvenRides: 4,
    description: "도쿄 메트로 9개 노선 + 도에이 지하철 4개 노선 무제한 탑승",
    notes: "JR선은 이용 불가. 하루에 지하철 4회 이상 탑승 시 본전 달성",
  },
  {
    id: "tokyo-subway-48",
    name: "도쿄 서브웨이 티켓 (48시간권)",
    city: "tokyo",
    priceYen: 1200,
    durationLabel: "첫 개찰 후 48시간",
    breakEvenRides: 6,
    description: "도쿄 메트로 + 도에이 지하철 48시간 무제한",
    notes: "하루 600엔 꼴(지하철 3회 상당)로 가성비가 가장 높은 패스",
  },
  {
    id: "tokyo-subway-72",
    name: "도쿄 서브웨이 티켓 (72시간권)",
    city: "tokyo",
    priceYen: 1500,
    durationLabel: "첫 개찰 후 72시간",
    breakEvenRides: 8,
    description: "도쿄 메트로 + 도에이 지하철 72시간 무제한",
    notes: "하루 500엔 꼴(지하철 2.5회 탑승 시 본전)",
  },
  {
    id: "osaka-amazing-1day",
    name: "오사카 주유패스 (1일권)",
    city: "osaka",
    priceYen: 3300,
    durationLabel: "이용일 당일 (첫차~막차)",
    breakEvenRides: 5,
    description:
      "오사카 메트로 무제한 + 우메다 공중정원, 헵파이브 등 주요 관광지 40여 곳 무료 입장",
    notes: "전철만 타면 손해이며, 무료 관광지 2~3곳 이상 방문 필수",
  },
  {
    id: "osaka-metro-1day",
    name: "오사카 메트로 1일 승차권 (엔조이 에코 카드)",
    city: "osaka",
    priceYen: 820,
    durationLabel: "당일 유효 (주말/공휴일은 620엔)",
    breakEvenRides: 4,
    description: "오사카 시영 지하철 및 시내버스 무제한",
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
    notes: "공항-하카타-텐진 왕복 2회(4구간) 시 무조건 이득",
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
      "도카이도·산요·규슈·니시규슈 신칸센 탑승 시 '특대하물 스페이스 지정석'을 사전 예약해야 합니다. 예약 수수료는 무료이나, 미예약 반입 시 차내 수수료 1,000엔 부과 및 승무원 지정 장소 이동 조치됩니다.",
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

export function calculateTaxiFare(
  distanceKm: number,
  city: "tokyo" | "osaka" | "fukuoka" = "tokyo",
  isNight = false,
  krwPer100Jpy = 900,
): TaxiEstimate {
  const km = Math.max(0.5, Math.min(200, distanceKm || 1));
  // Standard taxi rates approx:
  // Tokyo: ~500 JPY for first 1.096 km, ~100 JPY per 255m
  // Osaka: ~600 JPY for first 1.3km, ~100 JPY per 260m
  // Fukuoka: ~670 JPY for first 1.6km, ~80 JPY per 268m
  let baseFare = 500;
  let perKm = 400;

  if (city === "osaka") {
    baseFare = 600;
    perKm = 380;
  } else if (city === "fukuoka") {
    baseFare = 670;
    perKm = 320;
  }

  const extraKm = Math.max(0, km - 1.2);
  let fare = baseFare + Math.round(extraKm * perKm);

  let nightSurcharge = 0;
  if (isNight) {
    nightSurcharge = Math.round(fare * 0.2); // 20% night surcharge (22:00 ~ 05:00)
    fare += nightSurcharge;
  }

  const estimatedKrw = Math.round((fare * krwPer100Jpy) / 100);

  return {
    distanceKm: km,
    baseFareYen: baseFare,
    estimatedFareYen: fare,
    nightSurchargeYen: nightSurcharge,
    estimatedKrw,
  };
}
