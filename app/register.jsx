import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from "react-native-reanimated";
import {
  Phone,
  ArrowLeft,
  ArrowRight,
  Send,
  CheckCircle,
  Mail,
  Shield,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import { useAuth } from "@/utils/auth/useAuth";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const { signUp } = useAuth();

  const [method, setMethod] = useState(null); // 'phone' | 'google'
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation values
  const phoneScale = useSharedValue(1);
  const googleScale = useSharedValue(1);
  const verifyScale = useSharedValue(1);
  const submitScale = useSharedValue(1);

  const handleSelectMethod = (selectedMethod) => {
    if (selectedMethod === "phone") {
      phoneScale.value = withSpring(0.95, {}, () => {
        phoneScale.value = withSpring(1);
      });
      setMethod("phone");
    } else if (selectedMethod === "google") {
      googleScale.value = withSpring(0.95, {}, () => {
        googleScale.value = withSpring(1);
      });
      handleGoogleSignIn();
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    // Use the existing auth system
    signUp();
    // For dummy flow, continue directly after Google sign-in
    setTimeout(() => {
      setLoading(false);
      handleContinue();
    }, 500);
  };

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      Alert.alert(
        isRTL ? "تنبيه" : "Alert",
        isRTL ? "يرجى إدخال رقم جوال صحيح" : "Please enter a valid phone number"
      );
      return;
    }

    setIsVerifying(true);
    verifyScale.value = withSpring(0.95, {}, () => {
      verifyScale.value = withSpring(1);
    });

    // Simulate sending code
    setTimeout(() => {
      setIsVerifying(false);
      setCodeSent(true);
    }, 1500);
  };

  const handleVerifyOtp = () => {
    if (otpCode === "0000") {
      setIsVerified(true);
      setCodeSent(false);
    } else {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        isRTL ? "رمز التحقق غير صحيح. استخدم 0000 للاختبار" : "Invalid verification code. Use 0000 for testing"
      );
    }
  };

  const handleContinue = async () => {
    if (method === "phone" && !isVerified) {
      Alert.alert(
        isRTL ? "تنبيه" : "Alert",
        isRTL ? "يرجى التحقق من رقم الجوال" : "Please verify your phone number"
      );
      return;
    }

    setLoading(true);
    submitScale.value = withSpring(0.95, {}, () => {
      submitScale.value = withSpring(1);
    });

    // Simulate account creation
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        isRTL ? "تم بنجاح!" : "Success!",
        isRTL ? "تم إنشاء حسابك بنجاح" : "Your account has been created successfully",
        [
          {
            text: isRTL ? "متابعة" : "Continue",
            onPress: () => router.replace("/"),
          },
        ]
      );
    }, 1500);
  };

  const phoneAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: phoneScale.value }],
  }));

  const googleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: googleScale.value }],
  }));

  const verifyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: verifyScale.value }],
  }));

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  // Method Selection Screen
  const renderMethodSelection = () => (
    <View style={styles.methodSelectionContainer}>
      <Animated.View entering={FadeInDown.delay(200)} style={styles.methodSelectionHeader}>
        <Text style={[styles.methodSelectionTitle, { color: colors.text }]}>
          {isRTL ? "التسجيل" : "Sign Up"}
        </Text>
        <Text style={[styles.methodSelectionSubtitle, { color: colors.textSecondary }]}>
          {isRTL ? "اختر طريقة التسجيل" : "Choose your sign up method"}
        </Text>
      </Animated.View>

      <View style={styles.methodCards}>
        {/* Phone Number Option */}
        <Animated.View entering={ZoomIn.delay(300)} style={phoneAnimatedStyle}>
          <Pressable
            onPress={() => handleSelectMethod("phone")}
            style={({ pressed }) => [
              styles.methodCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <View style={[styles.methodIconBox, { backgroundColor: colors.primaryLight }]}>
              <Phone size={36} color={colors.primary} />
            </View>
            <Text style={[styles.methodCardTitle, { color: colors.text }]}>
              {isRTL ? "رقم الجوال" : "Phone Number"}
            </Text>
            <Text style={[styles.methodCardDesc, { color: colors.textSecondary }]}>
              {isRTL ? "سجل باستخدام رقم جوالك" : "Sign up with your phone number"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Google Option */}
        <Animated.View entering={ZoomIn.delay(400)} style={googleAnimatedStyle}>
          <Pressable
            onPress={() => handleSelectMethod("google")}
            style={({ pressed }) => [
              styles.methodCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <View style={[styles.methodIconBox, { backgroundColor: colors.surfaceSecondary }]}>
              <Mail size={36} color={colors.primary} />
            </View>
            <Text style={[styles.methodCardTitle, { color: colors.text }]}>
              {isRTL ? "جوجل" : "Google"}
            </Text>
            <Text style={[styles.methodCardDesc, { color: colors.textSecondary }]}>
              {isRTL ? "سجل باستخدام حساب جوجل" : "Sign up with Google"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );

  // Phone Number Entry Screen
  const renderPhoneEntry = () => (
    <View style={styles.phoneEntryContainer}>
      <Animated.View entering={FadeInDown.delay(200)} style={styles.phoneEntryHeader}>
        <Text style={[styles.phoneEntryTitle, { color: colors.text }]}>
          {isRTL ? "أدخل رقم الجوال" : "Enter Phone Number"}
        </Text>
        <Text style={[styles.phoneEntrySubtitle, { color: colors.textSecondary }]}>
          {isRTL ? "سنرسل لك رمز التحقق عبر الرسائل النصية" : "We'll send you a verification code via SMS"}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300)} style={styles.phoneInputContainer}>
        <View
          style={[
            styles.phoneInputWrapper,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <View style={[styles.phoneIconBox, { backgroundColor: colors.primaryLight }]}>
            <Phone size={20} color={colors.primary} />
          </View>
          <Text style={[styles.countryCode, { color: colors.text }]}>+966</Text>
          <TextInput
            style={[
              styles.phoneInput,
              { color: colors.text, textAlign: isRTL ? "right" : "left" },
            ]}
            placeholder={isRTL ? "5XXXXXXXX" : "5XXXXXXXX"}
            placeholderTextColor={colors.textMuted}
            value={phoneNumber}
            onChangeText={(text) => {
              // Only allow numbers
              const cleaned = text.replace(/[^0-9]/g, "");
              setPhoneNumber(cleaned);
              setIsVerified(false);
            }}
            keyboardType="phone-pad"
            maxLength={9}
          />
        </View>

        {phoneNumber.length >= 9 && !codeSent && !isVerified && (
          <Animated.View style={verifyAnimatedStyle} entering={FadeInDown.delay(100)}>
            <Pressable
              onPress={handleSendCode}
              disabled={isVerifying}
              style={[
                styles.verifyButton,
                {
                  backgroundColor: colors.primary,
                  opacity: isVerifying ? 0.7 : 1,
                },
              ]}
            >
              <Send size={18} color="#fff" />
              <Text style={styles.verifyButtonText}>
                {isVerifying
                  ? (isRTL ? "جاري الإرسال..." : "Sending...")
                  : (isRTL ? "إرسال رمز التحقق" : "Send Verification Code")}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {codeSent && !isVerified && (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.otpContainer}>
            <Text style={[styles.otpLabel, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "أدخل رمز التحقق" : "Enter Verification Code"}
            </Text>
            <Text style={[styles.otpHint, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "استخدم 0000 للاختبار" : "Use 0000 for testing"}
            </Text>
            <View
              style={[
                styles.otpInputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <View style={[styles.otpIconBox, { backgroundColor: colors.primaryLight }]}>
                <Shield size={20} color={colors.primary} />
              </View>
              <TextInput
                style={[
                  styles.otpInput,
                  { color: colors.text, textAlign: "center" },
                ]}
                placeholder={isRTL ? "0000" : "0000"}
                placeholderTextColor={colors.textMuted}
                value={otpCode}
                onChangeText={(text) => {
                  // Only allow numbers, max 4 digits
                  const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
                  setOtpCode(cleaned);
                }}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
              />
            </View>
            <Pressable
              onPress={handleVerifyOtp}
              disabled={otpCode.length !== 4}
              style={[
                styles.verifyOtpButton,
                {
                  backgroundColor: otpCode.length === 4 ? colors.primary : colors.textMuted,
                  opacity: otpCode.length === 4 ? 1 : 0.6,
                },
              ]}
            >
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.verifyOtpButtonText}>
                {isRTL ? "تحقق" : "Verify"}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {isVerified && (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.continueContainer}>
            <Pressable
              onPress={handleContinue}
              disabled={loading}
              style={[
                styles.continueButton,
                {
                  backgroundColor: loading ? colors.textMuted : colors.primary,
                },
              ]}
            >
              <Text style={styles.continueButtonText}>
                {loading
                  ? (isRTL ? "جاري إنشاء الحساب..." : "Creating Account...")
                  : (isRTL ? "متابعة" : "Continue")}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
          {/* Header */}
          <Animated.View
            entering={SlideInRight.delay(100)}
            style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          >
            <Pressable
              onPress={() => {
                if (method) {
                  setMethod(null);
                  setPhoneNumber("");
                  setOtpCode("");
                  setCodeSent(false);
                  setIsVerified(false);
                } else {
                  // Check if we can go back, otherwise navigate to home
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/");
                  }
                }
              }}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
            >
              {isRTL ? (
                <ArrowRight size={22} color={colors.text} />
              ) : (
                <ArrowLeft size={22} color={colors.text} />
              )}
            </Pressable>

            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isRTL ? "التسجيل" : "Sign Up"}
            </Text>

            <View style={styles.headerSpacer} />
          </Animated.View>

          {/* Content */}
          {!method ? renderMethodSelection() : method === "phone" ? renderPhoneEntry() : null}
        </View>
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

  // Method Selection
  methodSelectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  methodSelectionHeader: {
    alignItems: "center",
    marginBottom: 50,
  },
  methodSelectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  methodSelectionSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  methodCards: {
    gap: 20,
  },
  methodCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1.5,
  },
  methodIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  methodCardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  methodCardDesc: {
    fontSize: 14,
    textAlign: "center",
  },

  // Phone Entry
  phoneEntryContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  phoneEntryHeader: {
    marginBottom: 40,
  },
  phoneEntryTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  phoneEntrySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  phoneInputContainer: {
    gap: 20,
  },
  phoneInputWrapper: {
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  phoneIconBox: {
    padding: 10,
    borderRadius: 10,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#D83A3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  continueContainer: {
    marginTop: 10,
  },
  continueButton: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#D83A3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  otpContainer: {
    gap: 12,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  otpHint: {
    fontSize: 13,
    marginBottom: 4,
  },
  otpInputWrapper: {
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  otpIconBox: {
    padding: 10,
    borderRadius: 10,
  },
  otpInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 8,
    paddingVertical: 4,
  },
  verifyOtpButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: "#D83A3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyOtpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
