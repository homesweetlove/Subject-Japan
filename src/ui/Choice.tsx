import { Pressable, Text } from "react-native";
import { useTheme } from "./theme";
export function Choice({
  label,
  selected,
  onPress,
  checkbox = false,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  checkbox?: boolean;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole={checkbox ? "checkbox" : "button"}
      accessibilityLabel={label}
      aria-checked={checkbox ? selected : undefined}
      accessibilityState={
        checkbox ? { checked: selected, disabled } : { selected, disabled }
      }
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: selected ? c.accent : c.soft,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={{
          color: selected ? c.inverse : c.ink,
          fontSize: 14,
          lineHeight: 22,
          fontWeight: "600",
          flexShrink: 1,
        }}
      >
        {checkbox ? (selected ? "✓  " : "○  ") : ""}
        {label}
      </Text>
    </Pressable>
  );
}
