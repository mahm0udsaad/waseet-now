import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/utils/theme/store';

/**
 * Reusable Bottom Sheet Component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render inside the bottom sheet
 * @param {string[]} [props.snapPoints=['50%']] - Snap points for the bottom sheet
 * @param {Function} [props.onChange] - Callback when sheet position changes
 * @param {boolean} [props.enablePanDownToClose=true] - Whether to enable pan down to close
 * @param {string} [props.backgroundStyle] - Custom background style
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
  
  // renderBackdrop
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const _snapPoints = useMemo(() => snapPoints, [snapPoints]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={_snapPoints}
      onChange={onChange}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={[{ backgroundColor: colors.surface }, backgroundStyle]}
      handleIndicatorStyle={{ backgroundColor: colors.textSecondary }}
      {...props}
    >
      <BottomSheetView style={styles.contentContainer}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AppBottomSheet.displayName = 'AppBottomSheet';

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
});

export default AppBottomSheet;
