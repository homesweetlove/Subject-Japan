import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import { motion, useReducedMotion } from "./motion";

/** Strong ease-out: quick to start, soft to land. */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * A block that settles into place when it first appears. `order` staggers
 * neighbours so a screen assembles top to bottom instead of all at once.
 * Only opacity and transform move, so nothing else is laid out again.
 */
export function Rise({
  children,
  order = 0,
  distance = 16,
  style,
}: {
  children: ReactNode;
  order?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      delay: Math.min(order, 6) * 55,
      easing: EASE_OUT,
      useNativeDriver: motion.native,
    });
    animation.start();
    return () => animation.stop();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.001, 1],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Draws the eye to a value that just changed (a total, a reply) with one
 * small settle. It never plays on first render, only when `trigger` changes.
 */
export function Pop({
  children,
  trigger,
  style,
}: {
  children: ReactNode;
  trigger: string | number | null | undefined;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      easing: EASE_OUT,
      useNativeDriver: motion.native,
    });
    animation.start();
    return () => {
      animation.stop();
      progress.setValue(1);
    };
  }, [trigger]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.55, 1],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.97, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
