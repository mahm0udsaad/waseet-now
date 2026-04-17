import React, { useRef } from "react";
import { StyleSheet, View, Animated, PanResponder } from "react-native";
import { Reply } from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";

const SWIPE_THRESHOLD = 50;

function SwipeableMessage({ children, onReply, isMe }) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const replyOpacity = useRef(new Animated.Value(0)).current;

  // Bubble is visually on the right for `isMe`, on the left for others in both
  // LTR and RTL (see MessageBubble alignSelf + messageRow flexDirection). The
  // swipe should always pull the bubble toward the screen center:
  //   - right-side bubble (isMe): swipe left  → dx < 0 → direction = -1
  //   - left-side bubble  (other): swipe right → dx > 0 → direction = +1
  const swipeDirection = isMe ? -1 : 1;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only activate for horizontal swipes, not vertical
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const clamped = gestureState.dx * swipeDirection;
        if (clamped > 0) {
          const value = Math.min(clamped * 0.6, 80) * swipeDirection;
          translateX.setValue(value);
          replyOpacity.setValue(Math.min(Math.abs(value) / SWIPE_THRESHOLD, 1));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const clamped = gestureState.dx * swipeDirection;
        if (clamped > SWIPE_THRESHOLD && onReply) {
          onReply();
        }
        Animated.spring(translateX, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }).start();
        Animated.timing(replyOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      {/* Reply icon sits on the bubble's outer edge — the side the bubble
          slides away from as the user swipes. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.replyIcon,
          isMe ? styles.replyIconRight : styles.replyIconLeft,
          {
            opacity: replyOpacity,
            transform: [{ scale: replyOpacity }],
          },
        ]}
      >
        <View style={[styles.replyIconCircle, { backgroundColor: colors.primaryLight }]}>
          <Reply size={18} color={colors.primary} />
        </View>
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  replyIcon: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: -1,
  },
  // Use physical left/right so the icon stays pinned to the bubble's visual
  // side regardless of RTL (the bubble's position is driven by isMe, not RTL).
  replyIconLeft: {
    left: -8,
  },
  replyIconRight: {
    right: -8,
  },
  replyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default React.memo(SwipeableMessage);
