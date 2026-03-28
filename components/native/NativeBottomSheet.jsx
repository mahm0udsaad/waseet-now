import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/utils/theme/store';
import { hapticFeedback } from '@/utils/native/haptics';

/**
 * NativeBottomSheet - Enhanced bottom sheet with blur (iOS) and haptics
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render inside the bottom sheet
 * @param {string[]} [props.snapPoints=['50%']] - Snap points for the bottom sheet
 * @param {Function} [props.onChange] - Callback when sheet position changes
 * @param {boolean} [props.enablePanDownToClose=true] - Whether to enable pan down to close
 * @param {boolean} [props.enableDynamicSizing=false] - Enable dynamic sizing based on content
 * @param {boolean} [props.keyboardBehavior='interactive'] - Keyboard handling behavior
 * @param {Object} [props.backgroundStyle] - Custom background style
 * @param {boolean} [props.enableBlur=true] - Enable blur backdrop on iOS
 */
const NativeBottomSheet = forwardRef(({ 
  children, 
  snapPoints = ['50%'], 
  onChange,
  enablePanDownToClose = true,
  enableDynamicSizing = false,
  keyboardBehavior = 'interactive',
  backgroundStyle,
  enableBlur = Platform.OS === 'ios',
  ...props 
}, ref) => {
  const { colors, isDark } = useTheme();
  
  // Render backdrop with blur on iOS
  const renderBackdrop = useCallback(
    (props) => {
      if (enableBlur && Platform.OS === 'ios') {
        return (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.3}
            pressBehavior="close"
          >
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          </BottomSheetBackdrop>
        );
      }
      
      return (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="close"
        />
      );
    },
    [enableBlur, isDark]
  );

  const _snapPoints = useMemo(() => snapPoints, [snapPoints]);

  const handleSheetChanges = useCallback((index) => {
    // Haptic feedback on sheet changes
    if (index === -1) {
      hapticFeedback.tap();
    } else if (index >= 0) {
      hapticFeedback.selection();
    }
    
    if (onChange) {
      onChange(index);
    }
  }, [onChange]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={_snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={enablePanDownToClose}
      enableDynamicSizing={enableDynamicSizing}
      backdropComponent={renderBackdrop}
      backgroundStyle={[
        { backgroundColor: colors.surface },
        backgroundStyle,
      ]}
      handleIndicatorStyle={{ 
        backgroundColor: colors.textSecondary,
        width: 40,
        height: 4,
      }}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      {...props}
    >
      <BottomSheetView style={styles.contentContainer}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

NativeBottomSheet.displayName = 'NativeBottomSheet';

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
});

export default NativeBottomSheet;
