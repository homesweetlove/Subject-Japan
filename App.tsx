import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { initialState, type LocalState } from "./src/domain/models";
import { ProfileScreen } from "./src/features/profile/ProfileScreen";
import { TranslationHub } from "./src/features/translation/TranslationHub";
import { CardScreen } from "./src/features/cards/CardScreen";
import { PayScreen } from "./src/features/pay/PayScreen";
import { CouponHub } from "./src/features/coupons/CouponHub";
import { TripScreen, type TripSection } from "./src/features/trip/TripScreen";
import { TodayScreen, type AppTab } from "./src/features/today/TodayScreen";
import { planNotifications } from "./src/features/today/model";
import { notifier } from "./src/features/today/notifications";
import { REMINDER_LIMIT } from "./src/features/trip/countdown";
import { localRepository } from "./src/storage/localRepository";
import {
  deleteDutyFreeReceipt,
  recordTranslation,
  saveDutyFreeReceipt,
  setAutoRefreshRate,
  toggleFavorite,
  toggleSavedCoupon,
} from "./src/storage/state";
import { Button, Icon, Label } from "./src/ui/components";
import { Enter } from "./src/ui/Enter";
import { Press } from "./src/ui/Press";
import { TabBar, type TabItem } from "./src/ui/TabBar";
import { dark, light, ThemeContext } from "./src/ui/theme";

