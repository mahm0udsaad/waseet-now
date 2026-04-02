import React, { memo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  InputAccessoryView,
  Keyboard,
} from "react-native";
import FadeInView from "@/components/ui/FadeInView";
import { Check } from "lucide-react-native";

const KeyboardAwareInput = memo(({
  icon: Icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  colors,
  isRTL,
  onFocus,
  onBlur,
  inputAccessoryViewID,
}) => {
  const inputRef = useRef(null);

  return (
    <FadeInView style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.text }]}>
        {label}
      </Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.inputContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <Icon size={18} color={colors.primary} />
          </View>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              {
                color: colors.text,
                writingDirection: 'rtl',
                minHeight: multiline ? 100 : undefined,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            onFocus={onFocus}
            onBlur={onBlur}
            inputAccessoryViewID={Platform.OS === "ios" ? inputAccessoryViewID : undefined}
          />
        </View>
      </View>
    </FadeInView>
  );
});

KeyboardAwareInput.displayName = "KeyboardAwareInput";

// Reusable Done Button for iOS Keyboard
export const KeyboardDoneButton = memo(({ inputAccessoryViewID, colors, isRTL }) => {
  if (Platform.OS !== "ios") return null;

  return (
    <InputAccessoryView nativeID={inputAccessoryViewID}>
      <View style={[styles.accessoryContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
          onPress={() => Keyboard.dismiss()}
        >
          <Check size={18} color="#fff" />
          <Text style={styles.doneButtonText}>
            {isRTL ? "تم" : "Done"}
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
});

KeyboardDoneButton.displayName = "KeyboardDoneButton";

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  inputContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  // Input Accessory View (iOS Done Button)
  accessoryContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default KeyboardAwareInput;
