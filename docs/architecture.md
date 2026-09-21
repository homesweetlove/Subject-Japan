# 확장 경계

앱은 계정 없이 작동하는 로컬 중심 구조입니다. `features`에는 화면과 도메인 조합, `storage`에는 영속화, `modules`에는 플랫폼 SDK만 둡니다.

## 번역

`TranslationProvider`는 `available`, `isReady`, `prepare`, `translate`를 제공하며 UI가 Google API를 직접 호출하지 않습니다. `translateText`가 길이·언어 검증과 내장 문장팩 우선 처리를 맡습니다. 새 엔진은 제공자 계약만 구현합니다. 특정 엔진 장애 시 사용자의 동의 없이 클라우드로 원문을 보내는 자동 fallback은 두지 않습니다.

현재 언어 감지는 문자 휴리스틱입니다. 중국어 한자와 일본어 한자 구별, 로마자 일본어, 한일 혼합 입력을 완벽히 감지하지 않습니다. 입력 범위를 한국어/일본어로 한정하고 모호한 값은 수동 선택으로 해결합니다. 엔진 호출 중 입력이 바뀌면 이전 결과를 무시합니다.

최근 기록과 즐겨찾기는 별도로 보관합니다. 같은 원문·번역·방향은 중복 저장하지 않습니다. 영속화 완료 후 상태를 반영하고 변경 요청을 직렬화해 빠른 연속 조작의 덮어쓰기를 막습니다. 손상/미지원 버전 데이터는 자동 초기화하지 않습니다.

## 신규 기능

| 기능 | 새 경계 | 확인할 제약 |
| --- | --- | --- |
| 카메라/OCR | `features/camera`, OCR provider | 권한, 이미지 회전·영역 선택, 문자 인식 품질, 이미지 로컬 처리 |
| 음성 대화 | speech recognizer/TTS adapter | OS별 오프라인 지원, 마이크 권한, 발화 중단 |
| 정중함 | provider capabilities + curated phrases | ML Kit에 보장 없는 기능을 파라미터만으로 가장하지 않기 |
| IC 카드 | `features/ic-card`, NFC reader module | Android NFC-F와 iOS Core NFC/FeliCa 지원, 시스템 월렛 접근 제약 |
| 쿠폰 | coupon repository | 공식 URL/검증일/유효기간/조건, 위치 권한은 필요할 때 요청 |
| 결제 | 독립 계산 함수 | 통화 최소단위, 할인 적용 순서, 환율 기준 시각 |
| 여행 | trip repository | 버전 있는 데이터 마이그레이션, 백업/내보내기 동의 |

기존 로컬 상태를 확장할 때는 버전 마이그레이션과 손상 복구 테스트를 함께 추가합니다. 규모가 커지면 AsyncStorage에서 SQLite로 이동하되 화면 대신 repository 경계를 교체합니다. 계정 도입은 로컬 프로필의 서버 동기화를 의미하지 않습니다.
