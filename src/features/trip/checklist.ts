export interface ChecklistItem {
  id: string;
  category: "drugstore" | "donki" | "prep" | "fashion";
  title: string;
  jpName?: string;
  description: string;
  defaultChecked?: boolean;
}

export const travelChecklistItems: ChecklistItem[] = [
  // Prep
  {
    id: "prep-plug",
    category: "prep",
    title: "11자 돼지코 어댑터",
    jpName: "変換プラグ",
    description:
      "일본은 100V·11자 콘센트예요. 휴대폰·노트북 충전기는 대부분 그대로 되지만 드라이기·고데기는 전압 확인",
  },
  {
    id: "prep-battery",
    category: "prep",
    title: "보조배터리 (기내 수하물)",
    jpName: "モバイルバッテリー",
    description:
      "부치는 짐 금지. 2026년 4월부터 1인 2개·개당 160Wh 이하만 기내 반입, 비행 중 사용·충전 금지. 단자에 테이프를 붙이거나 파우치에 넣고 선반 말고 몸 가까이 두세요",
  },
  {
    id: "prep-sim",
    category: "prep",
    title: "eSIM / 포켓 와이파이 / 로밍",
    jpName: "SIMカード / Wi-Fi",
    description: "입국 전 데이터 연결 및 QR코드 확인",
  },
  {
    id: "prep-passport",
    category: "prep",
    title: "여권 및 면세 자격 확인",
    jpName: "パスポート",
    description: "여권 사본 및 실물 여권 (면세 쇼핑 시 실물 여권 필수)",
  },
  {
    id: "prep-vjw",
    category: "prep",
    title: "Visit Japan Web 입국 QR 등록",
    jpName: "Visit Japan Web",
    description: "입국 심사 및 세관 신고 QR 사전 등록",
  },
  {
    id: "prep-departure-tax",
    category: "prep",
    title: "일본 출국세 3,000엔 확인",
    jpName: "国際観光旅客税",
    description:
      "2026년 7월 1일 출국분부터 1인 1,000엔에서 3,000엔으로 올랐어요. 보통 항공권 값에 포함되니 따로 낼 일은 없지만 총액 비교 때 참고",
  },

  // Drugstore
  {
    id: "drug-cabagin",
    category: "drugstore",
    title: "카베진 코와 α (소화·위장약)",
    jpName: "キャベジンコーワα",
    description: "양배추 유래 MMSC 성분의 일본 대표 위장약 (5,000엔 면세 품목)",
  },
  {
    id: "drug-otaisan",
    category: "drugstore",
    title: "오타이산 (소화제)",
    jpName: "太田胃散",
    description: "생약 성분의 즉효성 가루 소화제 (휴대용 캔/포)",
  },
  {
    id: "drug-eve",
    category: "drugstore",
    title: "이브 퀵 진통제 (EVE Quick)",
    jpName: "イブクイック頭痛薬",
    description: "두통, 치통, 생리통에 빠른 효과 (이부프로펜 성분)",
  },
  {
    id: "drug-sharon",
    category: "drugstore",
    title: "샤론파스 / 동전파스(로이히츠보코)",
    jpName: "サロンパス / ロイヒつぼ膏",
    description: "여행 중 많이 걸었을 때 근육통 완화용 밀착 파스",
  },
  {
    id: "drug-rest-feet",
    category: "drugstore",
    title: "휴족시간 (발·다리 쿨링 시트)",
    jpName: "休足時間",
    description: "하루 종일 걸은 뒤 발바닥이나 종아리에 붙이는 냉각 젤 시트",
  },
  {
    id: "drug-megurhythm",
    category: "drugstore",
    title: "메구리즘 증기 온열 아이마스크",
    jpName: "めぐりズム 蒸気でホットアイマスク",
    description: "약 40도의 따뜻한 증기로 눈의 피로를 풀어주는 수면 시트",
  },

  // Donki
  {
    id: "donki-jelly",
    category: "donki",
    title: "오리히로 곤약젤리 (파우치형)",
    jpName: "ぷるんと蒟蒻ゼリー",
    description:
      "⚠️ 컵형 곤약젤리는 한국 반입 금지! 반드시 튜브/파우치형만 구매하세요.",
  },
  {
    id: "donki-suntory",
    category: "donki",
    title: "산토리 가쿠빈 위스키 (700ml)",
    jpName: "サントリー角瓶",
    description: "이자카야 하이볼 베이스 위스키 (면세 주류 2병 한도 체크)",
  },
  {
    id: "donki-kitkat",
    category: "donki",
    title: "일본 한정 킷캣 (말차·사케 등)",
    jpName: "キットカット 地域限定",
    description: "선물용 지역 한정 특산 맛 초콜릿",
  },
  {
    id: "donki-senka",
    category: "donki",
    title: "센카 퍼펙트 휩 클렌징폼",
    jpName: "専科 パーフェクトホイップ",
    description: "쫀득한 거품의 대표 클렌저",
  },

  // Fashion & Shopping
  {
    id: "fashion-uniqlo",
    category: "fashion",
    title: "유니클로 / GU 기본 이너웨어 & 의류",
    jpName: "ユニクロ / GU",
    description:
      "한국 대비 저렴하며 5,000엔 이상 시 즉시 10% 면세 적용 (사이즈 확인 필수)",
  },
  {
    id: "fashion-comme",
    category: "fashion",
    title: "꼼데가르송 / 빔즈 / 오니츠카 타이거",
    jpName: "COMME des GARÇONS / BEAMS",
    description:
      "일본 현지 매장 특가 및 백화점 5% 게스트 쿠폰 + 면세 중복 확인",
  },
];
