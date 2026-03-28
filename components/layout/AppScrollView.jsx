import { SCREEN_MAX_WIDTH, Spacing } from '@/constants/theme';
import React, { forwardRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const AppScrollView = forwardRef(function AppScrollView(
  {
    children,
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
    <ScrollView
      ref={ref}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: topPadding,
          paddingBottom: (bottomPadding ?? insets.bottom + Spacing.xl),
        },
        contentContainerStyle,
      ]}
      {...props}
    >
      <View style={{ width: '100%', maxWidth, alignSelf: 'center' }}>{children}</View>
    </ScrollView>
  );
});

export default AppScrollView;
