import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/utils/theme/store";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function SystemMessageCard({ content, type }) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: Spacing.m,
    width: "100%",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  text: {
    fontSize: 12,
    textAlign: "center",
  },
});
