# 안정성 점검과 검증 기록 — 2026-10-22

> 이 문서는 2026-10-22 당시의 점검 기록입니다. 이후 2026-11-16에는 Quality·Android/iOS 시뮬레이터/네이티브 빌드·Android 테스트 APK CI가 성공했습니다. 최신 결과는 [기기 검증 기록](device-validation.md)과 [릴리스 현황](release-status.md)에 분리해 기록합니다. 실기기 검증은 여전히 별개입니다.

기준: `main`의 `24e3ff8`. Windows, Node.js 24, npm. 이 기록은 소스·자동 테스트 결과와 실기기 검증을 구분한다. 모델 추론·마이크·카드 판독을 모의 응답으로 테스트한 결과는 하드웨어 성공으로 세지 않는다.

## 우선순위와 수정 범위

| 우선순위 | 발견한 문제 | 조치와 판단 |
| --- | --- | --- |
| P1 데이터 보존 | 첫 Room 이전과 쓰기가 겹치면 예전 데이터가 새 상태를 덮어쓸 수 있음. 빈 저장 문자열을 신규 설치로 취급 | 읽기·이전·쓰기 직렬화. 손상 데이터는 실패로 표시하고 자동 초기화하지 않음 |
| P1 복원 | 다른 JSON이나 부분 손상 백업을 정제해 복원하면 기존 데이터를 잃을 수 있음. 최대 데이터의 백업 크기가 이전 1MB 한도 초과 | 핵심 필드와 정제 전후 값 보존 검사. 손실 있는 백업 거부. 실제 내보낸 백업의 재복원 가능성 검사 |
| P1 네이티브 수명 | 권한 응답 뒤 화면이 사라져도 마이크 시작 가능, 취소 뒤 늦은 콜백, OCR 방향·작업 종료 처리 부족 | 작업 토큰·중단 처리, Vision 방향 처리, 번역 클라이언트 수명 관리. 네이티브 컴파일·실기기 검증은 미완료 |
| P1 번역 신뢰성 | 모델 준비·빈 번역 응답을 성공으로 취급할 여지 | 준비 후 모델 재확인, 네이티브 브리지에서도 모델 설치·입력 검증, 빈 결과 거부 |
| P1 환율 신뢰성 | 미입력 환율에 900원을 적용해 원화 표시. 응답이 수동 편집을 덮어쓸 수 있음 | 실제 입력/조회값 없으면 원화 숨김. 편집 시 기존 조회 취소, 중복 조회 억제 |
| P1 CI | Expo SDK 패치 버전 불일치, 최근 러너 시작 불가 | SDK 57 안에서 공식 호환 버전 정렬. 계정 결제/한도 문제는 코드 변경으로 해결 불가 |
| P2 사용자 흐름 | 사이즈 문장 결과 확인·크게 보기, 저장 실패·연속 조작·접근성 보완 필요 | 기존 문장팩/프로필 흐름 개선, 공통 전체화면 표시, 회귀 테스트 추가 |
| P2 알림·복귀 | 비동기 예약 작업 겹침, 앱을 연 알림 응답 누락, 오류 무시 | 예약 직렬화·기존 예약 보존·실패 표시, 콜드 스타트 처리, 복귀 시 재동기화 |
| P2 화면 | 고정 헤더 높이, 작은 프로필 터치 영역, 오래된 날씨의 상대 날짜 표시 | 최소 높이·44pt 터치·탭 폭 조정, 저장 날씨는 실제 날짜 표시, 복귀 시 시각/날씨 갱신 |

대규모 구조 전환·새 서버·유료 API·클라우드 번역은 추가하지 않았다. Room DB 버전과 로컬 JSON v1 키를 유지했다. iOS 저장소는 AsyncStorage이며 Room과 동일한 JSON 계약을 사용한다. 원문·사진·음성·사이즈를 임의로 업로드하는 경로는 추가하지 않았다. 저장소는 앱 수준 암호화 저장소가 아니므로 민감한 결제정보 보관용이 아니다.

