import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { Icon, type IconName } from "./components";
import { motion, useReducedMotion } from "./motion";
import { Press } from "./Press";
import { useTheme } from "./theme";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon: IconName;
  activeIcon: IconName;
}

/**
 * Bottom navigation. The chosen tab's soft pill grows in from the icon,
 * which is the only motion here; the icon swaps to its filled form.
 */
export function TabBar<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  const c = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        borderTopWidth: 1,
        borderColor: c.line,
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 6,
        backgroundColor: c.surface,
      }}
    >
      {tabs.map((t) => (
        <Tab
          key={t.key}
          item={t}
          on={t.key === value}
          onPress={() => onChange(t.key)}
        />
      ))}
    </View>
  );
}

function Tab<K extends string>({
  item,
  on,
  onPress,
}: {
  item: TabItem<K>;
  on: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      progress.setValue(on ? 1 : 0);
      return;
    }
    if (on)
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: motion.native,
        ...motion.settle,
      }).start();
    else
      Animated.timing(progress, {
        toValue: 0,
        duration: 120,
        useNativeDriver: motion.native,
      }).start();
  }, [on, reduced]);
  return (
    <Press
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      pressScale={0.92}
      style={{
        flexGrow: 1,
        flexBasis: "16.666%",
        minWidth: 48,
        alignItems: "center",
        gap: 4,
        paddingVertical: 4,
        minHeight: 52,
        borderRadius: 14,
      }}
    >
      <View
        style={{
          width: 52,
          height: 30,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            borderRadius: 15,
            backgroundColor: c.accentSoft,
            opacity: progress,
            transform: [
              {
                scaleX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ],
          }}
        />
        <Icon
          name={on ? item.activeIcon : item.icon}
          size={21}
          color={on ? c.accent : c.muted}
        />
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 11,
          fontWeight: on ? "800" : "600",
          color: on ? c.ink : c.muted,
        }}
      >
        {item.label}
      </Text>
    </Press>
  );
}