const tabs: TabItem<AppTab>[] = [
  { key: "today", label: "오늘", icon: "today-outline", activeIcon: "today" },
  { key: "card", label: "교통카드", icon: "card-outline", activeIcon: "card" },
  {
    key: "coupon",
    label: "쿠폰",
    icon: "ticket-outline",
    activeIcon: "ticket",
  },
  {
    key: "translate",
    label: "번역",
    icon: "language-outline",
    activeIcon: "language",
  },
  { key: "pay", label: "결제", icon: "wallet-outline", activeIcon: "wallet" },
  { key: "trip", label: "여행", icon: "map-outline", activeIcon: "map" },
];
function Application() {
  const systemTheme = useColorScheme();
  const [state, setState] = useState<LocalState>(initialState);
  const stateRef = useRef(state);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState<AppTab>("today");
  const [resumeTick, setResumeTick] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") setResumeTick((value) => value + 1);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (profileOpen) {
        setProfileOpen(false);
        return true;
      }
      if (tab !== "today") {
        setTab("today");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [profileOpen, tab]);
  // Remount key lets Today (or a tapped notification) open a TRIP section.
  const [tripTarget, setTripTarget] = useState<{
    section: TripSection;
    nonce: number;
  }>({ section: "itinerary", nonce: 0 });
  const navigate = (next: AppTab, section?: TripSection) => {
    if (next === "trip" && section)
      setTripTarget((t) => ({ section, nonce: t.nonce + 1 }));
    setTab(next);
    setProfileOpen(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  // Keep the OS schedule in step with saved timers, trips and settings.
  useEffect(() => {
    if (!loaded || !notifier.available) return;
    let active = true;
    const timer = setTimeout(() => {
      void notifier
        .sync(
          planNotifications({
            tripItems: state.tripItems,
            airportReminders: state.airportReminders,
            settings: state.notifications,
          }),
        )
        .then(() => {
          if (active) setNotificationError("");
        })
        .catch(() => {
          if (active)
            setNotificationError(
              "알림 예약을 갱신하지 못했어요. 기기 설정에서 알림 권한을 확인하고 앱을 다시 열어 주세요.",
            );
        });
    }, 800);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    loaded,
    state.tripItems,
    state.airportReminders,
    state.notifications,
    resumeTick,
  ]);
  useEffect(
    () =>
      notifier.onOpen((target) =>
        navigate("trip", target === "airport" ? "airport" : "itinerary"),
      ),
    [],
  );
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
              paddingHorizontal: 20,
              minHeight: 64,
              paddingVertical: 10,
              gap: 8,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flexShrink: 1,
              }}
              accessibilityRole="header"
              accessibilityLabel="Subject Japan"
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  backgroundColor: colors.ink,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
              <Text
                style={{
                  color: colors.ink,
                  fontWeight: "800",
                  fontSize: 17,
                  letterSpacing: 0.4,
                  flexShrink: 1,
                }}
              >
                SUBJECT JAPAN
              </Text>
            </View>
            {loaded && state.onboarded && !profileOpen && (
              <Press
                accessibilityRole="button"
                accessibilityLabel="사용자 페이지"
                onPress={openProfile}
                hitSlop={6}
                pressScale={0.9}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? colors.softPressed : colors.soft,
                })}
              >
                {state.profile.nickname ? (
                  <Text
                    style={{
                      color: colors.ink,
                      fontWeight: "800",
                      fontSize: 15,
                    }}
                  >
                    {[...state.profile.nickname][0]?.toUpperCase()}
                  </Text>
                ) : (
                  <Icon name="person" size={18} color={colors.muted} />
                )}
              </Press>
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
                  paddingHorizontal: 20,
                  paddingTop: 8,
                  paddingBottom: 40,
                }}
              >
                {!!notificationError && (
                  <Label style={{ color: colors.error }}>
                    {notificationError}
                  </Label>
                )}
                <Enter
                  key={!state.onboarded || profileOpen ? "profile" : tab}
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
                      setTab("today");
                      scroll.current?.scrollTo({ y: 0, animated: false });
                    }}
                  />
                ) : tab === "today" ? (
                  <TodayScreen
                    state={state}
                    onNavigate={navigate}
                    onWeatherCity={(weatherCity) =>
                      commit((s) => ({ ...s, weatherCity }))
                    }
                    onWeather={(weather) =>
                      commit((s) =>
                        s.weatherCity === weather.cityId
                          ? { ...s, weather }
                          : s,
                      )
                    }
                    onNotifications={(notifications) =>
                      commit((s) => ({ ...s, notifications }))
                    }
                  />
                ) : tab === "translate" ? (
                  <TranslationHub
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
                ) : tab === "card" ? (
                  <CardScreen
                    cards={state.transitCards}
                    rate={state.exchangeRate}
                    onSave={(value) =>
                      commit((s) => {
                        if (
                          !s.transitCards.some((c) => c.id === value.id) &&
                          s.transitCards.length >= 20
                        )
                          throw new Error(
                            "교통카드는 20장까지 저장할 수 있어요.",
                          );
                        return {
                          ...s,
                          transitCards: [
                            value,
                            ...s.transitCards.filter((c) => c.id !== value.id),
                          ],
                        };
                      })
                    }
                    onDelete={(id) =>
                      commit((s) => ({
                        ...s,
                        transitCards: s.transitCards.filter((c) => c.id !== id),
                      }))
                    }
                  />
                ) : tab === "pay" ? (
                  <PayScreen
                    rate={state.exchangeRate}
                    onRate={(exchangeRate) =>
                      commit((s) => ({ ...s, exchangeRate }))
                    }
                    dutyFreeReceipts={state.dutyFreeReceipts}
                    autoRefreshRate={state.autoRefreshRate}
                    onSaveReceipt={(receipt) =>
                      commit((s) => saveDutyFreeReceipt(s, receipt))
                    }
                    onDeleteReceipt={(id) =>
                      commit((s) => deleteDutyFreeReceipt(s, id))
                    }
                    onToggleAutoRefresh={(enabled) =>
                      commit((s) => setAutoRefreshRate(s, enabled))
                    }
                  />
                ) : tab === "trip" ? (
                  <TripScreen
                    key={tripTarget.nonce}
                    initialSection={tripTarget.section}
                    state={state}
                    onRestore={(restored) => commit(() => restored)}
                    onSaveItem={(item) =>
                      commit((s) => {
                        if (
                          !s.tripItems.some((t) => t.id === item.id) &&
                          s.tripItems.length >= 200
                        )
                          throw new Error("일정은 200개까지 저장할 수 있어요.");
                        return {
                          ...s,
                          tripItems: [
                            ...s.tripItems.filter((t) => t.id !== item.id),
                            item,
                          ],
                        };
                      })
                    }
                    onDeleteItem={(id) =>
                      commit((s) => ({
                        ...s,
                        tripItems: s.tripItems.filter((t) => t.id !== id),
                      }))
                    }
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
                ) : null}
                </Enter>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
          {loaded && state.onboarded && !profileOpen && (
            <TabBar
              tabs={tabs}
              value={tab}
              onChange={(next) => {
                setTab(next);
                scroll.current?.scrollTo({ y: 0, animated: false });
              }}
            />
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
