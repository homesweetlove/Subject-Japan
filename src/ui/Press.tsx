import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { motion, useReducedMotion } from "./motion";
import { useTheme } from "./theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressState {
  pressed: boolean;
  hovered: boolean;
  focused: boolean;
}

export type PressProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle> | ((state: PressState) => StyleProp<ViewStyle>);
  /** How far the surface sinks while held. 1 keeps it still. */
  pressScale?: number;
};

/**
 * Drop-in Pressable with one consistent touch response for the whole app:
 * the surface sinks slightly while held and springs back on release, a
 * keyboard focus ring appears only for keyboard focus (not taps), and web
 * hover is exposed to the style callback. Reduced motion keeps it still.
 */
export function Press({
  style,
  pressScale = 0.97,
  disabled,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  ...rest
}: PressProps) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Focus that follows a tap or click is not keyboard focus.
  const pointer = useRef(false);

  const springTo = (
    value: number,
    config: { speed: number; bounciness: number },
  ) => {
    if (reduced || pressScale === 1) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: motion.native,
      ...config,
    }).start();
  };

  // A control disabled mid-press never receives onPressOut.
  useEffect(() => {
    if (!disabled) return;
    setPressed(false);
    setHovered(false);
    scale.setValue(1);
  }, [disabled]);

  const handlers: Partial<PressableProps> = {
    onPressIn: (event) => {
      pointer.current = true;
      setPressed(true);
      springTo(pressScale, motion.press);
      onPressIn?.(event);
    },
    onPressOut: (event) => {
      setPressed(false);
      springTo(1, motion.release);
      onPressOut?.(event);
    },
    onHoverIn: (event) => {
      setHovered(true);
      onHoverIn?.(event);
    },
    onHoverOut: (event) => {
      setHovered(false);
      onHoverOut?.(event);
    },
    onFocus: (event) => {
      if (!pointer.current) setFocused(true);
      onFocus?.(event);
    },
    onBlur: (event) => {
      pointer.current = false;
      setFocused(false);
      onBlur?.(event);
    },
  };

  const resolved =
    typeof style === "function" ? style({ pressed, hovered, focused }) : style;

  return (
    <AnimatedPressable
      {...rest}
      {...handlers}
      disabled={disabled}
      style={[
        resolved,
        focused && {
          outlineColor: c.accent,
          outlineStyle: "solid",
          outlineWidth: 2,
          outlineOffset: 2,
        },
        { transform: [{ scale }] },
      ]}
    />
  );
}
