export const regions = [
  "도쿄",
  "오사카",
  "후쿠오카",
  "삿포로",
  "나고야",
] as const;
export type AirportRegion = (typeof regions)[number];
export interface AirportRoute {
  id: string;
  region: AirportRegion;
  airport: string;
  operator: string;
  origin: string;
  terminalNote: string;
  officialUrl: string;
}
/** Route directory only. Never ships an invented or evergreen last-train time. */
export const airportRoutes: readonly AirportRoute[] = [
  {
    id: "narita-keisei",
    region: "도쿄",
    airport: "나리타 NRT",
    operator: "게이세이",
    origin: "게이세이우에노",
    terminalNote:
      "T1과 T2·3의 하차역이 달라요. 스카이라이너와 일반 열차의 막차를 구분하세요.",
    officialUrl: "https://www.keisei.co.jp/keisei/tetudou/skyliner/us/",
  },
  {
    id: "haneda-keikyu",
    region: "도쿄",
    airport: "하네다 HND",
    operator: "게이큐",
    origin: "시나가와",
    terminalNote:
      "국제선도 T2 또는 T3를 이용할 수 있어요. 항공편 터미널과 열차 목적지를 확인하세요.",
    officialUrl: "https://www.haneda-tokyo-access.com/en/",
  },
  {
    id: "kansai-nankai",
    region: "오사카",
    airport: "간사이 KIX",
    operator: "난카이",
    origin: "난카이 난바",
    terminalNote:
      "라피트와 공항급행의 막차가 달라요. T2 이용 시 터미널 이동 시간도 확보하세요.",
    officialUrl: "https://www.howto-osaka.com/en/",
  },
  {
    id: "fukuoka-subway",
    region: "후쿠오카",
    airport: "후쿠오카 FUK",
    operator: "후쿠오카 시영 지하철",
    origin: "하카타",
    terminalNote:
      "지하철 공항역은 국내선 쪽이에요. 국제선 터미널까지 별도 이동편과 운영 시간을 확인하세요.",
    officialUrl: "https://subway.city.fukuoka.lg.jp/eng/",
  },
  {
    id: "chitose-jr",
    region: "삿포로",
    airport: "신치토세 CTS",
    operator: "JR 홋카이도",
    origin: "삿포로",
    terminalNote:
      "신치토세공항 방면을 선택하세요. 국제선 터미널까지 도보 이동 시간도 확보하세요.",
    officialUrl: "https://www.jrhokkaido.co.jp/global/english/train/index.html",
  },
  {
    id: "centrair-meitetsu",
    region: "나고야",
    airport: "주부 센트레아 NGO",
    operator: "메이테츠",
    origin: "메이테츠 나고야",
    terminalNote:
      "뮤스카이와 일반 열차의 막차를 구분하세요. 터미널까지 이동과 항공사 체크인 마감을 확인하세요.",
    officialUrl: "https://www.meitetsu.co.jp/eng/",
  },
];
