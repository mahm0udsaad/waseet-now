import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { StyleSheet, Modal, View, Pressable, Dimensions } from 'react-native';
import { useTheme } from '@/utils/theme/store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Reusable Bottom Sheet Component - Modal-based replacement for @gorhom/bottom-sheet
 * Exposes .present() and .dismiss() to match the gorhom API.
 */
const AppBottomSheet = forwardRef(({
  children,
  snapPoints = ['50%'],
  onChange,
  enablePanDownToClose = true,
  backgroundStyle,
  ...props
}, ref) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const present = useCallback(() => {
    setVisible(true);
    onChange?.(0);
  }, [onChange]);

  const dismiss = useCallback(() => {
    setVisible(false);
    onChange?.(-1);
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    present,
    dismiss,
  }), [present, dismiss]);

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
          style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={enablePanDownToClose ? dismiss : undefined}
        />

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

AppBottomSheet.displayName = 'AppBottomSheet';

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

export default AppBottomSheet;
