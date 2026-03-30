import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CreditCard, CheckCircle, AlertTriangle, Info } from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { Spacing, BorderRadius } from "@/constants/theme";

const TYPE_CONFIG = {
  payment: { Icon: CreditCard, color: "#10B981" },
  completion: { Icon: CheckCircle, color: "#10B981" },
  dispute: { Icon: AlertTriangle, color: "#F59E0B" },
};

export default function SystemMessageCard({ content, type }) {
  const { colors } = useTheme();

  const config = TYPE_CONFIG[type] || { Icon: Info, color: colors.textMuted };
  const { Icon, color } = config;

  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: colors.surfaceSecondary, borderLeftColor: color, borderLeftWidth: 2 }]}>
        <Icon size={14} color={color} />
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.l,
    maxWidth: "85%",
  },
  text: {
    fontSize: 12,
    flex: 1,
  },
});
