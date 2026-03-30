import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
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
        { backgroundColor: colors.primary, opacity: pressed ? 0.85 : disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  label: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
