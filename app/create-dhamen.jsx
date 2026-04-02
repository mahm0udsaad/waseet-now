import DateTimePicker from '@react-native-community/datetimepicker';
import CountryPickerModal from "@/components/CountryPickerModal";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import FadeInView from "@/components/ui/FadeInView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown } from "lucide-react-native";

// Native Components
import {
  NativeButton,
  NativeFormSection,
  NativeFormSelectorRow,
  NativeFormTextField,
  NativeIcon,
} from "@/components/native";

// Components
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

// Utils
import { COUNTRIES, getCountryName } from "@/utils/countries";
import { useDhamenForm } from "@/utils/forms/useDhamenForm";
import { useTranslation } from "@/utils/i18n/store";
import { hapticFeedback } from "@/utils/native/haptics";
import { borderRadius, hairlineWidth, spacing } from "@/utils/native/layout";
import { useTheme } from "@/utils/theme/store";
import { getSupabaseSession } from "@/utils/supabase/client";

export default function CreateDhamenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL, writingDirection } = useTranslation();
  const [userPhone, setUserPhone] = useState('');
  const [selectedProviderCountry, setSelectedProviderCountry] = useState(COUNTRIES[0]);
  const [serviceProviderLocalNumber, setServiceProviderLocalNumber] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    getSupabaseSession().then((session) => {
      const phone = session?.user?.phone || '';
      if (phone) setUserPhone(phone);
    });
  }, []);

  const {
    loading,
    formData,
    calculations,
    updateFormData,
    handleSubmit,
    isFormValid,
  } = useDhamenForm(isRTL, userPhone, selectedProviderCountry, serviceProviderLocalNumber);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatNumber = useCallback((num) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const handleSubmitWithHaptic = useCallback(async () => {
    hapticFeedback.confirm();
    await handleSubmit();
  }, [handleSubmit]);

  const handleDateChange = useCallback((event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      updateFormData("servicePeriodStart", formattedDate);
    }
  }, [updateFormData, isRTL]);

  const showDatePickerModal = useCallback(() => {
    hapticFeedback.selection();
    setShowDatePicker(true);
  }, []);

  useEffect(() => {
    const fullPhone = serviceProviderLocalNumber
      ? `${selectedProviderCountry.dialCode}${serviceProviderLocalNumber}`
      : "";
    updateFormData("serviceProviderMobile", fullPhone);
  }, [selectedProviderCountry, serviceProviderLocalNumber, updateFormData]);

  const handleProviderPhoneChange = useCallback((text) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setServiceProviderLocalNumber(cleaned);
  }, []);

  // Calculator card component
  const renderCalculatorCard = useCallback(() => (
    <FadeInView
      style={[styles.calculatorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.calculatorHeader, { borderBottomColor: colors.border }]}>
        <NativeIcon name="money" size="sm" color={colors.primary} />
        <Text style={[styles.calculatorTitle, { color: colors.text, writingDirection }]}>
          {t?.dhamen?.costSummary || (isRTL ? "ملخص التكلفة" : "Cost Summary")}
        </Text>
      </View>

      <View style={styles.calculatorBody}>
        {/* Value */}
        <View style={[styles.calculatorRow]}>
          <View style={[styles.calculatorLabel]}>
            <NativeIcon name="wallet" size={16} color={colors.textSecondary} />
            <Text style={[styles.calculatorLabelText, { color: colors.textSecondary, writingDirection }]}>
              {t?.dhamen?.value || (isRTL ? "القيمة" : "Value")}
            </Text>
          </View>
          <Text style={[styles.calculatorValue, { color: colors.text, writingDirection }]}>
            {formatNumber(calculations.value)} {t?.common?.sar || "SAR"}
          </Text>
        </View>

        {/* Commission */}
        <View style={[styles.calculatorRow]}>
          <View style={[styles.calculatorLabel]}>
            <NativeIcon name="money" size={16} color={colors.textSecondary} />
            <Text style={[styles.calculatorLabelText, { color: colors.textSecondary, writingDirection }]}>
              {t?.dhamen?.commission || (isRTL ? "عمولة المنصة" : "Platform Commission")} ({calculations.commissionRate}%)
            </Text>
          </View>
          <Text style={[styles.calculatorValue, { color: colors.textSecondary, writingDirection }]}>
            {formatNumber(calculations.commission)} {t?.common?.sar || "SAR"}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Total */}
        <View style={[styles.calculatorRow]}>
          <Text style={[styles.totalLabel, { color: colors.primary, writingDirection }]}>
            {t?.dhamen?.total || (isRTL ? "الإجمالي" : "Total")}
          </Text>
          <Text style={[styles.totalValue, { color: colors.primary, writingDirection }]}>
            {formatNumber(calculations.total)} {t?.common?.sar || "SAR"}
          </Text>
        </View>
      </View>
    </FadeInView>
  ), [calculations, colors, isRTL, t, formatNumber, writingDirection]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          title: t?.dhamen?.title || (isRTL ? "طلب ضامن" : "Request Guarantee"),
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <StatusBar style={colors.statusBar} />

      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 10) + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FadeInView>
            <NativeFormSection
              title={t?.dhamen?.contactInfo || (isRTL ? "معلومات الاتصال" : "CONTACT INFO")}
            >
              <NativeFormTextField
                label={isRTL ? "جوالك" : "Your Mobile"}
                value={formData.serviceOwnerMobile}
                onChangeText={(text) => updateFormData("serviceOwnerMobile", text)}
                placeholder={t?.dhamen?.enterMobile || (isRTL ? "أدخل رقم الجوال" : "Enter mobile")}
                keyboardType="phone-pad"
                editable={false}
                testID="damin-payer-phone"
                required
              />

              <CountryPickerModal
                visible={showCountryPicker}
                onClose={() => setShowCountryPicker(false)}
                onSelect={(country) => {
                  setSelectedProviderCountry(country);
                  setServiceProviderLocalNumber("");
                }}
                selectedCode={selectedProviderCountry.code}
              />

              <View
                style={[
                  styles.phoneRow,
                  {
                    borderBottomWidth: hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.phoneRowHeader,
                    {
                      alignItems: 'flex-start',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.phoneLabel,
                      {
                        color: colors.text,
                        writingDirection,
                      },
                    ]}
                  >
                    {isRTL ? "جوال مقدم الخدمة" : "Service Provider Mobile"}
                    <Text style={{ color: colors.error }}> *</Text>
                  </Text>
                  <Text
                    style={[
                      styles.phoneSubLabel,
                      {
                        color: colors.textSecondary,
                        writingDirection,
                      },
                    ]}
                  >
                    {isRTL ? "اختر الدولة ثم أدخل الرقم المحلي" : "Choose the country, then enter the local number"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.phoneField,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setShowCountryPicker(true)}
                    style={({ pressed }) => [
                      styles.countrySelector,
                      {
                        backgroundColor: pressed ? colors.surfaceSecondary : colors.backgroundSecondary,
                      },
                    ]}
                    testID="damin-beneficiary-country"
                  >
                    <Text style={styles.countryFlag}>{selectedProviderCountry.flag}</Text>
                    <Text style={[styles.countryCode, { color: colors.text }]}>
                      {selectedProviderCountry.dialCode}
                    </Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </Pressable>

                  <View
                    style={[
                      styles.phoneFieldDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />

                  <TextInput
                    style={[
                      styles.phoneInput,
                      styles.phoneFieldInput,
                      { color: colors.text, writingDirection: 'ltr' },
                    ]}
                    value={serviceProviderLocalNumber}
                    onChangeText={handleProviderPhoneChange}
                    placeholder={
                      isRTL
                        ? `أدخل الرقم بدون ${selectedProviderCountry.dialCode}`
                        : `Enter number without ${selectedProviderCountry.dialCode}`
                    }
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={selectedProviderCountry.maxLength}
                    testID="damin-beneficiary-phone"
                  />
                </View>

                <Text
                  style={[
                    styles.phoneHint,
                    {
                      color: colors.textSecondary,
                      writingDirection,
                    },
                  ]}
                >
                  {isRTL
                    ? `الدولة: ${getCountryName(selectedProviderCountry, isRTL)}`
                    : `Country: ${getCountryName(selectedProviderCountry, isRTL)}`}
                </Text>
              </View>
            </NativeFormSection>

            <NativeFormSection
              title={t?.dhamen?.serviceDetails || (isRTL ? "تفاصيل الخدمة" : "SERVICE DETAILS")}
            >
              <NativeFormTextField
                label={t?.dhamen?.serviceTypeOrDetails || (isRTL ? "وصف الخدمة بالتفصيل" : "Service Description (detailed)")}
                value={formData.serviceTypeOrDetails}
                onChangeText={(text) => updateFormData("serviceTypeOrDetails", text)}
                placeholder={t?.dhamen?.enterDetails || (isRTL ? "أدخل وصفاً تفصيلياً للخدمة المطلوبة (مثال: تطوير موقع إلكتروني متكامل مع لوحة تحكم)" : "Enter a detailed description of the service (e.g., Complete website development with admin panel)")}
                multiline
                numberOfLines={5}
                style={{ minHeight: 120, paddingTop: 8, paddingBottom: 8 }}
                testID="damin-service-details"
                required
              />
              
              <NativeFormSelectorRow
                label={t?.dhamen?.servicePeriodStart || (isRTL ? "تاريخ بدء الخدمة" : "Service Start Date")}
                value={formData.servicePeriodStart}
                onPress={showDatePickerModal}
                placeholder={t?.dhamen?.selectDate || (isRTL ? "اضغط لتحديد التاريخ" : "Tap to select date")}
              />
              
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  textColor={colors.text}
                  locale="en-US-u-ca-gregory"
                />
              )}
              
              <NativeFormTextField
                label={t?.dhamen?.completionDays || (isRTL ? "مدة الإنجاز (بالأيام)" : "Completion Days")}
                value={formData.completionDays}
                onChangeText={(text) => updateFormData("completionDays", text)}
                placeholder={t?.dhamen?.enterDays || (isRTL ? "أدخل عدد الأيام" : "Enter days")}
                keyboardType="numeric"
                isLast
              />
            </NativeFormSection>

            <NativeFormSection
              title={t?.dhamen?.pricing || (isRTL ? "التسعير" : "PRICING")}
            >
              <NativeFormTextField
                label={t?.dhamen?.value || (isRTL ? "قيمة الخدمة" : "Service Value")}
                value={formData.value}
                onChangeText={(text) => updateFormData("value", text)}
                placeholder={t?.dhamen?.enterAmount || (isRTL ? "أدخل المبلغ" : "Enter amount")}
                keyboardType="numeric"
                testID="damin-service-value"
                required
                isLast
                suffix="SAR"
              />
            </NativeFormSection>

            {/* Calculator Card - Only show when value is entered */}
            {formData.value ? renderCalculatorCard() : null}

            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
              <NativeButton
                title={loading ? (t?.dhamen?.sending || (isRTL ? "جاري الإرسال..." : "Sending...")) : (t?.dhamen?.sendRequest || (isRTL ? "إرسال الطلب" : "Send Request"))}
                onPress={handleSubmitWithHaptic}
                disabled={!isFormValid || loading}
                loading={loading}
                icon="send"
                iconPosition="left"
                size="lg"
                testID="damin-submit-btn"
              />
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingAnimatedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
  },
  headerBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  phoneRowHeader: {
    gap: spacing.xs,
    alignSelf: "stretch",
  },
  phoneLabel: {
    fontSize: 17,
    fontWeight: "600",
  },
  phoneSubLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  phoneField: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 52,
    overflow: "hidden",
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: "stretch",
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: "600",
  },
  phoneFieldDivider: {
    width: 1,
    alignSelf: "stretch",
  },
  phoneInput: {
    fontSize: 17,
    paddingVertical: spacing.sm,
  },
  phoneFieldInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  phoneHint: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Calculator
  calculatorCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  calculatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  calculatorBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  calculatorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calculatorLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  calculatorLabelText: {
    fontSize: 14,
  },
  calculatorValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
