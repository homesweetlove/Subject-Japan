[![English](https://img.shields.io/badge/README-English-24292f?style=for-the-badge)](./README.md) [![한국어](https://img.shields.io/badge/README-%ED%95%9C%EA%B5%AD%EC%96%B4-24292f?style=for-the-badge)](./README.ko.md)

# SUBJECT:JAPAN

한국 여행자를 위한 일본 여행 유틸리티. Android와 iPhone에서 쓰는 하나의 앱을 목표로 합니다. 첫 번째 기능은 **번역과 내 사이즈를 기억하는 쇼핑 문장**입니다.

## 사용자 문제와 개발 동기

일본 매장에서 필요한 문장을 급히 찾거나, 사이즈를 매번 다시 입력하는 불편을 줄이기 위해 시작했습니다. 통신이 불안정한 여행 중에도 저장한 사이즈와 작성된 쇼핑 문장을 즉시 꺼내 직원에게 보여주는 것이 핵심입니다. 자유 입력 번역은 기기 내 모델이 준비된 전용 앱에서 처리합니다.

**핵심 흐름:** 내 사이즈 저장 → 번역의 사이즈/재고 문장 선택 → 일본어 확인·크게 보기 → 필요하면 즐겨찾기 → 앱을 다시 열어 재사용. 저장 실패 시 기존 데이터를 유지하고 오류를 안내합니다.

**2026-10-22 품질 점검:** SDK 57 호환 패치 정렬, 저장·복원 및 네이티브 작업 수명·쇼핑 흐름·알림 경쟁 상태를 개선했습니다. 로컬 검증과 미실행 검증, 실제 Actions 실패 원인은 [품질 점검 기록](docs/quality-audit.md)에 구분했습니다. 계정 결제/한도 문제로 GitHub 러너가 시작되지 않으며, 새 Android/iOS 네이티브 컴파일과 실기기 통과는 확인되지 않았습니다.

## 구현 상태와 실기기 검증 범위

아래 기능 목록은 **소스에 구현된 기능과 UI 경로**를 설명합니다. Android·iOS 네이티브 모듈에 번역, OCR, 기기 내 음성 인식, FeliCa 읽기 코드가 존재하지만, 이것이 모든 실기기에서 정상 동작함을 보증하지는 않습니다. 기종·OS·언어팩·권한·서명에 따라 지원 범위가 달라집니다. Expo Go와 웹은 별도 제한 기능만 제공합니다.

**iPhone 출시 전 검증이 필요한 부분:** 실제 서명된 앱 설치, 한↔일 오프라인 번역, 카메라·마이크, Apple NFC capability와 실물 Suica/PASMO/ICOCA(기록이 20건보다 적은 카드 포함), 로컬 알림. CI에는 Android/iOS 빌드 구성이 있으나 이번 환경에서는 새 네이티브 컴파일을 완료하거나 실기기를 테스트하지 못했습니다. [실기기 검증 체크리스트](docs/device-validation.md)를 참고하세요.

## 소스에 구현된 기능

- 오늘(홈): 일본 시각, 선택한 도시의 현재 기온·3일 예보(일본 기상청 JMA, 무료·상업 이용 가능, 출처 표시), 다음 일정·공항 막차 카운트다운, 환율·교통카드 잔액, 번역·긴급 SOS·식당 카드·쿠폰 바로 가기
- 막차·일정 로컬 알림 (전용 앱): 막차 역 출발 30분 전·출발 시각, 일정 30분/1/2시간 전. 서버·푸시 토큰 없이 기기에서 예약하며 잠금화면 노출을 고려해 예약번호·메모·주소는 넣지 않음

- 카메라·사진 번역: 일본어/한국어 OCR → 편집 → 기기 내 번역 (사진은 업로드하지 않음)
- 음성 대화: 기기 내 음성 인식 → 원문 확인 → 번역 → 시스템 음성 읽기, 양방향 대화 기록
- 실물 Suica/PASMO/ICOCA NFC 읽기, 마지막 잔액·최대 20건 기록, 카드 20장 이름 관리, 원화 환산
- PAY & 금융 도우미:
  - 참고 환율 자동 최신화(기본 꺼짐, 켜면 PAY 진입 시 6시간 이상 지난 값 갱신)·수동 환율, 입력/조회한 환율 기반 엔화-원화 환산표
  - 순차 할인·면세/추후 환급·수수료·캐시백 계산기
  - 면세 & 세관 한도 추적기: 일본 5,000엔 면세 달성 체크 및 대한민국 입국 세관 $800 면세 한도 추적 (주류 2병·2L·$400, 담배 200개비, 향수 100ml 별도 한도 관리)
  - 동전 지갑 털기 계산기: 거스름돈 동전 개수를 최소화하는 스마트 지폐+동전 지불 조합 계산
  - 와리캉 (더치페이) 정산기: 1인당 엔화·원화 부담액 및 100엔 단위 올림/내림 정산
  - 일본 ATM 수수료 & 트래블카드(트래블로그·트래블월렛·토스) 무료 출금 가이드
  - 한·일 의류 & 신발 규격 대조표 (한국 mm/호수 ↔ 일본 cm/호수 ↔ US/EU)
- TRIP & 여행 유틸리티 20선:
  - 식당 필수 표현 & 와사비 빼기 등 주문 카드 (전체화면 모달 지원)
  - 오토오시(お通し, 자릿세) 인원별 계산기 및 거절 가능 여부 가이드
  - 음식 알레르기 & 기피 식재료 일본어 문장 생성기 및 보여주기 카드
  - 라멘 취향 빌더: 면 익힘(카타메)·국물 진하기·마늘 양 주문서 자동 생성
  - 교통 패스 vs Suica(IC카드) 본전 비교 계산기 (도쿄 서브웨이 24/48/72시간권, 오사카 주유패스 등)
  - 신칸센 특대하물(대형 캐리어) 160cm 초과 사전 예약 필수 규정 및 위약금 안내
  - 도쿄 & 오사카 지하철 노선 기호·색상 식별표 및 주요 정차역 안내
  - 일본 택시 예상 요금 계산기 (심야 할증 20% 반영) & 자동문 탑승 매너
  - 일본 길거리 쓰레기 분리배출 요령 (자판기 재활용통 주의사항)
  - 온천 & 센토 목욕 에티켓 및 문신(타투) 허용 규정
  - 신사 & 사찰 테미즈야(손 씻기) 및 2배 2박수 1배 참배 순서
  - 호텔 & 료칸 매너, 유카타 좌우 깃 방향(왼쪽 깃 위) 및 짐 보관 일본어
  - 100V 전압 호환성(프리볼트 vs 220V 드라이기 고장 위험) 체커
  - Visit Japan Web (VJW) 단계별 등록 체크리스트 및 오프라인 캡처 팁
  - 일본 현지 eSIM / 로밍 데이터 장애 시 긴급 해결 가이드
  - 내 여행 데이터 JSON 백업(클립보드 1분 후 자동 삭제)과 검증 후 복원
  - 긴급 SOS & 지원 가이드: 경찰(110)·구급(119)·#7119·영사콜센터·주일 대사관/총영사관 긴급 원터치 연결, 응급 일본어 카드 전체화면, 지진 대응 요령
  - 쇼핑 & 필수 준비물 체크리스트: 드럭스토어·돈키호테 추천템 및 내 사이즈(상의/하의/신발) 퀵뷰 연동
  - 공항행 막차 타이머 & 실시간 JST 시계: 도쿄·오사카·후쿠오카·삿포로·나고야의 6개 공항, 일본 표준시(JST UTC+9) 실시간 시계, 카운트다운 동기화
  - 여행 일정·예약번호·메모 200개, 완료 체크·수정·삭제·지도 연결
  - J-pop/현지 공연 티켓팅 가이드: 해외 접수·추첨/선착순·결제 마감·수령·입장 체크리스트와 일본어 도움 문장

**막차 시각은 자동 수집하지 않습니다.** 이용일의 공식 시간표를 확인해 직접 등록하는 카운트다운입니다. 실시간 운휴·지연 반영과 항공편 탑승 가능 판정은 제공하지 않습니다. 전용 앱에서 알림을 켜면 역 출발 30분 전과 출발 시각에 기기 내 로컬 알림을 보냅니다(Android는 절전 상태에 따라 몇 분 늦을 수 있음). [여행 기능 설계와 출처](docs/travel.md)를 참고하세요.

예: 상의 `44` 저장 → 사이즈/재고 → `이 제품 44 사이즈도 있나요?` → `この商品の44サイズはありますか？`

쿠폰에는 빅카메라·코지마, 에디온, 스기약국, 사츠도라, 한큐 게스트/VIP, 미츠코시이세탄과 기존 6개 혜택을 포함합니다. 일본의 모든 외국인용 쿠폰을 포괄하거나 실시간 갱신하는 서비스는 아닙니다. 일반 고객용 앱 쿠폰은 일본 서비스 가입·발급 조건을 충족해야 합니다. 실제 쿠폰·QR은 공식 사이트/앱에서 열고, 앱에는 한국어 조건 요약을 보관합니다. [출처와 갱신 정책](docs/coupons.md)을 참고하세요.

**계정 서버와 로그인은 없습니다.** 현재 가입 경험은 로컬 프로필 온보딩입니다. 향후 인증을 추가하더라도 사이즈와 번역 기록은 별도 동의 없이 계정에 업로드하지 않는 구조입니다. 사이즈는 브랜드·국가 규격이 다르므로 자동 환산하지 않습니다. 단위가 필요한 값은 `24 cm`, `28 inch`처럼 입력합니다.

## 기술 선택

React Native + Expo SDK 57 + TypeScript. 공통 UI와 도메인 코드를 사용하면서 Expo 로컬 모듈로 Swift/Kotlin 네이티브 API를 연결합니다. 카메라·음성·NFC를 추가할 수 있도록 Expo Go만을 전제로 하지 않습니다. 현재 최소 iOS 타깃은 16.4이며 Android 타깃은 Expo SDK 기본 설정을 따릅니다.

공통 화면/도메인 → 제공자 인터페이스 → 로컬 Swift/Kotlin 모듈의 경계를 유지합니다. Android Room과 iOS AsyncStorage는 같은 v1 JSON 계약을 사용합니다. 데이터 이전과 상태 변경은 직렬화하고, 지원하지 않는 저장 버전은 자동 삭제하지 않습니다. [아키텍처](docs/architecture.md)

네트워크 없이 쓰는 문장팩은 빠르고 예측 가능하지만 자유로운 표현을 모두 다루지는 못합니다. 자유 번역의 로컬 모델은 최초 다운로드와 기기 저장 공간이 필요하며 문장팩의 말투 제어를 보장하지 않습니다. 하나의 공통 UI는 유지보수 비용을 줄이지만 실제 VoiceOver·Dynamic Type·Android 뒤로 가기 동작은 플랫폼별 검증이 필요합니다. 새 SDK 메이저 전환보다 현재 SDK의 호환 패치를 선택해 변경 범위를 줄였습니다.

| 실행 환경 | 지원 범위 |
| --- | --- |
| Android/iOS 전용 빌드 | 일반 텍스트 기기 내 번역 + 모든 로컬 기능 |
| Expo Go | 내장 문장팩·사이즈·쿠폰·막차·가이드 (AsyncStorage 저장) |
| 웹 | 내장 문장팩·사이즈·쿠폰·막차·가이드 (브라우저 저장) |

웹/Expo Go의 임의 문장을 번역한 것처럼 표시하지 않습니다. 지원하지 않는 경우 전용 앱 사용 안내를 표시합니다.

## 실행

### Android 테스트 APK 다운로드

[GitHub Releases](https://github.com/homesweetlove/Subject-Japan/releases)에서 **Subject Japan Android Test** 릴리스의 `Subject-Japan-android-test-arm64.apk`를 내려받아 설치합니다. ARM64 Android 기기용이며 개발 서버나 Expo Go 없이 실행합니다. 설치된 앱 이름은 **Subject Japan Test**입니다. 처음 자유 입력 번역을 사용할 때는 Wi-Fi로 번역팩을 내려받습니다.

테스트 전용 패키지 `com.subjectjapan.app.preview`는 정식 앱과 데이터가 분리됩니다. APK는 Expo 템플릿의 테스트 서명을 사용하며 Play Store 배포본이 아닙니다. 키 파일은 저장소나 릴리스에 올리지 않습니다. 다음 테스트 APK도 GitHub Actions의 **Android test APK → Run workflow**에서 생성할 수 있으며, 번들 포함·서명·패키지 ID를 검사한 후 GitHub 프리릴리스에 APK와 SHA-256을 게시합니다.

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
src/features/trip/                공항 노선, JST 카운트다운, 일정·예약 관리
src/features/cards/               FeliCa 기록 검증·해석, 여러 카드 관리
src/features/pay/                 환율·할인·면세·환급·캐시백 계산
src/features/tools/               OCR·음성·NFC 네이티브 어댑터
src/features/guides/              공연·게스트/VIP 안내, 준비 체크리스트
src/storage/                     버전 있는 로컬 저장소, 데이터 검증, 기록/즐겨찾기 정책, 백업 검증·복원
src/ui/                          디자인 시스템: 테마 토큰(와시·슈 팔레트), ScreenHeader·SubNav·Card·Button 등 공통 컴포넌트
modules/subject-translator/       ML Kit Swift/Kotlin Expo 모듈
modules/subject-local-store/      Android Room 로컬 DB 및 Expo 브리지
modules/subject-travel/           Android ML Kit / Apple Vision OCR, 음성 인식, NFC
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

프로필·사이즈·기록·교통카드·환율·일정·혜택·막차·체크리스트는 기기에만 보관합니다. Android 전용 빌드는 Room 2.8.5 DB를 사용하고 기존 AsyncStorage 데이터를 검증 후 자동 이전합니다. iOS·Expo Go·웹은 같은 저장소 계약의 AsyncStorage 구현을 사용합니다. 자체 서버, 로그인, 광고, 분석 SDK는 없습니다. Android 백업과 iOS AsyncStorage 백업을 비활성화했습니다. 저장소는 앱 수준 암호화 저장소가 아니므로 비밀번호·결제정보 저장에 사용하지 않습니다. [개인정보 처리 설계](docs/privacy.md)를 참고하세요.

`.env*`, 인증서, 키스토어, 플랫폼 서비스 설정은 `.gitignore`로 제외합니다. Expo의 `EXPO_PUBLIC_*`는 공개 번들 값이므로 비밀키를 넣지 않습니다.

빌드 도구 `xcode`의 간접 의존성 `uuid`는 보안 권고 GHSA-w5hq-g745-h8pq를 해결하는 CommonJS 호환 버전 11.1.1로 고정했습니다. `xcode`에서 사용하는 v4 호출과 프로젝트 생성을 CI로 검증합니다. 상위 패키지에서 해결되면 override를 제거합니다.

## 다음 단계

여섯 탭에 기존 기능을 연결했습니다. 하드웨어·외부 데이터 의존성은 다음과 같습니다.

- NFC: 실물 FeliCa 카드 읽기 전용. 동일 휴대폰 Wallet 카드 조회·충전·결제는 미지원입니다. iPhone 배포 서명에 NFC Tag Reading capability가 필요합니다. 역명 DB는 포함하지 않습니다.
- 사진: Android는 번들 ML Kit 일본어/한국어 OCR, iOS는 Vision. 손글씨·세로쓰기·영수증의 작은 글자는 인식 오류가 있을 수 있어 수정 후 번역합니다.
- 음성: Android 12 이상 및 기기 내 인식 서비스, iOS는 언어별 `supportsOnDeviceRecognition` 지원이 필요합니다. 지원하지 않으면 서버 인식으로 전환하지 않습니다. TTS는 기기 시스템 음성 서비스를 사용합니다.
- 정중함: 미리 작성한 문장팩 23개에 3가지 표현을 제공합니다. ML Kit 자유 입력 번역에는 말투 제어 API가 없어 임의 문장의 정중함 변환은 미지원입니다.
- 주변 쿠폰: OpenStreetMap에 등록된 매장 후보입니다. 검색할 때 동의 후 약 100m 단위 좌표를 Overpass에 전송하며, 지점의 쿠폰 사용 가능 여부를 보장하지 않습니다. 일본의 모든 쿠폰 수집·자동 갱신은 아직 제공하지 않습니다.
- 막차: 확인한 시간 수동 등록 방식입니다. 실시간 운행·자동 막차 검색은 별도 시간표 공급자가 필요합니다. 앱 종료 중 알림은 전용 앱의 로컬 알림으로 제공하며 웹/브라우저는 지원하지 않습니다.
- 결제: 참고 계산이며 매장 승인·카드사 청구 금액을 보장하지 않습니다. 2026-11-01 면세 환급 방식 전환 안내와 국세청 출처를 제공합니다.

기능별 사용법·제약과 공식 자료는 [기기 기능 안내](docs/device-features.md)에 정리했습니다.
세부 설계는 [확장 계획](docs/architecture.md)을 참고하세요.

공식 참고: [Expo 로컬 모듈](https://docs.expo.dev/modules/get-started/), [ML Kit 번역](https://developers.google.com/ml-kit/language/translation), [Android](https://developers.google.com/ml-kit/language/translation/android), [iOS](https://developers.google.com/ml-kit/language/translation/ios).
