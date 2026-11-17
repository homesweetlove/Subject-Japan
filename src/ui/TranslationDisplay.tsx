import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Translation } from "../domain/models";
import { Button } from "./components";
import { haptic } from "./haptics";
import { motion, useReducedMotion } from "./motion";
import { Press } from "./Press";
import { Rise } from "./Rise";
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

/** On-screen movement: eases in and out so the turn reads as one motion. */
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

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
  const reduced = useReducedMotion();
  const [reply, setReply] = useState<StaffReply | null>(null);
  // Turned toward the clerk across the counter, so the phone stays as held.
  const [facing, setFacing] = useState(false);
  const turn = useRef(new Animated.Value(0)).current;
  const appear = useRef(new Animated.Value(1)).current;

  // A new sentence starts without the previous reply, and settles into view.
  useEffect(() => {
    setReply(null);
    if (!value || reduced) {
      appear.setValue(1);
      return;
    }
    appear.setValue(0);
    const animation = Animated.timing(appear, {
      toValue: 1,
      duration: 260,
      easing: EASE_OUT,
      useNativeDriver: motion.native,
    });
    animation.start();
    return () => animation.stop();
  }, [value?.id]);
  useEffect(() => {
    if (!value) setFacing(false);
  }, [value]);
  // The sentence turns half a circle toward whoever should read it.
  useEffect(() => {
    if (reduced) {
      turn.setValue(facing ? 1 : 0);
      return;
    }
    const animation = Animated.timing(turn, {
      toValue: facing ? 1 : 0,
      duration: 360,
      easing: EASE_IN_OUT,
      useNativeDriver: motion.native,
    });
    animation.start();
    return () => animation.stop();
  }, [facing]);

  const toStaff = value?.target === "ja";
  const answer = staffAnswers.find((item) => item.id === reply);
  const next = reply && followUps ? followUps(reply) : [];
  const extras = Children.toArray(children);
  const hasTravellerSide =
    facing || !!answer || next.length > 0 || extras.length > 0;

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
                onPress={() => {
                  haptic.tap();
                  setFacing(!facing);
                }}
              />
            )}
          </View>

          {/* What the clerk reads and taps. */}
          <Animated.View
            style={{
              flex: 1,
              transform: [
                {
                  rotate: turn.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "180deg"],
                  }),
                },
              ],
            }}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                padding: 24,
                gap: 24,
              }}
            >
              <Animated.View
                style={{
                  gap: 24,
                  opacity: appear.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.001, 1],
                  }),
                  transform: [
                    {
                      scale: appear.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
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
                {!facing && (
                  <Text
                    selectable
                    {...translationLanguage(value?.source ?? "ko")}
                    style={{ color: c.muted, fontSize: 18, lineHeight: 28 }}
                  >
                    {value?.original}
                  </Text>
                )}
              </Animated.View>
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
                      <Text
                        style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}
                      >
                        직원이 눌러 주는 답
                      </Text>
                    )}
                  </View>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {staffAnswers.map((item) => {
                      const on = reply === item.id;
                      return (
                        <Press
                          key={item.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.ja} (${item.ko})`}
                          accessibilityState={{ selected: on }}
                          onPress={() => {
                            haptic.tick();
                            setReply(item.id);
                          }}
                          pressScale={0.94}
                          style={{
                            minHeight: 56,
                            justifyContent: "center",
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 16,
                            backgroundColor: on ? c.accent : c.soft,
                          }}
                        >
                          <Text
                            {...translationLanguage("ja")}
                            style={{
                              color: on ? c.inverse : c.ink,
                              fontSize: 19,
                              lineHeight: 27,
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
            </ScrollView>
          </Animated.View>

          {/* What the traveller reads: the reply and what to show next. */}
          {hasTravellerSide && (
            <ScrollView
              style={{
                flexGrow: 0,
                // Turned to the clerk, their side needs the room more.
                maxHeight: facing ? "36%" : "48%",
                borderTopWidth: 1,
                borderColor: c.line,
              }}
              contentContainerStyle={{ padding: 24, gap: 16 }}
            >
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
                <Rise key={answer.id} distance={10} style={{ gap: 12 }}>
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
                  {next.length > 0 && (
                    <View style={{ gap: 8 }}>
                      <Text
                        style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}
                      >
                        이어서 보여줄 문장
                      </Text>
                      {next.map((item, index) => (
                        <Rise key={item.key} order={index + 1} distance={10}>
                          <Button
                            label={item.label}
                            icon="arrow-forward"
                            onPress={() => {
                              haptic.tap();
                              onFollowUp?.(item.key);
                            }}
                          />
                        </Rise>
                      ))}
                    </View>
                  )}
                </Rise>
              )}
              {extras}
            </ScrollView>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
