import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { LocalState } from "../../domain/models";
import { ScreenHeader, Button, Card, Label, styles } from "../../ui/components";
import { Choice } from "../../ui/Choice";
import { useTheme } from "../../ui/theme";
import {
  BACKUP_CLIPBOARD_TTL_MS,
  backupSummary,
  encodeBackup,
  parseBackup,
} from "../../storage/backup";
import { applianceChecks, esimTroubles, vjwSteps } from "./digitalUtilities";

// Module scope so the wipe still runs after the user leaves this screen.
let clipboardWipe: ReturnType<typeof setTimeout> | undefined;
/** Wipe the backup from the shared clipboard unless something else was copied. */
function scheduleClipboardWipe(json: string, onDone: () => void) {
  clearTimeout(clipboardWipe);
  clipboardWipe = setTimeout(() => {
    clipboardWipe = undefined;
    onDone();
    void Clipboard.getStringAsync()
      .then((current) =>
        current === json ? Clipboard.setStringAsync("") : undefined,
      )
      .catch(() => {});
  }, BACKUP_CLIPBOARD_TTL_MS);
}

export function DigitalUtilitiesScreen({
  state,
  onRestore,
}: {
  state: LocalState;
  onRestore?: (restored: LocalState) => Promise<void>;
}) {
  const c = useTheme();
  const [subTab, setSubTab] = useState<"voltage" | "vjw" | "esim" | "backup">(
    "voltage",
  );
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<LocalState | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(
    () => () => {
      // Leaving the screen must not cancel the clipboard wipe below.
      alive.current = false;
    },
    [],
  );

  const exportData = async () => {
    setNotice("");
    try {
      const json = encodeBackup(state);
      await Clipboard.setStringAsync(json);
      setCopied(true);
      scheduleClipboardWipe(json, () => {
        if (alive.current) setCopied(false);
      });
    } catch {
      setNotice("데이터를 클립보드에 복사하지 못했어요.");
    }
  };
  const readBackup = async () => {
    setNotice("");
    setPending(null);
    try {
      setPending(parseBackup(await Clipboard.getStringAsync()));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "클립보드를 읽지 못했어요.");
    }
  };
  const restore = async () => {
    if (!pending || !onRestore) return;
    setBusy(true);
    try {
      await onRestore(pending);
      setPending(null);
      await Clipboard.setStringAsync("").catch(() => {});
      setNotice("백업을 복원했어요. 클립보드의 백업 데이터도 지웠어요.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "복원하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 20 }}>
      <ScreenHeader
        title="여행 디지털 & 필수 도우미"
        subtitle="100V 전압 호환성, VJW 등록 요령, eSIM 장애 해결 및 여행 데이터 백업이에요."
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Choice
          label="100V 전압 호환성"
          selected={subTab === "voltage"}
          onPress={() => setSubTab("voltage")}
        />
        <Choice
          label="Visit Japan Web"
          selected={subTab === "vjw"}
          onPress={() => setSubTab("vjw")}
        />
        <Choice
          label="eSIM 장애 해결"
          selected={subTab === "esim"}
          onPress={() => setSubTab("esim")}
        />
        <Choice
          label="여행 데이터 백업"
          selected={subTab === "backup"}
          onPress={() => setSubTab("backup")}
        />
      </View>

      {subTab === "voltage" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700" size={17}>
              110V 돼지코와 220V 전압 차이 주의사항
            </Label>
            <Label muted size={13}>
              일본의 콘센트 규격은 100V (A타입 11자 핀)입니다. 단순 모양 변환용
              '돼지코'는 전압(V)을 바꿔주지 않으므로 전자기기의 프리볼트 여부를
              반드시 확인해야 합니다.
            </Label>
          </Card>

          {applianceChecks.map((item) => (
            <Card key={item.id}>
              <View style={styles.between}>
                <Label weight="700" size={16}>
                  {item.name}
                </Label>
                <View
                  style={{
                    backgroundColor:
                      item.voltageType === "safe"
                        ? c.accent
                        : item.voltageType === "danger"
                          ? c.error
                          : c.soft,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color:
                        item.voltageType === "safe" ||
                        item.voltageType === "danger"
                          ? c.inverse
                          : c.ink,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {item.voltageText}
                  </Text>
                </View>
              </View>
              <Label muted size={13}>
                {item.guide}
              </Label>
            </Card>
          ))}
        </View>
      ) : subTab === "vjw" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700" size={17}>
              Visit Japan Web (VJW) 등록 가이드
            </Label>
            <Label muted size={13}>
              일본 입국 심사 및 세관 신고를 모바일 QR코드로 간편하게 통과할 수
              있는 일본 디지털청 공식 웹 서비스입니다.
            </Label>
          </Card>

          {vjwSteps.map((step) => (
            <Card key={step.step}>
              <View
                style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: c.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: c.inverse, fontWeight: "700" }}>
                    {step.step}
                  </Text>
                </View>
                <Label weight="700" size={16} style={{ flex: 1 }}>
                  {step.title}
                </Label>
              </View>
              <Label size={13}>{step.detail}</Label>
              <Label muted size={12}>
                팁: {step.tip}
              </Label>
            </Card>
          ))}
        </View>
      ) : subTab === "esim" ? (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700" size={17}>
              일본 현지 eSIM / 로밍 데이터 안 될 때 긴급 대처
            </Label>
            <Label muted size={13}>
              공항 도착 후 데이터가 잡히지 않을 때 아래 3가지 조치를 순서대로
              확인해 보세요.
            </Label>
          </Card>

          {esimTroubles.map((item, idx) => (
            <Card key={idx}>
              <Label weight="700" size={15} style={{ color: c.accent }}>
                {item.problem}
              </Label>
              <View style={{ gap: 6, marginTop: 4 }}>
                {item.solution.map((sol, solIdx) => (
                  <Label key={solIdx} size={13}>
                    {sol}
                  </Label>
                ))}
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Card>
            <Label weight="700" size={17}>
              내 여행 데이터 백업
            </Label>
            <Label muted size={13}>
              일정({state.tripItems.length}개), 면세 영수증(
              {state.dutyFreeReceipts.length}개), 사이즈 프로필, 번역 기록과
              즐겨찾기를 JSON으로 클립보드에 복사해요. 서버로 보내지 않아요.
            </Label>
            <Card tone="accent" style={{ padding: 14, gap: 6 }}>
              <Label size={13} weight="700" style={{ color: c.accentInk }}>
                클립보드 주의
              </Label>
              <Label size={12} style={{ color: c.accentInk }}>
                클립보드는 다른 앱, 키보드 앱, 기기 간 클립보드 동기화에서 읽힐
                수 있어요. 예약번호와 번역 기록이 포함되니 메모 앱 등 안전한
                곳에 바로 붙여넣으세요. 1분 뒤 클립보드에서 자동으로 지워요.
              </Label>
            </Card>
            <Button
              label={
                copied
                  ? "클립보드에 복사했어요 (1분 뒤 삭제)"
                  : "내 데이터 백업 복사"
              }
              primary
              icon={copied ? "checkmark" : "copy-outline"}
              onPress={() => void exportData()}
            />
          </Card>
          {onRestore && (
            <Card>
              <Label weight="700" size={17}>
                백업에서 복원
              </Label>
              <Label muted size={13}>
                복사해 둔 백업을 클립보드에 넣고 불러오세요. 형식과 값을 모두
                검사한 뒤, 확인을 누를 때만 현재 데이터를 대체해요.
              </Label>
              <Button
                label="클립보드에서 백업 불러오기"
                icon="download-outline"
                onPress={() => void readBackup()}
              />
              {pending && (
                <Card tone="muted" style={{ padding: 14 }}>
                  <Label size={13} weight="700">
                    불러온 백업
                  </Label>
                  <Label size={13} muted>
                    {backupSummary(pending)}
                  </Label>
                  <Button
                    label="현재 데이터를 백업으로 대체"
                    variant="danger"
                    busy={busy}
                    onPress={() => void restore()}
                  />
                  <Button
                    label="취소"
                    variant="ghost"
                    onPress={() => setPending(null)}
                  />
                </Card>
              )}
            </Card>
          )}
          {!!notice && (
            <View accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Label size={13}>{notice}</Label>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
