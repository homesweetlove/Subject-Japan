# 확장 경계

앱은 계정 없이 작동하는 로컬 중심 구조입니다. `features`에는 화면과 도메인 조합, `storage`에는 영속화, `modules`에는 플랫폼 SDK만 둡니다.

## 번역

`TranslationProvider`는 `available`, `isReady`, `prepare`, `translate`를 제공하며 UI가 Google API를 직접 호출하지 않습니다. `translateText`가 길이·언어 검증과 내장 문장팩 우선 처리를 맡습니다. 새 엔진은 제공자 계약만 구현합니다. 특정 엔진 장애 시 사용자의 동의 없이 클라우드로 원문을 보내는 자동 fallback은 두지 않습니다.

현재 언어 감지는 문자 휴리스틱입니다. 중국어 한자와 일본어 한자 구별, 로마자 일본어, 한일 혼합 입력을 완벽히 감지하지 않습니다. 입력 범위를 한국어/일본어로 한정하고 모호한 값은 수동 선택으로 해결합니다. 엔진 호출 중 입력이 바뀌면 이전 결과를 무시합니다.

최근 기록과 즐겨찾기는 별도로 보관합니다. 같은 원문·번역·방향은 중복 저장하지 않습니다. 영속화 완료 후 상태를 반영하고 변경 요청을 직렬화해 빠른 연속 조작의 덮어쓰기를 막습니다. 손상/미지원 버전 데이터는 자동 초기화하지 않습니다.

## 신규 기능

쿠폰 초기 기능은 `features/coupons`의 독립 카탈로그·조건 모델·화면으로 구현되어 있습니다. 검색/대상/업종 필터, 일본 시간 만료 판단과 검토일 경과 표시를 순수 함수로 분리했습니다. `savedCouponIds`는 로컬 v1 스키마에 추가된 필드로, 이전 설치 데이터에서는 빈 배열로 기본화하며 프로필과 번역 기록을 유지합니다. 향후 원격 카탈로그 저장소·위치 검색은 별도 경계로 추가합니다. 자세한 관리 정책은 [쿠폰 문서](coupons.md)를 참고하세요.

| 기능 | 새 경계 | 확인할 제약 |
| --- | --- | --- |
| 카메라/OCR | `features/camera`, OCR provider | 권한, 이미지 회전·영역 선택, 문자 인식 품질, 이미지 로컬 처리 |
| 음성 대화 | speech recognizer/TTS adapter | OS별 오프라인 지원, 마이크 권한, 발화 중단 |
| 정중함 | provider capabilities + curated phrases | ML Kit에 보장 없는 기능을 파라미터만으로 가장하지 않기 |
| IC 카드 | `features/ic-card`, NFC reader module | Android NFC-F와 iOS Core NFC/FeliCa 지원, 시스템 월렛 접근 제약 |
| 쿠폰 확장 | 원격 coupon repository / store locator | 공식 조건 갱신·캐시 정책, 위치 권한은 필요할 때 요청 |
| 결제 | 독립 계산 함수 | 통화 최소단위, 할인 적용 순서, 환율 기준 시각 |
| 여행 | trip repository | 버전 있는 데이터 마이그레이션, 백업/내보내기 동의 |

Android 전용 앱의 documentStore는 Room 기반 SQLite로 전환했습니다. iOS·웹은 같은 계약 아래 AsyncStorage를 사용합니다. `airportReminders`, `guideChecks`는 기존 v1 상태를 유지하는 추가 필드이며 기존 설치에서는 빈 배열로 읽습니다. Room 이전의 실패·손상·정리 실패 테스트를 포함합니다. 계정 도입은 로컬 프로필의 서버 동기화를 의미하지 않습니다. [여행 기능의 경계와 출처](travel.md)를 참고하세요.


## 구현 업데이트 (2026-09-22)

`subject-travel` 네이티브 모듈과 `travelTools` 어댑터가 OCR·기기 내 음성 인식·NFC를 담당합니다. 사진 인식문과 음성 인식문은 공통 `translateText` 서비스로 전달합니다. `TranslationHub`의 모드 전환 시 진행 중인 녹음/스캔을 종료하며 오래된 결과로 화면을 덮어쓰지 않습니다. 문장팩에는 작성된 3단계 말투를 추가했으며 자유 입력에 접미사를 붙여 정중한 번역이라고 위장하지 않습니다.

카드 디코더·결제 계산·일정 검증·거리/브랜드 매칭은 UI와 분리된 순수 함수입니다. `LocalState` v1에 `transitCards`, `exchangeRate`, `tripItems`를 추가하고 누락된 이전 데이터에는 기본값을 적용합니다. 각 항목을 검증/중복 제거한 뒤 로드하며 기존 직렬 커밋과 Room/AsyncStorage 저장 계약을 그대로 사용합니다. 거래/프로필/예약 정보는 외부 공급자 요청에 들어가지 않습니다. 자세한 네트워크 경계는 privacy.md를 참고하세요.
