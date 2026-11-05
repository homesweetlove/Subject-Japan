export interface EmergencyContact {
  id: string;
  name: string;
  jpName: string;
  category: "police" | "medical" | "consulate";
  phone: string;
  description: string;
  availableHours: string;
  /** Duty phone outside office hours (consular emergencies, lost passports). */
  afterHoursPhone?: string;
}

/**
 * Consular numbers are copied from each mission's own page on
 * overseas.mofa.go.kr and the embassy's list of consulates in Japan
 * (checked 2026-11-05). JNTO's hotline from japan.travel / jnto.go.jp.
 */
export const EMERGENCY_CHECKED_ON = "2026-11-05";

export const emergencyContacts: EmergencyContact[] = [
  {
    id: "police",
    name: "경찰 (범죄·사건·분실)",
    jpName: "警察 (事件・事故・遺失物)",
    category: "police",
    phone: "110",
    description: "일본 경찰 긴급 신고 (전국 공통, 공중전화 긴급버튼 무료)",
    availableHours: "24시간 365일",
  },
  {
    id: "ambulance-fire",
    name: "구급·소방 (화재·응급환자)",
    jpName: "救急・消防 (急病人・火災)",
    category: "medical",
    phone: "119",
    description: "응급 환자 이송 및 화재 신고 (외국어 동시통역 3자 통화 가능)",
    availableHours: "24시간 365일",
  },
  {
    id: "medical-consult",
    name: "구급 안심 센터 (#7119)",
    jpName: "救急安心センター",
    category: "medical",
    phone: "#7119",
    description:
      "병원에 가야 할지, 구급차를 불러야 할지 망설여질 때 의사·간호사 상담. 도쿄·오사카·후쿠오카·삿포로 등 실시 지역에서만 연결돼요. 안 되면 119로 거세요.",
    availableHours: "24시간 365일",
  },
  {
    id: "japan-visitor-hotline",
    name: "일본정부관광국 (JNTO) 핫라인",
    jpName: "Japan Visitor Hotline",
    category: "medical",
    phone: "050-3816-2787",
    description:
      "여행자를 위한 24시간 전화 안내. 한국어 가능 (사고·병·재해 때 도움, 일반 관광 안내)",
    availableHours: "24시간 365일",
  },
  {
    id: "mofa-call-center",
    name: "외교부 영사콜센터 (한국)",
    jpName: "韓国外交部 領事コールセンター",
    category: "consulate",
    phone: "+82-2-3210-0404",
    description:
      "해외 사건사고 24시간 상담 (유료 국제전화). 스마트폰 '영사콜센터' 앱으로 무료 통화도 가능해요.",
    availableHours: "24시간 연중무휴",
  },
  {
    id: "embassy-tokyo",
    name: "주일본 대한민국 대사관 (도쿄)",
    jpName: "駐日本国大韓民国大使館 (東京・南麻布)",
    category: "consulate",
    phone: "+81-3-3452-7611",
    description:
      "영사과 +81-3-3455-2601 (도쿄·지바·이바라키·사이타마·도치기·군마). 휴일·평일 18시 이후 사건사고는 아래 긴급 전화로.",
    availableHours: "평일 근무시간",
    afterHoursPhone: "+81-70-2153-5454",
  },
  {
    id: "consulate-yokohama",
    name: "주요코하마 대한민국 총영사관",
    jpName: "駐横浜大韓民国総領事館",
    category: "consulate",
    phone: "+81-45-621-4531",
    description:
      "가나가와 등 관할. 근무시간 외 사건사고는 영사콜센터(+82-2-3210-0404)로 연결돼요.",
    availableHours: "평일 근무시간",
    afterHoursPhone: "+82-2-3210-0404",
  },
  {
    id: "consulate-osaka",
    name: "주오사카 대한민국 총영사관",
    jpName: "駐大阪大韓民国総領事館",
    category: "consulate",
    phone: "+81-6-4256-2345",
    description:
      "오사카·교토·나라 등 간사이 (효고현은 고베 총영사관). 민원 평일 09:00~16:00.",
    availableHours: "평일 근무시간",
    afterHoursPhone: "+81-90-3050-0746",
  },
  {
    id: "consulate-kobe",
    name: "주고베 대한민국 총영사관",
    jpName: "駐神戸大韓民国総領事館",
    category: "consulate",
    phone: "+81-78-221-4853",
    description: "고베 등 효고현 관할.",
    availableHours: "평일 근무시간",
    afterHoursPhone: "+81-90-5099-0414",
  },
  {
    id: "consulate-fukuoka",
    name: "주후쿠오카 대한민국 총영사관",
    jpName: "駐福岡大韓民国総領事館",
    category: "consulate",
    phone: "+81-92-771-0461",
    description:
      "규슈·오키나와. 근무시간 외 여권 분실은 +81-80-2956-6736, 사건사고는 아래 긴급 전화.",
    availableHours: "평일 09:00~12:00, 13:30~17:30",
    afterHoursPhone: "+81-80-8588-2806",
  },
  {
    id: "consulate-sapporo",
    name: "주삿포로 대한민국 총영사관",
    jpName: "駐札幌大韓民国総領事館",
    category: "consulate",
    phone: "+81-11-218-0288",
    description: "홋카이도 관할.",
    availableHours: "평일 근무시간",
    afterHoursPhone: "+81-80-1971-0288",
  },
  {
    id: "consulate-nagoya",
    name: "주나고야 대한민국 총영사관",
    jpName: "駐名古屋大韓民国総領事館",
    category: "consulate",
    phone: "+81-52-586-9221",
    description: "아이치·기후·미에 등 관할.",
    availableHours: "평일 근무시간",
    afterHoursPhone: "+81-80-4221-9500",
  },
];

