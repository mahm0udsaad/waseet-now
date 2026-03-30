import React, { useCallback, useMemo, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FadeInView from "@/components/ui/FadeInView";

// Native Components
import {
  NativeIcon,
  NativeButton,
  NativePressable,
  NativeBottomSheet,
  NativeFormSection,
  NativeFormTextField,
  NativeFormSelectorRow,
} from "@/components/native";

// Components
import { NationalityItem } from "@/components/forms/TanazulFormInputs";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

// Utils & Constants
import { SAUDI_CITIES } from "@/constants/saudiCities";
import { useTaqibForm } from "@/utils/forms/useTaqibForm";
import { useTranslation, getRTLTextAlign } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { hapticFeedback } from "@/utils/native/haptics";
import { spacing } from "@/utils/native/layout";

export default function CreateTaqibScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isRTL, rowDirection } = useTranslation();

  // Ref for city bottom sheet
  const citySheetRef = useRef(null);

  const {
    loading,
    formData,
    citySearch,
    updateFormData,
    setCitySearch,
    handleSubmit,
    isFormValid,
  } = useTaqibForm(isRTL);

  // City selector handlers
  const openCitySheet = useCallback(() => {
    hapticFeedback.tap();
    citySheetRef.current?.present();
  }, []);

  const closeCitySheet = useCallback(() => {
    citySheetRef.current?.dismiss();
  }, []);

  const selectCity = useCallback((city) => {
    updateFormData("location", city);
    closeCitySheet();
  }, [updateFormData, closeCitySheet]);

  const filteredCities = useMemo(() => 
    SAUDI_CITIES.filter((c) =>
      (isRTL ? c.ar : c.en).toLowerCase().includes(citySearch.toLowerCase())
    ),
    [citySearch, isRTL]
  );

  const handleSubmitWithHaptic = useCallback(async () => {
    hapticFeedback.confirm();
    await handleSubmit();
  }, [handleSubmit]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          title: isRTL ? "إضافة خدمات تعقيب" : "Post Taqib Services",
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
          <FadeInView>
            <NativeFormSection
              title={isRTL ? "تفاصيل الخدمة" : "SERVICE DETAILS"}
            >
              <NativeFormSelectorRow
                label={isRTL ? "المدينة" : "City"}
                value={formData.location}
                placeholder={isRTL ? "اختر المدينة" : "Select City"}
                onPress={openCitySheet}
                icon="pin"
                testID="taqib-city-selector"
                required
                isLast
              />
            </NativeFormSection>

            <NativeFormSection>
              <NativeFormTextField
                label={isRTL ? "عنوان الإعلان" : "Post Title"}
                value={formData.requestTitle}
                onChangeText={(text) => updateFormData("requestTitle", text)}
                placeholder={isRTL ? "مثال: خدمات تعقيب (جوازات/مقيم/بلدية...)" : "e.g., Taqib services"}
                testID="taqib-title-input"
                required
              />
              
              <NativeFormTextField
                label={isRTL ? "الوصف" : "Description"}
                value={formData.description}
                onChangeText={(text) => updateFormData("description", text)}
                placeholder={isRTL ? "اكتب تفاصيل خدماتك وخبرتك والخدمات التي تقدمها..." : "Describe your services and expertise..."}
                multiline
                numberOfLines={5}
                testID="taqib-description-input"
                required
                isLast
              />
            </NativeFormSection>

            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
              <NativeButton
                title={loading ? (isRTL ? "جاري النشر..." : "Posting...") : (isRTL ? "نشر الإعلان" : "Publish Post")}
                onPress={handleSubmitWithHaptic}
                disabled={!isFormValid || loading}
                loading={loading}
                icon="send"
                iconPosition="left"
                size="lg"
                testID="taqib-submit-btn"
              />
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingAnimatedView>

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
    borderRadius: 8,
  },
  sheetSearchBar: {
    alignItems: "center",
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 15,
  },
});
