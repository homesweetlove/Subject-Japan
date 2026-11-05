import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { motion, useReducedMotion } from "./motion";
import { Press } from "./Press";
import { elevation, radius, useTheme } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 21,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const c = useTheme();
  return (
    <Ionicons
      accessible={false}
      aria-hidden
      importantForAccessibility="no"
      name={name}
      size={size}
      color={color ?? c.ink}
    />
  );
}
/** Tighter leading for display sizes; relaxed leading for Korean body copy. */
const leading = (size: number) =>
  size >= 26 ? 1.25 : size >= 20 ? 1.35 : size <= 12 ? 1.5 : 1.55;
export function Label({
  children,
  muted = false,
  size = 15,
  weight = "400",
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  size?: number;
  weight?: "400" | "500" | "600" | "700" | "800";
  style?: StyleProp<TextStyle>;
}) {
  const c = useTheme();
  return (
    <Text
      style={[
        {
          color: muted ? c.muted : c.ink,
          fontSize: size,
          fontWeight: weight,
          lineHeight: Math.round(size * leading(size)),
          letterSpacing: size >= 26 ? -0.6 : size >= 20 ? -0.3 : 0,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
/**
 * One button family. Every variant has a resting fill and a deeper held
 * fill, so a press is visible even with reduced motion. Busy keeps the
 * label and the variant colour (the action is still the same action).
 */
export function Button({
  label,
  onPress,
  icon,
  primary = false,
  variant,
  disabled = false,
  busy = false,
  size = "md",
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  primary?: boolean;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  size?: "md" | "sm";
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const kind: ButtonVariant = variant ?? (primary ? "primary" : "secondary");
  const off = disabled || busy;
  const tones: Record<ButtonVariant, [string, string, string]> = {
    primary: [c.accent, c.accentPressed, c.inverse],
    secondary: [c.soft, c.softPressed, c.ink],
    ghost: ["transparent", c.soft, c.ink],
    danger: [c.accentSoft, c.accentSoftPressed, c.error],
  };
  const [rest, held, ink] = tones[kind];
  const bg = disabled ? c.soft : rest;
  const fg = disabled ? c.muted : ink;
  const small = size === "sm";
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.button,
        small && styles.buttonSmall,
        kind === "ghost" && {
          borderWidth: 1,
          borderColor: disabled ? "transparent" : c.line,
        },
        {
          backgroundColor: !off && (pressed || hovered) ? held : bg,
          opacity: busy ? 0.72 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Icon name={icon} size={small ? 16 : 18} color={fg} />
      ) : null}
      <Text
        style={{
          color: fg,
          fontSize: small ? 14 : 15,
          fontWeight: kind === "primary" ? "700" : "600",
          flexShrink: 1,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Press>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  color,
  disabled = false,
  selected,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  selected?: boolean;
}) {
  const c = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      pressScale={0.88}
      style={({ pressed, hovered }) => ({
        width: 44,
        height: 44,
        opacity: disabled ? 0.45 : 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
        backgroundColor: pressed
          ? c.softPressed
          : selected
            ? c.accentSoft
            : hovered
              ? c.soft
              : "transparent",
      })}
    >
      <Icon name={name} color={color ?? (selected ? c.accent : c.ink)} />
    </Press>
  );
}
export type CardTone = "default" | "accent" | "muted" | "success";
export function Card({
  children,
  tone = "default",
  style,
}: {
  children: ReactNode;
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const bg =
    tone === "accent"
      ? c.accentSoft
      : tone === "muted"
        ? c.soft
        : tone === "success"
          ? c.successSoft
          : c.surface;
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          padding: 20,
          gap: 14,
        },
        tone === "default" && elevation(c),
        style,
      ]}
    >
      {children}
    </View>
  );
}
/**
 * A single kanji pressed like a name seal (印). It tells a Korean traveller
 * which part of the trip a screen is about without any English label.
 */
export function Seal({ glyph }: { glyph: string }) {
  const c = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        width: 38,
        height: 38,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: c.accent,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ rotate: "-4deg" }],
      }}
    >
      <Text
        style={{
          color: c.accent,
          fontSize: 20,
          lineHeight: 24,
          fontWeight: "800",
        }}
      >
        {glyph}
      </Text>
    </View>
  );
}
/** Consistent page title block: seal, display title, lede. */
export function ScreenHeader({
  seal,
  title,
  subtitle,
  trailing,
}: {
  seal?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      {!!seal && <Seal glyph={seal} />}
      <View style={[styles.row, { alignItems: "flex-start" }]}>
        <View style={{ flex: 1 }}>
          <Label size={28} weight="800">
            {title}
          </Label>
        </View>
        {trailing}
      </View>
      {!!subtitle && <Label muted>{subtitle}</Label>}
    </View>
  );
}
export interface NavItem<K extends string> {
  key: K;
  label: string;
  icon?: IconName;
}
/**
 * Section switcher. Up to three short items render as a segmented control
 * whose white thumb slides to the chosen segment; longer lists scroll
 * horizontally and keep the chosen pill in view.
 */