export interface EmergencyPhraseCard {
  id: string;
  category: "medical" | "police" | "disaster";
  titleKo: string;
  japanese: string;
  reading: string;
  detail: string;
}

export const emergencyPhrases: EmergencyPhraseCard[] = [
  {
    id: "ep-1",
    category: "medical",
    titleKo: "병원에 가야 합니다. 구급차를 불러주세요.",
    japanese: "病院に行く必要があります。救急車を呼んでください。",
    reading: "뵤-인니 이쿠 히츠요-가 아리마스. 큐-큐-샤오 욘데 쿠다사이.",
    detail: "급성 통증이나 호흡 곤란, 골절 등 긴급 상황 시",
  },
  {
    id: "ep-2",
    category: "medical",
    titleKo: "저는 알레르기가 있어 진료가 필요합니다.",
    japanese: "私はアレルギーがあり、医師の診察が必要です。",
    reading: "와타시와 아레루기-가 아리, 이시노 신사츠가 히츠요-데스.",
    detail: "음식 알레르기 또는 약물 부작용 발생 시",
  },
  {
    id: "ep-3",
    category: "police",
    titleKo: "여권을 잃어버렸습니다. 가까운 파출소(交番)가 어디인가요?",
    japanese: "パスポートを紛失しました。最寄りの交番はどこですか？",
    reading: "파스포-토오 훈시츠 시마시타. 모요리노 코-반와 도코데스카?",
    detail: "분실신고증명서(遺失届出証明書) 발급 필요 시",
  },
  {
    id: "ep-4",
    category: "police",
    titleKo: "가방/지갑을 두고 내렸습니다. 분실물 센터는 어디인가요?",
    japanese: "カバン・財布を置き忘れました。落とし物センターはどこですか？",
    reading: "카방·사이후오 오키와스레마시타. 오토시모노 센타-와 도코데스카?",
    detail: "지하철·전철·버스·택시에 소지품을 분실했을 때",
  },
  {
    id: "ep-5",
    category: "medical",
    titleKo: "한국인 여행자입니다. 한국어가 가능한 직원이 있습니까?",
    japanese: "韓国人旅行者です。韓国語ができるスタッフはいますか？",
    reading: "칸코쿠진 료코-샤데스. 칸코쿠고가 데키루 스탓후와 이마스카?",
    detail: "병원 안내 데스크나 역무원에게 지원 요청 시",
  },
  {
    id: "ep-6",
    category: "disaster",
    titleKo: "지진/재난 시 가장 가까운 대피소는 어디인가요?",
    japanese: "地震・災害時の最寄りの避難所はどこですか？",
    reading: "지신·사이카이지노 모요리노 히난조와 도코데스카?",
    detail: "강한 지진이나 재난 경보 발생 시 지정 피난소 문의",
  },
];

export interface DisasterGuideline {
  location: string;
  action: string;
  checklist: string[];
}

export const disasterGuidelines: DisasterGuideline[] = [
  {
    location: "실내 (호텔·숙소)",
    action: "침대 밑이나 테이블 아래로 들어가 머리를 보호하세요.",
    checklist: [
      "베개나 이불로 머리와 목 보호",
      "흔들림이 멈출 때까지 무리하게 밖으로 뛰어나가지 않기",
      "흔들림이 잦아들면 출입문 확보 (문이 뒤틀려 갇히는 것 방지)",
      "가스·전열기 끄기 (화재 방지)",
    ],
  },
  {
    location: "전철·지하철 안",
    action: "손잡이나 기둥을 단단히 잡고 승무원의 방송에 따르세요.",
    checklist: [
      "급정거에 대비해 몸을 낮추고 고정물 잡기",
      "선로로 임의 탈출 절대 금지 (감전 및 후속 열차 위험)",
      "승무원이나 역무원의 안내 방송 및 지시 대기",
    ],
  },
  {
    location: "거리·상가 (실외)",
    action: "유리창 파편과 간판 낙하물을 피해 넓은 공터로 이동하세요.",
    checklist: [
      "가방 등으로 머리를 감싸고 낙하물 주의",
      "자판기나 블록 담장, 건물 유리창에서 떨어지기",
      "근처 공원이나 내진 대피 공터로 대피",
    ],
  },
  {
    location: "재해 통신 팁",
    action: "무료 공공 Wi-Fi '00000JAPAN' 개방 여부를 확인하세요.",
    checklist: [
      "대규모 재해 시 통신 3사 무료 Wi-Fi '00000JAPAN' 개방",
      "음성 통화 폭주 시 카카오톡/LINE/문자 메시지 우선 이용",
      "재해용 전언 다이얼 171 (외국인 이용 가능)",
    ],
  },
];
