# 기기 기능과 결제·여행 도구

## 설치와 권한

`npm ci` 후 새 전용 빌드가 필요합니다. Expo Go/웹에는 `SubjectTravel` 네이티브 모듈이 없어 OCR·음성 인식·NFC를 제공하지 않습니다. 카메라/사진/마이크/음성 인식/위치 권한은 해당 기능에서 요청합니다. 거부 시 원인을 보여주고 텍스트 입력과 오프라인 문장팩을 계속 쓸 수 있습니다.

iPhone 실기기 배포 시 Apple Developer App ID에 **NFC Tag Reading** capability를 활성화하고 프로비저닝을 다시 생성해야 합니다. 저장소 `app.json`에는 TAG entitlement, FeliCa system code `0003`, NFC 사용 설명을 선언했습니다. 이 설정이 Apple 계정의 capability 승인을 대신하지 않습니다. iPad·시뮬레이터 등 NFC 미지원 기기는 스캔할 수 없습니다.

## 사진 번역

TRANSLATE → 카메라 번역 → 한국어/일본어 선택 → 촬영 또는 사진 선택 → OCR 결과 편집 → 번역. 메뉴판·안내문·영수증·표지판을 같은 파이프라인에서 처리합니다. 문서 분석/항목별 영수증 계산이나 카메라 화면 위 실시간 AR 오버레이는 아닙니다. 2,000자를 넘으면 일부를 선택하도록 직접 편집하며 몰래 잘라 번역하지 않습니다. 번역 모델은 텍스트 화면에서 먼저 내려받습니다.

Android: ML Kit text-recognition-japanese / korean 16.0.1 번들 모델. iOS: Vision `VNRecognizeTextRequest`. 외부 OCR API 키나 사진 서버 업로드 없음.

## 음성 대화

언어를 고르고 말하기 → 말하기 끝 → 인식문 수정 → 번역 → 음성 듣기/크게 보기. 한 화면의 대화는 30개, 영구 최근 번역은 공통 100개 정책입니다. 45초 시간 제한과 취소/화면 이탈/백그라운드 정리를 적용했습니다. Android 12(API 31)+ `createOnDeviceSpeechRecognizer`, iOS `requiresOnDeviceRecognition = true` 사용. 서비스·언어 모델 미지원 기기에서는 텍스트 입력을 이용합니다. 완전 자동 동시 통역은 아닙니다.

## NFC 교통카드

실물 Suica/PASMO/ICOCA의 공통 FeliCa 서비스 `0x090f` 최근 기록을 최대 20블록 읽습니다. Android는 `NfcF`, iOS는 `NFCFeliCaTag.readWithoutEncryption` 사용. 명령은 polling/read 뿐이며 쓰기·충전·결제 기능이 없습니다. 읽는 동안 한 장을 고정하세요. 날짜·처리 코드·각 기록의 잔액을 해석하며, 불완전한 응답은 저장하지 않습니다. 카드 브랜드·역명·정확한 이용 금액은 추측하지 않습니다. IDm으로 동일 카드의 최신 스냅샷을 갱신하고 별칭은 유지합니다. 잔액은 마지막 읽기 기록 기준이며 오래된 상태에서도 실시간인 것처럼 표시하지 않습니다.

같은 휴대폰의 Apple Wallet/모바일 Suica 데이터에는 접근하지 않습니다. 실제 Suica/PASMO/ICOCA 각 카드와 기기 조합은 실기기 검증 대상입니다.

## 결제 계산

100엔당 원화 참고 환율을 직접 입력하거나 Frankfurter v2에서 받습니다. 네트워크 실패 시 저장값을 유지합니다. 계산은 사용자 입력 기준: 세금 포함가 → 매장 할인 → 추가 할인 → 세액 역산 → 즉시 면세 또는 추후 환급 → 해외 결제 수수료 → 캐시백. 복수 할인은 중복 사용 확인을 요구합니다. 캐시백은 환급 후 상품가에 적용하고 엔 기준 한도를 둡니다. 환급 수수료 필드는 **환급 세액의 비율**이며 매장 정액/상품가 기준 수수료와 다릅니다. 혼합 세율 장바구니는 나누어 계산해야 합니다. 실제 결제 승인이나 면세 자격 판정은 수행하지 않습니다.

일본 국세청은 2026-11-01부터 리펀드 방식으로 전환한다고 안내합니다. 계산기에서 즉시 차감과 추후 환급을 구분하며 임의로 면세 적용하지 않습니다.

## 주변 매장·여행 일정

주변 검색은 동의할 때만 위치를 받아 Overpass 공개 API로 반경 2km를 조회합니다. 일본 범위만 허용하고 요청 시간을 제한합니다. 결과는 등록된 브랜드의 **매장 후보**이며, 공식 쿠폰의 지점 제외 조건·유효기간·사용 자격을 확인해야 합니다. 만료된 쿠폰은 매장 후보에서 제외합니다. 지도 데이터 누락/잘못된 상호/서버 제한은 있을 수 있으며 자동으로 다른 공급자에 위치를 보내지 않습니다. 지도 데이터 © OpenStreetMap contributors, ODbL.

일정은 일본 날짜·시각, 장소, 예약번호, 메모, 완료 여부를 최대 200개 저장합니다. 실존하는 달력 날짜만 허용하고 수정·삭제·초기화를 지원합니다. 예약을 실제 발권/변경하는 기능은 아닙니다.

## 공식 자료와 구현 대조 (2026-09-22 확인)

- [Android 음성 인식](https://developer.android.com/reference/android/speech/SpeechRecognizer)
- [Apple Speech](https://developer.apple.com/documentation/speech/sfspeechrecognizer)
- [ML Kit 일본어·한국어 OCR](https://developers.google.com/ml-kit/vision/text-recognition/v2/android)
- [Apple Vision](https://developer.apple.com/documentation/vision/vnrecognizetextrequest)
- [Apple FeliCa](https://developer.apple.com/documentation/corenfc/nfcfelicatag)
- [Android NfcF](https://developer.android.com/reference/android/nfc/tech/NfcF)
- [Metrodroid Suica 데이터 해석 참고](https://github.com/metrodroid/metrodroid/tree/master/src/commonMain/kotlin/au/id/micolous/metrodroid/transit/suica) — 바이너리 필드 위치 대조, 코드/역명 데이터베이스 복사 없음
- [Frankfurter API](https://frankfurter.dev/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), [OpenStreetMap 저작권](https://www.openstreetmap.org/copyright)
- [일본 국세청 면세 리펀드 전환](https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/format/002.htm)

## 남은 외부 의존성

일본의 모든 쿠폰을 완전 수집하거나 실시간 갱신한다고 보장하지 않습니다. 전국 쿠폰 배포권/공식 피드와 철도 실시간 시간표는 별도 사업자 데이터 연동이 필요합니다. 임의 문장의 말투 제어는 ML Kit이 지원하지 않아 작성된 문장팩에만 제공합니다. 실기기 검증·Apple 서명·스토어 배포는 CI 컴파일 성공과 별개입니다.