export function SubNav<K extends string>(props: {
  items: NavItem<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  return props.items.length <= 3 ? (
    <Segmented {...props} />
  ) : (
    <PillRail {...props} />
  );
}
const SEG_PAD = 4;
const SEG_GAP = 4;
function Segmented<K extends string>({
  items,
  value,
  onChange,
}: {
  items: NavItem<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    items.findIndex((item) => item.key === value),
  );
  const position = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    if (reduced) {
      position.setValue(index);
      return;
    }
    Animated.spring(position, {
      toValue: index,
      useNativeDriver: motion.native,
      ...motion.settle,
    }).start();
  }, [index, reduced]);
  const count = items.length;
  const segment =
    width > 0 ? (width - SEG_PAD * 2 - SEG_GAP * (count - 1)) / count : 0;
  const last = Math.max(1, count - 1);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: "row",
        backgroundColor: c.soft,
        borderRadius: radius.md,
        padding: SEG_PAD,
        gap: SEG_GAP,
      }}
    >
      {segment > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: SEG_PAD,
              bottom: SEG_PAD,
              left: SEG_PAD,
              width: segment,
              borderRadius: radius.sm + 1,
              backgroundColor: c.surface,
            },
            // Android draws elevated views above their siblings; use a hairline.
            Platform.OS === "android"
              ? { borderWidth: 1, borderColor: c.line }
              : elevation(c),
            {
              transform: [
                {
                  translateX: position.interpolate({
                    inputRange: [0, last],
                    outputRange: [0, last * (segment + SEG_GAP)],
                  }),
                },
              ],
            },
          ]}
        />
      )}
      {items.map((item) => {
        const on = item.key === value;
        return (
          <Press
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(item.key)}
            pressScale={0.96}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: radius.sm + 1,
              paddingHorizontal: 6,
              paddingVertical: 8,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
              justifyContent: "center",
              // Before the first layout there is no thumb yet.
              backgroundColor: segment > 0 || !on ? "transparent" : c.surface,
            }}
          >
            {item.icon && (
              <Icon name={item.icon} size={16} color={on ? c.ink : c.muted} />
            )}
            <Text
              style={{
                color: on ? c.ink : c.muted,
                fontSize: 14,
                fontWeight: on ? "700" : "600",
                flexShrink: 1,
              }}
            >
              {item.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}
function PillRail<K extends string>({
  items,
  value,
  onChange,
}: {
  items: NavItem<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const rail = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<K, number>>>({});
  const reveal = (key: K, animated: boolean) => {
    const x = offsets.current[key];
    if (x === undefined) return;
    rail.current?.scrollTo({ x: Math.max(0, x - 28), animated });
  };
  // A section opened from elsewhere (Today, a notification) can sit off-screen.
  useEffect(() => {
    reveal(value, !reduced);
  }, [value]);
  return (
    <ScrollView
      ref={rail}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -20, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {items.map((item) => {
        const on = item.key === value;
        return (
          <Press
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(item.key)}
            onLayout={(e) => {
              offsets.current[item.key] = e.nativeEvent.layout.x;
              if (on) reveal(item.key, false);
            }}
            style={({ pressed, hovered }) => ({
              minHeight: 44,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: on
                ? c.selected
                : pressed
                  ? c.softPressed
                  : hovered
                    ? c.soft
                    : c.surface,
              borderWidth: 1,
              borderColor: on ? c.selected : c.line,
            })}
          >
            {item.icon && (
              <Icon
                name={item.icon}
                size={16}
                color={on ? c.onSelected : c.muted}
              />
            )}
            <Text
              style={{
                color: on ? c.onSelected : c.ink,
                fontSize: 14,
                fontWeight: on ? "700" : "600",
              }}
            >
              {item.label}
            </Text>
          </Press>
        );
      })}
    </ScrollView>
  );
}
export function Badge({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "accent" | "success";
}) {
  const c = useTheme();
  const [bg, fg] =
    tone === "accent"
      ? [c.accentSoft, c.accentInk]
      : tone === "success"
        ? [c.successSoft, c.success]
        : [c.soft, c.muted];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}
export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSmall: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.sm + 2,
  },
  section: { gap: 16 },
});
