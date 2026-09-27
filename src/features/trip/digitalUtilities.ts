export interface ApplianceCheck {
  id: string;
  name: string;
  voltageType: "safe" | "caution" | "danger";
  voltageText: string;
  guide: string;
}

export const applianceChecks: ApplianceCheck[] = [
  {
    id: "ap-phone",
    name: "스마트폰 / 태블릿 / 노트북 충전기",
    voltageType: "safe",
    voltageText: "프리볼트 (100V ~ 240V 지원)",
    guide: "돼지코(11자 변환 플러그)만 끼우면 일본에서 100% 정상 충전됩니다.",
  },
  {
    id: "ap-hairdryer",
    name: "한국 헤어드라이기 / 고데기 (일반형)",
    voltageType: "danger",
    voltageText: "한국 전용 (220V Only)",
    guide:
      "⚠️ 절대 주의: 220V 전용 열기구를 100V 콘센트에 꽂으면 온도가 거의 올라가지 않거나 모터가 망가질 수 있습니다. 반드시 '100-240V' 표기된 프리볼트 제품만 가져가세요.",
  },
  {
    id: "ap-camera",
    name: "카메라 배터리 충전기",
    voltageType: "safe",
    voltageText: "프리볼트 (100V ~ 240V)",
    guide: "돼지코만 끼우면 정상 충전 가능합니다.",
  },
  {
    id: "ap-shaver",
    name: "전기면도기 / 전동칫솔",
    voltageType: "caution",
    voltageText: "기기 뒷면 스펙 확인 필요",
    guide: "충전기 어댑터에 'INPUT: 100-240V'라고 적혀 있는지 확인하세요.",
  },
];

export interface VjwStep {
  step: number;
  title: string;
  detail: string;
  tip: string;
}

export const vjwSteps: VjwStep[] = [
  {
    step: 1,
    title: "Visit Japan Web 계정 생성 및 이용자 등록",
    detail:
      "공식 사이트(vjw-lp.digital.go.jp)에서 본인 및 동반가족 여권 정보 등록",
    tip: "여권 사진면을 촬영해 자동 OCR 등록 가능",
  },
  {
    step: 2,
    title: "입국·귀국 예정 등록",
    detail:
      "여행명(예: 도쿄 3박4일), 항공편명, 일본 내 체류지(호텔명·주소·연락처) 입력",
    tip: "숙소 예약 바우처의 주소(우편번호 7자리)를 미리 복사해 두면 편리",
  },
  {
    step: 3,
    title: "외국인 입국기록 & 세관신고 QR코드 생성",
    detail:
      "질문 사항(범죄 이력, 면세 초과 물품 여부 등) 답변 후 통합 QR코드 발급",
    tip: "통합 QR코드 1개로 입국심사 키오스크와 전자세관신고 게이트 모두 통과",
  },
  {
    step: 4,
    title: "★비행기 탑승 전 QR코드 캡처 저장★",
    detail:
      "일본 공항 도착 시 Wi-Fi 접속이 불안정할 수 있으므로 화면 캡처 필수",
    tip: "갤러리 즐겨찾기 또는 캡처 화면을 오프라인 상태에서도 바로 열 수 있게 준비",
  },
];

export interface EsimTroubleItem {
  problem: string;
  solution: string[];
}

export const esimTroubles: EsimTroubleItem[] = [
  {
    problem: "일본 도착 후 '서비스 없음' 또는 안테나가 안 뜰 때",
    solution: [
      "1. 비행기 모드를 켰다가 10초 후 끄기",
      "2. [설정] > [셀룰러]에서 여행용 eSIM 라인이 '켬'으로 되어 있는지 확인",
      "3. [셀룰러 데이터] 항목에서 여행용 eSIM이 선택되어 있는지 확인",
      "4. 스마트폰을 완전히 재부팅(전원 껐다 켜기)",
    ],
  },
  {
    problem: "안테나는 뜨는데 인터넷(카톡, 웹)이 안 될 때",
    solution: [
      "★가장 흔한 원인★: [설정] > [셀룰러] > [여행용 eSIM] 선택 > 【데이터 로밍】 스위치를 반드시 '켜짐(ON)'으로 설정",
      "국내 통신사 메인 SIM의 데이터 로밍은 '꺼짐'으로 두고, 여행용 eSIM의 데이터 로밍만 켜야 요금 폭탄이 없습니다.",
    ],
  },
  {
    problem: "APN 수동 설정이 필요할 때",
    solution: [
      "통신사 네트워크 선택을 '자동'에서 'SoftBank' 또는 'Docomo'로 수동 변경해 보기",
      "eSIM 구매 시 받은 알림톡/이메일의 APN 이름(예: vmobile.jp 등) 입력 확인",
    ],
  },
];
