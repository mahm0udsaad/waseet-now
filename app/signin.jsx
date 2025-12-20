import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { useTranslation } from "@/utils/i18n/store";
import { supabase } from "@/utils/supabase/client";
import { useTheme } from "@/utils/theme/store";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Chrome,
  Phone,
  Shield
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Complete the OAuth session in the browser
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation values
  const verifyScale = useSharedValue(1);

  // Debug: Log initial URL on mount
  useEffect(() => {
    const getInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      console.log('Initial URL:', initialUrl);
    };
    getInitialUrl();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Create the redirect URL - works for both Expo Go and standalone builds
      // const redirectUrl = Linking.createURL('auth/callback');
      // console.log('Redirect URL:', redirectUrl);

      // Start OAuth flow with Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open auth session in browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'https://jsiqigrrvuhazgseqscq.supabase.co/auth/v1/callback'
        );
        
        console.log('Auth result:', result.type);
        
        if (result.type === 'success') {
          // Check for session
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) throw sessionError;
          
          if (sessionData?.session) {
            router.replace("/(tabs)");
          } else {
             // If getSession doesn't return a session immediately, we might need to handle the URL manually if it's returned
             // But the user instructions rely on getSession working.
             // We'll add a check for tokens in result.url just in case, similar to before but simpler
             if (result.url) {
                const url = result.url;
                const hashIndex = url.indexOf('#');
                if (hashIndex !== -1) {
                  const fragment = url.substring(hashIndex + 1);
                  const params = new URLSearchParams(fragment);
                  const accessToken = params.get('access_token');
                  const refreshToken = params.get('refresh_token');
                  
                  if (accessToken && refreshToken) {
                    const { error: setSessionError } = await supabase.auth.setSession({
                      access_token: accessToken,
                      refresh_token: refreshToken,
                    });
                    if (setSessionError) throw setSessionError;
                    router.replace("/(tabs)");
                    return;
                  }
                }
             }

             // If still no session
             const { data: refreshedSession } = await supabase.auth.getSession();
             if (refreshedSession?.session) {
                router.replace("/(tabs)");
             } else {
                throw new Error(isRTL ? 'فشل الحصول على رموز المصادقة' : 'Failed to get authentication tokens');
             }
          }
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          Alert.alert(
            isRTL ? "تم الإلغاء" : "Cancelled",
            isRTL ? "تم إلغاء تسجيل الدخول مع جوجل" : "Google sign in was cancelled"
          );
        }
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        error.message || (isRTL ? "فشل تسجيل الدخول مع جوجل" : "Google sign in failed")
      );
    } finally {
      setLoading(false);
    }
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

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+966${phoneNumber}`,
      });

      if (error) throw error;

      setIsVerifying(false);
      setCodeSent(true);
    } catch (error) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        error.message || (isRTL ? "فشل إرسال رمز التحقق" : "Failed to send verification code")
      );
      setIsVerifying(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert(
        isRTL ? "تنبيه" : "Alert",
        isRTL ? "يرجى إدخال رمز التحقق المكون من 6 أرقام" : "Please enter 6-digit verification code"
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+966${phoneNumber}`,
        token: otpCode,
        type: "sms",
      });

      if (error) throw error;

      setIsVerified(true);
      setCodeSent(false);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        error.message || (isRTL ? "رمز التحقق غير صحيح" : "Invalid verification code")
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: verifyScale.value }],
  }));

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const renderPhoneInput = () => (
    <Animated.View entering={FadeInUp.delay(300)} style={styles.contentContainer}>
      {/* Header Text */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isRTL ? "تسجيل الدخول" : "Sign In"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isRTL ? "أدخل رقم الجوال للمتابعة" : "Enter your phone number to continue"}
        </Text>
      </View>

      {/* Phone Input */}
      <View style={styles.inputGroup}>
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
          <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
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
              const cleaned = text.replace(/[^0-9]/g, "");
              setPhoneNumber(cleaned);
            }}
            keyboardType="phone-pad"
            maxLength={9}
          />
        </View>

        <Animated.View style={verifyAnimatedStyle}>
          <Pressable
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
            {!isVerifying && <ArrowLeft size={20} color="#fff" style={{ transform: [{ rotate: isRTL ? '0deg' : '180deg' }] }} />}
          </Pressable>
        </Animated.View>
      </View>

      {/* Divider */}
      <View style={[styles.dividerContainer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
          {isRTL ? "أو" : "Or"}
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Google Button */}
      <Pressable
        onPress={handleGoogleSignIn}
        disabled={loading}
        style={({ pressed }) => [
          styles.secondaryButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <Chrome size={24} color={colors.text} />
        <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
          {isRTL ? "المتابعة باستخدام جوجل" : "Continue with Google"}
        </Text>
      </Pressable>

      {/* Sign Up Link */}
      <View style={[styles.footerLink, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {isRTL ? "ليس لديك حساب؟ " : "Don't have an account? "}
        </Text>
        <Pressable onPress={() => router.push("/register")}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {isRTL ? "سجل الآن" : "Sign Up"}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderOtpInput = () => (
    <Animated.View entering={FadeInUp.delay(200)} style={styles.contentContainer}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isRTL ? "تحقق من الرقم" : "Verify Number"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isRTL ? `تم إرسال الرمز إلى +966${phoneNumber}` : `Code sent to +966${phoneNumber}`}
        </Text>
      </View>

      <View style={styles.inputGroup}>
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
          <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
            <Shield size={20} color={colors.primary} />
          </View>
          <TextInput
            style={[
              styles.otpInput,
              { color: colors.text, textAlign: "center" },
            ]}
            placeholder="000000"
            placeholderTextColor={colors.textMuted}
            value={otpCode}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
              setOtpCode(cleaned);
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        <Pressable
          onPress={handleVerifyOtp}
          disabled={otpCode.length !== 6 || loading}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: otpCode.length === 6 && !loading ? colors.primary : colors.textMuted,
              opacity: otpCode.length === 6 && !loading ? 1 : 0.6,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <CheckCircle size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {loading ? (isRTL ? "جاري التحقق..." : "Verifying...") : (isRTL ? "تحقق" : "Verify")}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setCodeSent(false);
            setOtpCode("");
          }}
          style={styles.changePhoneButton}
        >
          <Text style={[styles.changePhoneText, { color: colors.primary }]}>
            {isRTL ? "تغيير رقم الجوال" : "Change Phone Number"}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
          {/* Back Button (Only when code sent) */}
          <View style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {codeSent ? (
              <Pressable
                onPress={() => {
                  setCodeSent(false);
                  setOtpCode("");
                }}
                style={[styles.backButton, { backgroundColor: colors.surface }]}
              >
                {isRTL ? (
                  <ArrowRight size={22} color={colors.text} />
                ) : (
                  <ArrowLeft size={22} color={colors.text} />
                )}
              </Pressable>
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>

          {codeSent ? renderOtpInput() : renderPhoneInput()}
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
    paddingHorizontal: 24,
  },
  header: {
    paddingVertical: 16,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
  },
  headerSpacer: {
    height: 44,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 20,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  textContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputGroup: {
    gap: 20,
    marginBottom: 32,
  },
  phoneInputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    height: 60,
  },
  iconBox: {
    padding: 8,
    borderRadius: 8,
  },
  countryCode: {
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    height: '100%',
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  dividerContainer: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 32,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footerLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 'auto',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
  },
  otpInputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    height: 60,
  },
  otpInput: {
    flex: 1,
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: "bold",
  },
  changePhoneButton: {
    alignItems: 'center',
    padding: 10,
  },
  changePhoneText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
