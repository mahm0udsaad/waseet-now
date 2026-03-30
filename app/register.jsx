import CountryPickerModal from "@/components/CountryPickerModal";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { COUNTRIES, getCountryName } from "@/utils/countries";
import { useTranslation, getRTLTextAlign } from "@/utils/i18n/store";
import { supabase } from "@/utils/supabase/client";
import { useTheme } from "@/utils/theme/store";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Phone,
  Send,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isRTL, rowDirection } = useTranslation();

  const [method, setMethod] = useState(null); // 'phone'
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // default: Saudi Arabia
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const handleSelectMethod = (selectedMethod) => {
    if (selectedMethod === "phone") {
      setMethod("phone");
    }
  };

  const handleSendCode = async () => {
    const isValidLength =
      phoneNumber.length >= selectedCountry.minLength &&
      phoneNumber.length <= selectedCountry.maxLength;

    if (!phoneNumber || !isValidLength) {
      Alert.alert(
        isRTL ? "تنبيه" : "Alert",
        isRTL
          ? `يرجى إدخال رقم جوال صحيح ل${getCountryName(selectedCountry, isRTL)}`
          : `Please enter a valid phone number for ${getCountryName(selectedCountry, isRTL)}`
      );
      return;
    }

    setIsVerifying(true);

    try {
      const fullPhone = `${selectedCountry.dialCode}${phoneNumber}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });
      if (error) throw error;
      setIsVerifying(false);
      router.push({ pathname: "/otp", params: { phone: fullPhone, flow: "signup" } });
    } catch (error) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        error.message || (isRTL ? "فشل إرسال رمز التحقق" : "Failed to send verification code")
      );
      setIsVerifying(false);
    }
  };

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  // Method Selection Screen
  const renderMethodSelection = () => (
    <View style={styles.methodSelectionContainer}>
      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={[styles.logoCircle, { backgroundColor: "#FFFFFF", shadowColor: colors.primary }]}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>
      </View>

      <View style={styles.methodSelectionHeader}>
        <Text style={[styles.methodSelectionTitle, { color: colors.text }]}>
          {isRTL ? "إنشاء حساب" : "Create Account"}
        </Text>
        <Text style={[styles.methodSelectionSubtitle, { color: colors.textSecondary }]}>
          {isRTL ? "اختر طريقة التسجيل المفضلة" : "Choose your preferred sign up method"}
        </Text>
      </View>

      <View style={styles.methodCards}>
        {/* Phone Number Option */}
        <View>
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
              {isRTL ? "سجل باستخدام رقم جوالك" : "Sign up with your phone"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Sign In Link */}
      <View style={[styles.footerLink, { flexDirection: rowDirection }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {isRTL ? "لديك حساب بالفعل؟ " : "Already have an account? "}
        </Text>
        <Pressable onPress={() => router.push("/signin")}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {isRTL ? "تسجيل الدخول" : "Sign In"}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // Phone Number Entry Screen
  const renderPhoneEntry = () => (
    <View style={styles.phoneEntryContainer}>
      <View style={styles.phoneEntryHeader}>
        <View style={[styles.phoneIconCircle, { backgroundColor: colors.primaryLight }]}>
          <Phone size={36} color={colors.primary} />
        </View>
        <Text style={[styles.phoneEntryTitle, { color: colors.text }]}>
          {isRTL ? "أدخل رقم الجوال" : "Enter Phone Number"}
        </Text>
        <Text style={[styles.phoneEntrySubtitle, { color: colors.textSecondary }]}>
          {isRTL ? "سنرسل لك رمز التحقق عبر الرسائل النصية" : "We'll send you a verification code via SMS"}
        </Text>
      </View>

      <View style={styles.phoneInputContainer}>
        <CountryPickerModal
          visible={showCountryPicker}
          onClose={() => setShowCountryPicker(false)}
          onSelect={(country) => {
            setSelectedCountry(country);
            setPhoneNumber("");
          }}
          selectedCode={selectedCountry.code}
        />

        <View
          style={[
            styles.phoneInputWrapper,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              flexDirection: rowDirection,
            },
          ]}
        >
          <View style={[styles.phoneIconBox, { backgroundColor: colors.primaryLight }]}>
            <Phone size={20} color={colors.primary} />
          </View>

          {/* Country Selector */}
          <Pressable
            onPress={() => setShowCountryPicker(true)}
            style={({ pressed }) => [
              styles.countrySelector,
              {
                backgroundColor: pressed ? colors.surfaceSecondary : "transparent",
                flexDirection: rowDirection,
              },
            ]}
          >
            <Text style={[styles.countryFlag, { marginHorizontal: 4 }]}>{selectedCountry.flag}</Text>
            <Text style={[styles.countryCode, { color: colors.text }]}>{selectedCountry.dialCode}</Text>
            <ChevronDown size={16} color={colors.textSecondary} style={{ marginHorizontal: 4 }} />
          </Pressable>

          <TextInput
            style={[
              styles.phoneInput,
              { color: colors.text, textAlign: getRTLTextAlign(isRTL) },
            ]}
            placeholder={"XXXXXXXXXX"}
            placeholderTextColor={colors.textMuted}
            value={phoneNumber}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "").replace(/^0+/, "");
              setPhoneNumber(cleaned);
            }}
            keyboardType="phone-pad"
            maxLength={selectedCountry.maxLength}
            autoFocus
          />
        </View>

        {phoneNumber.length >= selectedCountry.minLength && (
          <View>
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
          </View>
        )}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: rowDirection }]}>
            <Pressable
              onPress={() => {
                if (method) {
                  setMethod(null);
                  setPhoneNumber("");
                } else {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/onboarding");
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
          </View>

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

  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImage: {
    width: 50,
    height: 50,
  },

  // Method Selection
  methodSelectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  methodSelectionHeader: {
    alignItems: "center",
    marginBottom: 40,
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
    gap: 16,
  },
  methodCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
  },
  methodIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  methodCardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  methodCardDesc: {
    fontSize: 14,
    textAlign: "center",
  },

  // Footer Link
  footerLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "700",
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Phone Entry
  phoneEntryContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  phoneEntryHeader: {
    marginBottom: 36,
    alignItems: 'center',
  },
  phoneIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    position: "relative",
  },
  phoneInputWrapper: {
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    padding: 16,
    gap: 12,
    position: "relative",
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  countryFlag: {
    fontSize: 20,
  },
  phoneIconBox: {
    padding: 10,
    borderRadius: 10,
  },
  countryCode: {
    fontSize: 17,
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    fontSize: 17,
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
  otpContainer: {
    gap: 12,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
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
    fontSize: 22,
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