## 구조와 의존성

- Expo SDK 57 / React Native 0.86.3 / React 19.2.3 / TypeScript. `App.tsx`에서 상태 커밋을 직렬화하고 `src/features`가 화면과 도메인 작업을 조합한다.
- `modules/subject-translator`: Android/iOS ML Kit 한↔일 번역. Wi-Fi로 모델을 준비한 뒤 기기 내 처리. 모델이 없으면 자유 입력 번역은 실패하고 안내한다.
- `modules/subject-travel`: Android ML Kit OCR·SpeechRecognizer·NfcF, iOS Vision·Speech·Core NFC. JS 어댑터는 지원하지 않는 환경을 성공으로 위장하지 않는다.
- `modules/subject-local-store`: Android Room 2.8.5. `src/storage`가 AsyncStorage 이전과 백업/복원을 담당한다. iOS·웹·Expo Go는 AsyncStorage.
- SDK 메이저 업그레이드는 피하고 `expo install --fix`의 57 호환 패치를 적용했다. `npm audit fix`는 강제 메이저 변경 없이 적용했다.

## Actions 실제 로그

- [2026-10-02 Quality](https://github.com/homesweetlove/Subject-Japan/actions/runs/36978538341): typecheck와 110개 단위 테스트 통과. Expo Doctor가 `expo`, `expo-build-properties`, `expo-image-picker`, `expo-location` 패치 불일치로 실패하여 이후 번들/E2E 단계는 실행되지 않았다.
- [2026-10-19 Quality](https://github.com/homesweetlove/Subject-Japan/actions/runs/39215226682): 단계 목록이 비어 있음. check-run annotation: “The job was not started because recent account payments have failed or your spending limit needs to be increased.” 계정 설정이 원인이며 테스트 실패와 다르다. 사용자는 이번 작업에서 결제 설정 변경이 어렵다고 확인했다.
- Quality의 기존 typecheck·단위 테스트·Doctor·번들·Playwright 단계는 유지했다. 수동 재실행을 위한 `workflow_dispatch`를 추가했다. 실패한 검사를 제거하거나 `continue-on-error`로 우회하지 않았다.

## 실행 결과

아래는 최종 통합 코드에 대한 로컬 결과다. Node.js 24.20.0 / npm 11.19.0을 사용했다.

| 검증 | 결과와 범위 |
| --- | --- |
| 기준 단위 테스트 | 110/110 통과 |
| 통합 typecheck | 통과 |
| 통합 단위 테스트 | 10개 파일, 144/144 통과. 새 네이티브 어댑터 검사는 모의 브리지 사용 |
| Expo Doctor | 21/21 통과, `expo install --check` 통과 |
| JS export | Android/iOS/web 모두 성공. Swift/Kotlin 컴파일과 별개 |
| Android prebuild | `expo prebuild --platform android --no-install` 성공 |
| Android native build | `gradlew.bat :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --no-daemon` 실행 실패: JAVA_HOME 미설정·java 없음. Android SDK도 미설치. 소스 컴파일 단계에 도달하지 못함 |
| iOS simulator/native build | 미실행: Windows, Xcode·CocoaPods·macOS 없음. GitHub macOS 러너는 계정 제한으로 사용 불가 |
| Playwright E2E | 첫 통합 실행 6통과/3실패: `result === null` 상태에서 `result.source` 접근으로 번역 화면 충돌. 명시적 null 가드 수정. 중간 14통과/1실패는 새 언어 태그 변경 이전 번들을 검사한 결과이며 재export 후 해소. 최종 15/15를 3회 연속 통과(12.9초 / 13.8초 / 14.8초) |
| npm audit | 최초 21건(critical 1, high 18, moderate 2) → 호환 업데이트 뒤 high 15건. 남은 근본 권고는 braces와 node-forge, Expo/Metro 도구 체인으로 전파. npm 제안 강제 해결은 Expo 44로 다운그레이드하므로 적용하지 않음. 보안 문제가 모두 해결됐다고 주장하지 않음 |

처음 샌드박스에서 Vitest는 임시 디렉터리 ENOENT로 테스트를 로드하지 못했다. 동일 명령을 정상 로컬 권한으로 재실행해 통과했다. 테스트 삭제나 검증 코드 완화로 해결하지 않았다.

독립 Agency Code Reviewer가 저장·네이티브·화면·알림 변경을 검토했다. 발견한 P2는 iOS의 반복 `stopListening`이 최종 인식 대기 작업을 취소하는 문제였으며, `finalizing` 상태와 반복 중단 무시 처리로 수정했다. Swift 실행 검증은 여전히 남아 있다.

생성된 iOS 설정을 introspection으로 확인했다: TAG entitlement와 FeliCa `0003`, 권한 설명 유지. ATS `NSAllowsArbitraryLoads`를 `false`로 명시하고 개발용 로컬 네트워크만 허용했다. NFC capability의 Apple 서명 유효성과 실제 dev-client 연결은 확인하지 못했다.

## 릴리스 전 남은 확인

네이티브 변경은 컴파일과 기기 검증이 모두 남아 있다. 따라서 이 PR을 iPhone 출시 준비 완료로 간주하지 않는다.

1. 계정 Actions 제한 해소 뒤 Quality와 Native builds(Android·iOS)를 다시 실행한다. CI 성공 확인 전 `main` 병합은 보류한다.
2. Apple App ID의 NFC Tag Reading capability·프로비저닝·서명을 확인하고 실물 iPhone에 설치한다. 선언된 TAG entitlement/FeliCa `0003`은 서명 승인을 대신하지 않는다. iPad/시뮬레이터 NFC는 지원 대상이 아니다.
3. 모델 미설치·다운로드 실패·재시작·비행기 모드에서 문장팩 밖의 한↔일 번역을 확인한다. OS/저장 공간 정책에 따라 모델이 제거될 수 있으므로 준비 상태를 다시 검사한다.
4. 실제 회전 사진·HEIC·한국어/일본어 OCR, 제한된 사진 권한·카메라 거부·촬영 취소를 확인한다.
5. 양 언어 기기 내 음성 모델, 마이크/음성 권한 거부, 말하기 끝·전화·백그라운드·TTS 중단을 확인한다.
6. 실물 Suica/PASMO/ICOCA의 1~19건·20건 기록, 여러 카드·중도 제거·취소·재시도를 확인한다. 짧은 기록에 대한 오류를 정상 종료로 임의 해석하지 않는다. 같은 휴대폰 Wallet 카드는 조회하지 않는다.
7. 기존 설치를 삭제하지 않고 업데이트하여 Room/iOS 저장 데이터 보존, 저장 공간 부족·복원·전체 초기화를 확인한다.
8. 작은 iPhone·노치·Dynamic Type 최대 크기·VoiceOver·TalkBack·키보드·다크 모드, 앱 종료/재시작 뒤 로컬 알림과 탭 이동을 검증한다. 브라우저 화면 검사는 iOS 접근성 인증이 아니다.

UI 방향은 기존 따뜻한 배경·주황 강조색을 유지하며, 사용자가 저장한 사이즈를 선택한 직후 일본어를 읽고 보여주기 쉽게 하는 데 집중했다. 장식 애니메이션보다 기존 모달 전환과 사용자 상태 피드백을 우선했다.

참고: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Apple NFC HIG](https://developer.apple.com/design/human-interface-guidelines/nfc), [Core NFC](https://developer.apple.com/documentation/corenfc), [ML Kit 번역](https://developers.google.com/ml-kit/language/translation). 세부 실기기 절차는 [기기 검증 체크리스트](device-validation.md)를 따른다.
