import React, { useRef, useCallback } from "react";
import { Animated, Pressable } from "react-native";

/**
 * Drop-in replacement for reanimated's useSharedValue + withSpring scale pattern.
 * Wraps children in a scale-animated Pressable.
 */
function ScalePressable({ onPress, style, children, scaleValue = 0.95, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
  }, []);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default React.memo(ScalePressable);
