import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
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
  FileText,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Send,
  Building,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { createAd } from "@/utils/supabase/ads";

export default function CreateTaqibScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    requestTitle: "",
    description: "",
    expectedAmount: "",
  });

  // Animation values
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

  const handleSubmitTicket = async () => {
    setLoading(true);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    try {
      await createAd({
        type: "taqib",
        title: formData.requestTitle || "Follow-up Request",
        description: formData.description,
        price: formData.expectedAmount || null,
        metadata: {
          ...formData,
        },
      });

      Alert.alert(
        isRTL ? "تم الإرسال!" : "Sent!",
        isRTL ? "تم إرسال طلب التعقيب بنجاح" : "Follow-up request sent successfully",
        [{ text: isRTL ? "موافق" : "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      const message = error?.message || (isRTL ? "تعذر حفظ الطلب" : "Failed to save request");
      Alert.alert(isRTL ? "خطأ" : "Error", message);
    } finally {
      setLoading(false);
    }
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
                minHeight: multiline ? 100 : undefined,
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
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
            >
              {isRTL ? (
                <ArrowRight size={22} color={colors.text} />
              ) : (
                <ArrowLeft size={22} color={colors.text} />
              )}
            </Pressable>

            <Text style={[styles.headerTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "طلب تعقيب جديد" : "New Follow-up Request"}
            </Text>

            <View style={styles.headerSpacer} />
          </Animated.View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Form Section */}
            <Animated.View
              entering={FadeInDown.delay(200)}
              style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Building size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {isRTL ? "تفاصيل الطلب" : "Request Details"}
                </Text>
              </View>

              <InputField
                icon={FileText}
                label={isRTL ? "عنوان الطلب" : "Request Title"}
                value={formData.requestTitle}
                onChangeText={(text) => updateFormData("requestTitle", text)}
                placeholder={isRTL ? "عنوان مختصر للطلب" : "Brief title for your request"}
              />

              <InputField
                icon={FileText}
                label={isRTL ? "وصف العمل المطلوب" : "Description of Required Work"}
                value={formData.description}
                onChangeText={(text) => updateFormData("description", text)}
                placeholder={isRTL ? "اكتب وصف للعمل المطلوب..." : "Describe what needs to be done..."}
                multiline
              />

              <InputField
                icon={DollarSign}
                label={isRTL ? "المبلغ المتوقع" : "Expected Amount"}
                value={formData.expectedAmount}
                onChangeText={(text) => updateFormData("expectedAmount", text)}
                placeholder={isRTL ? "أدخل المبلغ المتوقع" : "Enter expected amount"}
                keyboardType="numeric"
              />
            </Animated.View>
          </ScrollView>

          {/* Submit Button */}
          <Animated.View style={[buttonAnimatedStyle, styles.buttonContainer]}>
            <Pressable
              onPress={handleSubmitTicket}
              disabled={loading || !formData.requestTitle || !formData.description || !formData.expectedAmount}
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    !formData.requestTitle || !formData.description || !formData.expectedAmount || loading
                      ? colors.textMuted
                      : colors.primary,
                },
              ]}
            >
              <Send size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {loading
                  ? (isRTL ? "جاري الإرسال..." : "Sending...")
                  : (isRTL ? "إرسال الطلب" : "Send Request")}
              </Text>
            </Pressable>
          </Animated.View>
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
    flex: 1,
    paddingHorizontal: 16,
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
    paddingBottom: 100,
  },

  // Form
  formCard: {
    borderRadius: 16,
    padding: 20,
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

  // Button
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#D83A3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
