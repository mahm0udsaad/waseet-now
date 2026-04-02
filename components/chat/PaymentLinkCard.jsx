import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { CreditCard, CheckCircle2, AlertTriangle } from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function PaymentLinkCard({
  data,
  isMe,
  alreadyPaid,
  canPay,
  canPayRegular,
  onPaymentPress,
  onSubmitDispute,
}) {
  const { colors } = useTheme();
  const { isRTL } = useTranslation();

  const statusColor = alreadyPaid ? "#10B981" : "#F59E0B";
  const statusBg = alreadyPaid ? "#10B98120" : "#F59E0B20";

  const formattedAmount = data.amount
    ? Number(data.amount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;

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
          {alreadyPaid ? (
            <CheckCircle2 size={16} color={statusColor} />
          ) : (
            <CreditCard size={16} color={statusColor} />
          )}
        </View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isRTL
            ? (alreadyPaid ? "تم الدفع بنجاح" : "رابط الدفع")
            : (alreadyPaid ? "Payment Complete" : "Payment Link")}
        </Text>
      </View>

      {/* Amount Section */}
      {formattedAmount && (
        <View style={styles.amountSection}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            {isRTL ? "المبلغ المطلوب" : "Amount Due"}
          </Text>
          <Text style={[styles.amountValue, { color: statusColor }]}>
            {formattedAmount} <Text style={{ fontSize: 16 }}>{isRTL ? "ر.س" : "SAR"}</Text>
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {!alreadyPaid && canPay && (
          <Pressable
            testID="payment-pay-btn"
            onPress={() => onPaymentPress?.({ amount: data.amount, orderId: data.order_id, isDamin: data.isDamin })}
            style={[styles.payButton, { backgroundColor: colors.primary }]}
          >
            <CreditCard size={16} color="#fff" />
            <Text style={styles.payButtonText}>
              {isRTL ? "ادفع الآن" : "Pay Now"}
            </Text>
          </Pressable>
        )}
        {alreadyPaid && !data.isDamin && canPayRegular && (
          <Pressable
            testID="payment-dispute-btn"
            onPress={() => onSubmitDispute?.(data.order_id)}
            style={[styles.disputeButton, { borderColor: colors.error }]}
          >
            <AlertTriangle size={14} color={colors.error} />
            <Text style={[styles.disputeText, { color: colors.error }]}>
              {isRTL ? "رفع نزاع" : "Submit Dispute"}
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
    gap: 4,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  actions: {
    padding: Spacing.m,
    gap: 8,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  disputeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  disputeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
