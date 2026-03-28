import React from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useTheme } from "@/utils/theme/store";

const SkeletonPulseContext = React.createContext(null);

function usePulseOpacity({ enabled, duration }) {
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!enabled) return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();
    return () => {
      try {
        anim.stop();
      } catch {
        // ignore
      }
    };
  }, [duration, enabled, progress]);

  return React.useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.35, 0.8],
      }),
    [progress]
  );
}

/**
 * SkeletonGroup
 * - Provides a single pulsing animation value to all nested Skeleton blocks.
 * - This keeps skeleton animation lightweight (one loop per screen).
 */
export function SkeletonGroup({ children, enabled = true, duration = 900, style }) {
  const opacity = usePulseOpacity({ enabled, duration });

  return (
    <SkeletonPulseContext.Provider value={opacity}>
      <View style={style}>{children}</View>
    </SkeletonPulseContext.Provider>
  );
}

/**
 * Skeleton
 * - A lightweight placeholder block (pulsing opacity by default).
 */
export const Skeleton = React.memo(function Skeleton({
  width,
  height,
  radius = 12,
  style,
  animated = true,
  duration = 900,
}) {
  const { colors, isDark } = useTheme();
  const groupOpacity = React.useContext(SkeletonPulseContext);
  const localOpacity = usePulseOpacity({ enabled: animated && !groupOpacity, duration });

  const bg =
    colors?.surfaceSecondary ||
    (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)");

  const opacity = groupOpacity || localOpacity;

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: bg,
          opacity,
        },
        style,
      ]}
    />
  );
});

export const SkeletonText = React.memo(function SkeletonText({
  lines = 2,
  lineHeight = 12,
  gap = 8,
  lastLineWidth = "65%",
  style,
}) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          height={lineHeight}
          radius={8}
          width={idx === lines - 1 ? lastLineWidth : "100%"}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    overflow: "hidden",
  },
});

