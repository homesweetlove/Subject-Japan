import { Pressable, Text } from "react-native";
import { Icon } from "./components";
import { radius, useTheme } from "./theme";
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
  const bg = checkbox
    ? selected
      ? c.successSoft
      : c.soft
    : selected
      ? c.selected
      : c.soft;
  const fg = !checkbox && selected ? c.onSelected : c.ink;
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
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: checkbox ? 12 : 15,
        paddingVertical: 10,
        borderRadius: checkbox ? radius.md : radius.pill,
        backgroundColor: bg,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      {checkbox && (
        <Icon
          name={selected ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={selected ? c.success : c.muted}
        />
      )}
      <Text
        style={{
          color: fg,
          fontSize: 14,
          lineHeight: 21,
          fontWeight: selected ? "700" : "600",
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
