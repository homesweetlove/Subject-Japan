import type { Coupon } from "./model";
import { additionalCoupons } from "./additionalCoupons";

// Reviewed official terms, not live availability. Keep dates tied to actual review.
export const couponCatalog: readonly Coupon[] = [
  ...additionalCoupons,
  {
    id: "donki-visitor",
    merchant: "돈키호테",
    title: "면세 쇼핑 쿠폰",
    benefit: "세전 1만 엔부터 5% · 3만 엔부터 7%",
    audience: "visitor",
    category: "종합쇼핑",
    registrationRequired: false,
    eligibility:
      "면세 구매 조건을 충족하는 방문객. 조건을 충족한 일시 귀국 일본인도 대상이며 외교관 면세는 제외됩니다.",
    minimumSpend: "대상 상품 합계 세전 10,000엔 이상 5%, 30,000엔 이상 7%",
    validity: "고정 종료일 미표기 · 결제 당일 공식 쿠폰에서 확인",
    checkedOn: "2026-09-21",
    stores: "일본 돈키호테·APITA·PIAGO 대상 점포 (일부 제외)",
    steps: [
      "공식 페이지에서 최신 쿠폰을 엽니다.",
      "결제 전에 쿠폰과 면세 구매에 필요한 여권 등을 제시합니다.",
      "면세 결제 1회에 한 번 사용합니다. 결제 후 적용은 불가합니다.",
    ],
    exclusions: [
      "스크린샷으로는 사용할 수 없습니다.",
      "주류·담배·게임기 본체·POSA 등 비과세 상품·가격 제한 상품·단품 세전 10만 엔 이상 상품 등은 제외되며 기준 금액에도 포함되지 않습니다.",
    ],
    stacking:
      "다른 할인·서비스 및 majica와 함께 사용할 수 없습니다. 면세와 쿠폰 할인율을 단순 합산하지 마세요.",
    officialUrl: "https://japanportal.donki-global.com/coupon/?ptcd=0000000201",
    keywords: ["donki", "ドン・キホーテ", "면세", "드럭스토어"],
  },
  {
    id: "takashimaya-shoppers",
    merchant: "다카시마야",
    title: "쇼퍼스 카드",
    benefit: "대상 상품 5% 할인",
    audience: "visitor",
    category: "백화점",
    registrationRequired: false,
    eligibility:
      "일본을 방문한 면세 대상 관광객. 카드 발급 시 여권이 필요합니다.",
    minimumSpend: "세전 3,000엔 이상 구매",
    validity:
      "발급받은 카드의 유효기간 확인 · 안내 페이지에 고정 종료일 미표기",
    checkedOn: "2026-09-21",
    stores: "다카시마야 대상 점포 · JR 나고야 다카시마야 및 인접 쇼핑센터 제외",
    steps: [
      "쇼핑 전에 지정 카운터에 여권을 제시하고 카드를 발급받습니다.",
      "결제 시 카드를 제시합니다. 현금·신용카드·UnionPay·Alipay·WeChat Pay 결제가 안내되어 있습니다.",
    ],
    exclusions: ["시계·보석·럭셔리 브랜드 등 일부 상품과 매장은 제외됩니다."],
    stacking: "다른 행사·할인과의 중복 적용은 해당 점포에서 확인하세요.",
    officialUrl:
      "https://www.takashimaya.co.jp/store/special/shopperscard/index_en.html",
    keywords: ["takashimaya", "高島屋", "게스트 할인", "면세"],
  },
  {
    id: "daimaru-tokyo",
    merchant: "다이마루 도쿄",
    title: "외국인 쇼핑 우대 쿠폰",
    benefit: "대상 화장품 5% 할인",
    audience: "visitor",
    category: "백화점",
    registrationRequired: false,
    eligibility:
      "일본 입국 후 6개월 미만인 외국 국적 고객. 여권 제시가 필요합니다.",
    minimumSpend: "공식 안내에 최소 구매금액 미표기 · 발급 시 확인",
    validity: "발급 쿠폰에서 확인 · 안내 페이지에 고정 종료일 미표기",
    checkedOn: "2026-09-21",
    stores: "다이마루 도쿄점만 해당 · 12층 면세 카운터에서 발급 안내",
    steps: [
      "여권을 지참해 지정 카운터에서 쿠폰을 발급받습니다.",
      "대상 화장품인지 확인하고 결제 전에 쿠폰을 제시합니다.",
    ],
    exclusions: [
      "2024년 3월 1일부터 대상 매장은 화장품으로 한정되며 일부 화장품도 제외됩니다.",
      "전 상품·전 지점 할인 쿠폰이 아닙니다. 식품·세일 상품·시계·럭셔리 브랜드 등은 제외됩니다.",
    ],
    stacking: "다른 혜택과의 중복 적용은 점포에서 확인하세요.",
    officialUrl: "https://www.daimaru.co.jp/tokyo/service/gaikoku.html",
    keywords: ["daimaru", "大丸", "화장품", "도쿄역", "게스트 할인"],
  },
  {
    id: "uniqlo-new-app",
    merchant: "유니클로 일본",
    title: "신규 앱 다운로드 쿠폰",
    benefit: "5,000엔 이상 구매 시 500엔 할인",
    audience: "general",
    category: "패션",
    registrationRequired: true,
    eligibility:
      "일본판 앱 최초 다운로드 및 온라인 스토어 회원 등록 조건. 공식 안내에 국적 제한은 명시되지 않았으나, 여행자의 일본 서비스 가입·쿠폰 발급 가능 여부는 확인이 필요합니다.",
    minimumSpend: "5,000엔 이상 · 금액 산정 기준은 발급 쿠폰 확인",
    validity: "발급일을 포함해 31일 · 개인별 발급일에 따라 다름",
    checkedOn: "2026-09-21",
    stores: "일본 유니클로 매장·온라인 스토어 (개별 쿠폰 조건 적용)",
    steps: [
      "일본 공식 앱과 회원가입 조건을 확인합니다. 한국 계정·한국 쿠폰과 동일하다고 가정하지 마세요.",
      "발급된 쿠폰을 앱에서 확인하고 결제 시 회원 바코드와 쿠폰을 제시·선택합니다.",
    ],
    exclusions: [
      "본인만 사용 가능하며 양도·판매할 수 없습니다.",
      "기프트카드 구매·수선비·선물 포장비 등은 대상과 기준 금액에서 제외됩니다.",
    ],
    stacking: "개별 쿠폰 조건을 따릅니다. 온라인 주문은 주문당 쿠폰 1개입니다.",
    officialUrl: "https://faq.uniqlo.com/articles/faq/100005203",
    keywords: ["uniqlo", "ユニクロ", "옷", "사이즈", "500"],
  },
  {
    id: "mcdonalds-app",
    merchant: "맥도날드 일본",
    title: "공식 앱 쿠폰",
    benefit: "메뉴별 할인 · 앱에서 확인",
    audience: "general",
    category: "식음료",
    registrationRequired: true,
    eligibility:
      "일본 공식 앱·회원 서비스 이용 조건을 충족한 고객용입니다. 국적 제한은 안내되지 않았으나 여행자의 앱 설치 지역·가입·발급 가능 여부는 공식 서비스에서 확인하세요.",
    minimumSpend: "메뉴·쿠폰별로 다름",
    validity: "각 쿠폰에 표시된 기간과 이용 가능 시간 확인",
    checkedOn: "2026-09-21",
    stores: "일본 맥도날드 대상 매장 · 쿠폰별 제외 매장 확인",
    steps: [
      "공식 안내에서 일본 앱을 설치하고 회원 등록 조건을 확인합니다.",
      "앱에서 현재 발급되는 쿠폰을 선택한 뒤 최신 사용 안내에 따라 결제 전에 제시합니다.",
    ],
    exclusions: [
      "메뉴·가격·판매 시간·이용 횟수·대상 매장은 쿠폰마다 다릅니다.",
      "이 앱은 쿠폰 코드나 QR을 복제하지 않습니다. 일본 공식 앱의 실제 쿠폰이 필요합니다.",
    ],
    stacking: "쿠폰마다 조건이 다르므로 앱의 이용 조건을 확인하세요.",
    officialUrl: "https://www.mcdonalds.co.jp/shop/howto_coupon/",
    keywords: ["mcdonalds", "マクドナルド", "햄버거", "식당"],
  },
  {
    id: "starbucks-personal-cup",
    merchant: "스타벅스 일본",
    title: "개인 컵 할인",
    benefit: "매장 22엔 · 포장 21엔 할인",
    audience: "general",
    category: "식음료",
    registrationRequired: false,
    eligibility:
      "개인 컵을 가져온 고객에게 제공하는 일반 혜택입니다. 공개 조건에 국적·회원가입 제한이 없으며 다른 브랜드 컵도 가능합니다.",
    minimumSpend: "금액 기준 대신 대상 음료·개인 컵 조건 적용",
    validity:
      "기본 혜택 기준 · 고정 종료일 미표기, 행사 및 최신 정책은 공식 확인",
    checkedOn: "2026-09-21",
    stores: "일본 스타벅스 대상 매장 (일부 점포·상품 제외)",
    steps: [
      "깨끗이 세척하고 음료 용량에 맞는 컵을 준비합니다.",
      "계산 전에 뚜껑을 분리한 컵을 직원에게 전달합니다. 할인액은 세금 포함 기준입니다.",
    ],
    exclusions: [
      "일회용 컵·매장 제공 컵, 병입 생수·주스, 포트 서비스·커피 트래블러 등은 제외됩니다.",
      "모바일 오더와 배달에는 적용되지 않습니다.",
    ],
    stacking:
      "One More Coffee와 중복 불가. Reward eTicket과는 함께 사용할 수 있습니다.",
    officialUrl: "https://www.starbucks.co.jp/tumblerbu/bulletinboard/",
    keywords: ["starbucks", "スターバックス", "커피", "텀블러", "카페"],
  },
];
