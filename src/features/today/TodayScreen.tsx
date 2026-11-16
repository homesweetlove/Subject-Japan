import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Text, View } from "react-native";
import type { LocalState } from "../../domain/models";
import {
  Badge,
  Button,
  Card,
  Icon,
  Label,
  ScreenHeader,
  styles,
  type IconName,
} from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { elevation, radius, useTheme } from "../../ui/theme";
import { useNow } from "../../ui/useNow";
import { airportRoutes } from "../trip/airports";
import { countdown } from "../trip/countdown";
import type { TripSection } from "../trip/TripScreen";
import {
  jstClock,
  jstHeadline,
  nextReminder,
  nextTripItem,
  relativeTime,
  TRIP_LEAD_OPTIONS,
  tripItemTime,
  type NotificationSettings,
} from "./model";
import { notifier, type PermissionState } from "./notifications";
import {
  japanDay,
  refundSummary,
  type DutyFreeReceipt,
} from "../pay/taxFreeTracker";
import { japanDate, japanHoliday } from "./holidays";
import {
  fetchQuakes,
  intensityAdvice,
  intensityLabel,
  intensityRank,
  notableQuake,
  QUAKE_PAGE_URL,
  type Quake,
} from "./quakes";
import { openTravelLink } from "../guides/links";
import { recommendedArrival } from "../pay/airportTaxFree";
import {
  departureAirportName,
  departureTime,
  type Departure,
} from "../trip/departure";
import {
  describeWeather,
  fetchWeather,
  isWeatherStale,
  WEATHER_ATTRIBUTION,
  weatherCities,
  type WeatherCityId,
  type WeatherSnapshot,
} from "./weather";
import { Press } from "../../ui/Press";
import { TranslationDisplay } from "../../ui/TranslationDisplay";

export type AppTab = "today" | "card" | "translate" | "pay" | "trip";
/** Where Today can send the traveller: a tab, or the coupon side of cards. */
export type NavTarget = AppTab | "coupon";

