import React from 'react';
import { Text, TextInput } from 'react-native';

let patched = false;
let currentFontFamily = undefined;
let originalTextDefaultStyle;
let originalTextInputDefaultStyle;

function withFontFamily(originalElement) {
  if (!originalElement || !currentFontFamily) return originalElement;

  // Put our font first so explicit styles passed by the component can override it.
  const injectedStyle = { fontFamily: currentFontFamily };
  return React.cloneElement(originalElement, {
    style: [injectedStyle, originalElement.props?.style],
  });
}

export function setGlobalFontFamily(fontFamily) {
  currentFontFamily = fontFamily || undefined;

  // Always keep defaultProps updated (works even if render patch isn't available).
  if (!patched) {
    originalTextDefaultStyle = Text.defaultProps?.style;
    originalTextInputDefaultStyle = TextInput.defaultProps?.style;
  }

  Text.defaultProps = Text.defaultProps || {};
  TextInput.defaultProps = TextInput.defaultProps || {};

  Text.defaultProps.style = currentFontFamily
    ? [{ fontFamily: currentFontFamily }, originalTextDefaultStyle]
    : originalTextDefaultStyle;

  TextInput.defaultProps.style = currentFontFamily
    ? [{ fontFamily: currentFontFamily }, originalTextInputDefaultStyle]
    : originalTextInputDefaultStyle;

  if (patched) return;
  patched = true;

  // Patch Text
  const oldTextRender = Text.render;
  if (typeof oldTextRender === 'function') {
    Text.render = function (...args) {
      const origin = oldTextRender.call(this, ...args);
      return withFontFamily(origin);
    };
  }

  // Patch TextInput (best-effort; implementation differs across RN versions)
  const oldTextInputRender = TextInput.render;
  if (typeof oldTextInputRender === 'function') {
    TextInput.render = function (...args) {
      const origin = oldTextInputRender.call(this, ...args);
      return withFontFamily(origin);
    };
  }
}


