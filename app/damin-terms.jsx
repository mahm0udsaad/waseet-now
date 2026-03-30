import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react-native";
import FadeInView from "@/components/ui/FadeInView";

import { useTheme } from "@/utils/theme/store";
import { useTranslation, getRTLRowDirection, getRTLTextAlign } from "@/utils/i18n/store";
import { NativeButton } from "@/components/native";
import { createDaminOrder } from "@/utils/supabase/daminOrders";
import { hapticFeedback } from "@/utils/native/haptics";
import { getCommissionDisplayText } from "@/constants/commissionConfig";

export default function DaminTermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const params = useLocalSearchParams();
  
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Parse order data from params
  const orderData = params.orderData ? JSON.parse(params.orderData) : null;
  const commissionText = getCommissionDisplayText("damin", isRTL);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert(
        isRTL ? "تنبيه" : "Warning",
        isRTL
          ? "يرجى قبول الشروط والأحكام للمتابعة"
          : "Please accept the terms and conditions to continue"
      );
      return;
    }

    if (!orderData) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        isRTL ? "بيانات الطلب مفقودة" : "Order data is missing"
      );
      return;
    }

    hapticFeedback.confirm();
    setLoading(true);

      try {
      const createdOrder = await createDaminOrder({
        serviceTypeOrDetails: orderData.serviceTypeOrDetails,
        servicePeriodStart: orderData.servicePeriodStart,
        completionDays: orderData.completionDays ? parseInt(orderData.completionDays) : null,
        payerPhone: orderData.serviceOwnerMobile,
        beneficiaryPhone: orderData.serviceProviderMobile,
        serviceValue: orderData.serviceValue || parseFloat(orderData.value),
        commission: orderData.commission,
        totalAmount: orderData.total,
        metadata: {
          original_form_data: orderData,
        },
      });

      Alert.alert(
        isRTL ? "تم الإنشاء!" : "Success!",
        isRTL
          ? "تم إنشاء طلب الضامن بنجاح. سيتم إشعار الطرفين."
          : "Damin order created successfully. Both parties will be notified.",
        [
          {
            text: isRTL ? "موافق" : "OK",
            onPress: () => {
              router.replace({
                pathname: "/damin-order-details",
                params: { id: createdOrder.id },
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error("Failed to create Damin order:", error);
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        error?.message || (isRTL ? "فشل إنشاء الطلب" : "Failed to create order")
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleAccepted = () => {
    hapticFeedback.selection();
    setAccepted(!accepted);
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          title: isRTL ? "الشروط والأحكام" : "Terms & Conditions",
          headerBackVisible: !isRTL,
          headerLeft: undefined,
          headerRight: isRTL
            ? () => (
                <Pressable onPress={() => router.back()} style={styles.headerBackButton}>
                  <ChevronRight size={22} color={colors.text} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <StatusBar style={colors.statusBar} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <FadeInView
          delay={100}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? "خدمة الضامن (ضامن)" : "Damin Guarantee Service"}
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL
              ? "خدمة الضامن هي نظام ضمان للمدفوعات بين طرفين (الدافع والمستفيد). تحمي هذه الخدمة كلا الطرفين من خلال الاحتفاظ بالأموال حتى اكتمال الخدمة."
              : "The Damin service is a payment guarantee system between two parties (payer and beneficiary). This service protects both parties by holding funds until service completion."}
          </Text>
        </FadeInView>

        {/* Commission */}
        <FadeInView
          delay={200}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? "عمولة المنصة" : "Platform Commission"}
          </Text>
          <View style={[styles.highlightBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.highlightText, { color: colors.primary, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL
                ? `عمولة ثابتة ${commissionText} فقط - بدون ضرائب إضافية`
                : `Fixed ${commissionText} commission only - No additional taxes`}
            </Text>
          </View>
          <Text style={[styles.paragraph, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL
              ? `يتم احتساب عمولة المنصة بنسبة ${commissionText} فقط من قيمة الخدمة. لا توجد ضرائب أو رسوم إضافية. العمولة غير قابلة للتفاوض.`
              : `The platform charges a ${commissionText} commission on the service value only. No additional taxes or fees. The commission is non-negotiable.`}
          </Text>
        </FadeInView>

        {/* Workflow */}
        <FadeInView
          delay={300}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? "سير العمل" : "Workflow"}
          </Text>
          <View style={styles.workflowList}>
            {[
              {
                ar: "1. بعد إنشاء الطلب، سيتم إرسال إشعار لمقدم الخدمة للتأكيد",
                en: "1. After order creation, the service provider will be notified to confirm"
              },
              {
                ar: "2. يجب على مقدم الخدمة تأكيد مشاركته قبل المتابعة",
                en: "2. The service provider must confirm participation before proceeding"
              },
              {
                ar: `3. بعد التأكيد، تقوم بدفع المبلغ الإجمالي (قيمة الخدمة + عمولة المنصة ${commissionText})`,
                en: `3. After confirmation, you pay the total amount (service value + ${commissionText} platform commission)`
              },
              {
                ar: "4. يتم تنفيذ الخدمة من قبل مقدم الخدمة والطلب تحت مراجعة الإدارة",
                en: "4. The service is performed by the provider and the order is under admin review"
              },
              {
                ar: "5. بعد اكتمال الخدمة والتحقق، يتم تحويل المبلغ لمقدم الخدمة",
                en: "5. After service completion and verification, funds are transferred to the provider"
              }
            ].map((item, index) => (
              <Text key={index} style={[styles.workflowItem, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                {isRTL ? item.ar : item.en}
              </Text>
            ))}
          </View>
        </FadeInView>

        {/* Confirmation Required */}
        <FadeInView
          delay={400}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? "تأكيد مطلوب" : "Confirmation Required"}
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL
              ? "لن يتقدم الطلب دون تأكيد كلا الطرفين. إذا رفض أي طرف، سيتم إلغاء الطلب. يمكن لأي طرف رفض المشاركة قبل إيداع الأموال."
              : "The order will not progress without confirmation from both parties. If either party rejects, the order will be cancelled. Either party can reject participation before fund deposit."}
          </Text>
        </FadeInView>

        {/* Dispute Resolution */}
        <FadeInView
          delay={500}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? "حل النزاعات" : "Dispute Resolution"}
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL
              ? "في حالة حدوث نزاع، سيتم الاحتفاظ بالأموال في الحساب الضامن حتى يتم حل المشكلة. يمكنك الاتصال بالدعم للمساعدة في حل النزاعات."
              : "In case of a dispute, funds will be held in escrow until the issue is resolved. You can contact support for assistance with dispute resolution."}
          </Text>
        </FadeInView>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 10) + 10, backgroundColor: colors.background }]}>
        <Pressable
          onPress={toggleAccepted}
          style={[styles.checkboxContainer, { flexDirection: getRTLRowDirection(isRTL) }]}
        >
          {accepted ? (
            <CheckCircle2 size={24} color={colors.primary} />
          ) : (
            <Circle size={24} color={colors.textMuted} />
          )}
          <Text style={[styles.checkboxText, { color: colors.text, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>
            {isRTL
              ? `أوافق على الشروط والأحكام وعمولة المنصة ${commissionText}`
              : `I accept the terms and conditions and the ${commissionText} platform commission`}
          </Text>
        </Pressable>

        <NativeButton
          title={loading ? (isRTL ? "جاري الإنشاء..." : "Creating...") : (isRTL ? "قبول وإنشاء الطلب" : "Accept & Create Order")}
          onPress={handleAccept}
          disabled={!accepted || loading}
          loading={loading}
          icon="check"
          iconPosition="left"
          size="lg"
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
  },
  highlightBox: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    marginVertical: 12,
  },
  highlightText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  workflowList: {
    gap: 10,
  },
  workflowItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  checkboxContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
  },
  checkboxText: {
    fontSize: 14,
    flex: 1,
  },
});
