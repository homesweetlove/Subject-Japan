# 막차·공연·VIP 기능

## 공항행 막차 타이머

5개 지역·6개 공항의 공식 확인 경로를 제공합니다. 해당 공항으로 갈 때의 출발역·실제 열차 출발 날짜/시각·터미널을 사용자가 확인해 입력하는 방식입니다. 사전 내장 시각이나 모든 날짜에 공통인 '막차 시간'은 없습니다.

| 지역 | 공항/대표 노선 | 공식 안내 |
| --- | --- | --- |
| 도쿄 | 나리타 / 게이세이 | [시간표·경로 검색](https://www.keisei.co.jp/keisei/tetudou/skyliner/us/) |
| 도쿄 | 하네다 / 게이큐 | [공항 접근·시간 검색](https://www.haneda-tokyo-access.com/en/) |
| 오사카 | 간사이 / 난카이 | [공항 접근·시간표](https://www.howto-osaka.com/en/) |
| 후쿠오카 | 후쿠오카 / 시영 지하철 | [노선·공식 안내](https://subway.city.fukuoka.lg.jp/eng/) |
| 삿포로 | 신치토세 / JR 홋카이도 | [공식 시간표 검색 방법](https://www.jrhokkaido.co.jp/global/english/train/index.html) |
| 나고야 | 주부 센트레아 / 메이테츠 | [시간표·막차 검색](https://www.meitetsu.co.jp/eng/) |

출처 확인일: 2026-09-22. 대표 노선 디렉터리이며 모든 철도·버스·환승 경로를 포괄하지 않습니다. 영어 페이지의 시간표 연결을 따라 이용일과 방향을 선택합니다. 실시간 운휴·지연·행사 임시편은 별도 확인해야 합니다.

`parseJapanDateTime`은 UTC+09:00을 명시하고 실제 달력 날짜를 역검증합니다. 자정 이후 00시대는 다음 날짜를 입력하며 `24:30` 같은 운행일 표기는 자동 추측하지 않습니다. 출발 시각이 지나도 다음 날짜로 넘기지 않습니다. 입력은 미래 1년 이내, 이동·승차 여유는 5~180분, 저장은 최대 12개입니다.

카운트다운은 저장된 절대 시각에서 현재 시간을 빼 계산합니다. 백그라운드에서는 화면 갱신을 중지하고 복귀 시 즉시 재계산합니다. 사용자가 `오늘` 탭에서 알림을 켜고 OS 권한을 허용하면, 저장된 막차 타이머와 일정으로 로컬 알림을 계산해 `expo-notifications`로 예약합니다(막차: 역 출발 30분 전·출발 시각, 일정: 선택한 시간 전, 최대 60개). 저장 데이터가 바뀔 때마다 이 앱이 예약한 알림만 지우고 다시 예약합니다. Android 12+에서 정확한 알람 권한이 없으면 OS가 알림을 몇 분 늦출 수 있으므로 막차 판단은 공식 시간표로 해야 합니다. 항공편 출발·체크인 마감 판정도 하지 않습니다. 기기 시계가 잘못되어 있으면 타이머도 영향을 받습니다.

## Android Room

`modules/subject-local-store`는 Room 2.8.5의 Entity·DAO·RoomDatabase와 Expo 브리지를 제공합니다. Room annotation이 붙는 타입은 Java이며 Java annotation processor를 사용합니다. Kotlin은 Expo 브리지에만 사용합니다. 전용 직렬 worker에서 읽기·쓰기를 수행하며 main-thread I/O와 destructive migration은 사용하지 않습니다.

현재 로컬 상태는 작고 함께 초기화해야 하므로 `local_documents` 한 행에 버전 있는 JSON 문서로 저장합니다. 막차 데이터도 이 문서의 `airportReminders`에 포함되며 Room이 실제 저장소입니다. 개별 시간표 행을 쿼리하거나 원격 시간표를 Room에 동기화하는 구조는 아직 아닙니다. DB 스키마 버전은 1, JSON 스키마도 1의 하위 호환 필드 추가입니다. 추후 DB 구조 변경 시 명시적인 Room migration을 추가해야 합니다.

`documentStore.android.ts`가 Room을 선택합니다. 이전 AsyncStorage 데이터를 검증하고 Room 쓰기가 끝난 뒤 기존 키를 제거합니다. 기존 데이터가 손상되면 이전하지 않고, Room 실패 시 AsyncStorage로 무조건 fallback하지 않습니다. iOS·웹·Expo Go에서는 AsyncStorage를 사용합니다. 업데이트 후 구버전 Android 앱으로 다운그레이드해 이전 저장 방식을 다시 사용하는 것은 지원하지 않습니다.

공식 기술 출처: [Android Room 릴리스·설정](https://developer.android.com/jetpack/androidx/releases/room).

## 공연 가이드

공연 접수, 해외 eplus, 로손 해외 이용, 현장 준비의 4개 가이드와 로컬 체크리스트입니다. 구매·결제·회원가입·추첨 응모·티켓 발급을 앱에서 실행하지 않습니다. 현재 진행 중 공연 목록이나 판매 재고를 제공하지 않습니다. 전화번호 인증을 우회하거나 제3자 명의를 사용하는 방식은 안내하지 않습니다.

확인한 공식 출처: [eplus 해외 FAQ](https://ib.eplus.jp/faq), [로손 외국인 안내](https://l-tike.com/guide/en/), [로손 전자티켓 안내](https://l-tike.com/e-tike/navi/guide-top/). 확인일은 2026-09-22입니다. 판매처별 규칙을 모든 공연에 일반화하지 않고 실제 공연의 주최자 조건을 우선 확인하도록 안내합니다.

## 게스트·VIP 패스트트랙

한큐 게스트 쿠폰, 한큐 VIP, 미츠코시이세탄 REWARDS, 다카시마야, 다이마루 도쿄의 5개 가이드입니다. 일반 게스트 카드의 준비 절차와 실적 VIP의 실제 우선 면세를 분리합니다. '패스트트랙' 화면 자체는 우선권이나 예약을 발급하지 않습니다.

[한큐 공식 서비스](https://global.hankyu-hanshin-dept.co.jp/ko/store/hankyuhonten/service/)에서 실적 VIP에게 한정된 우선 면세 수속을 확인했습니다. [미츠코시이세탄 REWARDS](https://cp.mistore.jp/global/en/app/rewards.html)는 공식 앱 등록과 매장 활성화가 필요합니다. 앱은 확인 여부만 보관하고 여권·카드 번호·백화점 계정 정보를 받지 않습니다. 쿠폰 조건과 추가 출처는 [쿠폰 문서](coupons.md)를 참고하세요.
