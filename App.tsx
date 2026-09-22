import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { initialState, type LocalState } from "./src/domain/models";
import { ProfileScreen } from "./src/features/profile/ProfileScreen";
import { TranslateScreen } from "./src/features/translation/TranslateScreen";
import { CouponHub } from "./src/features/coupons/CouponHub";
import { TripScreen } from "./src/features/trip/TripScreen";
import { REMINDER_LIMIT } from "./src/features/trip/countdown";
import { localRepository } from "./src/storage/localRepository";
import {
  recordTranslation,
  toggleFavorite,
  toggleSavedCoupon,
} from "./src/storage/state";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Label,
  type IconName,
} from "./src/ui/components";
import { dark, light, ThemeContext } from "./src/ui/theme";

const tabs: {
  key: string;
  label: string;
  title: string;
  icon: IconName;
  description: string;
}[] = [
  {
    key: "card",
    label: "IC CARD",
    title: "이동을 더 가볍게",
    icon: "card-outline",
    description:
      "Suica · PASMO · ICOCA 잔액과 이용내역을 한곳에서 확인하는 기능을 준비하고 있어요.",
  },
  {
    key: "coupon",
    label: "COUPON",
    title: "여행의 작은 혜택",
    icon: "ticket-outline",
    description: "일반 고객과 방문객을 위한 공식 쿠폰·혜택을 확인하세요.",
  },
  {
    key: "translate",
    label: "TRANSLATE",
    title: "",
    icon: "language-outline",
    description: "",
  },
  {
    key: "pay",
    label: "PAY",
    title: "계산은 간단하게",
    icon: "wallet-outline",
    description:
      "환율, 면세, 게스트 할인과 캐시백을 함께 계산하는 도구를 준비하고 있어요.",
  },
  {
    key: "trip",
    label: "TRIP",
    title: "나만의 여행 노트",
    icon: "map-outline",
    description: "여행 일정과 예약 정보를 모아둘 공간을 준비하고 있어요.",
  },
];
function Application() {
  const systemTheme = useColorScheme();
  const [state, setState] = useState<LocalState>(initialState);
  const stateRef = useRef(state);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState("translate");
  const [resetConfirm, setResetConfirm] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const isDark =
    state.theme === "dark" ||
    (state.theme === "system" && systemTheme === "dark");
  const colors = isDark ? dark : light;
  const load = async () => {
    setLoadError(false);
    try {
      const saved = await localRepository.load();
      stateRef.current = saved;
      setState(saved);
      setLoaded(true);
    } catch {
      setLoadError(true);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const commitQueue = useRef<Promise<void>>(Promise.resolve());
  const commit = (
    change: (current: LocalState) => LocalState,
  ): Promise<void> => {
    const next = commitQueue.current
      .catch(() => {})
      .then(async () => {
        const updated = change(stateRef.current);
        try {
          await localRepository.save(updated);
        } catch {
          throw new Error(
            "기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.",
          );
        }
        stateRef.current = updated;
        setState(updated);
      });
    commitQueue.current = next;
    return next;
  };
  const openProfile = () => {
    setProfileOpen(true);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const activeTab = tabs.find((t) => t.key === tab)!;
  const toggleGuide = (id: string) =>
    commit((s) => ({
      ...s,
      guideChecks: s.guideChecks.includes(id)
        ? s.guideChecks.filter((value) => value !== id)
        : [...s.guideChecks, id],
    }));
  return (
    <ThemeContext.Provider value={colors}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.bg }}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <View
          style={{ flex: 1, width: "100%", maxWidth: 620, alignSelf: "center" }}
        >
          <View
            style={{
              paddingHorizontal: 24,
              height: 68,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.ink,
                fontWeight: "800",
                fontSize: 17,
                letterSpacing: 1.5,
              }}
            >
              SUBJECT<Text style={{ color: colors.accent }}>:</Text>JAPAN
            </Text>
            {loaded && state.onboarded && (
              <IconButton
                name="person-circle-outline"
                label="사용자 페이지"
                onPress={openProfile}
              />
            )}
          </View>
          {!loaded ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                padding: 24,
                gap: 16,
              }}
            >
              {loadError ? (
                <>
                  <Label>
                    저장한 정보를 읽지 못했어요. 기존 데이터는 덮어쓰지
                    않았어요.
                  </Label>
                  <Button label="다시 읽기" onPress={() => void load()} />
                  <Button
                    label={
                      resetConfirm
                        ? "기존 데이터 삭제 후 시작 확인"
                        : "저장 데이터 초기화"
                    }
                    onPress={async () => {
                      if (!resetConfirm) {
                        setResetConfirm(true);
                        return;
                      }
                      try {
                        await commit(() => initialState());
                        setLoaded(true);
                        setLoadError(false);
                      } catch {
                        setLoadError(true);
                      }
                    }}
                  />
                </>
              ) : (
                <ActivityIndicator color={colors.accent} />
              )}
            </View>
          ) : (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <ScrollView
                ref={scroll}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingHorizontal: 24,
                  paddingTop: 18,
                  paddingBottom: 36,
                }}
              >
                {!state.onboarded || profileOpen ? (
                  <ProfileScreen
                    key={state.onboarded ? "profile" : "onboarding"}
                    state={state}
                    onClose={() => setProfileOpen(false)}
                    onSave={async (profile, theme) => {
                      await commit((s) => ({
                        ...s,
                        onboarded: true,
                        profile,
                        theme,
                      }));
                      setProfileOpen(false);
                      scroll.current?.scrollTo({ y: 0, animated: false });
                    }}
                    onReset={async (fresh) => {
                      await commit(() => fresh);
                      setProfileOpen(false);
                      setTab("translate");
                      scroll.current?.scrollTo({ y: 0, animated: false });
                    }}
                  />
                ) : tab === "translate" ? (
                  <TranslateScreen
                    state={state}
                    onRecord={(value) =>
                      commit((s) => recordTranslation(s, value))
                    }
                    onFavorite={(value) =>
                      commit((s) => toggleFavorite(s, value))
                    }
                    onClearHistory={() =>
                      commit((s) => ({ ...s, history: [] }))
                    }
                    onProfile={openProfile}
                  />
                ) : tab === "coupon" ? (
                  <CouponHub
                    state={state}
                    onToggleGuide={toggleGuide}
                    onToggleSaved={(id) =>
                      commit((s) => toggleSavedCoupon(s, id))
                    }
                  />
                ) : tab === "trip" ? (
                  <TripScreen
                    state={state}
                    onToggleGuide={toggleGuide}
                    onSaveReminder={(reminder) =>
                      commit((s) => {
                        if (
                          !s.airportReminders.some(
                            (r) => r.id === reminder.id,
                          ) &&
                          s.airportReminders.length >= REMINDER_LIMIT
                        )
                          throw new Error(
                            "막차 타이머는 12개까지 저장할 수 있어요.",
                          );
                        return {
                          ...s,
                          airportReminders: [
                            ...s.airportReminders.filter(
                              (r) => r.id !== reminder.id,
                            ),
                            reminder,
                          ],
                        };
                      })
                    }
                    onDeleteReminder={(id) =>
                      commit((s) => ({
                        ...s,
                        airportReminders: s.airportReminders.filter(
                          (r) => r.id !== id,
                        ),
                      }))
                    }
                  />
                ) : (
                  <View style={{ gap: 24, paddingTop: 35 }}>
                    <Icon name={activeTab.icon} size={38} />
                    <Label size={30} weight="700">
                      {activeTab.title}
                    </Label>
                    <Label muted>{activeTab.description}</Label>
                    <Card>
                      <Label weight="600">준비 중인 기능이에요</Label>
                      <Label muted size={14}>
                        지금은 번역, 나의 쇼핑 사이즈와 공식 쿠폰·혜택을 이용할
                        수 있어요.
                      </Label>
                      <Button
                        label="번역기로 이동"
                        primary
                        onPress={() => setTab("translate")}
                      />
                      {tab === "trip" && (
                        <Button
                          label="나의 프로필 · 사이즈"
                          onPress={openProfile}
                        />
                      )}
                    </Card>
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          )}
          {loaded && state.onboarded && !profileOpen && (
            <View
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderColor: colors.line,
                paddingTop: 10,
                paddingBottom: 8,
                backgroundColor: colors.bg,
              }}
            >
              {tabs.map((t) => (
                <Pressable
                  key={t.key}
                  accessibilityRole="tab"
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: tab === t.key }}
                  onPress={() => {
                    setTab(t.key);
                    scroll.current?.scrollTo({ y: 0, animated: false });
                  }}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 8,
                    minHeight: 52,
                  }}
                >
                  <Icon
                    name={t.icon}
                    size={22}
                    color={tab === t.key ? colors.accent : colors.muted}
                  />
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: tab === t.key ? "800" : "500",
                      color: tab === t.key ? colors.accent : colors.muted,
                      letterSpacing: 0.4,
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Application />
    </SafeAreaProvider>
  );
}