export function TodayScreen({
  state,
  onNavigate,
  onWeatherCity,
  onWeather,
  onNotifications,
  onOpenRefunds,
  onOpenTaxFreeGuide,
}: {
  state: LocalState;
  onNavigate: (tab: NavTarget, section?: TripSection) => void;
  /** Opens PAY on the tax-free receipts list. */
  onOpenRefunds?: () => void;
  /** Opens PAY on the tax-free guide (airport planner). */
  onOpenTaxFreeGuide?: () => void;
  onWeatherCity: (id: WeatherCityId) => Promise<void>;
  onWeather: (w: WeatherSnapshot) => Promise<void>;
  onNotifications: (s: NotificationSettings) => Promise<void>;
}) {
  const c = useTheme();
  // Shared 30-second clock: paused in the background, refreshed on return.
  const now = useNow(30000);
  const trip = nextTripItem(state.tripItems, now);
  const reminder = nextReminder(state.airportReminders, now);
  const card = [...state.transitCards].sort((a, b) => b.readAt - a.readAt)[0];
  const rate = state.exchangeRate;
  // The sentence last shown to a clerk, one tap away for the next clerk.
  const lastShown = state.history.find((t) => t.target === "ja");
  const [showingLast, setShowingLast] = useState(false);
  return (
    <View style={{ gap: 18 }}>
      <ScreenHeader
        title={
          state.profile.nickname
            ? `${state.profile.nickname}님의 오늘`
            : "오늘의 여행"
        }
        subtitle={`일본 시각 ${jstHeadline(now)}`}
      />
      {lastShown && (
        <Card tone="muted">
          <Label muted size={13}>
            방금 보여준 문장
          </Label>
          <Label weight="700" size={17}>
            {lastShown.original}
          </Label>
          <Button
            label="다시 보여주기"
            icon="expand-outline"
            primary
            onPress={() => setShowingLast(true)}
          />
        </Card>
      )}
      <TranslationDisplay
        closeLabel="닫기"
        value={showingLast && lastShown ? lastShown : null}
        onClose={() => setShowingLast(false)}
      />
      <HolidayNote now={now} />
      <Card>
        <SectionTitle icon="calendar-outline" title="다음 일정" />
        {trip ? (
          <Press
            accessibilityRole="button"
            accessibilityLabel={`${trip.title} 일정 보기`}
            onPress={() => onNavigate("trip", "itinerary")}
            style={{ gap: 4 }}
          >
            <View style={styles.between}>
              <Label size={24} weight="700" style={{ flexShrink: 1 }}>
                {trip.title}
              </Label>
              <Badge
                label={relativeTime(tripItemTime(trip) - now)}
                tone="accent"
              />
            </View>
            <Label muted size={14}>
              {trip.when} (일본 시각){trip.place ? ` · ${trip.place}` : ""}
            </Label>
          </Press>
        ) : (
          <>
            <Label muted size={14}>
              다가오는 일정이 없어요. 호텔 체크인이나 예약을 적어 두면 여기에
              보여 드려요.
            </Label>
            <Button
              label="일정 추가하기"
              icon="add"
              onPress={() => onNavigate("trip", "itinerary")}
            />
          </>
        )}
      </Card>
      {state.departure && (
        <DepartureCard
          departure={state.departure}
          receipts={state.dutyFreeReceipts}
          now={now}
          onOpen={onOpenTaxFreeGuide ?? (() => onNavigate("pay"))}
        />
      )}
      <WeatherCard
        city={state.weatherCity}
        weather={state.weather}
        onCity={onWeatherCity}
        onWeather={onWeather}
      />
      <QuakeCard
        autoCheck={state.weatherCity !== null}
        onGuide={() => onNavigate("trip", "emergency")}
      />
      <RefundCard
        receipts={state.dutyFreeReceipts}
        now={now}
        onOpen={onOpenRefunds ?? (() => onNavigate("pay"))}
      />
      {reminder && (
        <LastTrainCard
          reminder={reminder}
          now={now}
          onOpen={() => onNavigate("trip", "airport")}
        />
      )}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Tile
          icon="swap-horizontal"
          label="환율"
          value={
            rate
              ? `¥1,000 ≈ ₩${Math.round(rate.krwPer100Jpy * 10).toLocaleString()}`
              : "환율 입력"
          }
          hint={rate ? `${rate.date} 기준` : "PAY에서 설정"}
          onPress={() => onNavigate("pay")}
        />
        <Tile
          icon="card-outline"
          label="카드"
          value={
            card
              ? `¥${card.entries[0].balance.toLocaleString()}`
              : state.membershipCards.length
                ? `멤버십 ${state.membershipCards.length}개`
                : "열기"
          }
          hint={
            card
              ? `${card.name || "내 카드"} 마지막 잔액 · 멤버십 ${state.membershipCards.length}개`
              : state.membershipCards.length
                ? "저장한 멤버십 열기"
                : "교통카드와 멤버십"
          }
          onPress={() => onNavigate("card")}
        />
      </View>
      <Card>
        <SectionTitle icon="flash-outline" title="바로 가기" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Shortcut
            icon="language"
            label="번역"
            onPress={() => onNavigate("translate")}
          />
          <Shortcut
            icon="medkit"
            label="긴급 SOS"
            onPress={() => onNavigate("trip", "emergency")}
          />
          <Shortcut
            icon="restaurant"
            label="식당 카드"
            onPress={() => onNavigate("trip", "dining")}
          />
          <Shortcut
            icon="ticket"
            label="쿠폰"
            onPress={() => onNavigate("coupon")}
          />
        </View>
      </Card>
      <NotificationCard
        settings={state.notifications}
        onChange={onNotifications}
      />
    </View>
  );
}

function SectionTitle({
  icon,
  title,
  trailing,
}: {
  icon: IconName;
  title: string;
  trailing?: ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={styles.between}>
      <View style={styles.row}>
        <Icon name={icon} size={18} color={c.accent} />
        <Label size={15} weight="700">
          {title}
        </Label>
      </View>
      {trailing}
    </View>
  );
}

