# SUBJECT:JAPAN

한국 여행자를 위한 일본 여행 유틸리티. Android와 iPhone에서 쓰는 하나의 앱을 목표로 합니다. 첫 번째 기능은 **번역과 내 사이즈를 기억하는 쇼핑 문장**입니다.

## 지금 사용할 수 있는 기능

- 한국어 ↔ 일본어 텍스트 번역: Google ML Kit 기기 내 엔진 (전용 네이티브 빌드)
- 한글/가나/한자 기반 자동 감지, 한국어·일본어 직접 선택 (혼합 문장·숫자는 수동 선택 안내)
- 결과 복사, 원문/번역문 교환, 상대방에게 보여주는 전체화면
- 로컬 최근 번역 100개, 즐겨찾기 100개, 기록 삭제
- 8개 상황별 여행 문장 23개: 쇼핑, 사이즈/재고, 백화점/면세, 식당, 호텔, 예약, 교통, 응급상황
- 첫 실행 프로필 등록 및 사용자 페이지: 닉네임, 상의·하의·신발 사이즈 (모두 선택)
- 사이즈가 들어간 한국어·일본어 쇼핑 문장 자동 완성
- 시스템/라이트/다크 테마, 전체 로컬 데이터 초기화
- 공식/공식 제휴 쿠폰·혜택 13개: 일반 고객용과 외국인·방문객용, 검색·대상/업종 필터·로컬 저장
- 쿠폰 상세: 사용 자격, 최소 구매 조건, 유효기간 안내, 제외 상품, 중복 할인, 공식 출처·확인일
- 공항행 막차 타이머: 도쿄·오사카·후쿠오카·삿포로·나고야의 6개 공항, 공식 안내 링크, 사용자 확인 시각 등록·수정·삭제, 이동 여유 시간, 재시작 후 복원
- J-pop/현지 공연 티켓팅 가이드: 해외 접수·추첨/선착순·결제 마감·수령·입장 체크리스트와 일본어 도움 문장
- 백화점 게스트·VIP 가이드: 발급 동선·사전 준비, 한큐 VIP 우선 면세 자격, 미츠코시이세탄 REWARDS 활성화

**막차 시각은 자동 수집하지 않습니다.** 이용일의 공식 시간표를 확인해 직접 등록하는 카운트다운입니다. 실시간 운휴·지연 반영, 항공편 탑승 가능 판정, 앱 종료 중 알림은 제공하지 않습니다. [여행 기능 설계와 출처](docs/travel.md)를 참고하세요.

예: 상의 `44` 저장 → 사이즈/재고 → `이 제품 44 사이즈도 있나요?` → `この商品の44サイズはありますか？`

쿠폰에는 빅카메라·코지마, 에디온, 스기약국, 사츠도라, 한큐 게스트/VIP, 미츠코시이세탄과 기존 6개 혜택을 포함합니다. 일본의 모든 외국인용 쿠폰을 포괄하거나 실시간 갱신하는 서비스는 아닙니다. 일반 고객용 앱 쿠폰은 일본 서비스 가입·발급 조건을 충족해야 합니다. 실제 쿠폰·QR은 공식 사이트/앱에서 열고, 앱에는 한국어 조건 요약을 보관합니다. [출처와 갱신 정책](docs/coupons.md)을 참고하세요.

**계정 서버와 로그인은 없습니다.** 현재 가입 경험은 로컬 프로필 온보딩입니다. 향후 인증을 추가하더라도 사이즈와 번역 기록은 별도 동의 없이 계정에 업로드하지 않는 구조입니다. 사이즈는 브랜드·국가 규격이 다르므로 자동 환산하지 않습니다. 단위가 필요한 값은 `24 cm`, `28 inch`처럼 입력합니다.

## 기술 선택

React Native + Expo SDK 57 + TypeScript. 공통 UI와 도메인 코드를 사용하면서 Expo 로컬 모듈로 Swift/Kotlin 네이티브 API를 연결합니다. 카메라·음성·NFC를 추가할 수 있도록 Expo Go만을 전제로 하지 않습니다. 현재 최소 iOS 타깃은 16.4이며 Android 타깃은 Expo SDK 기본 설정을 따릅니다.

| 실행 환경 | 지원 범위 |
| --- | --- |
| Android/iOS 전용 빌드 | 일반 텍스트 기기 내 번역 + 모든 로컬 기능 |
| Expo Go | 내장 문장팩·사이즈·쿠폰·막차·가이드 (AsyncStorage 저장) |
| 웹 | 내장 문장팩·사이즈·쿠폰·막차·가이드 (브라우저 저장) |

