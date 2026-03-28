import { AppScrollView } from "@/components/layout";
import CountryPickerModal from "@/components/CountryPickerModal";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { COUNTRIES, getCountryName } from "@/utils/countries";
import { useTranslation, getRTLTextAlign } from "@/utils/i18n/store";
import { supabase } from "@/utils/supabase/client";
import { useTheme } from "@/utils/theme/store";
import { Spacing } from "@/constants/theme";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Phone,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const { isRTL, rowDirection } = useTranslation();

  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // default: Saudi Arabia
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Animation values
  const verifyScale = useSharedValue(1);
  const logoScale = useSharedValue(1);

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
    verifyScale.value = withSpring(0.95, {}, () => {
      verifyScale.value = withSpring(1);
    });

    try {
      const fullPhone = `${selectedCountry.dialCode}${phoneNumber}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) throw error;

      setIsVerifying(false);
      router.push({ pathname: "/otp", params: { phone: fullPhone, flow: "signin" } });
    } catch (error) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        error.message || (isRTL ? "فشل إرسال رمز التحقق" : "Failed to send verification code")
      );
      setIsVerifying(false);
    }
  };

  const verifyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: verifyScale.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const renderPhoneInput = () => (
    <Animated.View entering={FadeInUp.delay(300)} style={styles.contentContainer}>
      {/* Logo */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.logoSection, logoAnimatedStyle]}>
        <View style={[styles.logoCircle, { backgroundColor: "#FFFFFF", shadowColor: colors.primary }]}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>
        <Text style={[styles.logoText, { color: colors.text }]}>
          {isRTL ? "وسيط الان" : "Waseet Alan"}
        </Text>
      </Animated.View>

      {/* Header Text */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isRTL ? "مرحباً بعودتك" : "Welcome Back"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isRTL ? "سجل دخولك للمتابعة" : "Sign in to continue"}
        </Text>
      </View>

      {/* Phone Input */}
      <Animated.View entering={FadeInUp.delay(600)} style={styles.inputGroup}>
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
          <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
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
            testID="signin-phone-input"
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
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleSendCode();
            }}
            selectionColor={colors.primary}
          />
        </View>

        <Animated.View style={verifyAnimatedStyle}>
          <Pressable
            testID="signin-continue-btn"
            onPress={handleSendCode}
            disabled={isVerifying || !phoneNumber}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                opacity: (isVerifying || !phoneNumber) ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isVerifying
                ? (isRTL ? "جاري الإرسال..." : "Sending...")
                : (isRTL ? "متابعة برقم الجوال" : "Continue with Phone")}
            </Text>
            {!isVerifying && (
              isRTL 
                ? <ArrowLeft size={20} color="#fff" />
                : <ArrowRight size={20} color="#fff" />
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* Sign Up Link */}
      <Animated.View entering={FadeIn.delay(800)} style={[styles.footerLink, { flexDirection: rowDirection }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {isRTL ? "ليس لديك حساب؟ " : "Don't have an account? "}
        </Text>
        <Pressable onPress={() => router.push("/register")}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {isRTL ? "سجل الآن" : "Sign Up"}
          </Text>
        </Pressable>
      </Animated.View>

      {__DEV__ && (
        <Pressable
          testID="signin-preview-onboarding-btn"
          onPress={() => router.push("/onboarding")}
          style={styles.previewLinkContainer}
        >
          <Text style={[styles.previewLinkText, { color: colors.textSecondary }]}>
            {isRTL ? "معاينة شاشة الترحيب" : "Preview onboarding"}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
            <AppScrollView
              contentWidth={Math.min(width - 32, 520)}
              topPadding={Spacing.l}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            >
              {renderPhoneInput()}
              <View style={{ height: 24 }} />
            </AppScrollView>
          </View>
        </TouchableWithoutFeedback>
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
    paddingHorizontal: 24,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 10,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
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
    marginBottom: 12,
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Verify Icon Section
  verifyIconSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  verifyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },

  inputGroup: {
    gap: 16,
    marginBottom: 32,
    position: "relative",
  },
  phoneInputWrapper: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    height: 60,
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
  iconBox: {
    padding: 8,
    borderRadius: 8,
  },
  countryCode: {
    fontSize: 17,
    fontWeight: "600",
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 17,
    height: '100%',
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },

  footerLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 'auto',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 15,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "700",
  },
  previewLinkContainer: {
    alignItems: "center",
    marginTop: -24,
    marginBottom: 28,
  },
  previewLinkText: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
