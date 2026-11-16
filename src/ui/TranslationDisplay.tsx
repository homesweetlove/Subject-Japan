import { useEffect, useState, type ReactNode } from "react";
import { Modal, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Translation } from "../domain/models";
import { Button } from "./components";
import { Press } from "./Press";
import { useTheme } from "./theme";

// React Native Web does not map the native accessibilityLanguage prop to lang.
export function translationLanguage(language: Translation["target"]) {
  const tag = language === "ja" ? "ja-JP" : "ko-KR";
  return {
    accessibilityLanguage: tag,
    ...(Platform.OS === "web" ? { lang: tag } : {}),
  };
}

export type StaffReply = "yes" | "no" | "wait";
/**
 * Fixed replies a shop clerk can tap instead of answering aloud. They are
 * plain phrases with a set meaning, not machine translation.
 */
const staffAnswers: { id: StaffReply; ja: string; ko: string }[] = [
  { id: "yes", ja: "はい", ko: "네" },
  { id: "no", ja: "いいえ", ko: "아니요" },
  { id: "wait", ja: "少々お待ちください", ko: "잠시만 기다려 주세요" },
];
/** A sentence the traveller can show next, offered after a reply. */
export interface FollowUp {
  key: string;
  label: string;
}

/** Keep the close action reachable even at accessibility text sizes. */
export function TranslationDisplay({
  value,
  onClose,
  children,
  closeLabel = "큰 화면 닫기",
  followUps,
  onFollowUp,
}: {
  value: Translation | null;
  onClose: () => void;
  children?: ReactNode;
  closeLabel?: string;
  /** Sentences worth showing next for a given reply; none hides the list. */
  followUps?: (reply: StaffReply) => FollowUp[];
  onFollowUp?: (key: string) => void;
}) {
  const c = useTheme();
  const [reply, setReply] = useState<StaffReply | null>(null);
  // Turned toward the clerk across the counter, so the phone stays as held.
  const [facing, setFacing] = useState(false);
  // A new sentence starts without the previous sentence's reply.
  useEffect(() => setReply(null), [value?.id]);
  useEffect(() => {
    if (!value) setFacing(false);
  }, [value]);
  const toStaff = value?.target === "ja";
  const answer = staffAnswers.find((item) => item.id === reply);
  const next = reply && followUps ? followUps(reply) : [];

  // What the clerk reads and taps.
  const staffBlock = (
    <>
      <Text
        selectable
        {...translationLanguage(value?.target ?? "ja")}
        style={{
          color: c.ink,
          fontSize: 40,
          lineHeight: 60,
          fontWeight: "700",
        }}
      >
        {value?.translated}
      </Text>
      {!facing && (
        <Text
          selectable
          {...translationLanguage(value?.source ?? "ko")}
          style={{ color: c.muted, fontSize: 18, lineHeight: 28 }}
        >
          {value?.original}
        </Text>
      )}
      {toStaff && (
        <View
          style={{
            gap: 12,
            paddingTop: 20,
            borderTopWidth: 1,
            borderColor: c.line,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              {...translationLanguage("ja")}
              style={{ color: c.ink, fontSize: 16, lineHeight: 24 }}
            >
              お答えをタップしてください
            </Text>
            {!facing && (
              <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>
                직원이 눌러 주는 답
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {staffAnswers.map((item) => {
              const on = reply === item.id;
              return (
                <Press
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.ja} (${item.ko})`}
                  accessibilityState={{ selected: on }}
                  onPress={() => setReply(item.id)}
                  style={{
                    minHeight: 52,
                    justifyContent: "center",
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: on ? c.accentSoft : c.soft,
                  }}
                >
                  <Text
                    {...translationLanguage("ja")}
                    style={{
                      color: on ? c.accentInk : c.ink,
                      fontSize: 18,
                      lineHeight: 26,
                      fontWeight: "700",
                    }}
                  >
                    {item.ja}
                  </Text>
                </Press>
              );
            })}
          </View>
        </View>
      )}
    </>
  );

  // What the traveller reads: the reply's meaning and what to show next.
  const travellerBlock = (
    <>
      {facing && (
        <Text
          selectable
          {...translationLanguage(value?.source ?? "ko")}
          style={{ color: c.muted, fontSize: 16, lineHeight: 24 }}
        >
          {value?.original}
        </Text>
      )}
      {answer && (
        <View accessibilityLiveRegion="polite">
          <Text
            style={{
              color: c.ink,
              fontSize: 22,
              lineHeight: 32,
              fontWeight: "700",
            }}
          >
            직원의 답: {answer.ko}
          </Text>
        </View>
      )}
      {next.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>
            이어서 보여줄 문장
          </Text>
          {next.map((item) => (
            <Button
              key={item.key}
              label={item.label}
              icon="arrow-forward"
              onPress={() => onFollowUp?.(item.key)}
            />
          ))}
        </View>
      )}
    </>
  );

  return (
    <Modal visible={!!value} onRequestClose={onClose} animationType="fade">
      <SafeAreaProvider>
        <SafeAreaView
          accessibilityViewIsModal
          style={{ flex: 1, backgroundColor: c.bg }}
        >
          <View style={{ paddingHorizontal: 24, paddingVertical: 12, gap: 8 }}>
            <Button label={closeLabel} onPress={onClose} />
            {toStaff && (
              <Button
                label={facing ? "내 쪽으로 되돌리기" : "직원 쪽으로 뒤집기"}
                icon="swap-vertical"
                variant="ghost"
                size="sm"
                onPress={() => setFacing(!facing)}
              />
            )}
          </View>
          {facing ? (
            <>
              <View style={{ flex: 1, transform: [{ rotate: "180deg" }] }}>
                <ScrollView
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "center",
                    padding: 24,
                    gap: 24,
                  }}
                >
                  {staffBlock}
                </ScrollView>
              </View>
              <ScrollView
                style={{
                  flexGrow: 0,
                  maxHeight: "45%",
                  borderTopWidth: 1,
                  borderColor: c.line,
                }}
                contentContainerStyle={{ padding: 24, gap: 16 }}
              >
                {travellerBlock}
                {children}
              </ScrollView>
            </>
          ) : (
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                padding: 24,
                gap: 24,
              }}
            >
              {staffBlock}
              {travellerBlock}
              {children}
            </ScrollView>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