function WeatherCard({
  city,
  weather,
  onCity,
  onWeather,
}: {
  city: WeatherCityId | null;
  weather: WeatherSnapshot | null;
  onCity: (id: WeatherCityId) => Promise<void>;
  onWeather: (w: WeatherSnapshot) => Promise<void>;
}) {
  const c = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const inflight = useRef<AbortController | null>(null);
  const load = async (id: WeatherCityId) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setBusy(true);
    setError("");
    try {
      const w = await fetchWeather(id, controller.signal);
      if (!controller.signal.aborted) await onWeather(w);
    } catch (e) {
      if (inflight.current === controller)
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "날씨를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
    } finally {
      clearTimeout(timeout);
      // Saving the result re-runs the effect below, whose cleanup clears
      // inflight first; without the null case the spinner could stay on.
      if (inflight.current === controller || inflight.current === null) {
        inflight.current = null;
        setBusy(false);
      }
    }
  };
  // Fetch only after the user has chosen a city, and only when the cache is old.
  useEffect(() => {
    const refresh = () => {
      if (city && isWeatherStale(weather, city)) void load(city);
    };
    refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      sub.remove();
      inflight.current?.abort();
      inflight.current = null;
    };
  }, [city, weather?.fetchedAt]);
  const cityName = weatherCities.find((x) => x.id === city)?.name;
  const current = weather && weather.cityId === city ? weather : null;
  const picker = (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {weatherCities.map((x) => (
        <Choice
          key={x.id}
          label={x.name}
          selected={x.id === city}
          onPress={() => {
            setPicking(false);
            void onCity(x.id).catch(() =>
              setError("선택한 도시를 저장하지 못했어요. 다시 시도해 주세요."),
            );
          }}
        />
      ))}
    </View>
  );
  if (!city)
    return (
      <Card>
        <SectionTitle icon="partly-sunny-outline" title="현지 날씨" />
        <Label muted size={13}>
          도시를 고르면 일본 기상청(JMA)에서 그 도시의 3일 예보와 현재 기온을
          받아와요. 내 위치는 보내지 않아요.
        </Label>
        {picker}
      </Card>
    );
  const now = current ? describeWeather(current.days[0].code) : null;
  const t = (v: number | null) => (v === null ? "–" : `${Math.round(v)}°`);
  return (
    <Card>
      <SectionTitle
        icon="partly-sunny-outline"
        title={`${cityName} 날씨`}
        trailing={
          <Press
            accessibilityRole="button"
            accessibilityLabel="날씨 도시 변경"
            onPress={() => setPicking((v) => !v)}
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Label size={13} weight="700" style={{ color: c.accent }}>
              {picking ? "닫기" : "도시 변경"}
            </Label>
          </Press>
        }
      />
      {picking && picker}
      {current && now ? (
        <>
          <View style={[styles.row, { gap: 14 }]}>
            <Icon name={now.icon} size={40} color={c.ink} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.ink,
                  fontSize: 34,
                  fontWeight: "800",
                  letterSpacing: -1,
                }}
              >
                {current.temperature !== null
                  ? `${Math.round(current.temperature)}°`
                  : t(current.days[0].max)}
              </Text>
              <Label muted size={13}>
                {now.label}
                {current.temperature !== null
                  ? ` · 최고 ${t(current.days[0].max)} / 최저 ${t(current.days[0].min)}`
                  : " · 오늘 예상 최고"}
                {current.days[0].rainChance !== null
                  ? ` · 강수 ${current.days[0].rainChance}%`
                  : ""}
              </Label>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {current.days.map((d, i) => {
              const info = describeWeather(d.code);
              return (
                <View
                  key={d.date}
                  style={{
                    flex: 1,
                    backgroundColor: c.soft,
                    borderRadius: radius.md,
                    padding: 10,
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Label size={12} weight="700">
                    {d.date ===
                    new Date(Date.now() + (i * 24 + 9) * 3600000)
                      .toISOString()
                      .slice(0, 10)
                      ? ["오늘", "내일", "모레"][i]
                      : d.date.slice(5)}
                  </Label>
                  <Icon name={info.icon} size={20} />
                  <Label size={12}>
                    {t(d.max)} / {t(d.min)}
                  </Label>
                  {d.rainChance !== null && (
                    <Label size={11} muted>
                      비 {d.rainChance}%
                    </Label>
                  )}
                </View>
              );
            })}
          </View>
          <Label muted size={11}>
            {current.observedAt
              ? `기온 ${current.observedAt.slice(11, 16)} 관측 · `
              : ""}
            {relativeFetched(current.fetchedAt)} 갱신 · {WEATHER_ATTRIBUTION}
          </Label>
        </>
      ) : (
        !error && (
          <Label muted size={13}>
            날씨를 불러오는 중이에요…
          </Label>
        )
      )}
      {!!error && (
        <View accessibilityRole="alert" style={{ gap: 8 }}>
          <Label size={13}>{error}</Label>
        </View>
      )}
      {(!!error || (current && Date.now() - current.fetchedAt > 5 * 60000)) && (
        <Button
          label="날씨 새로고침"
          icon="refresh"
          variant="ghost"
          busy={busy}
          onPress={() => void load(city)}
        />
      )}
    </Card>
  );
}
function relativeFetched(at: number) {
  const m = Math.floor((Date.now() - at) / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}

function LastTrainCard({
  reminder,
  now,
  onOpen,
}: {
  reminder: NonNullable<ReturnType<typeof nextReminder>>;
  now: number;
  onOpen: () => void;
}) {
  const c = useTheme();
  const cd = countdown(reminder, now);
  const route = airportRoutes.find((r) => r.id === reminder.routeId);
  const urgent = cd.phase === "leave-now";
  return (
    <Card tone={urgent ? "accent" : "default"}>
      <SectionTitle
        icon="airplane-outline"
        title="공항 막차"
        trailing={
          <Badge
            label={urgent ? "지금 출발" : `${relativeTime(cd.leaveMs)} 출발`}
            tone="accent"
          />
        }
      />
      <Press
        accessibilityRole="button"
        accessibilityLabel="막차 타이머 보기"
        onPress={onOpen}
        style={{ gap: 4 }}
      >
        <Label size={17} weight="700">
          {reminder.origin} → {route?.airport ?? "공항"}
        </Label>
        <Label muted size={14}>
          역 출발 {jstClock(cd.leaveAt)} · 막차 {jstClock(reminder.departureAt)}{" "}
          (일본 시각)
        </Label>
        {cd.needsReview && (
          <Label size={12} style={{ color: c.accentInk }}>
            저장한 지 하루가 지났어요. 공식 시간표를 다시 확인하세요.
          </Label>
        )}
      </Press>
    </Card>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  hint: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        {
          flex: 1,
          backgroundColor: pressed || hovered ? c.surfacePressed : c.surface,
          borderRadius: radius.lg,
          padding: 16,
          gap: 6,
        },
        elevation(c),
      ]}
    >
      <View style={styles.row}>
        <Icon name={icon} size={16} color={c.muted} />
        <Label size={12} weight="700" muted>
          {label}
        </Label>
      </View>
      <Label size={17} weight="800">
        {value}
      </Label>
      <Label size={11} muted>
        {hint}
      </Label>
    </Press>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: "40%",
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        backgroundColor: pressed ? c.softPressed : c.soft,
      })}
    >
      <Icon name={icon} size={20} color={c.accent} />
      <Label size={14} weight="700">
        {label}
      </Label>
    </Press>
  );
}

