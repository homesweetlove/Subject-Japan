import { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";
import { Icon } from "./components";
import { motion, useReducedMotion } from "./motion";
import { Press } from "./Press";
import { radius, useTheme } from "./theme";

/** The check mark settles into place when ticked, so the change is seen. */
function CheckMark({ selected }: { selected: boolean }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced || !selected) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0.55);
    Animated.spring(pop, {
      toValue: 1,
      useNativeDriver: motion.native,
      speed: 20,
      bounciness: 12,
    }).start();
  }, [selected]);
  return (
    <Animated.View style={{ transform: [{ scale: pop }] }}>
      <Icon
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={20}
        color={selected ? c.success : c.muted}
      />
    </Animated.View>
  );
}

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
  const rest = checkbox
    ? selected
      ? c.successSoft
      : c.soft
    : selected
      ? c.selected
      : c.soft;
  const fg = !checkbox && selected ? c.onSelected : c.ink;
  return (
    <Press
      accessibilityRole={checkbox ? "checkbox" : "button"}
      accessibilityLabel={label}
      aria-checked={checkbox ? selected : undefined}
      accessibilityState={
        checkbox ? { checked: selected, disabled } : { selected, disabled }
      }
      disabled={disabled}
      onPress={onPress}
      pressScale={0.96}
      style={({ pressed, hovered }) => ({
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: checkbox ? 12 : 15,
        paddingVertical: 10,
        borderRadius: checkbox ? radius.md : radius.pill,
        // Selected pills keep their ink fill; only resting pills deepen.
        backgroundColor:
          !selected && !disabled && (pressed || hovered)
            ? c.softPressed
            : rest,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      {checkbox && <CheckMark selected={selected} />}
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
    </Press>
  );
}
