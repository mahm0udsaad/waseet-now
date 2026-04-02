import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { useLanguage } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import {
  generateFallbackDisplayName,
  getMyProfile,
  uploadMyAvatarFromBase64,
  upsertMyProfile,
} from "@/utils/supabase/profile";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Globe,
  Mail,
  Moon,
  Sun,
  User,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export default function CompleteProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, theme, setTheme } = useTheme();
  const { language, setLanguage, isRTL } = useLanguage();

  const scrollRef = useRef(null);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);

  const [step, setStep] = useState(0); // 0: profile details, 1: preferences
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedTheme, setSelectedTheme] = useState(theme);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { profile } = await getMyProfile();
        if (!mounted) return;
        setDisplayName(profile?.display_name ?? "");
        setEmail(profile?.email ?? "");
        setAvatarUrl(profile?.avatar_url ?? null);
        setSelectedLanguage(profile?.language ?? language);
        setSelectedTheme(profile?.theme ?? theme);
      } catch (e) {
        // If anything fails, we still allow user to continue locally
        if (__DEV__) console.warn("Failed to load profile for completion:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [language, theme]);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const canContinue = useMemo(() => {
    if (step === 0) {
      const nameOk = String(displayName || "").trim().length >= 2 || String(displayName || "").trim().length === 0;
      const emailOk = isValidEmail(email);
      return nameOk && emailOk && !avatarUploading;
    }
    return true;
  }, [step, displayName, email, avatarUploading]);

  const title = step === 0
    ? (isRTL ? "أكمل بيانات حسابك" : "Complete your profile")
    : (isRTL ? "الإعدادات" : "Preferences");

  const subtitle = step === 0
    ? (isRTL ? "أضف صورة واسم وبريد (اختياري) لإكمال التسجيل" : "Add a photo, name and email (optional) to finish setup")
    : (isRTL ? "اختر اللغة والمظهر الذي تفضله" : "Pick your preferred language and theme");

  // Returns true if the app restarted (RTL/LTR flip in production).
  const applyPrefsLocally = async () => {
    const { restarted } = await setLanguage(selectedLanguage);
    if (restarted) return true;
    await setTheme(selectedTheme);
    return false;
  };

  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          isRTL ? "تنبيه" : "Alert",
          isRTL ? "الرجاء السماح بالوصول للصور لاختيار صورة" : "Please allow photo access to pick an image"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      const base64 = asset?.base64;
      if (!base64) {
        Alert.alert(isRTL ? "خطأ" : "Error", isRTL ? "تعذر قراءة الصورة" : "Could not read image");
        return;
      }

      setAvatarUploading(true);
      const mimeType = asset?.mimeType || "image/jpeg";
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
      const { publicUrl } = await uploadMyAvatarFromBase64(base64, mimeType, ext);
      setAvatarUrl(publicUrl);
      setAvatarUploading(false);
    } catch (e) {
      setAvatarUploading(false);
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        e?.message || (isRTL ? "فشل رفع الصورة" : "Failed to upload image")
      );
    }
  };

  const finish = async (mode) => {
    // mode: 'save' | 'skip'
    if (saving) return;

    const safeName = String(displayName || "").trim() || generateFallbackDisplayName();
    const safeEmail = String(email || "").trim() || null;

    if (!isValidEmail(safeEmail || "")) {
      Alert.alert(isRTL ? "تنبيه" : "Alert", isRTL ? "البريد الإلكتروني غير صحيح" : "Invalid email address");
      return;
    }

    setSaving(true);
    try {
      // Persist profile BEFORE applying language — if the language change
      // triggers an app restart the DB write must already be done.
      await upsertMyProfile({
        display_name: safeName,
        email: safeEmail,
        avatar_url: avatarUrl,
        language: selectedLanguage,
        theme: selectedTheme,
        is_profile_complete: true,
      });

      const restarted = await applyPrefsLocally();
      if (restarted) return; // app is reloading

      setSuccess(true);
      setSaving(false);
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 900);
    } catch (e) {
      setSaving(false);
      Alert.alert(isRTL ? "خطأ" : "Error", e?.message || (isRTL ? "فشل حفظ البيانات" : "Failed to save profile"));
    }
  };

  const skipText = isRTL ? "تخطي الآن" : "Skip for now";
  const nextText = isRTL ? "التالي" : "Next";
  const backText = isRTL ? "رجوع" : "Back";
  const saveText = isRTL ? "إنهاء" : "Finish";

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar style={colors.statusBar} />
        <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {isRTL ? "جاري التحضير..." : "Getting things ready..."}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.main, { paddingTop: insets.top + 8 }]}>
            <View style={styles.header}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  if (step === 0) {
                    // If user came here and wants out, allow skip with defaults
                    finish("skip");
                  } else {
                    setStep(0);
                  }
                }}
                style={[styles.headerBtn, { backgroundColor: colors.surface }]}
              >
                <ArrowRight size={20} color={colors.text} />
              </Pressable>

              <View style={styles.progress}>
                <View style={[styles.dot, { backgroundColor: step === 0 ? colors.primary : colors.border }]} />
                <View style={[styles.dot, { backgroundColor: step === 1 ? colors.primary : colors.border }]} />
              </View>

              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  finish("skip");
                }}
                style={styles.skipBtn}
                disabled={saving || avatarUploading}
              >
                <Text style={[styles.skipText, { color: colors.textSecondary, opacity: saving || avatarUploading ? 0.5 : 1 }]}>
                  {skipText}
                </Text>
              </Pressable>
            </View>

            {/* Scrollable content so inputs stay visible above keyboard */}
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 24 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

                {step === 0 ? (
                  <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <Pressable
                  onPress={pickAvatar}
                  style={[styles.avatarWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                      <User size={34} color={colors.primary} />
                    </View>
                  )}
                  <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
                    <Camera size={14} color="#fff" />
                  </View>
                </Pressable>
                {avatarUploading && (
                  <Text style={[styles.helper, { color: colors.textMuted }]}>
                    {isRTL ? "جاري رفع الصورة..." : "Uploading image..."}
                  </Text>
                )}

                <View
                  style={[
                    styles.field,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.fieldIcon, { backgroundColor: colors.primaryLight }]}>
                    <User size={18} color={colors.primary} />
                  </View>
                  <TextInput
                    ref={nameInputRef}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={isRTL ? "الاسم (اختياري)" : "Name (optional)"}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.text, textAlign: 'auto', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                    autoCapitalize="words"
                    textContentType="name"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => emailInputRef.current?.focus?.()}
                    selectionColor={colors.primary}
                  />
                </View>

                <View
                  style={[
                    styles.field,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.fieldIcon, { backgroundColor: colors.primaryLight }]}>
                    <Mail size={18} color={colors.primary} />
                  </View>
                  <TextInput
                    ref={emailInputRef}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={isRTL ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.text, textAlign: 'auto', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={Keyboard.dismiss}
                    selectionColor={colors.primary}
                  />
                </View>

                {!!email && !isValidEmail(email) && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {isRTL ? "البريد الإلكتروني غير صحيح" : "Email looks invalid"}
                  </Text>
                )}
                  </View>
                ) : (
                  <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionTitleRow}>
                  <Globe size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {isRTL ? "اللغة" : "Language"}
                  </Text>
                </View>

                <View style={styles.optionRow}>
                  <Pressable
                    onPress={() => setSelectedLanguage("ar")}
                    style={[
                      styles.option,
                      {
                        backgroundColor: colors.surface,
                        borderColor: selectedLanguage === "ar" ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>العربية</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedLanguage("en")}
                    style={[
                      styles.option,
                      {
                        backgroundColor: colors.surface,
                        borderColor: selectedLanguage === "en" ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>English</Text>
                  </Pressable>
                </View>

                <View style={[styles.sectionTitleRow, { marginTop: 16 }]}>
                  {selectedTheme === "dark" ? (
                    <Moon size={18} color={colors.primary} />
                  ) : (
                    <Sun size={18} color={colors.primary} />
                  )}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {isRTL ? "المظهر" : "Theme"}
                  </Text>
                </View>

                <View style={styles.optionRow}>
                  <Pressable
                    onPress={() => setSelectedTheme("dark")}
                    style={[
                      styles.option,
                      {
                        backgroundColor: colors.surface,
                        borderColor: selectedTheme === "dark" ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {isRTL ? "داكن" : "Dark"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedTheme("light")}
                    style={[
                      styles.option,
                      {
                        backgroundColor: colors.surface,
                        borderColor: selectedTheme === "light" ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {isRTL ? "فاتح" : "Light"}
                    </Text>
                  </Pressable>
                </View>

                <Text style={[styles.helper, { color: colors.textMuted }]}>
                  {isRTL ? "يمكنك تغيير هذه الإعدادات لاحقاً من الملف الشخصي" : "You can change these later from Profile"}
                </Text>
                  </View>
                )}
              </View>
              {/* Space so the last field isn't hidden behind the footer */}
              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky footer (moves up with keyboard thanks to KeyboardAvoidingAnimatedView padding) */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: 'transparent' }]}>
              {step === 1 && (
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setStep(0);
                  }}
                  style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  disabled={saving}
                >
                  <Text style={[styles.secondaryText, { color: colors.text }]}>
                    {backText}
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  if (step === 0) setStep(1);
                  else finish("save");
                }}
                disabled={!canContinue || saving}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: canContinue && !saving ? colors.primary : colors.textMuted,
                    opacity: canContinue && !saving ? 1 : 0.6,
                  },
                ]}
              >
                <Text style={styles.primaryText}>
                  {saving ? (isRTL ? "جاري الحفظ..." : "Saving...") : (step === 0 ? nextText : saveText)}
                </Text>
                {!saving && (step === 0 ? <ArrowLeft size={18} color="#fff" /> : null)}
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>

        {success && (
          <View style={[styles.successOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[styles.successCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.successIcon, { backgroundColor: colors.primaryLight }]}>
                <CheckCircle2 size={46} color={colors.success} />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>
                {isRTL ? "تم إعداد حسابك" : "You're all set"}
              </Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                {isRTL ? "جاري تحويلك..." : "Redirecting..."}
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
  main: { flex: 1, paddingHorizontal: 20 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 15, fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  headerBtn: { padding: 10, borderRadius: 12 },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 8 },
  skipText: { fontSize: 14, fontWeight: "700" },
  progress: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },

  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { alignItems: "center", paddingTop: 14 },
  title: { fontSize: 26, fontWeight: "900", textAlign: "center" },
  subtitle: { fontSize: 15, marginTop: 8, textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },

  card: {
    width: "100%",
    maxWidth: 520,
    marginTop: 18,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },

  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignSelf: "center",
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  avatarBadge: {
    position: "absolute",
    end: 6,
    bottom: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },

  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 56,
    gap: 10,
  },
  fieldIcon: { padding: 10, borderRadius: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: "600" },
  errorText: { fontSize: 13, fontWeight: "700", marginTop: -4 },
  helper: { fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 4 },

  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  optionRow: { flexDirection: "row", gap: 10 },
  option: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { fontSize: 15, fontWeight: "800" },

  footer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  secondaryText: { fontSize: 15, fontWeight: "800" },
  primaryBtn: {
    flex: 2,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "900" },

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
