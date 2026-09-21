import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "./theme";

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
export function Label({
  children,
  muted = false,
  size = 15,
  weight = "400",
}: {
  children: ReactNode;
  muted?: boolean;
  size?: number;
  weight?: "400" | "500" | "600" | "700" | "800";
}) {
  const c = useTheme();
  return (
    <Text
      style={{
        color: muted ? c.muted : c.ink,
        fontSize: size,
        fontWeight: weight,
        lineHeight: size * 1.55,
      }}
    >
      {children}
    </Text>
  );
}
export function Button({
  label,
  onPress,
  icon,
  primary = false,
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  primary?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? c.accent : c.soft,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? c.inverse : c.accent} />
      ) : icon ? (
        <Icon name={icon} size={18} color={primary ? c.inverse : c.ink} />
      ) : null}
      <Text
        style={{
          color: primary ? c.inverse : c.ink,
          fontSize: 14,
          fontWeight: "600",
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
}: {
  name: IconName;
  label: string;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
        backgroundColor: pressed ? c.soft : "transparent",
      })}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Card({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderColor: c.line,
        borderWidth: 1,
        borderRadius: 24,
        padding: 22,
        gap: 16,
      }}
    >
      {children}
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
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { gap: 16 },
});
