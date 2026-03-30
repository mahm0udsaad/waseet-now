import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { CheckCircle2, Clock, CreditCard, Receipt, Copy, XCircle } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/utils/theme/store";
import { useTranslation, getRTLRowDirection, pickRTLValue } from "@/utils/i18n/store";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function PaymentReceiptCard({ data, isMe }) {
  const { colors } = useTheme();
  const { isRTL } = useTranslation();

  const {
    amount,
    currency = "SAR",
    methodLabelAr,
    methodLabelEn,
    reference,
    createdAt,
    status,
  } = data;

  const handleCopyReference = async () => {
    if (reference) {
      await Clipboard.setStringAsync(reference);
    }
  };

  const isPending = status === "pending";
  const isRejected = status === "rejected";

  const formattedAmount = Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
        },
        Shadows.small,
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: getRTLRowDirection(isRTL) }]}>
        <View style={[styles.iconContainer, { backgroundColor: isRejected ? "#EF444420" : isPending ? "#F59E0B20" : "#10B98120" }]}>
          {isRejected ? (
            <XCircle size={16} color="#EF4444" />
          ) : isPending ? (
            <Clock size={16} color="#F59E0B" />
          ) : (
            <CheckCircle2 size={16} color="#10B981" />
          )}
        </View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isRejected
            ? (isRTL ? "تم رفض التحويل" : "Transfer Rejected")
            : isPending
            ? (isRTL ? "بانتظار موافقة الإدارة" : "Awaiting Admin Approval")
            : (isRTL ? "تم الدفع بنجاح" : "Payment Successful")}
        </Text>
      </View>

      {/* Amount Section */}
      <View style={styles.amountSection}>
        <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
          {isRTL ? "المبلغ الإجمالي" : "Total Amount"}
        </Text>
        <Text style={[styles.amountValue, { color: isRejected ? "#EF4444" : isPending ? "#F59E0B" : colors.primary }]}>
          {formattedAmount} <Text style={{ fontSize: 16 }}>{isRTL ? "ر.س" : currency}</Text>
        </Text>
      </View>

      {/* Details Rows */}
      <View style={styles.detailsContainer}>
        <View style={[styles.row, { flexDirection: getRTLRowDirection(isRTL) }]}>
          <View style={[styles.rowLabelContainer, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <CreditCard size={14} color={colors.textSecondary} />
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
              {isRTL ? "طريقة الدفع" : "Payment Method"}
            </Text>
          </View>
          <Text style={[styles.rowValue, { color: colors.text }]}>
            {isRTL ? (methodLabelAr || "بطاقة ائتمانية") : (methodLabelEn || "Credit Card")}
          </Text>
        </View>

        {reference && (
          <View style={[styles.row, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={[styles.rowLabelContainer, { flexDirection: getRTLRowDirection(isRTL) }]}>
              <Receipt size={14} color={colors.textSecondary} />
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                {isRTL ? "رقم العملية" : "Reference"}
              </Text>
            </View>
            <Pressable onPress={handleCopyReference} style={{ flexDirection: getRTLRowDirection(isRTL), alignItems: "center", gap: 4 }}>
              <Text style={[styles.rowValue, { color: colors.text }]}>
                {reference.slice(0, 12)}...
              </Text>
              <Copy size={12} color={colors.textMuted} />
            </Pressable>
          </View>
        )}

        <View style={[styles.row, { flexDirection: getRTLRowDirection(isRTL) }]}>
           <Text style={[styles.dateText, { color: colors.textMuted, width: '100%', textAlign: pickRTLValue(isRTL, 'right', 'left') }]}>
             {new Date(createdAt).toLocaleString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US', {
               month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
             })}
           </Text>
        </View>
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
  detailsContainer: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
    gap: 10,
  },
  row: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabelContainer: {
    alignItems: "center",
    gap: 6,
  },
  rowLabel: {
    fontSize: 12,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 10,
    marginTop: 4,
  }
});
