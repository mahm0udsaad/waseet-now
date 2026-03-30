import React, { useRef } from "react";
import { StyleSheet, View, Animated, PanResponder } from "react-native";
import { Reply } from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";

const SWIPE_THRESHOLD = 50;

function SwipeableMessage({ children, onReply, isMe, isRTL }) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const replyOpacity = useRef(new Animated.Value(0)).current;

  const swipeDirection = isRTL ? -1 : 1;

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
      {/* Reply icon behind the message */}
      <Animated.View
        style={[
          styles.replyIcon,
          isRTL ? styles.replyIconRight : styles.replyIconLeft,
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
