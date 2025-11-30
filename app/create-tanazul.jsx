import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
  SlideInRight,
} from "react-native-reanimated";
import {
  User,
  Clock,
  DollarSign,
  FileText,
  Flag,
  ArrowLeft,
  ArrowRight,
  ChefHat,
  Baby,
  Sparkles,
  Search,
  CheckCircle,
  X,
  Stethoscope,
  Car,
  Hammer,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function CreateTanazulScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const [showNationalityModal, setShowNationalityModal] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    nationality: "",
    profession: "",
    previousTransfers: "",
    contractDuration: "",
    transferAmount: "",
    description: "",
  });

  const platformCommissionRate = 3;
  const buttonScale = useSharedValue(1);
  const paddingAnimation = useSharedValue(insets.bottom + 12);

  const animateTo = (value) => {
    paddingAnimation.value = withTiming(value, { duration: 200 });
  };

  const handleInputFocus = () => {
    if (Platform.OS === "web") return;
    animateTo(12);
  };

  const handleInputBlur = () => {
    if (Platform.OS === "web") return;
    animateTo(insets.bottom + 12);
  };

  const transferAmount = parseFloat(formData.transferAmount) || 0;
  const commission = transferAmount * (platformCommissionRate / 100);
  const totalListingPrice = transferAmount + commission;

  const allNationalities = [
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

  const filteredNationalities = allNationalities.filter((n) =>
    (isRTL ? n.ar : n.en).toLowerCase().includes(nationalitySearch.toLowerCase())
  );

  const professions = [
    { key: "cooking", icon: ChefHat, ar: "طبخ", en: "Cooking" },
    { key: "nanny", icon: Baby, ar: "رعاية أطفال", en: "Nanny" },
    { key: "cleaning", icon: Sparkles, ar: "تنظيف", en: "Cleaning" },
    { key: "nurse", icon: Stethoscope, ar: "ممرضة", en: "Nurse" },
    { key: "driver", icon: Car, ar: "سائق", en: "Driver" },
    { key: "worker", icon: Hammer, ar: "عامل", en: "Worker" },
  ];

  const handleNextStep = () => {
    if (!formData.nationality || !formData.profession || !formData.previousTransfers || !formData.contractDuration || !formData.transferAmount) {
      Alert.alert(
        isRTL ? "تنبيه" : "Alert",
        isRTL ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill all required fields"
      );
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!pledgeAccepted) {
      Alert.alert(
        isRTL ? "تنبيه" : "Alert",
        isRTL ? "يرجى الموافقة على التعهد بدفع العمولة" : "Please accept the commission pledge"
      );
      return;
    }

    setLoading(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        isRTL ? "تم النشر!" : "Published!",
        isRTL ? "تم نشر إعلان التنازل بنجاح" : "Transfer ad published successfully",
        [{ text: isRTL ? "موافق" : "OK", onPress: () => router.back() }]
      );
    }, 1500);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: paddingAnimation.value,
  }));

  const updateFormData = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const InputField = ({ icon: Icon, label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }) => (
    <Animated.View entering={FadeInDown} style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
        {label}
      </Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.inputContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <Icon size={18} color={colors.primary} />
          </View>
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text,
                textAlign: isRTL ? "right" : "left",
                minHeight: multiline ? 80 : undefined,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </View>
      </View>
    </Animated.View>
  );

  const renderNationalitySelector = () => (
    <Animated.View entering={FadeInDown} style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "الجنسية" : "Nationality"}
      </Text>
      <Pressable
        onPress={() => setShowNationalityModal(true)}
        style={[styles.selectorButton, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Flag size={18} color={colors.primary} />
        </View>
        <Text style={[styles.selectorText, { color: formData.nationality ? colors.text : colors.textMuted, flex: 1, textAlign: isRTL ? "right" : "left" }]}>
          {formData.nationality || (isRTL ? "اختر الجنسية" : "Select Nationality")}
        </Text>
        <Search size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={showNationalityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isRTL ? "اختر الجنسية" : "Select Nationality"}
              </Text>
              <Pressable onPress={() => setShowNationalityModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.modalSearchBar, { backgroundColor: colors.surface, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Search size={20} color={colors.textMuted} style={{ marginHorizontal: 10 }} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}
                placeholder={isRTL ? "بحث..." : "Search..."}
                placeholderTextColor={colors.textMuted}
                value={nationalitySearch}
                onChangeText={setNationalitySearch}
              />
            </View>

            <ScrollView>
              {filteredNationalities.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    updateFormData("nationality", isRTL ? item.ar : item.en);
                    setShowNationalityModal(false);
                  }}
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.modalItemText, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                    {isRTL ? item.ar : item.en}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );

  const renderProfessionSelector = () => (
    <Animated.View entering={FadeInDown} style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "المهنة" : "Profession"}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.professionsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {professions.map((prof) => (
            <Pressable
              key={prof.key}
              onPress={() => updateFormData("profession", prof.key)}
              style={[
                styles.professionCard,
                {
                  backgroundColor: formData.profession === prof.key ? colors.primary : colors.surface,
                  borderColor: formData.profession === prof.key ? colors.primary : colors.border,
                },
              ]}
            >
              <prof.icon
                size={26}
                color={formData.profession === prof.key ? "#fff" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.professionText,
                  { color: formData.profession === prof.key ? "#fff" : colors.text },
                ]}
              >
                {isRTL ? prof.ar : prof.en}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderFormStep = () => (
    <Animated.View entering={FadeInDown}>
      <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <User size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isRTL ? "بيانات التنازل" : "Transfer Data"}
          </Text>
        </View>

        {renderNationalitySelector()}
        {renderProfessionSelector()}

        <InputField
          icon={FileText}
          label={isRTL ? "عدد مرات نقل الكفالة" : "Previous Transfers"}
          value={formData.previousTransfers}
          onChangeText={(text) => updateFormData("previousTransfers", text)}
          placeholder={isRTL ? "مثلاً 1" : "e.g. 1"}
          keyboardType="numeric"
        />

        <InputField
          icon={Clock}
          label={isRTL ? "المدة المتبقية من العقد" : "Remaining Contract Duration"}
          value={formData.contractDuration}
          onChangeText={(text) => updateFormData("contractDuration", text)}
          placeholder={isRTL ? "مثلاً 10 شهور" : "e.g. 10 months"}
        />

        <InputField
          icon={DollarSign}
          label={isRTL ? "مبلغ التنازل شامل النقل" : "Transfer Amount (Including Fees)"}
          value={formData.transferAmount}
          onChangeText={(text) => updateFormData("transferAmount", text)}
          placeholder={isRTL ? "ريال سعودي" : "SAR"}
          keyboardType="numeric"
        />

        <InputField
          icon={FileText}
          label={isRTL ? "وصف إضافي (اختياري)" : "Description (Optional)"}
          value={formData.description}
          onChangeText={(text) => updateFormData("description", text)}
          placeholder={isRTL ? "مزيد من المعلومات..." : "More info..."}
          multiline
        />
      </View>

      <Animated.View style={buttonAnimatedStyle}>
        <Pressable onPress={handleNextStep} style={[styles.nextButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.nextButtonText}>
            {isRTL ? "متابعة" : "Continue"}
          </Text>
          {isRTL ? (
            <ArrowLeft size={20} color="#fff" />
          ) : (
            <ArrowRight size={20} color="#fff" />
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );

  const renderPreviewStep = () => (
    <Animated.View entering={SlideInRight}>
      <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.previewTitle, { color: colors.text }]}>
          {isRTL ? "مراجعة الطلب" : "Review Request"}
        </Text>

        <View style={styles.previewGrid}>
          <View style={[styles.previewRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الجنسية:" : "Nationality:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>{formData.nationality}</Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "المهنة:" : "Profession:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {professions.find((p) => p.key === formData.profession)?.[isRTL ? "ar" : "en"] || formData.profession}
            </Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "نقل الكفالة:" : "Transfers:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {formData.previousTransfers} {isRTL ? "مرات" : "times"}
            </Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "المدة المتبقية:" : "Remaining:"}
            </Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>{formData.contractDuration}</Text>
          </View>
          <View style={[styles.previewRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {isRTL ? "المبلغ:" : "Amount:"}
            </Text>
            <Text style={[styles.previewPrice, { color: colors.primary }]}>
              {formData.transferAmount} {isRTL ? "ر.س" : "SAR"}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Pressable
          onPress={() => setPledgeAccepted(!pledgeAccepted)}
          style={[
            styles.pledgeBox,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: pledgeAccepted ? colors.primary : colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
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
            {pledgeAccepted && <CheckCircle size={16} color="#fff" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pledgeTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "قسم التعهد بدفع العمولة" : "Commission Pledge"}
            </Text>
            <Text style={[styles.pledgeText, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL
                ? `أتعهد بدفع عمولة المنصة (${platformCommissionRate}%) في حال إتمام التنازل.`
                : `I pledge to pay the platform commission (${platformCommissionRate}%) upon completion.`}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={[styles.actionButtons, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Pressable
          onPress={() => setStep(1)}
          style={[styles.editButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.editButtonText, { color: colors.textSecondary }]}>
            {isRTL ? "تعديل" : "Edit"}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          style={[styles.submitButton, { backgroundColor: pledgeAccepted ? colors.primary : colors.textMuted }]}
        >
          <Text style={styles.submitButtonText}>
            {loading ? (isRTL ? "جاري التأكيد..." : "Confirming...") : (isRTL ? "تأكيد الطلب" : "Confirm")}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <Animated.View style={[containerAnimatedStyle, styles.mainContainer, { paddingTop: insets.top }]}>
          {/* Header */}
          <Animated.View
            entering={SlideInRight.delay(100)}
            style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          >
            <Pressable
              onPress={() => (step === 2 ? setStep(1) : router.back())}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
            >
              {isRTL ? (
                <ArrowRight size={22} color={colors.text} />
              ) : (
                <ArrowLeft size={22} color={colors.text} />
              )}
            </Pressable>

            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {step === 1
                ? (isRTL ? "إضافة إعلان تنازل" : "Add Transfer Ad")
                : (isRTL ? "مراجعة الإعلان" : "Review Ad")}
            </Text>

            <View style={styles.headerSpacer} />
          </Animated.View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 ? renderFormStep() : renderPreviewStep()}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingAnimatedView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSpacer: {
    width: 44,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },

  // Form Card
  formCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },

  // Input
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  inputContent: {
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  // Selector
  selectorButton: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 12,
  },
  selectorText: {
    fontSize: 15,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "75%",
    padding: 20,
  },
  modalHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalSearchBar: {
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 15,
  },

  // Professions
  professionsRow: {
    gap: 10,
    paddingVertical: 4,
  },
  professionCard: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 90,
  },
  professionText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
  },

  // Next Button
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Preview
  previewTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  previewGrid: {
    gap: 14,
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
    marginVertical: 20,
  },
  pledgeBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 12,
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
    marginTop: 4,
  },

  // Action Buttons
  actionButtons: {
    gap: 14,
  },
  editButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 15,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
