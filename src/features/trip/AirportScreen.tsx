import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ScreenHeader, Button, Card, Label, styles } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { useTheme } from "../../ui/theme";
import { useNow } from "../../ui/useNow";
import { openTravelLink } from "../guides/links";
import { airportRoutes, regions, type AirportRegion } from "./airports";
import {
  countdown,
  createReminder,
  duration,
  formatLiveJapanTime,
  japanDateTime,
  type AirportReminder,
} from "./countdown";

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 60,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Label muted size={13}>
        {label}
      </Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        maxLength={maxLength}
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: c.line,
          color: c.ink,
          backgroundColor: c.surface,
          padding: 14,
          borderRadius: 12,
          fontSize: 16,
        }}
      />
    </View>
  );
}
export function AirportScreen({
  reminders,
  onSave,
  onDelete,
}: {
  reminders: AirportReminder[];
  onSave: (reminder: AirportReminder) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const c = useTheme();
  const [region, setRegion] = useState<AirportRegion>("도쿄");
  const [routeId, setRouteId] = useState(airportRoutes[0].id);
  const [origin, setOrigin] = useState(airportRoutes[0].origin);
  const [terminal, setTerminal] = useState("");
  const [date, setDate] = useState(() =>
    japanDateTime(Date.now()).slice(0, 10),
  );
  const [time, setTime] = useState("");
  const [buffer, setBuffer] = useState("30");
  const [confirmed, setConfirmed] = useState(false);
  const [openedSource, setOpenedSource] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const route = airportRoutes.find((r) => r.id === routeId)!;
  const sortedReminders = useMemo(
    () => [...reminders].sort((a, b) => a.departureAt - b.departureAt),
    [reminders],
  );
  const selectRoute = (id: string) => {
    const next = airportRoutes.find((r) => r.id === id)!;
    setRegion(next.region);
    setRouteId(id);
    setOrigin(next.origin);
    setTerminal("");
    setTime("");
    setOpenedSource(false);
    setConfirmed(false);
  };
  const run = async (action: () => Promise<void>) => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  const change = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setConfirmed(false);
  };
  return (
    <View style={{ gap: 22 }}>
      <ScreenHeader
        seal="空"
        title="공항으로 가는 마지막 시간"
        subtitle="공식 시간표에서 확인한 막차를 저장하고, 역으로 출발할 시간까지 챙기세요."
      />
      <View
        style={{
          padding: 14,
          borderRadius: 16,
          backgroundColor: c.soft,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 2 }}>
          <Label muted size={11} weight="700">
            일본 현지 실시간 시계 (JST UTC+9)
          </Label>
          <Text
            style={{
              color: c.ink,
              fontSize: 16,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
            }}
          >
            <LiveJapanTime />
          </Text>
        </View>
        <View
          style={{
            backgroundColor: c.accent,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: c.inverse, fontSize: 11, fontWeight: "700" }}>
            LIVE
          </Text>
        </View>
      </View>
      <Card>
        <Label weight="600">확인한 시각으로 작동하는 타이머</Label>
        <Label muted size={13}>
          막차 자동 조회·실시간 운행 연동은 아직 제공하지 않아요. 이용일의
          공항행 시간표를 직접 확인해 등록하세요. 항공편 체크인 마감과 터미널
          이동 시간은 별도로 확인해야 해요. 앱을 닫으면 알림이 울리지 않아요.
        </Label>
      </Card>
      {reminders.length ? (
        <Label weight="700" size={18}>
          저장한 공항행 막차
        </Label>
      ) : null}
      {sortedReminders.map((reminder) => {
          const info = airportRoutes.find((r) => r.id === reminder.routeId)!;
          return (
            <Card key={reminder.id}>
              <Label weight="700" size={19}>
                {reminder.origin} → {info.airport}
              </Label>
              <Label muted size={13}>
                {reminder.terminal} · {info.operator}
              </Label>
              <ReminderCountdown reminder={reminder} />
              <Button
                label={`${info.airport} 운행·시간표 확인`}
                icon="open-outline"
                onPress={() => void run(() => openTravelLink(info.officialUrl))}
              />
              <View style={styles.between}>
                <Button
                  label={`${reminder.origin} 막차 수정`}
                  disabled={busy}
                  onPress={() => {
                    setEditing(reminder.id);
                    setRegion(info.region);
                    setRouteId(info.id);
                    setOrigin(reminder.origin);
                    setTerminal(reminder.terminal);
                    setDate(japanDateTime(reminder.departureAt).slice(0, 10));
                    setTime(japanDateTime(reminder.departureAt).slice(11));
                    setBuffer(String(reminder.bufferMinutes));
                    setOpenedSource(false);
                    setConfirmed(false);
                    setMessage("아래 등록 양식에서 시각을 수정해 주세요.");
                  }}
                />
                <Button
                  label={
                    deleting === reminder.id
                      ? "이 막차 삭제 확인"
                      : `${reminder.origin} 막차 삭제`
                  }
                  disabled={busy}
                  onPress={() => {
                    if (deleting !== reminder.id) {
                      setDeleting(reminder.id);
                      return;
                    }
                    void run(async () => {
                      await onDelete(reminder.id);
                      setDeleting(null);
                      if (editing === reminder.id) setEditing(null);
                    });
                  }}
                />
              </View>
            </Card>
          );
        })}
      <Label size={20} weight="700">
        {editing ? "막차 수정" : "막차 등록"}
      </Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {regions.map((value) => (
          <Choice
            key={value}
            label={value}
            selected={region === value}
            onPress={() =>
              selectRoute(airportRoutes.find((r) => r.region === value)!.id)
            }
          />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        {airportRoutes
          .filter((r) => r.region === region)
          .map((value) => (
            <Choice
              key={value.id}
              label={`${value.airport} · ${value.operator}`}
              selected={value.id === routeId}
              onPress={() => selectRoute(value.id)}
            />
          ))}
      </View>
      <Label muted size={13}>
        {route.terminalNote}
      </Label>
      <Button
        label="공식 시간표 열기"
        icon="open-outline"
        onPress={() =>
          void run(async () => {
            await openTravelLink(route.officialUrl);
            setOpenedSource(true);
          })
        }
      />
      <Field label="출발역" value={origin} onChange={change(setOrigin)} />
      <Field
        label="이용 터미널"
        value={terminal}
        onChange={change(setTerminal)}
        placeholder="예: 제1터미널 국제선"
        maxLength={40}
      />
      <Field
        label="열차 출발 날짜 (일본)"
        value={date}
        onChange={change(setDate)}
        placeholder="YYYY-MM-DD"
        maxLength={10}
      />
      <Field
        label="확인한 막차 시각 (일본)"
        value={time}
        onChange={change(setTime)}
        placeholder="HH:mm"
        maxLength={5}
      />
      <Label muted size={12}>
        자정 이후 00:30 출발은 실제 다음 날짜로 입력하세요. 예: 9월 22일 밤
        이후라면 9월 23일 00:30.
      </Label>
      <Field
        label="역까지 이동·승차 여유 (분)"
        value={buffer}
        onChange={setBuffer}
        maxLength={3}
      />
      <Choice
        checkbox
        label="공식 시간표의 날짜·출발역·공항 방향을 확인했어요"
        selected={confirmed}
        onPress={() => setConfirmed((v) => !v)}
      />
      {!openedSource ? (
        <Label muted size={12}>
          공식 시간표 버튼에서 날짜별 막차를 확인할 수 있어요.
        </Label>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: c.error }}>
          {error}
        </Text>
      ) : null}
      {message ? <Label>{message}</Label> : null}
      <Button
        label={editing ? "막차 변경 저장" : "막차 타이머 저장"}
        primary
        busy={busy}
        onPress={() =>
          void run(async () => {
            const reminder = createReminder({
              id:
                editing ??
                `train-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              routeId,
              origin,
              terminal,
              date,
              time,
              buffer,
              confirmed,
            });
            await onSave(reminder);
            setEditing(null);
            setConfirmed(false);
            setTime("");
            setMessage("막차 타이머를 이 기기에 저장했어요.");
          })
        }
      />
      {editing ? (
        <Button
          label="수정 취소"
          onPress={() => {
            setEditing(null);
            setTime("");
            setConfirmed(false);
          }}
        />
      ) : null}
    </View>
  );
}

/** Only this line re-renders every second, not the whole form. */
function LiveJapanTime() {
  const now = useNow(1000);
  return <>{formatLiveJapanTime(now).fullText}</>;
}

/** The live part of a saved last-train card. */
function ReminderCountdown({ reminder }: { reminder: AirportReminder }) {
  const c = useTheme();
  const now = useNow(1000);
  const timer = countdown(reminder, now);
  return (
    <>
      <Text
        style={{
          color: timer.phase === "upcoming" ? c.accent : c.error,
          fontSize: 32,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
        }}
      >
        {timer.phase === "departed"
          ? "출발 시각이 지났어요"
          : duration(timer.departureMs)}
      </Text>
      <Label muted size={13}>
        {timer.phase === "departed"
          ? "다음 날 막차로 자동 변경하지 않아요. 다른 이동편을 확인하세요."
          : "등록한 열차 출발까지 남은 시간"}
      </Label>
      <Label weight="600">
        {timer.phase === "upcoming"
          ? `역으로 출발하기까지 ${duration(timer.leaveMs)}`
          : timer.phase === "leave-now"
            ? "설정한 이동 여유 시간에 들어왔어요"
            : "운행 여부는 공식 안내에서 확인"}
      </Label>
      <Label muted size={13}>
        열차 출발 {japanDateTime(reminder.departureAt)} JST{"\n"}역으로 출발{" "}
        {japanDateTime(timer.leaveAt)} JST · 여유 {reminder.bufferMinutes}분
        {"\n"}사용자 확인 {japanDateTime(reminder.verifiedAt)} JST
      </Label>
      {timer.needsReview ? (
        <Label muted size={13}>
          확인 후 하루가 지났어요. 시간표·운행 변경을 다시 확인하세요.
        </Label>
      ) : null}
    </>
  );
}
