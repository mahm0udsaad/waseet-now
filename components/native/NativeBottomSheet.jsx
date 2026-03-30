import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { StyleSheet, Platform, Modal, View, Pressable, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/utils/theme/store';
import { hapticFeedback } from '@/utils/native/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * NativeBottomSheet - Modal-based bottom sheet replacement for @gorhom/bottom-sheet
 * Exposes .present() and .dismiss() to match the gorhom API.
 */
const NativeBottomSheet = forwardRef(({
  children,
  snapPoints = ['50%'],
  onChange,
  enablePanDownToClose = true,
  enableBlur = Platform.OS === 'ios',
  backgroundStyle,
  ...props
}, ref) => {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);

  const present = useCallback(() => {
    setVisible(true);
    hapticFeedback.selection();
    onChange?.(0);
  }, [onChange]);

  const dismiss = useCallback(() => {
    setVisible(false);
    hapticFeedback.tap();
    onChange?.(-1);
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    present,
    dismiss,
  }), [present, dismiss]);

  // Parse first snap point for height
  const snapHeight = snapPoints[0];
  const sheetHeight = typeof snapHeight === 'string' && snapHeight.endsWith('%')
    ? (parseInt(snapHeight) / 100) * SCREEN_HEIGHT
    : typeof snapHeight === 'number' ? snapHeight : SCREEN_HEIGHT * 0.5;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={enablePanDownToClose ? dismiss : undefined}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={enablePanDownToClose ? dismiss : undefined}
        >
          {enableBlur && Platform.OS === 'ios' ? (
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          )}
        </Pressable>

        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, height: sheetHeight },
            backgroundStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
          <View style={styles.contentContainer}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
});

NativeBottomSheet.displayName = 'NativeBottomSheet';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  contentContainer: {
    flex: 1,
  },
});

export default NativeBottomSheet;
