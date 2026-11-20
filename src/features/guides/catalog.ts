export interface TravelGuide {
  id: string;
  title: string;
  summary: string;
  badge: string;
  sections: readonly { title: string; body: string }[];
  checklist: readonly { id: string; label: string }[];
  links: readonly { label: string; url: string }[];
  phrase?: { ko: string; ja: string };
}
export const ticketGuides: readonly TravelGuide[] = [
  {
    id: "ticket-start",
    title: "J-pop 티켓팅, 어디서 시작할까",
    badge: "구매 전",
    summary: "아티스트 공식 공지 → 해외 접수 → 판매 방식 순서로 확인하세요.",
    sections: [
      {
        title: "공연마다 판매 창구가 달라요",
        body: "공연 주최자·아티스트가 안내한 판매처를 먼저 확인하세요. 해외 판매 페이지에 모든 일본 공연이 올라오는 것은 아니에요. 팬클럽 선행·추첨·일반 발매 중 어떤 접수인지 구분하세요.",
      },
      {
        title: "접수와 결제는 별개의 마감",
        body: "抽選은 추첨, 先着은 선착순, 当落는 당첨 결과, 入金期限은 결제 마감, 発券은 티켓 발권이에요. 응모가 곧 구매 완료는 아니므로 결과 확인과 결제·발권 일정을 따로 기록하세요. 공지 시각은 JST인지 확인하세요.",
      },
      {
        title: "전화번호·앱 조건부터 확인",
        body: "일본 전화번호/SMS 인증, 본인 명의, 동행인 등록, 전자티켓 앱과 지원 기기의 필요 여부는 공연·판매처별로 달라요. 데이터 전용 여행 eSIM이 SMS 인증을 지원한다고 가정하지 마세요.",
      },
    ],
    checklist: [
      { id: "official", label: "아티스트 공식 공지와 판매처를 확인했어요" },
      {
        id: "eligibility",
        label: "해외 접수·전화번호·본인 확인 조건을 확인했어요",
      },
      { id: "deadline", label: "접수·당첨 발표·결제 마감을 구분했어요" },
    ],
    links: [
      { label: "eplus 해외 판매", url: "https://ib.eplus.jp/" },
      { label: "로손 외국인 이용 안내", url: "https://l-tike.com/guide/en/" },
    ],
  },
  {
    id: "ticket-eplus",
    title: "eplus 해외 판매 이용하기",
    badge: "공식 FAQ",
    summary: "해외 고객용 판매 페이지와 일본 국내용 서비스를 구분하세요.",
    sections: [
      {
        title: "대상과 결제",
        body: "해외 거주 고객 또는 해외 발행 카드만 보유한 고객을 위한 서비스로 안내돼요. 공식 FAQ는 Visa·Mastercard와 Alipay를 안내하지만, 실제 공연의 결제 옵션을 다시 확인하세요.",
      },
      {
        title: "구매 후 변경 제한",
        body: "주문 확정 후 일정·좌석 변경, 임의 취소, 양도·재판매 및 구매자 이름 변경을 허용하지 않는다고 안내해요. 취소 공연은 안내 메일의 환불 절차를 따르세요.",
      },
      {
        title: "수령과 동행인",
        body: "구매 확인 메일에서 수령 장소·시간·준비물을 확인하세요. 편의점 발권은 지원 공연에만 적용돼요. eplus 해외 FAQ는 구매자와 동행인의 함께 입장을 안내하며 개별 QR 발급을 보장하지 않아요.",
      },
    ],
    checklist: [
      { id: "mail", label: "구매 확인 메일과 주문 조회 경로를 확인했어요" },
      {
        id: "pickup",
        label: "이 공연의 수령 방식과 동행인 입장 조건을 확인했어요",
      },
    ],
    links: [{ label: "eplus 해외 공식 FAQ", url: "https://ib.eplus.jp/faq" }],
    phrase: {
      ko: "이 예약의 티켓은 어디에서 받을 수 있나요?",
      ja: "この予約のチケットはどこで受け取れますか？",
    },
  },
  {
    id: "ticket-lawson",
    title: "로손 티켓, 해외에서 접속한다면",
    badge: "공식 가이드",
    summary: "회원·결제·수령 제한을 먼저 확인하세요.",
    sections: [
      {
        title: "해외 접속 제한",
        body: "외국인 안내 페이지는 해외에서 일반 발매 티켓만 구매 가능하며 회원 등록·로그인이 제한된다고 안내해요. 일본 국내 접수 조건과 같다고 가정하지 마세요.",
      },
      {
        title: "결제 마감과 수령",
        body: "해외 발행 카드가 거절될 수 있어요. 매장 결제를 선택하면 지정 기한 안에 일본 국내 로손에서 결제해야 하므로 입국일과 맞는지 확인하세요. 실제 기한은 공연별로 다릅니다.",
      },
      {
        title: "전자티켓",
        body: "전자티켓은 일본에서 이용 가능한 단말이 필요하다고 안내해요. 앱·전화번호·동행인 분배·기기 변경 조건을 해당 티켓 안내에서 확인하고, 스크린샷만으로 입장할 수 있다고 가정하지 마세요.",
      },
    ],
    checklist: [
      { id: "sale", label: "해외에서 이용 가능한 접수인지 확인했어요" },
      { id: "payment", label: "결제 마감 전에 실제 결제가 가능해요" },
      { id: "device", label: "일본에서 사용할 전자티켓 단말을 준비했어요" },
    ],
    links: [
      { label: "로손 공식 외국인 가이드", url: "https://l-tike.com/guide/en/" },
      {
        label: "로손 전자티켓 안내",
        url: "https://l-tike.com/e-tike/navi/guide-top/",
      },
    ],
  },
  {
    id: "ticket-day",
    title: "공연 당일 서바이벌",
    badge: "현장 준비",
    summary: "본인 확인부터 귀가편까지, 입장 전에 점검하세요.",
    sections: [
      {
        title: "개장과 개연 구분",
        body: "開場는 입장 시작, 開演은 공연 시작이에요. 전자티켓 표시, 신분증 원본, 구매 명의와 동행인 입장 방식을 주최자 안내대로 준비하세요.",
      },
      {
        title: "소규모 라이브하우스",
        body: "드링크 비용 별도(ドリンク代別), 현금 필요 여부, 코인로커, 재입장, 촬영·응원도구 규칙은 공연장마다 달라요. 해당 공연의 공식 안내에서 확인하세요.",
      },
      {
        title: "공연 후 이동",
        body: "공연 종료는 늦어질 수 있어요. 공항행 막차와 항공편 체크인 마감은 별개입니다. TRIP의 막차 타이머에 확인한 열차 시간을 등록해 두세요.",
      },
    ],
    checklist: [
      { id: "identity", label: "신분증·티켓 표시·동행인 입장 준비를 마쳤어요" },
      { id: "venue", label: "공연장 규칙과 추가 현장 비용을 확인했어요" },
      { id: "return", label: "공연 후 귀가·공항 이동편을 확인했어요" },
    ],
    links: [{ label: "eplus 입장·수령 FAQ", url: "https://ib.eplus.jp/faq" }],
    phrase: {
      ko: "전자티켓이 표시되지 않습니다. 확인해 주시겠어요?",
      ja: "電子チケットが表示されません。確認していただけますか？",
    },
  },
];
export const guestGuides: readonly TravelGuide[] = [
  {
    id: "guest-hankyu",
    title: "한큐 게스트 카드 빠른 준비",
    badge: "발급 안내",
    summary: "사전등록 안내와 카운터 위치를 미리 확인하세요.",
    sections: [
      {
        title: "쇼핑 전에 발급",
        body: "면세 대상 고객의 5% 게스트 쿠폰은 여권을 가지고 우메다 본점 B1 해외 고객 카운터 또는 안내된 1F 카운터에서 발급받아요. 발행일 포함 7일간 사용합니다.",
      },
      {
        title: "사전등록과 우선 수속은 달라요",
        body: "공식 페이지의 사전등록 안내를 따르면 발급 준비에 도움이 돼요. 이것만으로 VIP 우선 면세 수속 자격이나 대기열 우선권이 생기지는 않아요.",
      },
    ],
    checklist: [
      { id: "passport", label: "본인 여권과 면세 대상 조건을 확인했어요" },
      { id: "counter", label: "사전등록 안내와 발급 카운터 위치를 확인했어요" },
    ],
    links: [
      {
        label: "한큐 게스트 e카드 로그인",
        url: "https://taxfree-coupon.hankyu-hanshin-dept.co.jp/",
      },
      {
        label: "한큐 공식 사전등록·카운터 안내",
        url: "https://global.hankyu-hanshin-dept.co.jp/ko/store/hankyuhonten/service/",
      },
    ],
    phrase: {
      ko: "게스트 쿠폰은 어디에서 발급받을 수 있나요?",
      ja: "ゲストクーポンはどこで発行してもらえますか？",
    },
  },
  {
    id: "guest-hankyu-vip",
    title: "한큐 VIP 우선 면세 수속",
    badge: "회원 자격 필요",
    summary: "실제 우선 수속 혜택은 실적을 충족한 VIP 회원용이에요.",
    sections: [
      {
        title: "실적 확인이 먼저",
        body: "최근 1년간 대상 점포에서 할인 후 세전 100만 엔 이상 면세 실적이 있는 개인 고객을 대상으로 안내합니다. 실버 7%·골드 10% 할인은 제외 상품과 승급 규약이 적용됩니다.",
      },
      {
        title: "우선 수속 대상 점포",
        body: "우메다·고베·Men's 오사카·Men's 도쿄·하카타의 우선 면세 수속이 안내돼요. 회원 카드와 당일 적용 범위를 카운터에서 확인하세요. 이 앱은 VIP 가입이나 대기열 예약을 대행하지 않아요.",
      },
    ],
    checklist: [
      { id: "rules", label: "가입·승급 규약과 본인 실적을 확인했어요" },
      { id: "service", label: "방문 지점의 VIP 우선 수속 적용을 확인했어요" },
    ],
    links: [
      {
        label: "한큐 VIP 클럽 공식 조건",
        url: "https://global.hankyu-hanshin-dept.co.jp/ko/store/hankyuhonten/service/",
      },
    ],
  },
  {
    id: "guest-mistore",
    title: "미츠코시이세탄 REWARDS 준비",
    badge: "앱 + 카운터",
    summary: "앱 등록 후 방문 점포에서 활성화해야 사용할 수 있어요.",
    sections: [
      {
        title: "출국 전에 앱 준비",
        body: "공식 JAPAN 앱을 설치하고 회원 등록 및 REWARDS 이용 절차를 확인하세요. 여권 정보는 백화점 공식 앱에서만 등록하며 Subject Japan에는 입력하지 않습니다.",
      },
      {
        title: "매장에서 활성화",
        body: "여권과 앱을 준비해 면세/서비스 카운터에서 활성화한 후 결제 전에 제시하세요. 대상 상품 5%, 유효기간 1년이며 단품 금액·브랜드 제외 조건이 있어요. 활성화는 우선 수속 보장과 다릅니다.",
      },
    ],
    checklist: [
      { id: "app", label: "공식 앱의 회원·REWARDS 등록 절차를 확인했어요" },
      { id: "activate", label: "방문 점포의 카운터에서 활성화했어요" },
    ],
    links: [
      {
        label: "공식 앱 설치 안내",
        url: "https://cp.mistore.jp/global/en/app.html",
      },
      {
        label: "REWARDS 자격·활성화 조건",
        url: "https://cp.mistore.jp/global/en/app/rewards.html",
      },
    ],
  },
  {
    id: "guest-takashimaya",
    title: "다카시마야 쇼퍼스 카드",
    badge: "쇼핑 전 발급",
    summary: "여권을 지참하고 지정 카운터에서 발급받으세요.",
    sections: [
      {
        title: "점포와 상품 범위",
        body: "면세 대상 관광객에게 대상 상품 5% 할인을 안내합니다. JR 나고야 다카시마야·인접 쇼핑센터는 제외되며, 일부 브랜드·시계·보석은 대상이 아니에요. 방문 점포의 발급 위치와 카드 기간을 공식 안내에서 확인하세요.",
      },
    ],
    checklist: [
      { id: "store", label: "방문 점포와 구매 상품이 대상인지 확인했어요" },
      { id: "card", label: "쇼핑 전에 여권을 제시해 카드를 발급받았어요" },
    ],
    links: [
      {
        label: "다카시마야 쇼퍼스 카드 공식 안내",
        url: "https://www.takashimaya.co.jp/store/special/shopperscard/index_en.html",
      },
    ],
  },
  {
    id: "guest-daimaru",
    title: "다이마루 도쿄 화장품 쿠폰",
    badge: "도쿄점 한정 안내",
    summary: "전 상품 게스트 할인으로 오해하지 않도록 확인하세요.",
    sections: [
      {
        title: "발급 전 확인",
        body: "외국 국적·입국 후 6개월 미만 조건의 고객에게 대상 화장품 5% 쿠폰을 안내합니다. 12층 면세 카운터에서 여권과 함께 발급 조건을 확인하세요. 다른 지점이나 전 상품에 적용되는 것으로 가정하지 마세요.",
      },
    ],
    checklist: [
      {
        id: "cosmetics",
        label: "구매할 화장품의 적용 여부와 쿠폰 기간을 확인했어요",
      },
    ],
    links: [
      {
        label: "다이마루 도쿄 공식 서비스",
        url: "https://www.daimaru.co.jp/tokyo/service/gaikoku.html",
      },
    ],
  },
];
