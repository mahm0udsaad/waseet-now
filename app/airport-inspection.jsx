import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { NationalityItem } from "@/components/forms/TanazulFormInputs";
import {
  NativeBottomSheet,
  NativeButton,
  NativeFormSection,
  NativeFormSelectorRow,
  NativeFormTextField,
  NativeIcon,
  NativePressable,
} from "@/components/native";
import { useTranslation } from "@/utils/i18n/store";
import { hapticFeedback } from "@/utils/native/haptics";
import { spacing } from "@/utils/native/layout";
import { showToast } from "@/utils/notifications/inAppStore";
import { usePaymentFlowStore } from "@/utils/payments/paymentFlowStore";
import {
  createAirportRequest,
  fetchAirportServicePrice,
  updateAirportRequestPayment,
  uploadAirportDoc,
} from "@/utils/supabase/airportRequests";
import { ensureSupabaseSession } from "@/utils/supabase/client";
import { useTheme } from "@/utils/theme/store";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ImageIcon, Plane, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NATIONALITIES = [
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
];

function formatDate(d) {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(d) {
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function AirportInspectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isRTL, writingDirection } = useTranslation();
  const openPaymentFlow = usePaymentFlowStore((s) => s.openPaymentFlow);

  const nationalitySheetRef = useRef(null);

  const [price, setPrice] = useState(500);
  const [submitting, setSubmitting] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState("");

  // Form state
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorPhone, setSponsorPhone] = useState("");
  const [sponsorAltPhone, setSponsorAltPhone] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [workerNationality, setWorkerNationality] = useState("");
  const [flightDate, setFlightDate] = useState(null);
  const [flightTime, setFlightTime] = useState(null);
  const [exitVisaImage, setExitVisaImage] = useState(null);
  const [ticketImage, setTicketImage] = useState(null);
  const [pledgeAccepted, setPledgeAccepted] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    fetchAirportServicePrice()
      .then((p) => setPrice(p))
      .catch(() => setPrice(500));
  }, []);

  const filteredNationalities = useMemo(
    () =>
      NATIONALITIES.filter((n) =>
        (isRTL ? n.ar : n.en).toLowerCase().includes(nationalitySearch.toLowerCase())
      ),
    [nationalitySearch, isRTL]
  );

  const openNationalitySheet = useCallback(() => {
    hapticFeedback.tap();
    nationalitySheetRef.current?.present();
  }, []);

  const selectNationality = useCallback((nationality) => {
    setWorkerNationality(isRTL ? nationality.ar : nationality.en);
    nationalitySheetRef.current?.dismiss();
  }, [isRTL]);

  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(isRTL ? "خطأ" : "Error", isRTL ? "لم يتم منح صلاحية الوصول للمعرض" : "Gallery permission denied");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0]);
    }
  };

  const validate = () => {
    if (!sponsorName.trim()) return isRTL ? "اسم الكفيل مطلوب" : "Sponsor name required";
    if (!sponsorPhone.trim() || sponsorPhone.replace(/\D/g, "").length < 9)
      return isRTL ? "رقم جوال الكفيل مطلوب" : "Sponsor phone required";
    if (!workerName.trim()) return isRTL ? "اسم العاملة مطلوب" : "Worker name required";
    if (!workerNationality) return isRTL ? "جنسية العاملة مطلوبة" : "Worker nationality required";
    if (!flightDate) return isRTL ? "تاريخ الرحلة مطلوب" : "Flight date required";
    if (!flightTime) return isRTL ? "وقت الرحلة مطلوب" : "Flight time required";
    if (!exitVisaImage) return isRTL ? "صورة تأشيرة الخروج مطلوبة" : "Exit visa image required";
    if (!ticketImage) return isRTL ? "صورة التذكرة مطلوبة" : "Ticket image required";
    if (!pledgeAccepted) return isRTL ? "يجب الموافقة على الشروط" : "You must accept the terms";
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      showToast({
        id: "airport-validation",
        title: isRTL ? "تنبيه" : "Notice",
        body: error,
        type: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const session = await ensureSupabaseSession();
      const userId = session.user.id;

      // 1. Upload images
      const exit_visa_path = await uploadAirportDoc(userId, exitVisaImage, "exit_visa");
      const ticket_path = await uploadAirportDoc(userId, ticketImage, "ticket");

      // 2. Create the request row
      const request = await createAirportRequest({
        sponsor_name: sponsorName.trim(),
        sponsor_phone: sponsorPhone.trim(),
        sponsor_alt_phone: sponsorAltPhone.trim() || null,
        worker_name: workerName.trim(),
        worker_nationality: workerNationality,
        flight_date: formatDate(flightDate),
        flight_time: formatTime(flightTime),
        exit_visa_path,
        ticket_path,
        price,
      });

      // 3. Open payment modal — handlers same as damin-order-details.jsx
      openPaymentFlow({
        amount: price,
        initialPhone: sponsorPhone.trim(),
        onPaymentSubmitted: async (paymentInfo) => {
          try {
            // Bank transfer path: upload receipt then mark awaiting approval
            let paymentRef = null;
            if (paymentInfo?.receiptUri) {
              paymentRef = await uploadAirportDoc(
                userId,
                { uri: paymentInfo.receiptUri, mimeType: "image/jpeg" },
                "receipt"
              );
            }
            await updateAirportRequestPayment(request.id, {
              method: paymentInfo?.paymentMethod || "bank_transfer",
              ref: paymentRef,
            });
            router.replace("/airport-success");
            return true;
          } catch (err) {
            console.error("Airport payment submit failed", err);
            showToast({
              id: "airport-pay-err",
              title: isRTL ? "خطأ" : "Error",
              body: err?.message || (isRTL ? "فشل إرسال الدفع" : "Failed to submit payment"),
              type: "error",
            });
            return false;
          }
        },
        onCardPayment: async () => {
          // Card flow placeholder — Paymob integration follows existing pattern
          // (createPaymobIntention + /paymob-checkout) but is out of scope for v1.
          showToast({
            id: "airport-card-soon",
            title: isRTL ? "قريباً" : "Coming Soon",
            body: isRTL
              ? "الدفع بالبطاقة لخدمة المطار سيتاح قريباً، يرجى استخدام التحويل البنكي"
              : "Card payment for airport service is coming soon, please use bank transfer",
            type: "info",
          });
        },
      });
      router.push("/payment-modal");
    } catch (err) {
      console.error("Airport request submit failed", err);
      showToast({
        id: "airport-submit-err",
        title: isRTL ? "خطأ" : "Error",
        body: err?.message || (isRTL ? "فشل إرسال الطلب" : "Failed to submit request"),
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderImagePicker = (label, image, setter, testID) => (
    <View style={styles.uploadBlock}>
      <Text style={[styles.uploadLabel, { color: colors.text, writingDirection }]}>
        {label} <Text style={{ color: colors.error }}>*</Text>
      </Text>
      {image ? (
        <View style={[styles.uploadPreview, { borderColor: colors.border }]}>
          <Image source={{ uri: image.uri }} style={styles.uploadImage} />
          <Pressable
            onPress={() => setter(null)}
            style={[styles.uploadRemove, { backgroundColor: colors.error }]}
            testID={`${testID}-remove`}
          >
            <Trash2 size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          testID={testID}
          onPress={() => pickImage(setter)}
          style={[styles.uploadButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
        >
          <ImageIcon size={24} color={colors.textSecondary} />
          <Text style={[styles.uploadButtonText, { color: colors.textSecondary }]}>
            {isRTL ? "اختر صورة من المعرض" : "Pick image from gallery"}
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          title: isRTL ? "خدمة تفتيش وتوصيل للمطار" : "Airport Inspection Service",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <StatusBar style={colors.statusBar} />

      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 10) + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero / price */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.primary + "10",
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={[styles.heroIcon, { backgroundColor: colors.primary + "20" }]}>
              <Plane size={28} color={colors.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text, writingDirection }]}>
              {isRTL ? "خدمة تفتيش وتوصيل للمطار" : "Airport Inspection & Delivery"}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary, writingDirection }]}>
              {isRTL
                ? "نتولى تفتيش العمالة وتوصيلها إلى المطار في الموعد المحدد"
                : "We handle worker inspection and airport delivery"}
            </Text>
            <View style={styles.heroPriceRow}>
              <Text style={[styles.heroPriceLabel, { color: colors.textSecondary }]}>
                {isRTL ? "السعر" : "Price"}
              </Text>
              <Text style={[styles.heroPrice, { color: colors.primary }]}>
                {price.toLocaleString()} {isRTL ? "ر.س" : "SAR"}
              </Text>
            </View>
          </View>

          {/* Sponsor section */}
          <NativeFormSection title={isRTL ? "بيانات الكفيل" : "SPONSOR INFO"}>
            <NativeFormTextField
              label={isRTL ? "اسم الكفيل" : "Sponsor Name"}
              value={sponsorName}
              onChangeText={setSponsorName}
              placeholder={isRTL ? "الاسم الكامل" : "Full name"}
              required
              testID="sponsor-name"
            />
            <NativeFormTextField
              label={isRTL ? "رقم الجوال" : "Phone"}
              value={sponsorPhone}
              onChangeText={setSponsorPhone}
              placeholder={isRTL ? "5XXXXXXXX" : "5XXXXXXXX"}
              keyboardType="phone-pad"
              required
              testID="sponsor-phone"
            />
            <NativeFormTextField
              label={isRTL ? "رقم بديل" : "Alt Phone"}
              value={sponsorAltPhone}
              onChangeText={setSponsorAltPhone}
              placeholder={isRTL ? "اختياري" : "Optional"}
              keyboardType="phone-pad"
              isLast
              testID="sponsor-alt-phone"
            />
          </NativeFormSection>

          {/* Worker section */}
          <NativeFormSection title={isRTL ? "بيانات العاملة والرحلة" : "WORKER & FLIGHT"}>
            <NativeFormTextField
              label={isRTL ? "اسم العاملة" : "Worker Name"}
              value={workerName}
              onChangeText={setWorkerName}
              placeholder={isRTL ? "الاسم الكامل" : "Full name"}
              required
              testID="worker-name"
            />
            <NativeFormSelectorRow
              label={isRTL ? "الجنسية" : "Nationality"}
              value={workerNationality}
              placeholder={isRTL ? "اختر الجنسية" : "Select nationality"}
              onPress={openNationalitySheet}
              icon="user"
              required
              testID="worker-nationality"
            />
            <NativeFormSelectorRow
              label={isRTL ? "تاريخ الرحلة" : "Flight Date"}
              value={flightDate ? formatDate(flightDate) : ""}
              placeholder={isRTL ? "اختر التاريخ" : "Pick a date"}
              onPress={() => {
                hapticFeedback.tap();
                setShowDatePicker(true);
              }}
              icon="calendar"
              required
              testID="flight-date"
            />
            <NativeFormSelectorRow
              label={isRTL ? "وقت الرحلة" : "Flight Time"}
              value={flightTime ? formatTime(flightTime) : ""}
              placeholder={isRTL ? "اختر الوقت" : "Pick a time"}
              onPress={() => {
                hapticFeedback.tap();
                setShowTimePicker(true);
              }}
              icon="clock"
              required
              isLast
              testID="flight-time"
            />
          </NativeFormSection>

          {showDatePicker && (
            <DateTimePicker
              value={flightDate || new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              locale="en-US"
              onChange={(event, selected) => {
                if (Platform.OS !== "ios") setShowDatePicker(false);
                if (event.type === "set" && selected) setFlightDate(selected);
                if (event.type === "dismissed") setShowDatePicker(false);
              }}
            />
          )}
          {Platform.OS === "ios" && showDatePicker && (
            <View style={styles.pickerDoneRow}>
              <NativeButton
                title={isRTL ? "تم" : "Done"}
                onPress={() => setShowDatePicker(false)}
                size="sm"
              />
            </View>
          )}

          {showTimePicker && (
            <DateTimePicker
              value={flightTime || new Date()}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              locale="en-US"
              onChange={(event, selected) => {
                if (Platform.OS !== "ios") setShowTimePicker(false);
                if (event.type === "set" && selected) setFlightTime(selected);
                if (event.type === "dismissed") setShowTimePicker(false);
              }}
            />
          )}
          {Platform.OS === "ios" && showTimePicker && (
            <View style={styles.pickerDoneRow}>
              <NativeButton
                title={isRTL ? "تم" : "Done"}
                onPress={() => setShowTimePicker(false)}
                size="sm"
              />
            </View>
          )}

          {/* Uploads */}
          <View style={styles.uploadsSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, writingDirection }]}>
              {isRTL ? "المرفقات" : "ATTACHMENTS"}
            </Text>
            {renderImagePicker(
              isRTL ? "صورة تأشيرة الخروج النهائي" : "Final Exit Visa",
              exitVisaImage,
              setExitVisaImage,
              "exit-visa-upload"
            )}
            {renderImagePicker(
              isRTL ? "صورة التذكرة" : "Ticket Image",
              ticketImage,
              setTicketImage,
              "ticket-upload"
            )}
          </View>

          {/* Pledge / terms */}
          <View style={[styles.termsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.termsTitle, { color: colors.text, writingDirection }]}>
              {isRTL ? "عزيزي العميل، لتأكيد الطلب يجب التأكد من التالي:" : "Dear customer, to confirm your request please ensure:"}
            </Text>
            {[
              isRTL ? "الدفع قبل موعد 24 ساعة على الأقل" : "Payment at least 24 hours before the appointment",
              isRTL ? "إرفاق تأشيرة الخروج النهائي" : "Attach the final exit visa",
              isRTL ? "التأكد من وزن الأمتعة ومطابقته للحجز" : "Verify luggage weight matches the booking",
              isRTL ? "إرفاق صورة التذكرة" : "Attach a copy of the ticket",
            ].map((line, i) => (
              <View key={i} style={styles.termsRow}>
                <Text style={[styles.termsBullet, { color: colors.primary }]}>{i + 1}.</Text>
                <Text style={[styles.termsText, { color: colors.textSecondary, writingDirection }]}>
                  {line}
                </Text>
              </View>
            ))}
            <Text style={[styles.termsWarn, { color: colors.error, writingDirection }]}>
              {isRTL ? "ملاحظة: المبلغ غير مسترد في حالة الإلغاء" : "Note: Amount is non-refundable on cancellation"}
            </Text>

            <NativePressable
              onPress={() => {
                hapticFeedback.selection();
                setPledgeAccepted((p) => !p);
              }}
              haptic="selection"
              style={[
                styles.pledgeBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: pledgeAccepted ? colors.primary : colors.border,
                },
              ]}
              testID="airport-pledge"
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
                {pledgeAccepted && <NativeIcon name="check" size={16} color="#fff" />}
              </View>
              <Text style={[styles.pledgeText, { color: colors.text, writingDirection }]}>
                {isRTL
                  ? "أقر بقراءة الشروط أعلاه وأوافق على أن المبلغ غير مسترد"
                  : "I confirm I have read the terms and agree the amount is non-refundable"}
              </Text>
            </NativePressable>
          </View>

          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <NativeButton
              testID="airport-submit"
              title={
                submitting
                  ? isRTL ? "جاري الإرسال..." : "Submitting..."
                  : isRTL ? `متابعة للدفع (${price.toLocaleString()} ر.س)` : `Continue to Payment (${price.toLocaleString()} SAR)`
              }
              onPress={handleSubmit}
              disabled={submitting}
              loading={submitting}
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingAnimatedView>

      {/* Nationality Bottom Sheet */}
      <NativeBottomSheet
        ref={nationalitySheetRef}
        snapPoints={["75%"]}
        onDismiss={() => setNationalitySearch("")}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {isRTL ? "اختر الجنسية" : "Select Nationality"}
            </Text>
            <NativePressable
              onPress={() => nationalitySheetRef.current?.dismiss()}
              haptic="tap"
              style={[styles.sheetCloseButton, { backgroundColor: colors.surfaceSecondary }]}
            >
              <NativeIcon name="close" size="sm" color={colors.textSecondary} />
            </NativePressable>
          </View>

          <View style={[styles.sheetSearchBar, { backgroundColor: colors.surfaceSecondary }]}>
            <NativeIcon name="search" size="sm" color={colors.textMuted} style={{ marginHorizontal: 10 }} />
            <TextInput
              style={[styles.sheetSearchInput, { color: colors.text, writingDirection }]}
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
                onPress={() => selectNationality(item)}
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: spacing.lg },

  heroCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  heroPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroPriceLabel: { fontSize: 12 },
  heroPrice: { fontSize: 20, fontWeight: "800" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  uploadsSection: { marginBottom: spacing.md },
  uploadBlock: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  uploadLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 10,
  },
  uploadButtonText: { fontSize: 13, fontWeight: "600" },
  uploadPreview: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  uploadImage: { width: "100%", height: 180 },
  uploadRemove: {
    position: "absolute",
    top: 8,
    insetInlineEnd: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  termsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  termsTitle: { fontSize: 14, fontWeight: "700", marginBottom: spacing.sm },
  termsRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  termsBullet: { fontSize: 13, fontWeight: "700", marginEnd: 6, marginTop: 1 },
  termsText: { flex: 1, fontSize: 13, lineHeight: 20 },
  termsWarn: { fontSize: 12, fontWeight: "700", marginTop: spacing.md },

  pledgeBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: spacing.md,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pledgeText: { flex: 1, fontSize: 13, fontWeight: "600" },

  pickerDoneRow: {
    paddingHorizontal: spacing.lg,
    alignItems: "flex-end",
    marginVertical: spacing.sm,
  },

  // Bottom sheet
  sheetContent: { flex: 1, padding: spacing.lg },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  sheetSearchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
});
