import { SCREEN_MAX_WIDTH, Spacing } from '@/constants/theme';
import React, { forwardRef } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const AppFlatList = forwardRef(function AppFlatList(
  {
    contentContainerStyle,
    contentWidth = SCREEN_MAX_WIDTH,
    horizontalPadding = Spacing.m,
    topPadding = Spacing.l,
    bottomPadding,
    keyboardShouldPersistTaps = 'handled',
    keyboardDismissMode = 'on-drag',
    ...props
  },
  ref
) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxWidth = width >= 768 ? contentWidth : undefined;

  return (
    <FlatList
      ref={ref}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: topPadding,
          paddingBottom: bottomPadding ?? insets.bottom + Spacing.xl,
          width: '100%',
          maxWidth,
          alignSelf: 'center',
        },
        contentContainerStyle,
      ]}
      {...props}
    />
  );
});

export default AppFlatList;
