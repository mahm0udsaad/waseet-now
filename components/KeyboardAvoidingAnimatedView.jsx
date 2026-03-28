import React, { forwardRef } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

const KeyboardAvoidingAnimatedView = forwardRef((props, ref) => {
  const {
    children,
    behavior = Platform.OS === 'ios' ? 'padding' : 'height',
    keyboardVerticalOffset = 0,
    style,
    contentContainerStyle,
    enabled = true,
    onLayout,
    ...leftoverProps
  } = props;

  return (
    <KeyboardAvoidingView
      ref={ref}
      behavior={behavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={style}
      contentContainerStyle={contentContainerStyle}
      enabled={enabled}
      onLayout={onLayout}
      {...leftoverProps}
    >
      {children}
    </KeyboardAvoidingView>
  );
});

KeyboardAvoidingAnimatedView.displayName = 'KeyboardAvoidingAnimatedView';

export default KeyboardAvoidingAnimatedView;
