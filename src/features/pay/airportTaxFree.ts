/**
 * Where the customs tax-free check happens at Japan's main international
 * airports, and how early to arrive. Locations come from each airport's or
 * customs' own pages (checked 2026-11-05). Nobody publishes live queue
 * lengths for the customs kiosks; where an airport publishes security
 * waiting times, `liveWaitUrl` opens that official page.
 */
export type AirportId =
  | "kix"
  | "haneda"
  | "narita"
  | "chubu"
  | "fukuoka"
  | "chitose"
  | "naha";

export interface TaxFreeAirport {
  id: AirportId;
  name: string;
  /** Where the customs kiosks are: always before bag drop. */
  kiosk: string[];
  /** Airport machines that pay the refund in yen cash, when they exist. */
  cashRefund?: string;
  /** Visit Japan Web online check is available on the departure floor. */
  visitJapanWeb: boolean;
  guideUrl?: string;
  liveWaitUrl?: string;
}

export const taxFreeAirports: TaxFreeAirport[] = [
  {
    id: "kix",
    name: "간사이",
    kiosk: [
      "1터미널: 4층 국제선 출발 로비. 체크인 카운터에서 짐 맡기기 전에 세관 기계와 세관 검사 장소가 있어요.",
      "2터미널(피치 등): 국제선 출발 로비, 짐 맡기기 전.",
    ],
    visitJapanWeb: true,
    guideUrl: "https://www.kansai-airport.or.jp/kr/flight/detail/DEP/INT/1",
  },
  {
    id: "haneda",
    name: "하네다",
    kiosk: [
      "3터미널(국제선): 3층 보안검사 전.",
      "2터미널 국제선: 3층 보안검사 전, 6:00~다음 날 2:00, 8대.",
      "1터미널에는 면세 절차 기계가 없어요.",
    ],
    cashRefund:
      "현금 환급 기계(Self Tax Refund): 2·3터미널 3층 출국 심사 뒤. 해당 환급 업체를 쓰는 매장에서 산 물건만 돼요.",
    visitJapanWeb: true,
    guideUrl: "https://tokyo-haneda.com/service/facilities/tax_refund.html",
  },
  {
    id: "narita",
    name: "나리타",
    kiosk: [
      "체크인 층 출발 로비(1터미널 4층, 2터미널 3층, 3터미널 2층)에서 짐 맡기기 전.",
      "공항 안내: 항공기 출발 2시간 이상 전에 도착하세요.",
    ],
    cashRefund:
      "현금 환급 기계(Self Tax Refund): 1터미널 중앙빌딩 본관 4층, 2터미널 본관 3층, 출국 심사 전, 6:00~24:00. 해당 환급 업체를 쓰는 매장 구매분만 돼요.",
    visitJapanWeb: true,
    guideUrl: "https://www.narita-airport.jp/ko/airportguide/inter-dep/",
    liveWaitUrl:
      "https://www.narita-airport.jp/ja/airportguide/security/congestion-time/",
  },
  {
    id: "chubu",
    name: "주부(나고야)",
    kiosk: [
      "1터미널 3층 출발 로비의 세관 키오스크. 공항에 도착하면 이것부터 하라고 안내해요.",
      "환급은 엔화로만 받아요.",
    ],
    visitJapanWeb: true,
    guideUrl: "https://www.centrair.jp/ko/taxrefund/",
  },
  {
    id: "fukuoka",
    name: "후쿠오카",
    kiosk: ["국제선 출발 로비, 짐 맡기기 전."],
    visitJapanWeb: true,
  },
  {
    id: "chitose",
    name: "신치토세(삿포로)",
    kiosk: ["국제선 출발 로비, 짐 맡기기 전."],
    visitJapanWeb: true,
  },
  {
    id: "naha",
    name: "나하(오키나와)",
    kiosk: ["국제선 출발 로비, 짐 맡기기 전."],
    cashRefund:
      "현금 환급 기계(Self Tax Refund): 2층 출발 콘코스 출국 심사 뒤, 6:00~21:00.",
    visitJapanWeb: true,
  },
];

export interface ArrivalPlan {
  arriveAt: number;
  minutes: number;
  parts: { label: string; minutes: number }[];
}

/** Japan-time hour (0-23) of a timestamp. */
const japanHour = (timestamp: number) =>
  new Date(timestamp + 9 * 3600000).getUTCHours();

/**
 * Narita names early morning to midday and the evening as its busiest
 * security times; the same pattern is used as a general warning.
 */
export function isBusyDeparture(departure: number): boolean {
  const hour = japanHour(departure);
  return (hour >= 6 && hour < 12) || (hour >= 16 && hour < 20);
}

/**
 * The app's own estimate of when to reach the airport. Airports ask for at
 * least 2 hours before an international flight; the customs check adds
 * time before bag drop, more with many receipts (a red result means
 * showing every item), and busy hours or holidays add more.
 */
export function recommendedArrival(input: {
  departure: number;
  receipts: number;
  holiday: boolean;
}): ArrivalPlan {
  const receipts = Math.max(0, Math.floor(input.receipts));
  const parts: { label: string; minutes: number }[] = [
    { label: "국제선 기본 (공항 안내 2시간)", minutes: 120 },
  ];
  if (receipts > 0)
    parts.push({
      label: `면세 세관 확인 (영수증 ${receipts}장)`,
      minutes: 30 + Math.min(30, Math.max(0, receipts - 3) * 5),
    });
  if (isBusyDeparture(input.departure))
    parts.push({ label: "붐비기 쉬운 시간대", minutes: 20 });
  if (input.holiday) parts.push({ label: "연휴·성수기", minutes: 30 });
  const minutes = parts.reduce((sum, p) => sum + p.minutes, 0);
  return { arriveAt: input.departure - minutes * 60000, minutes, parts };
}

/**
 * Refund facts per shop, only where the shop itself announced them.
 * Everything else depends on the shop's refund company.
 */
export const shopRefundNotes: { shop: string; note: string; checkedOn: string }[] =
  [
    {
      shop: "돈키호테 (PPIH 그룹 매장)",
      note: "11월 1일부터 환급 신청 수수료 무료. 공항에서 현금으로 받을 때만 환급 업체 수수료가 붙어요.",
      checkedOn: "2026-11-05",
    },
    {
      shop: "그 밖의 매장",
      note: "은행 송금, 신용카드, 앱, 공항 현금 등 매장(환급 업체)마다 달라요. 결제할 때 방법·기간·수수료를 물어보세요.",
      checkedOn: "2026-11-05",
    },
  ];
