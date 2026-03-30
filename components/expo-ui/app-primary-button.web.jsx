import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/utils/theme/store";

export default function AppPrimaryButton({
  label,
  onPress,
  disabled = false,
  testID,
  style,
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.primary,
          opacity: disabled ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    width: "100%",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
