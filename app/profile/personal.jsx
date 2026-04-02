import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { useTranslation } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { getMyProfile, uploadMyAvatarFromBase64, upsertMyProfile } from "@/utils/supabase/profile";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Camera, Mail, Phone, Save, User } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
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
import FadeInView from "@/components/ui/FadeInView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/utils/supabase/client";

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export default function PersonalInformationScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();

  const nameRef = useRef(null);
  const emailRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) throw new Error("Not authenticated");
        if (mounted) setPhone(user.phone || "");

        const { profile } = await getMyProfile();
        if (!mounted) return;
        setDisplayName(profile?.display_name ?? "");
        setEmail(profile?.email ?? "");
        setAvatarUrl(profile?.avatar_url ?? null);
      } catch (e) {
        if (__DEV__) console.warn("Failed to load personal info:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar style={colors.statusBar} />
        <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
          <View style={styles.main}>
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
              showsVerticalScrollIndicator={false}
            >
              <SkeletonGroup>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.avatarWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Skeleton width={110} height={110} radius={55} />
                  </View>

                  <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row' }]}>
                    <Skeleton width={38} height={38} radius={12} />
                    <Skeleton height={16} radius={8} width="70%" />
                  </View>

                  <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row' }]}>
                    <Skeleton width={38} height={38} radius={12} />
                    <Skeleton height={16} radius={8} width="85%" />
                  </View>

                  <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row' }]}>
                    <Skeleton width={38} height={38} radius={12} />
                    <Skeleton height={16} radius={8} width="60%" />
                  </View>
                </View>
              </SkeletonGroup>
            </ScrollView>
          </View>
        </KeyboardAvoidingAnimatedView>
      </LinearGradient>
    );
  }

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
      Alert.alert(isRTL ? "خطأ" : "Error", e?.message || (isRTL ? "فشل رفع الصورة" : "Failed to upload image"));
    }
  };

  const save = async () => {
    if (saving || avatarUploading) return;
    const safeName = String(displayName || "").trim();
    const safeEmail = String(email || "").trim() || null;

    if (safeName.length > 0 && safeName.length < 2) {
      Alert.alert(isRTL ? "تنبيه" : "Alert", isRTL ? "الاسم قصير جداً" : "Name is too short");
      return;
    }
    if (!isValidEmail(safeEmail || "")) {
      Alert.alert(isRTL ? "تنبيه" : "Alert", isRTL ? "البريد الإلكتروني غير صحيح" : "Invalid email address");
      return;
    }

    setSaving(true);
    try {
      await upsertMyProfile({
        display_name: safeName.length ? safeName : "User000",
        email: safeEmail,
        avatar_url: avatarUrl,
      });
      setSaving(false);
      Alert.alert(isRTL ? "تم" : "Saved", isRTL ? "تم حفظ بياناتك" : "Your info was saved");
    } catch (e) {
      setSaving(false);
      Alert.alert(isRTL ? "خطأ" : "Error", e?.message || (isRTL ? "فشل حفظ البيانات" : "Failed to save"));
    }
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.main}>
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <FadeInView delay={100} direction="up" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable onPress={pickAvatar} style={[styles.avatarWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
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

                <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row' }]}>
                  <View style={[styles.fieldIcon, { backgroundColor: colors.primaryLight }]}>
                    <User size={18} color={colors.primary} />
                  </View>
                  <TextInput
                    ref={nameRef}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={isRTL ? "الاسم" : "Name"}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.text, writingDirection: 'rtl' }]}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => emailRef.current?.focus?.()}
                    selectionColor={colors.primary}
                  />
                </View>

                <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row' }]}>
                  <View style={[styles.fieldIcon, { backgroundColor: colors.primaryLight }]}>
                    <Mail size={18} color={colors.primary} />
                  </View>
                  <TextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={isRTL ? "البريد الإلكتروني" : "Email"}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.text, writingDirection: 'rtl' }]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    selectionColor={colors.primary}
                  />
                </View>

                {!!email && !isValidEmail(email) && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {isRTL ? "البريد الإلكتروني غير صحيح" : "Email looks invalid"}
                  </Text>
                )}

                <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', opacity: 0.7 }]}>
                  <View style={[styles.fieldIcon, { backgroundColor: colors.surfaceSecondary }]}>
                    <Phone size={18} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    value={phone}
                    editable={false}
                    placeholder={isRTL ? "رقم الجوال" : "Phone number"}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.textSecondary, writingDirection: 'rtl' }]}
                  />
                </View>

                <Text style={[styles.helper, { color: colors.textMuted }]}>
                  {isRTL ? "لا يمكن تعديل رقم الجوال" : "Phone number can’t be changed"}
                </Text>

                <Pressable
                  onPress={save}
                  disabled={saving || avatarUploading || loading}
                  style={({ pressed }) => [
                    styles.saveButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: saving || avatarUploading || loading ? 0.5 : pressed ? 0.85 : 1,
                      flexDirection: 'row',
                    },
                  ]}
                >
                  <Save size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {saving
                      ? (isRTL ? "جاري الحفظ..." : "Saving...")
                      : (isRTL ? "حفظ التغييرات" : "Save Changes")}
                  </Text>
                </Pressable>
              </FadeInView>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingAnimatedView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  main: { flex: 1, paddingHorizontal: 20 },

  scrollContent: { flexGrow: 1, paddingTop: 10 },
  card: { borderRadius: 20, padding: 16, borderWidth: 1.5, gap: 12 },

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
  input: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: "600" },
  errorText: { fontSize: 13, fontWeight: "700", marginTop: -4 },
  helper: { fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 4 },
  saveButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
