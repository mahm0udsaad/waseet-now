import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Headphones } from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useLanguageStore } from "@/utils/i18n/store";

const BRAND_COLOR = "#7C3AED"; // purple — visually distinct from system (blue)

export default function SupportMessageCard({ content }) {
  const { colors } = useTheme();
  const { isRTL } = useLanguageStore();

  const teamLabel = isRTL ? "فريق دعم وسيط الآن" : "Waseet Support Team";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: BRAND_COLOR + "33",
            borderWidth: 1,
          },
        ]}
      >
        {/* Header row */}
        <View style={[styles.header, { flexDirection: "row" }]}>
          <View style={[styles.iconWrap, { backgroundColor: BRAND_COLOR + "18" }]}>
            <Headphones size={13} color={BRAND_COLOR} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.senderName, { color: BRAND_COLOR }]}>
              {teamLabel}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: BRAND_COLOR + "22" }]} />

        {/* Message body */}
        <Text style={[styles.content, { color: colors.text }]}>
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
    paddingHorizontal: 12,
  },
  bubble: {
    borderRadius: BorderRadius.l,
    padding: 12,
    width: "92%",
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "700",
  },
  roleLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginBottom: 8,
  },
  content: {
    fontSize: 13,
    lineHeight: 20,
  },
});