function NotificationCard({
  settings,
  onChange,
}: {
  settings: NotificationSettings;
  onChange: (s: NotificationSettings) => Promise<void>;
}) {
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (notifier.available)
      void notifier.permission().then(setPermission, () => setPermission(null));
  }, []);
  const save = async (next: NotificationSettings) => {
    setNotice("");
    try {
      await onChange(next);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "설정을 저장하지 못했어요.");
    }
  };
  const enable = async () => {
    setBusy(true);
    setNotice("");
    try {
      const result = await notifier.request();
      setPermission(result);
      if (result === "granted") await save({ ...settings, enabled: true });
      else
        setNotice(
          "알림 권한이 꺼져 있어요. 기기 설정 > 앱 > Subject Japan에서 알림을 허용해 주세요.",
        );
    } catch {
      setNotice("알림 권한을 요청하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  if (!notifier.available)
    return (
      <Card tone="muted">
        <SectionTitle icon="notifications-outline" title="막차·일정 알림" />
        <Label muted size={13}>
          앱이 꺼져 있어도 받는 알림은 Android·iPhone 전용 앱에서 사용할 수
          있어요.
        </Label>
      </Card>
    );
  const on = settings.enabled && permission === "granted";
  return (
    <Card>
      <SectionTitle
        icon="notifications-outline"
        title="막차·일정 알림"
        trailing={on ? <Badge label="켜짐" tone="success" /> : undefined}
      />
      <Label muted size={13}>
        막차는 역 출발 30분 전과 출발 시각에, 일정은 아래에서 고른 시간 전에
        기기 안에서 알려요. 잠금화면에 보일 수 있어 예약번호·메모·주소는 넣지
        않아요.
      </Label>
      {on ? (
        <>
          <Label size={13} weight="700">
            일정 알림 시점
          </Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TRIP_LEAD_OPTIONS.map((m) => (
              <Choice
                key={m}
                label={
                  m === 0
                    ? "일정 알림 끄기"
                    : m >= 60
                      ? `${m / 60}시간 전`
                      : `${m}분 전`
                }
                selected={settings.tripLeadMinutes === m}
                onPress={() => void save({ ...settings, tripLeadMinutes: m })}
              />
            ))}
          </View>
          <Label muted size={12}>
            Android는 절전 상태에 따라 알림이 몇 분 늦을 수 있어요. 막차 시각은
            공식 시간표로 직접 확인하세요.
          </Label>
          <Button
            label="알림 끄기"
            variant="ghost"
            onPress={() => void save({ ...settings, enabled: false })}
          />
        </>
      ) : (
        <Button
          label="알림 켜기"
          icon="notifications"
          primary
          busy={busy}
          onPress={() => void enable()}
        />
      )}
      {!!notice && (
        <View accessibilityRole="alert">
          <Label size={13}>{notice}</Label>
        </View>
      )}
    </Card>
  );
}

/**
 * Tax still owed back under the refund method. Shown only while there is
 * something to do or to receive; the nearest 90-day deadline turns red
 * in its last week.
 */
function RefundCard({
  receipts,
  now,
  onOpen,
}: {
  receipts: DutyFreeReceipt[];
  now: number;
  onOpen: () => void;
}) {
  const c = useTheme();
  const summary = refundSummary(receipts, now);
  if (!summary.expectedJpy && !summary.lostJpy) return null;
  const daysLeft =
    summary.nextDeadline === null
      ? null
      : Math.ceil((summary.nextDeadline - now) / 86400000);
  const urgent = daysLeft !== null && daysLeft <= 7;
  return (
    <Card>
      <SectionTitle icon="receipt-outline" title="돌려받을 면세 세금" />
      <Press
        accessibilityRole="button"
        accessibilityLabel={`돌려받을 면세 세금 약 ${summary.expectedJpy}엔, 면세 기록 보기`}
        onPress={onOpen}
        style={{ gap: 4 }}
      >
        <Text
          style={{
            color: c.ink,
            fontSize: 28,
            fontWeight: "800",
            fontVariant: ["tabular-nums"],
          }}
        >
          약 ¥{summary.expectedJpy.toLocaleString()}
        </Text>
        {summary.nextDeadline !== null && daysLeft !== null ? (
          <Label size={14} style={{ color: urgent ? c.error : c.accentInk }}>
            세관 확인 전 영수증 {summary.waitingCount}장 · 마감{" "}
            {japanDay(summary.nextDeadline)} ({daysLeft}일 남음)
          </Label>
        ) : (
          <Label muted size={14}>
            세관 확인을 마쳤어요. 환급이 들어오면 '환급 받음'으로 바꿔 주세요.
          </Label>
        )}
        {summary.lostJpy > 0 && (
          <Label size={13} style={{ color: c.error }}>
            90일이 지나 못 받게 된 세금 약 ¥{summary.lostJpy.toLocaleString()}
          </Label>
        )}
        <Label muted size={12}>
          짐 맡기기 전에 공항 세관 기계에 여권을 대야 돌려받아요.
        </Label>
      </Press>
    </Card>
  );
}

/** Japanese public holidays today or tomorrow: crowds, closed banks. */
function HolidayNote({ now }: { now: number }) {
  const c = useTheme();
  const today = japanHoliday(japanDate(now));
  const tomorrow = japanHoliday(japanDate(now + 86400000));
  if (!today && !tomorrow) return null;
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: c.accentSoft,
          borderRadius: radius.md,
          padding: 12,
          alignItems: "flex-start",
        },
      ]}
    >
      <Icon name="flag-outline" size={18} color={c.accentInk} />
      <Label size={13} style={{ flex: 1, color: c.accentInk }}>
        {today
          ? `오늘은 일본 공휴일 ${today}이에요. 관광지·열차가 붐비고 은행·일부 관공서는 쉬어요.`
          : `내일은 일본 공휴일 ${tomorrow}이에요. 인기 식당·관광지는 미리 예약하세요.`}
      </Label>
    </View>
  );
}