웹/Expo Go의 임의 문장을 번역한 것처럼 표시하지 않습니다. 지원하지 않는 경우 전용 앱 사용 안내를 표시합니다.

## 실행

Node.js 22.13 이상 (검증 환경: Node 24), npm을 사용합니다.

```sh
npm ci
npm run web          # 브라우저 미리보기
npm start           # Expo 개발 서버
npm run android     # Android SDK/JDK가 있는 환경: 네이티브 빌드 및 실행
npm run ios         # macOS + Xcode + CocoaPods: 네이티브 빌드 및 실행
```

네이티브 모듈 변경 후에는 다시 빌드해야 합니다. Android Studio/에뮬레이터 또는 USB 디바이스, iOS 시뮬레이터/기기가 필요합니다. iOS 기기 배포에는 Apple 서명이 필요합니다.

### 번역팩 설치

1. 전용 네이티브 앱에서 번역 화면을 엽니다.
2. Wi-Fi에 연결하고 `다운로드`를 누릅니다. 한국어·일본어 모델은 각각 수십 MB이며 첫 설치는 시간이 걸릴 수 있습니다.
3. `오프라인 번역 준비 완료` 이후 자유 입력을 번역합니다.
4. 모델 설치 후에는 인터넷 없이 번역할 수 있습니다. 내장 여행 문장은 모델 설치도 필요 없습니다.

모델 다운로드는 명시적인 버튼 동작에만 연결되며 셀룰러 다운로드를 허용하지 않습니다. ML Kit은 한국어↔일본어와 같은 비영어 언어 쌍에서 영어를 중간 언어로 사용할 수 있어 번역 품질에 한계가 있습니다. 출시 전 실제 여행 문장과 일본어 원어민 검수가 필요합니다.

API 키, Firebase 프로젝트 또는 유료 번역 API 설정은 필요 없습니다. Apple Translation도 검토 대상이지만 Android/iOS 공통 동작과 지원 OS 범위를 위해 현재는 ML Kit을 선택했습니다. 향후 클라우드 제공자는 `TranslationProvider` 구현으로 추가하고, 키는 앱에 포함하지 않고 별도 서버에 보관해야 합니다.

### EAS 빌드 (선택)

`eas.json`에 development/preview/production 프로필이 있습니다. Expo 계정·프로젝트 연결 및 서명 정보가 준비된 환경에서 실행합니다. 현재 저장소에는 계정 식별자나 인증서가 없습니다.

```sh
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile development
```

## 프로젝트 구조

```text
App.tsx                           앱 셸, 탭, 프로필 진입, 직렬 상태 변경
src/domain/models.ts              언어/프로필/번역/저장 데이터 타입
src/features/translation/         번역 UI, 입력 검사, provider 계약 및 플랫폼 어댑터
src/features/phrases/             상황별 양방향 문장팩, 로컬 사이즈 치환
src/features/profile/             첫 실행 및 사용자 페이지
src/features/coupons/             공식 혜택 카탈로그, 필터/기간 판단, 목록·상세 화면
src/features/trip/                공항 노선, JST 날짜/카운트다운, 여행 화면
src/features/guides/              공연·게스트/VIP 안내, 준비 체크리스트
src/storage/                     버전 있는 로컬 저장소, 데이터 검증, 기록/즐겨찾기 정책
src/ui/                          공통 컴포넌트, 테마
modules/subject-translator/       ML Kit Swift/Kotlin Expo 모듈
modules/subject-local-store/      Android Room 로컬 DB 및 Expo 브리지
tests/                           제공자 경계·사이즈·저장소 단위 테스트
e2e/                             실제 브라우저 사용자 흐름 테스트
.github/workflows/                품질 검사 및 Android/iOS 네이티브 컴파일
docs/                            개인정보 처리 및 확장 계획
```

UI → `translateText` → `TranslationProvider` → 네이티브 어댑터 순서입니다. 문장팩은 외부 제공자 호출 전에 로컬에서 처리합니다. 제공자에는 문장과 언어 쌍만 전달하며 프로필 객체를 전달하지 않습니다. 사이즈 문장도 현재는 로컬 템플릿으로 처리합니다.

