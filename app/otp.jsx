import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { useTranslation } from "@/utils/i18n/store";
import { supabase } from "@/utils/supabase/client";
import { useTheme } from "@/utils/theme/store";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, Shield } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function maskPhone(phone) {
  if (!phone || typeof phone !== "string") return "";
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return trimmed;
  // Keep country code prefix (+XXX) and last 2 digits
  const last = trimmed.slice(-2);
  const prefix = trimmed.startsWith("+") ? trimmed.slice(0, Math.min(4, trimmed.length)) : trimmed.slice(0, 2);
  return `${prefix}••• ••• ${last}`;
}

function OtpBoxes({ value, onPress, colors }) {
  const digits = String(value || "").split("").slice(0, 6);
  return (
    <Pressable testID="otp-boxes" onPress={onPress} style={styles.otpBoxesRow}>
      {Array.from({ length: 6 }).map((_, idx) => {
        const digit = digits[idx] || "";
        const isFilled = digit.length > 0;
        return (
          <View
            key={idx}
            style={[
              styles.otpBox,
              {
                backgroundColor: colors.surface,
                borderColor: isFilled ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.otpBoxText, { color: colors.text }]}>{digit}</Text>
          </View>
        );
      })}
    </Pressable>
  );
}

export default function OtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isRTL, rowDirection } = useTranslation();
  const params = useLocalSearchParams();

  const phone = useMemo(() => {
    const raw = typeof params.phone === "string" ? params.phone : "";
    return raw.trim();
  }, [params.phone]);

  const flow = useMemo(() => {
    const raw = typeof params.flow === "string" ? params.flow : "signin";
    return raw === "signup" ? "signup" : "signin";
  }, [params.flow]);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [cooldown, setCooldown] = useState(30);
  const cooldownRef = useRef(null);
  const hiddenInputRef = useRef(null);

  useEffect(() => {
    setCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, []);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const title = flow === "signup" ? (isRTL ? "تأكيد رقم الجوال" : "Confirm your number") : (isRTL ? "تسجيل الدخول" : "Sign in");
  const subtitle = isRTL
    ? `أدخل رمز التحقق المكون من 6 أرقام المرسل إلى ${maskPhone(phone)}`
    : `Enter the 6-digit code sent to ${maskPhone(phone)}`;

  const focusOtp = () => hiddenInputRef.current?.focus?.();

  const handleVerify = async (code) => {
    if (!phone) {
      Alert.alert(isRTL ? "خطأ" : "Error", isRTL ? "رقم الجوال غير موجود" : "Missing phone number");
      router.back();
      return;
    }
    if (!code || String(code).length !== 6) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });
      if (error) throw error;

      setSuccess(true);
      setLoading(false);

      // Let the success state render, then hand off routing to the root guard.
      setTimeout(async () => {
        router.replace("/(tabs)");
      }, 900);
    } catch (error) {
      setLoading(false);
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        error?.message || (isRTL ? "رمز التحقق غير صحيح" : "Invalid verification code")
      );
      setOtp("");
      setTimeout(() => focusOtp(), 150);
    }
  };

  const handleResend = async () => {
    if (!phone || cooldown > 0) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setLoading(false);

      setCooldown(30);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      cooldownRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current);
            cooldownRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setLoading(false);
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        error?.message || (isRTL ? "فشل إعادة إرسال الرمز" : "Failed to resend code")
      );
    }
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <View style={[styles.mainContainer, { paddingTop: insets.top + 10 }]}>
          <View style={[styles.header, { flexDirection: rowDirection }]}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
            >
              {isRTL ? <ArrowRight size={22} color={colors.text} /> : <ArrowLeft size={22} color={colors.text} />}
            </Pressable>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <Shield size={40} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

            {/* Hidden input to capture digits */}
            <TextInput
              testID="otp-input"
              ref={hiddenInputRef}
              value={otp}
              onChangeText={(text) => {
                const cleaned = String(text || "").replace(/[^0-9]/g, "").slice(0, 6);
                setOtp(cleaned);
                if (cleaned.length === 6) handleVerify(cleaned);
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={styles.hiddenInput}
            />

            <View style={styles.otpArea}>
              <OtpBoxes value={otp} onPress={focusOtp} colors={colors} />

              <Pressable
                onPress={() => handleVerify(otp)}
                disabled={otp.length !== 6 || loading || success}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: otp.length === 6 && !loading && !success ? colors.primary : colors.textMuted,
                    opacity: otp.length === 6 && !loading && !success ? 1 : 0.6,
                  },
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? (isRTL ? "جاري التحقق..." : "Verifying...") : (isRTL ? "تأكيد" : "Verify")}
                </Text>
              </Pressable>

              <View style={[styles.resendRow, { flexDirection: rowDirection }]}>
                <Text style={[styles.resendHint, { color: colors.textSecondary }]}>
                  {isRTL ? "لم يصلك الرمز؟" : "Didn't get a code?"}
                </Text>
                <Pressable onPress={handleResend} disabled={cooldown > 0 || loading || success}>
                  <View style={[styles.resendBtn, { opacity: cooldown > 0 || loading || success ? 0.5 : 1 }]}>
                    <RefreshCw size={16} color={colors.primary} />
                    <Text style={[styles.resendText, { color: colors.primary }]}>
                      {cooldown > 0
                        ? (isRTL ? `إعادة الإرسال خلال ${cooldown}ث` : `Resend in ${cooldown}s`)
                        : (isRTL ? "إعادة إرسال" : "Resend")}
                    </Text>
                  </View>
                </Pressable>
              </View>

              <Pressable
                onPress={() => router.back()}
                disabled={loading || success}
                style={styles.changePhoneBtn}
              >
                <Text style={[styles.changePhoneText, { color: colors.primary }]}>
                  {isRTL ? "تغيير رقم الجوال" : "Change phone number"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {success && (
          <View style={[styles.successOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[styles.successCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.successIcon, { backgroundColor: colors.primaryLight }]}>
                <CheckCircle2 size={46} color={colors.success} />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>
                {flow === "signup"
                  ? (isRTL ? "تم إنشاء الحساب بنجاح" : "Account created")
                  : (isRTL ? "تم تسجيل الدخول بنجاح" : "Signed in")}
              </Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                {isRTL ? "جاري تحويلك الآن..." : "Redirecting you now..."}
              </Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingAnimatedView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContainer: { flex: 1, paddingHorizontal: 20 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
  },
  headerSpacer: { width: 44 },

  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 24,
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 22,
    paddingHorizontal: 10,
  },

  hiddenInput: {
    position: "absolute",
    opacity: 0.01,
    width: "100%",
    height: 50,
    color: "transparent",
    caretColor: "transparent",
  },

  otpArea: {
    width: "100%",
    maxWidth: 520,
    alignItems: "center",
  },
  otpBoxesRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxText: {
    fontSize: 20,
    fontWeight: "800",
  },

  primaryButton: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  resendRow: {
    marginTop: 14,
    alignItems: "center",
    gap: 8,
  },
  resendHint: { fontSize: 14, fontWeight: "500" },
  resendBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 8 },
  resendText: { fontSize: 14, fontWeight: "800" },

  changePhoneBtn: { paddingVertical: 8, marginTop: 4 },
  changePhoneText: { fontSize: 15, fontWeight: "700" },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },
  successIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