/** The flight home: days left and when to be at the airport. */
function DepartureCard({
  departure,
  receipts,
  now,
  onOpen,
}: {
  departure: Departure;
  receipts: DutyFreeReceipt[];
  now: number;
  onOpen: () => void;
}) {
  const c = useTheme();
  const at = departureTime(departure);
  if (at < now) return null;
  const waiting = refundSummary(receipts, now).waitingCount;
  const plan = recommendedArrival({
    departure: at,
    receipts: waiting,
    holiday: japanHoliday(departure.date) !== null,
  });
  const days = Math.round(
    (Date.parse(`${departure.date}T00:00:00+09:00`) -
      Date.parse(`${japanDate(now)}T00:00:00+09:00`)) /
      86400000,
  );
  return (
    <Card>
      <SectionTitle icon="airplane-outline" title="일본을 떠나는 날" />
      <Press
        accessibilityRole="button"
        accessibilityLabel="출국 정보와 공항 도착 시간 보기"
        onPress={onOpen}
        style={{ gap: 4 }}
      >
        <View style={styles.between}>
          <Label size={19} weight="700">
            {departureAirportName(departure)} 공항 {departure.time} 출발
          </Label>
          <Badge
            label={days === 0 ? "오늘" : days === 1 ? "내일" : `D-${days}`}
            tone="accent"
          />
        </View>
        <Label size={14} style={{ color: c.accentInk }}>
          {days === 0 ? "" : `${departure.date} `}
          {jstClock(plan.arriveAt)}까지 공항 도착 (일본 시각)
        </Label>
        <Label muted size={12}>
          {waiting > 0
            ? `세관 확인할 면세 영수증 ${waiting}장 포함해 계산했어요. 짐 맡기기 전 세관 기계부터.`
            : "면세 영수증이 없으면 공항 안내대로 2시간 전 기준이에요."}
        </Label>
      </Press>
    </Card>
  );
}

