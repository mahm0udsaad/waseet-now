import { Stack, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import FadeInView from "@/components/ui/FadeInView";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Native Components
import {
  NativeBottomSheet,
  NativeButton,
  NativeFormSection,
  NativeFormSelectorRow,
  NativeFormTextField,
  NativeIcon,
  NativePressable,
} from "@/components/native";

// Components
import { NationalityItem, ProfessionCard } from "@/components/forms/TanazulFormInputs";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

// Utils & Constants
import { SAUDI_CITIES } from "@/constants/saudiCities";
import { useTanazulForm } from "@/utils/forms/useTanazulForm";
import { useTranslation, getRTLTextAlign, pickRTLValue } from "@/utils/i18n/store";
import { hapticFeedback } from "@/utils/native/haptics";
import { borderRadius, spacing } from "@/utils/native/layout";
import { useTheme } from "@/utils/theme/store";

export default function CreateTanazulScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isRTL, rowDirection } = useTranslation();
  
  // Refs for Bottom Sheets
  const nationalitySheetRef = useRef(null);
  const citySheetRef = useRef(null);
  
  const {
    loading,
    step,
    pledgeAccepted,
    nationalitySearch,
    citySearch,
    formData,
    commissionDisplayText,
    setStep,
    updateFormData,
    setNationalitySearch,
    setCitySearch,
    handleNextStep,
    handlePreviousStep,
    handleSubmit,
    togglePledge,
    selectNationality: selectNationalityFromHook,
    selectCity: selectCityFromHook,
  } = useTanazulForm(isRTL);

  // Bottom Sheet handlers
  const openNationalitySheet = useCallback(() => {
    hapticFeedback.tap();
    nationalitySheetRef.current?.present();
  }, []);

  const closeNationalitySheet = useCallback(() => {
    nationalitySheetRef.current?.dismiss();
  }, []);

  const selectNationality = useCallback((nationality) => {
    selectNationalityFromHook(nationality);
    closeNationalitySheet();
  }, [selectNationalityFromHook, closeNationalitySheet]);

  const openCitySheet = useCallback(() => {
    hapticFeedback.tap();
    citySheetRef.current?.present();
  }, []);

  const closeCitySheet = useCallback(() => {
    citySheetRef.current?.dismiss();
  }, []);

  const selectCity = useCallback((city) => {
    selectCityFromHook(city);
    closeCitySheet();
  }, [selectCityFromHook, closeCitySheet]);

  const allNationalities = useMemo(() => [
    { ar: "فلبينية", en: "Filipino" },
    { ar: "إندونيسية", en: "Indonesian" },
    { ar: "سريلانكية", en: "Sri Lankan" },
    { ar: "بنجلاديشية", en: "Bangladeshi" },
    { ar: "أثيوبية", en: "Ethiopian" },
    { ar: "كينية", en: "Kenyan" },
    { ar: "أوغندية", en: "Ugandan" },
    { ar: "هندية", en: "Indian" },
    { ar: "باكستانية", en: "Pakistani" },
    { ar: "نيبالية", en: "Nepalese" },
  ], []);

  const filteredNationalities = useMemo(() => 
    allNationalities.filter((n) =>
      (isRTL ? n.ar : n.en).toLowerCase().includes(nationalitySearch.toLowerCase())
    ),
    [allNationalities, nationalitySearch, isRTL]
  );

  const filteredCities = useMemo(() => 
    SAUDI_CITIES.filter((c) =>
      (isRTL ? c.ar : c.en).toLowerCase().includes(citySearch.toLowerCase())
    ),
    [citySearch, isRTL]
  );

  const professions = useMemo(() => [
    { 
      key: "domestic_worker", 
      iconName: "home", 
      ar: "عامل منزلي", 
      ar_female: "عاملة منزلية",
      en: "Domestic Worker",
      en_female: "Domestic Worker"
    },
    { 
      key: "nanny", 
      iconName: "heart", 
      ar: "مربي منزلي", 
      ar_female: "مربية منزلية",
      en: "Nanny",
      en_female: "Nanny"
    },
    { 
      key: "cook", 
      iconName: "cook", 
      ar: "طباخ منزلي", 
      ar_female: "طباخة منزلية",
      en: "Cook",
      en_female: "Cook"
    },
    { 
      key: "driver", 
      iconName: "car", 
      ar: "سائق منزلي", 
      ar_female: "سائقة منزلية",
      en: "Driver",
      en_female: "Driver"
    },
    { 
      key: "nurse", 
      iconName: "shield", 
      ar: "ممرض منزلي", 
      ar_female: "ممرضة منزلية",
      en: "Nurse",
      en_female: "Nurse"
    },
  ], []);

  const handleSubmitWithHaptic = useCallback(async () => {
    hapticFeedback.confirm();
    await handleSubmit();
  }, [handleSubmit]);

  const handleTogglePledge = useCallback(() => {
    hapticFeedback.selection();
    togglePledge();
  }, [togglePledge]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (step !== 2) return;
      event.preventDefault();
      setStep(1);
    });

    return unsubscribe;
  }, [navigation, step, setStep]);

  // Render profession selector
  const renderProfessionSelector = useCallback(() => {
    const isFemale = formData.gender === "female";
    
    return (
      <FadeInView style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
          {isRTL ? "المهنة" : "Profession"}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.professionsRow, { flexDirection: rowDirection }]}>
            {professions.map((prof) => {
              const professionDisplay = {
                ...prof,
                ar: isFemale ? (prof.ar_female || prof.ar) : prof.ar,
                en: isFemale ? (prof.en_female || prof.en) : prof.en,
              };

              return (
                <ProfessionCard
                  key={prof.key}
                  profession={professionDisplay}
                  isSelected={formData.profession === prof.key}
                  onPress={() => {
                    hapticFeedback.tap();
                    updateFormData("profession", prof.key);
                  }}
                  colors={colors}
                  isRTL={isRTL}
                />
              );
            })}
          </View>
        </ScrollView>
      </FadeInView>
    );
  }, [formData.profession, formData.gender, professions, colors, isRTL, updateFormData]);

  // Render gender selector
  const renderGenderSelector = useCallback(() => (
    <FadeInView style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
        {isRTL ? "الجنس" : "Gender"}
      </Text>
      <View style={[styles.genderRow, { flexDirection: rowDirection }]}>
        <NativePressable
          testID="form-gender-male"
          onPress={() => {
            hapticFeedback.tap();
            updateFormData("gender", "male");
          }}
          style={[
            styles.genderButton,
            {
              backgroundColor: formData.gender === "male" ? colors.primary : colors.surface,
              borderColor: formData.gender === "male" ? colors.primary : colors.border,
            },
          ]}
        >
          <NativeIcon name="user" size={20} color={formData.gender === "male" ? "#fff" : colors.textSecondary} />
          <Text
            style={[
              styles.genderText,
              {
                color: formData.gender === "male" ? "#fff" : colors.text,
              },
            ]}
          >
            {isRTL ? "رجل" : "Male"}
          </Text>
        </NativePressable>
        <NativePressable
          testID="form-gender-female"
          onPress={() => {
            hapticFeedback.tap();
            updateFormData("gender", "female");
          }}
          style={[
            styles.genderButton,
            {
              backgroundColor: formData.gender === "female" ? colors.primary : colors.surface,
              borderColor: formData.gender === "female" ? colors.primary : colors.border,
            },
          ]}
        >
          <NativeIcon name="user" size={20} color={formData.gender === "female" ? "#fff" : colors.textSecondary} />
          <Text
            style={[
              styles.genderText,
              {
                color: formData.gender === "female" ? "#fff" : colors.text,
              },
            ]}
          >
            {isRTL ? "امرأة" : "Female"}
          </Text>
        </NativePressable>
      </View>
    </FadeInView>
  ), [formData.gender, colors, isRTL, updateFormData]);

  // Form Step (Data Entry)
  const renderFormStep = useCallback(() => (
    <FadeInView>
      <NativeFormSection
        title={isRTL ? "بيانات التنازل" : "TRANSFER DATA"}
      >
        <NativeFormSelectorRow
          testID="form-city-selector"
          label={isRTL ? "المدينة" : "City"}
          value={formData.location}
          placeholder={isRTL ? "اختر المدينة" : "Select City"}
          onPress={openCitySheet}
          icon="pin"
          required
        />
        
        <NativeFormSelectorRow
          testID="form-nationality-selector"
          label={isRTL ? "الجنسية" : "Nationality"}
          value={formData.nationality}
          placeholder={isRTL ? "اختر الجنسية" : "Select Nationality"}
          onPress={openNationalitySheet}
          icon="user"
          required
          isLast
        />
      </NativeFormSection>

      {/* Gender Selector */}
      {renderGenderSelector()}

      {/* Profession Selector (Custom UI) */}
        {renderProfessionSelector()}

      <NativeFormSection
        title={isRTL ? "تفاصيل العقد" : "CONTRACT DETAILS"}
      >
        <NativeFormTextField
          testID="form-age-input"
          label={isRTL ? "العمر" : "Age"}
          value={formData.age}
          onChangeText={(text) => updateFormData("age", text)}
          placeholder={isRTL ? "مثلاً 28" : "e.g. 28"}
          keyboardType="numeric"
          required
        />
        
        <NativeFormTextField
          label={isRTL ? "عدد مرات نقل الكفالة" : "Previous Transfers"}
          value={formData.previousTransfers}
          onChangeText={(text) => updateFormData("previousTransfers", text)}
          placeholder={isRTL ? "مثلاً 1" : "e.g. 1"}
          keyboardType="numeric"
        />

        <NativeFormTextField
          label={isRTL ? "المدة المتبقية من العقد" : "Remaining Duration"}
          value={formData.contractDuration}
          onChangeText={(text) => updateFormData("contractDuration", text)}
          placeholder={isRTL ? "مثلاً 10 شهور" : "e.g. 10 months"}
          isLast
        />
      </NativeFormSection>

      <NativeFormSection
        title={isRTL ? "التسعير" : "PRICING"}
      >
        <NativeFormTextField
          testID="form-amount-input"
          label={isRTL ? "مبلغ التنازل شامل النقل" : "Transfer Amount"}
          value={formData.transferAmount}
          onChangeText={(text) => updateFormData("transferAmount", text)}
          placeholder={isRTL ? "ريال سعودي" : "SAR"}
          keyboardType="numeric"
          required
        />
        
        <NativeFormTextField
          label={isRTL ? "وصف إضافي" : "Description"}
          value={formData.description}
          onChangeText={(text) => updateFormData("description", text)}
          placeholder={isRTL ? "مزيد من المعلومات..." : "More info..."}
          multiline
          numberOfLines={3}
          isLast
        />
      </NativeFormSection>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
        <NativeButton
          testID="form-continue-btn"
          title={isRTL ? "متابعة" : "Continue"}
          onPress={handleNextStep}
          icon="right"
          iconPosition={pickRTLValue(isRTL, "left", "right")}
          size="lg"
        />
      </View>
    </FadeInView>
  ), [
    formData,
    isRTL,
    handleNextStep,
    updateFormData,
    openNationalitySheet,
    openCitySheet,
    renderGenderSelector,
    renderProfessionSelector,
  ]);

  // Preview Step
  const renderPreviewStep = useCallback(() => (
    <FadeInView direction="right">
      <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.previewTitle, { color: colors.text }]}>
          {isRTL ? "مراجعة الطلب" : "Review Request"}
        </Text>

        <View style={styles.previewGrid}>
          <View style={[styles.previewRow, { flexDirection: rowDirection }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "المدينة:" : "City:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>{formData.location}</Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: rowDirection }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الجنسية:" : "Nationality:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>{formData.nationality}</Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: rowDirection }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "المهنة:" : "Profession:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {(() => {
                const prof = professions.find((p) => p.key === formData.profession);
                if (!prof) return formData.profession;
                const isFemale = formData.gender === "female";
                if (isRTL) {
                  return isFemale ? (prof.ar_female || prof.ar) : prof.ar;
                } else {
                  return isFemale ? (prof.en_female || prof.en) : prof.en;
                }
              })()}
            </Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: rowDirection }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الجنس:" : "Gender:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {formData.gender === "male" ? (isRTL ? "رجل" : "Male") : (isRTL ? "امرأة" : "Female")}
            </Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: rowDirection }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "العمر:" : "Age:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {formData.age} {isRTL ? "سنة" : "years"}
            </Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: rowDirection }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "نقل الكفالة:" : "Transfers:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {formData.previousTransfers} {isRTL ? "مرات" : "times"}
            </Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: rowDirection }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "المدة المتبقية:" : "Remaining:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>{formData.contractDuration}</Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: rowDirection }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "المبلغ:" : "Amount:"}
            </Text>
            <Text style={[styles.previewPrice, { color: colors.primary }]}>
              {formData.transferAmount} {isRTL ? "ر.س" : "SAR"}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Pledge Box */}
        <NativePressable
          testID="form-pledge-checkbox"
          onPress={handleTogglePledge}
          haptic="selection"
          style={[
            styles.pledgeBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: pledgeAccepted ? colors.primary : colors.border,
              flexDirection: rowDirection,
            },
          ]}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: pledgeAccepted ? colors.primary : "transparent",
                borderColor: colors.primary,
              },
            ]}
          >
            {pledgeAccepted && (
              <NativeIcon
                name="check"
                size={16}
                color="#fff"
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pledgeTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? "قسم التعهد بدفع العمولة" : "Commission Pledge"}
            </Text>
            <Text style={[styles.pledgeText, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL
                ? `أتعهد بدفع رسوم المنصة (${commissionDisplayText}) في حال إتمام التنازل.`
                : `I pledge to pay the platform fee (${commissionDisplayText}) upon completion.`}
            </Text>
          </View>
        </NativePressable>
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, { flexDirection: rowDirection, paddingHorizontal: spacing.lg }]}>
        <View style={{ flex: 1, marginRight: isRTL ? 0 : spacing.md, marginLeft: isRTL ? spacing.md : 0 }}>
          <NativeButton
            title={isRTL ? "تعديل" : "Edit"}
          onPress={handlePreviousStep}
            variant="secondary"
            size="lg"
          />
        </View>
        <View style={{ flex: 2 }}>
          <NativeButton
            testID="form-confirm-btn"
            title={loading ? (isRTL ? "جاري التأكيد..." : "Confirming...") : (isRTL ? "تأكيد الطلب" : "Confirm")}
            onPress={handleSubmitWithHaptic}
            disabled={!pledgeAccepted || loading}
            loading={loading}
            size="lg"
          />
        </View>
      </View>
    </FadeInView>
  ), [
    formData,
    professions,
    pledgeAccepted,
    commissionDisplayText,
    loading,
    colors,
    isRTL,
    handleTogglePledge,
    handlePreviousStep,
    handleSubmitWithHaptic,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          title:
            step === 1
              ? (isRTL ? "إضافة إعلان تنازل" : "Add Transfer Ad")
              : (isRTL ? "مراجعة الإعلان" : "Review Ad"),
          gestureEnabled: step !== 2,
          headerBackTitle: isRTL ? "رجوع" : "Back",
          headerBackTitleVisible: true,
          headerBackButtonDisplayMode: "default",
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
            {step === 1 ? renderFormStep() : renderPreviewStep()}
          </ScrollView>
      </KeyboardAvoidingAnimatedView>

      {/* Nationality Bottom Sheet */}
      <NativeBottomSheet
        ref={nationalitySheetRef}
        snapPoints={['75%']}
        onDismiss={() => setNationalitySearch("")}
      >
        <View style={styles.sheetContent}>
          <View style={[styles.sheetHeader, { flexDirection: rowDirection }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {isRTL ? "اختر الجنسية" : "Select Nationality"}
            </Text>
            <NativePressable
              onPress={closeNationalitySheet}
              haptic="tap"
              style={[styles.sheetCloseButton, { backgroundColor: colors.surfaceSecondary }]}
            >
              <NativeIcon name="close" size="sm" color={colors.textSecondary} />
            </NativePressable>
          </View>

          <View style={[styles.sheetSearchBar, { backgroundColor: colors.surfaceSecondary, flexDirection: rowDirection }]}>
            <NativeIcon name="search" size="sm" color={colors.textMuted} style={{ marginHorizontal: 10 }} />
            <TextInput
              style={[styles.sheetSearchInput, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}
              placeholder={isRTL ? "بحث..." : "Search..."}
              placeholderTextColor={colors.textMuted}
              value={nationalitySearch}
              onChangeText={setNationalitySearch}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredNationalities.map((item, index) => (
              <NationalityItem
                key={index}
                item={item}
                onPress={() => selectNationality(isRTL ? item.ar : item.en)}
                colors={colors}
                isRTL={isRTL}
              />
            ))}
          </ScrollView>
        </View>
      </NativeBottomSheet>

      {/* City Bottom Sheet */}
      <NativeBottomSheet
        ref={citySheetRef}
        snapPoints={['75%']}
        onDismiss={() => setCitySearch("")}
      >
        <View style={styles.sheetContent}>
          <View style={[styles.sheetHeader, { flexDirection: rowDirection }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {isRTL ? "اختر المدينة" : "Select City"}
            </Text>
            <NativePressable
              onPress={closeCitySheet}
              haptic="tap"
              style={[styles.sheetCloseButton, { backgroundColor: colors.surfaceSecondary }]}
            >
              <NativeIcon name="close" size="sm" color={colors.textSecondary} />
            </NativePressable>
          </View>

          <View style={[styles.sheetSearchBar, { backgroundColor: colors.surfaceSecondary, flexDirection: rowDirection }]}>
            <NativeIcon name="search" size="sm" color={colors.textMuted} style={{ marginHorizontal: 10 }} />
            <TextInput
              style={[styles.sheetSearchInput, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}
              placeholder={isRTL ? "بحث..." : "Search..."}
              placeholderTextColor={colors.textMuted}
              value={citySearch}
              onChangeText={setCitySearch}
            />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredCities.map((item, index) => (
              <NationalityItem
                key={index}
                item={item}
                onPress={() => selectCity(isRTL ? item.ar : item.en)}
            colors={colors}
            isRTL={isRTL}
          />
            ))}
          </ScrollView>
        </View>
      </NativeBottomSheet>
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

  // Profession Selector (Custom)
  inputContainer: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  professionsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },

  // Gender Selector
  genderRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  genderButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  genderText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Preview
  previewCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  previewGrid: {
    gap: spacing.md,
  },
  previewRow: {
    justifyContent: "space-between",
  },
  previewLabel: {
    fontSize: 14,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  previewPrice: {
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    marginVertical: spacing.xl,
  },
  pledgeBox: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 2,
    alignItems: "flex-start",
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pledgeTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  pledgeText: {
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 18,
  },

  // Action Buttons
  actionButtons: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  // Bottom Sheet
  sheetContent: {
    flex: 1,
    padding: spacing.xl,
  },
  sheetHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sheetCloseButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  sheetSearchBar: {
    alignItems: "center",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 15,
  },
});
