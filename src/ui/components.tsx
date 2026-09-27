import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  return <Ionicons name={name} size={size} color={color ?? c.ink} />;
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
export function Button({
  label,
  onPress,
  icon,
  primary = false,
  variant,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  primary?: boolean;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
}) {
  const c = useTheme();
  const kind: ButtonVariant = variant ?? (primary ? "primary" : "secondary");
  const off = disabled || busy;
  const bg = off
    ? c.soft
    : kind === "primary"
      ? c.accent
      : kind === "danger"
        ? c.accentSoft
        : kind === "ghost"
          ? "transparent"
          : c.soft;
  const fg = disabled
    ? c.muted
    : kind === "primary"
      ? busy
        ? c.accent
        : c.inverse
      : kind === "danger"
        ? c.error
        : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === "ghost" && !off && { borderWidth: 1, borderColor: c.line },
        {
          backgroundColor: bg,
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : icon ? (
        <Icon name={icon} size={18} color={fg} />
      ) : null}
      <Text
        style={{
          color: fg,
          fontSize: 15,
          fontWeight: kind === "primary" ? "700" : "600",
          flexShrink: 1,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  color,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
        backgroundColor: pressed ? c.line : "transparent",
      })}
    >
      <Icon name={name} color={color} />
    </Pressable>
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
/** Consistent page title block: small accent eyebrow, display title, lede. */
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {!!eyebrow && (
        <Text
          style={{
            color: c.accent,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 1.2,
          }}
        >
          {eyebrow}
        </Text>
      )}
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
 * Section switcher. Up to three short items render as a segmented control;
 * longer lists scroll horizontally instead of wrapping into a wall of pills.
 */
export function SubNav<K extends string>({
  items,
  value,
  onChange,
}: {
  items: NavItem<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  const c = useTheme();
  if (items.length <= 3) {
    return (
      <View
        style={{
          flexDirection: "row",
          backgroundColor: c.soft,
          borderRadius: radius.md,
          padding: 4,
          gap: 4,
        }}
      >
        {items.map((item) => {
          const on = item.key === value;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: on }}
              onPress={() => onChange(item.key)}
              style={[
                {
                  flex: 1,
                  minHeight: 42,
                  borderRadius: radius.sm + 1,
                  paddingHorizontal: 6,
                  flexDirection: "row",
                  gap: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: on ? c.surface : "transparent",
                },
                on && elevation(c),
              ]}
            >
              {item.icon && (
                <Icon name={item.icon} size={16} color={on ? c.ink : c.muted} />
              )}
              <Text
                numberOfLines={1}
                style={{
                  color: on ? c.ink : c.muted,
                  fontSize: 14,
                  fontWeight: on ? "700" : "600",
                  flexShrink: 1,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -20, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {items.map((item) => {
        const on = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => ({
              minHeight: 40,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: on ? c.selected : c.surface,
              borderWidth: 1,
              borderColor: on ? c.selected : c.line,
              opacity: pressed ? 0.8 : 1,
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
          </Pressable>
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
  section: { gap: 16 },
});
