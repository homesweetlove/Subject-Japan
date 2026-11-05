import { useEffect, useRef, type ReactNode } from "react";
import { Animated } from "react-native";
import { motion, useReducedMotion } from "./motion";

/**
 * The one screen-level motion: when a tab opens, its page rises a few
 * points into place. Key this by screen so it plays once per switch.
 */
export function Enter({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.enterMs,
      useNativeDriver: motion.native,
    });
    animation.start();
    return () => animation.stop();
  }, []);
  return (
    <Animated.View
      style={{
        opacity: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.001, 1],
        }),
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
