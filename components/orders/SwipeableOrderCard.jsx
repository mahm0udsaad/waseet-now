import { useTranslation } from "@/utils/i18n/store";
import { hapticFeedback } from "@/utils/native/haptics";
import { Archive, RotateCcw, Trash2 } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  I18nManager,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ACTION_WIDTH = 96;
const OPEN_THRESHOLD = ACTION_WIDTH * 0.55;
const FULL_TRIGGER = ACTION_WIDTH * 1.8;
const DISMISS_DISTANCE = Dimensions.get("window").width + ACTION_WIDTH;

/**
 * Bidirectional swipe-to-reveal wrapper (iOS-Mail style).
 *
 * Gesture model — physical swipe directions are FIXED regardless of RTL, so
 * muscle memory works the same for Arabic and English users:
 *   - Swipe LEFT  → card slides left  → red "Delete"  appears on the RIGHT edge
 *   - Swipe RIGHT → card slides right → amber "Archive" appears on the LEFT edge
 *
 * (In the archived view, the archive side becomes blue "Restore".)
 *
 * Only the button label text is localized; the edge each action lives on is
 * constant so users don't have to relearn the gesture when switching language.
 *
 * Full-bleed swipe past FULL_TRIGGER auto-fires the action (Mail-style).
 * Smaller swipes snap open and wait for a tap. Tapping the card or swiping
 * back across center snaps it closed.
 *
 * Pure view-state: onArchive / onDelete hide the row in a client-side store,
 * they never mutate the database.
 */
export default function SwipeableOrderCard({
  children,
  onArchive,
  onDelete,
  archived = false,
  onUnarchive,
}) {
  const { isRTL } = useTranslation();
  const translateX = useRef(new Animated.Value(0)).current;
  const [openSide, setOpenSide] = useState(null);
  const shouldSwapEdges =
    I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL;
  const physicalLeftEdge = shouldSwapEdges ? styles.actionSlotRight : styles.actionSlotLeft;
  const physicalRightEdge = shouldSwapEdges ? styles.actionSlotLeft : styles.actionSlotRight;
  // Track the current snap state: 0 = closed, -ACTION_WIDTH = delete open,
  // +ACTION_WIDTH = archive open. Used so a starting-from-open pan math
  // offsets correctly.
  const openOffsetRef = useRef(0);

  const snap = (value, onDone) => {
    openOffsetRef.current = value;
    setOpenSide(value < 0 ? "delete" : value > 0 ? "archive" : null);

    Animated.spring(translateX, {
      toValue: value,
      damping: 24,
      stiffness: 240,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && onDone) onDone();
    });
  };

  const close = (onDone) => snap(0, onDone);
  const openDelete = () => snap(-ACTION_WIDTH);
  const openArchive = () => snap(ACTION_WIDTH);
  const dismiss = (direction, onDone) => {
    const value = direction === "delete" ? -DISMISS_DISTANCE : DISMISS_DISTANCE;
    openOffsetRef.current = value;
    setOpenSide(direction);

    Animated.timing(translateX, {
      toValue: value,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone?.();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => openOffsetRef.current !== 0,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dy) < 10,
      onPanResponderGrant: () => {
        translateX.stopAnimation((value) => {
          openOffsetRef.current = value;
        });
      },
      onPanResponderMove: (_, g) => {
        const next = openOffsetRef.current + g.dx;
        // Clamp so the card can't be pulled past "about 2x reveal width" in
        // either direction — enough slack for the full-swipe auto-trigger.
        const clamped = Math.max(
          -ACTION_WIDTH * 2.2,
          Math.min(ACTION_WIDTH * 2.2, next)
        );
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, g) => {
        if (
          openOffsetRef.current !== 0 &&
          Math.abs(g.dx) < 10 &&
          Math.abs(g.dy) < 10
        ) {
          close();
          return;
        }

        const finalX = openOffsetRef.current + g.dx;

        // Full-bleed left swipe → delete.
        if (finalX < -FULL_TRIGGER) {
          hapticFeedback.warning();
          dismiss("delete", () => onDelete?.());
          return;
        }
        // Full-bleed right swipe → archive (or restore in archived view).
        if (finalX > FULL_TRIGGER) {
          hapticFeedback.confirm();
          dismiss("archive", () => (archived ? onUnarchive?.() : onArchive?.()));
          return;
        }

        if (finalX < -OPEN_THRESHOLD) {
          hapticFeedback.selection();
          openDelete();
        } else if (finalX > OPEN_THRESHOLD) {
          hapticFeedback.selection();
          openArchive();
        } else {
          close();
        }
      },
      onPanResponderTerminate: () => close(),
    })
  ).current;

  const handleArchive = () => {
    hapticFeedback.confirm();
    dismiss("archive", () => onArchive?.());
  };
  const handleUnarchive = () => {
    hapticFeedback.confirm();
    dismiss("archive", () => onUnarchive?.());
  };
  const handleDelete = () => {
    hapticFeedback.warning();
    dismiss("delete", () => onDelete?.());
  };

  // Opacity ramps each action in only while the card is sliding in that
  // direction, so the hidden button never peeks through unintentionally.
  const archiveOpacity = translateX.interpolate({
    inputRange: [0, ACTION_WIDTH * 0.3, ACTION_WIDTH],
    outputRange: [0, 0.6, 1],
    extrapolate: "clamp",
  });
  const deleteOpacity = translateX.interpolate({
    inputRange: [-ACTION_WIDTH, -ACTION_WIDTH * 0.3, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.wrapper}>
      {/* Left-edge action — archive / restore. Visible when swiping right. */}
      <Animated.View
        style={[styles.actionSlot, physicalLeftEdge, { opacity: archiveOpacity }]}
        pointerEvents={openSide === "archive" ? "auto" : "none"}
      >
        {archived ? (
          <Pressable
            style={[styles.action, { backgroundColor: "#3B82F6" }]}
            onPress={handleUnarchive}
            testID="order-swipe-unarchive"
          >
            <RotateCcw size={22} color="#fff" />
            <Text style={styles.actionText}>
              {isRTL ? "استعادة" : "Restore"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.action, { backgroundColor: "#F59E0B" }]}
            onPress={handleArchive}
            testID="order-swipe-archive"
          >
            <Archive size={22} color="#fff" />
            <Text style={styles.actionText}>
              {isRTL ? "أرشفة" : "Archive"}
            </Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Right-edge action — delete. Visible when swiping left. */}
      <Animated.View
        style={[styles.actionSlot, physicalRightEdge, { opacity: deleteOpacity }]}
        pointerEvents={openSide === "delete" ? "auto" : "none"}
      >
        <Pressable
          style={[styles.action, { backgroundColor: "#EF4444" }]}
          onPress={handleDelete}
          testID="order-swipe-delete"
        >
          <Trash2 size={22} color="#fff" />
          <Text style={styles.actionText}>{isRTL ? "حذف" : "Delete"}</Text>
        </Pressable>
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
  actionSlot: {
    position: "absolute",
    top: 0,
    // Inner card sets marginBottom:16 — match it so the action sits flush
    // with the card's bottom edge, not the gap below.
    bottom: 16,
    width: ACTION_WIDTH,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 16,
  },
  // These are selected above to compensate for native left/right swapping in
  // forced RTL. Gesture direction is language-agnostic by design.
  actionSlotLeft: { left: 0 },
  actionSlotRight: { right: 0 },
  action: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