/**
 * Recent earthquakes from JMA. Checked automatically only when the user has
 * already allowed JMA requests by picking a weather city; otherwise one tap.
 */
function QuakeCard({
  autoCheck,
  onGuide,
}: {
  autoCheck: boolean;
  onGuide: () => void;
}) {
  const c = useTheme();
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "done"; quake: Quake | null; checkedAt: number }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);
  const check = async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const timeout = setTimeout(() => current.abort(), 10000);
    setState({ kind: "loading" });
    try {
      const list = await fetchQuakes(current.signal);
      if (controller.current !== current) return;
      const checkedAt = Date.now();
      setState({
        kind: "done",
        quake: notableQuake(list, checkedAt),
        checkedAt,
      });
    } catch (e) {
      if (controller.current !== current) return;
      setState({
        kind: "error",
        message:
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "지진 정보를 가져오지 못했어요.",
      });
    } finally {
      clearTimeout(timeout);
    }
  };
  useEffect(() => {
    if (autoCheck) void check();
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, [autoCheck]);
  const quake = state.kind === "done" ? state.quake : null;
  const strong = quake && intensityRank(quake.intensity) >= intensityRank("5-");
  return (
    <Card tone={strong ? "accent" : "default"}>
      <SectionTitle icon="pulse-outline" title="최근 지진 (기상청)" />
      {state.kind === "idle" ? (
        <Button
          label="지난 24시간 지진 확인"
          icon="refresh-outline"
          size="sm"
          onPress={() => void check()}
        />
      ) : state.kind === "loading" ? (
        <Label muted size={13}>
          확인하는 중이에요…
        </Label>
      ) : state.kind === "error" ? (
        <>
          <Label muted size={13}>
            {state.message}
          </Label>
          <Button
            label="다시 확인"
            size="sm"
            variant="ghost"
            onPress={() => void check()}
          />
        </>
      ) : quake ? (
        <View style={{ gap: 4 }}>
          <Label
            size={19}
            weight="800"
            style={strong ? { color: c.error } : undefined}
          >
            최대 진도 {intensityLabel(quake.intensity)}
            {quake.magnitude !== null ? ` · 규모 ${quake.magnitude}` : ""}
          </Label>
          <Label size={14}>
            {quake.place} · {jstClock(quake.at)} (일본 시각)
          </Label>
          <Label muted size={13}>
            {intensityAdvice(quake.intensity)}
          </Label>
        </View>
      ) : (
        <Label muted size={13}>
          지난 24시간 동안 진도 3 이상 지진은 없었어요.
        </Label>
      )}
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        <Button
          label="지진 대피 요령"
          icon="shield-checkmark-outline"
          size="sm"
          variant="ghost"
          onPress={onGuide}
        />
        <Button
          label="기상청 지진 지도"
          icon="open-outline"
          size="sm"
          variant="ghost"
          onPress={() => void openTravelLink(QUAKE_PAGE_URL).catch(() => {})}
        />
      </View>
    </Card>
  );
}
