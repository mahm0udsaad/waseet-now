import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Receipt, FileText, CheckCircle2, Clock } from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function ReceiptCard({
  data,
  isMe,
  onReceiptPress,
  onAcceptReceipt,
  isAcceptingReceipt,
  accepted,
}) {
  const { colors } = useTheme();
  const { isRTL } = useTranslation();

  const isSigned = data.status === "seller_signed";
  const isFinal = data.status === "final";

  const statusColor = isFinal ? "#10B981" : isSigned ? "#3B82F6" : "#F59E0B";
  const statusBg = isFinal ? "#10B98120" : isSigned ? "#3B82F620" : "#F59E0B20";

  const formattedAmount = Number(data.amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
        Shadows.small,
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: statusBg }]}>
          {isFinal ? (
            <CheckCircle2 size={16} color={statusColor} />
          ) : isSigned ? (
            <Clock size={16} color={statusColor} />
          ) : (
            <Receipt size={16} color={statusColor} />
          )}
        </View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isFinal
            ? (isRTL ? "إيصال نهائي" : "Final Receipt")
            : isSigned
            ? (isRTL ? "بانتظار قبول المشتري" : "Awaiting Buyer Acceptance")
            : (isRTL ? "إيصال" : "Receipt")}
        </Text>
      </View>

      {/* Amount Section */}
      <View style={styles.amountSection}>
        {data.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {data.description}
          </Text>
        )}
        <Text style={[styles.amountValue, { color: statusColor }]}>
          {formattedAmount} <Text style={{ fontSize: 16 }}>{isRTL ? "ر.س" : "SAR"}</Text>
        </Text>
      </View>

      {/* Status Row */}
      <View style={styles.detailsContainer}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isSigned && (isRTL ? "موقع من البائع" : "Signed by Seller")}
              {isFinal && (isRTL ? "نهائي" : "Final")}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => onReceiptPress?.(data)}
          style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
        >
          <FileText size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {isRTL ? "عرض PDF" : "View PDF"}
          </Text>
        </Pressable>
        {isSigned && !isMe && !accepted && (
          <Pressable
            testID="receipt-accept-btn"
            onPress={() => onAcceptReceipt?.(data.receipt_id)}
            disabled={isAcceptingReceipt}
            style={[styles.actionButton, { backgroundColor: colors.primary, flex: 1 }]}
          >
            <Text style={[styles.actionText, { color: "#fff" }]}>
              {isAcceptingReceipt ? (isRTL ? "جاري..." : "Loading...") : (isRTL ? "قبول وتوقيع" : "Accept & Sign")}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    borderRadius: BorderRadius.l,
    overflow: "hidden",
    marginVertical: 4,
  },
  header: {
    flexDirection: "row",
    padding: Spacing.m,
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 0.5,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  amountSection: {
    padding: Spacing.l,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  description: {
    fontSize: 12,
    textAlign: "center",
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  detailsContainer: {
    paddingHorizontal: Spacing.m,
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    padding: Spacing.m,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
