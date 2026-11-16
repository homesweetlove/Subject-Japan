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

/**
 * Fixed replies a shop clerk can tap instead of answering aloud. They are
 * plain phrases with a set meaning, not machine translation.
 */
const staffAnswers = [
  { ja: "はい", ko: "네" },
  { ja: "いいえ", ko: "아니요" },
  { ja: "少々お待ちください", ko: "잠시만 기다려 주세요" },
] as const;

/** Keep the close action reachable even at accessibility text sizes. */
export function TranslationDisplay({
  value,
  onClose,
  children,
  closeLabel = "큰 화면 닫기",
}: {
  value: Translation | null;
  onClose: () => void;
  children?: ReactNode;
  closeLabel?: string;
}) {
  const c = useTheme();
  const [answer, setAnswer] = useState<string | null>(null);
  // A new sentence starts without the previous sentence's reply.
  useEffect(() => setAnswer(null), [value?.id]);
  return (
    <Modal visible={!!value} onRequestClose={onClose} animationType="fade">
      <SafeAreaProvider>
        <SafeAreaView
          accessibilityViewIsModal
          style={{ flex: 1, backgroundColor: c.bg }}
        >
          <View style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
            <Button label={closeLabel} onPress={onClose} />
          </View>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 24,
              gap: 24,
            }}
          >
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
            <Text
              selectable
              {...translationLanguage(value?.source ?? "ko")}
              style={{ color: c.muted, fontSize: 18, lineHeight: 28 }}
            >
              {value?.original}
            </Text>
            {value?.target === "ja" && (
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
                  <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>
                    직원이 눌러 주는 답
                  </Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {staffAnswers.map((item) => {
                    const on = answer === item.ko;
                    return (
                      <Press
                        key={item.ja}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.ja} (${item.ko})`}
                        accessibilityState={{ selected: on }}
                        onPress={() => setAnswer(item.ko)}
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
                {answer !== null && (
                  <View accessibilityLiveRegion="polite">
                    <Text
                      style={{
                        color: c.ink,
                        fontSize: 22,
                        lineHeight: 32,
                        fontWeight: "700",
                      }}
                    >
                      직원의 답: {answer}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {children}
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
