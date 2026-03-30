import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * Drop-in replacement for reanimated's <Animated.View entering={FadeInDown.delay(N)}>
 * Supports: delay, duration, direction (down/up/right), spring effect
 */
function FadeInView({
  children,
  delay = 0,
  duration = 400,
  direction = "down",
  spring = false,
  style,
  ...props
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(direction === "up" ? 20 : direction === "right" ? -30 : -20)).current;

  useEffect(() => {
    const animation = spring
      ? Animated.spring(translate, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        })
      : Animated.timing(translate, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        });

    const sequence = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration * 0.6,
        useNativeDriver: true,
      }),
      animation,
    ]);

    if (delay > 0) {
      const timer = setTimeout(() => sequence.start(), delay);
      return () => clearTimeout(timer);
    }
    sequence.start();
  }, []);

  const transform =
    direction === "right"
      ? [{ translateX: translate }]
      : [{ translateY: translate }];

  return (
    <Animated.View
      style={[{ opacity, transform }, style]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

export default React.memo(FadeInView);