`android/`, `ios/`는 `expo prebuild` 생성물이라 Git에서 제외합니다. 네이티브 수정은 반드시 `modules/` 또는 Expo 설정 플러그인에 보관합니다.

## 검증

```sh
npm run typecheck
npm test
npx expo-doctor
npm run build:bundles             # Android/iOS JS 번들 및 웹 산출물
npx playwright install chromium
npm run test:e2e                  # build:bundles 또는 build:web 이후
```

`expo export`는 Swift/Kotlin 컴파일을 대신하지 않습니다. GitHub Actions의 Native builds 워크플로는 Android debug APK와 iOS simulator용 앱을 컴파일합니다. 로컬 Windows에서는 iOS 네이티브 컴파일을 할 수 없습니다. 실제 모델 다운로드·비행기 모드 번역·디바이스 클립보드는 [기기 검증 체크리스트](docs/device-validation.md)로 별도 확인합니다.

자동 CI는 컴파일만 수행합니다. APK를 GitHub 아티팩트로 보관하려면 Native builds를 수동 실행하며 `upload-artifacts`를 켭니다. 계정의 아티팩트 저장 용량이 남아 있어야 합니다. Debug APK는 개발 서버에 연결하는 개발용 빌드이며, 독립 실행 배포본은 EAS preview/production 프로필로 만듭니다.

Quality 검사는 모든 코드 변경에 실행하며, 네이티브 컴파일은 모듈·플러그인·앱 설정·의존성 변경에 실행합니다. CI 워크플로 자체를 변경했거나 전체 네이티브 재검증이 필요하면 Native builds를 수동 실행합니다.

## 개인정보와 보안

프로필·사이즈·기록·혜택·막차·체크리스트는 기기에만 보관합니다. Android 전용 빌드는 Room 2.8.5 DB를 사용하고 기존 AsyncStorage 데이터를 검증 후 자동 이전합니다. iOS·Expo Go·웹은 같은 저장소 계약의 AsyncStorage 구현을 사용합니다. 자체 서버, 로그인, 광고, 분석 SDK는 없습니다. Android 백업과 iOS AsyncStorage 백업을 비활성화했습니다. 저장소는 앱 수준 암호화 저장소가 아니므로 비밀번호·결제정보 저장에 사용하지 않습니다. [개인정보 처리 설계](docs/privacy.md)를 참고하세요.

`.env*`, 인증서, 키스토어, 플랫폼 서비스 설정은 `.gitignore`로 제외합니다. Expo의 `EXPO_PUBLIC_*`는 공개 번들 값이므로 비밀키를 넣지 않습니다.

빌드 도구 `xcode`의 간접 의존성 `uuid`는 보안 권고 GHSA-w5hq-g745-h8pq를 해결하는 CommonJS 호환 버전 11.1.1로 고정했습니다. `xcode`에서 사용하는 v4 호출과 프로젝트 생성을 CI로 검증합니다. 상위 패키지에서 해결되면 override를 제거합니다.

## 다음 단계

IC CARD · PAY는 아직 준비 상태입니다. COUPON은 공식 출처 기반 카탈로그·게스트/VIP 안내, TRIP은 막차 타이머·공연 가이드가 구현되어 있습니다. 모든 장기 기능이 완료된 것은 아닙니다.

- 카메라 번역: 메뉴판·안내문·영수증·표지판 OCR → 현재 번역 서비스
- 음성 대화: 기기 음성 인식/TTS 지원 여부와 권한을 별도 어댑터로 처리
- 캐주얼/일반 정중/매우 정중: 제공자 기능 지원과 검증된 문장팩을 구분
- 교통카드: NFC-F/FeliCa, 기기 및 OS별 제약 검증 후 읽기 전용 어댑터
- 쿠폰: 공식 혜택 확대, 갱신 파이프라인, 위치 기반 매장 정보 (권한 및 데이터 출처 확인 후)
- 결제: 환율·면세·게스트 할인·카드 혜택 계산 도메인
- 여행: 일정·예약 관리, 계약된 시간표 데이터 제공자 연동, OS별 로컬 알림

세부 설계는 [확장 계획](docs/architecture.md)을 참고하세요.

공식 참고: [Expo 로컬 모듈](https://docs.expo.dev/modules/get-started/), [ML Kit 번역](https://developers.google.com/ml-kit/language/translation), [Android](https://developers.google.com/ml-kit/language/translation/android), [iOS](https://developers.google.com/ml-kit/language/translation/ios).
