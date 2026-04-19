import React, { useState, useCallback, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, AlertTriangle, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import { supabase } from "@/utils/supabase/client";
import { showToast } from "@/utils/notifications/inAppStore";

const CATEGORIES = [
  { id: "fraud", ar: "احتيال", en: "Fraud" },
  { id: "no_response", ar: "عدم الرد", en: "Not responding" },
  { id: "service_not_delivered", ar: "لم تتم الخدمة", en: "Service not delivered" },
  { id: "inappropriate_behavior", ar: "تصرفات غير لائقة", en: "Inappropriate behavior" },
  { id: "payment_issue", ar: "مشكلة في الدفع", en: "Payment issue" },
  { id: "other", ar: "سبب آخر", en: "Other" },
];

const SUBJECT_MAX = 100;
const DESCRIPTION_MAX = 1000;

export default function DisputeSubmitModal({
  visible,
  onClose,
  conversationId = null,
  reportedUserId = null,
  reportedUserName = null,
  orderId = null,
  daminOrderId = null,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isRTL, writingDirection } = useTranslation();

  const [category, setCategory] = useState(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setCategory(null);
    setSubject("");
    setDescription("");
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (submitting) return;
    reset();
    onClose?.();
  }, [submitting, reset, onClose]);

  const canSubmit = useMemo(
    () =>
      !submitting &&
      !!category &&
      subject.trim().length >= 4 &&
      description.trim().length >= 10,
    [submitting, category, subject, description]
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const reporterId = userData?.user?.id;
      if (!reporterId) {
        throw new Error(isRTL ? "يجب تسجيل الدخول" : "You must be signed in");
      }

      const { error } = await supabase.from("disputes").insert({
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        conversation_id: conversationId,
        order_id: orderId,
        damin_order_id: daminOrderId,
        category,
        subject: subject.trim(),
        description: description.trim(),
      });

      if (error) throw error;

      showToast({
        id: "dispute-submitted",
        title: isRTL ? "تم إرسال البلاغ" : "Report submitted",
        body: isRTL
          ? "سيتم مراجعة بلاغك من قبل فريق وسيط الآن."
          : "Our team will review your report shortly.",
        type: "success",
      });

      reset();
      onClose?.();
    } catch (e) {
      showToast({
        id: "dispute-submit-error",
        title: isRTL ? "تعذّر إرسال البلاغ" : "Could not submit",
        body: e?.message || (isRTL ? "حدث خطأ غير متوقع" : "Unexpected error"),
        type: "error",
      });
      setSubmitting(false);
    }
  }, [
    canSubmit,
    category,
    subject,
    description,
    conversationId,
    reportedUserId,
    orderId,
    daminOrderId,
    isRTL,
    onClose,
    reset,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={[styles.headerLeft, { flexDirection: "row" }]}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: (colors.danger || "#ef4444") + "18" },
                  ]}
                >
                  <AlertTriangle size={18} color={colors.danger || "#ef4444"} />
                </View>
                <Text
                  style={[styles.title, { color: colors.text, writingDirection }]}
                >
                  {isRTL ? "تقديم بلاغ" : "Submit a report"}
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                hitSlop={10}
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              >
                <X size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              {reportedUserName ? (
                <View
                  style={[
                    styles.contextRow,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.contextLabel,
                      { color: colors.textMuted, writingDirection },
                    ]}
                  >
                    {isRTL ? "البلاغ ضد" : "Report against"}
                  </Text>
                  <Text
                    style={[
                      styles.contextValue,
                      { color: colors.text, writingDirection },
                    ]}
                  >
                    {reportedUserName}
                  </Text>
                </View>
              ) : null}

              <Text
                style={[styles.label, { color: colors.text, writingDirection }]}
              >
                {isRTL ? "نوع البلاغ" : "Reason"}
              </Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((c) => {
                  const selected = category === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategory(c.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surface,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {selected ? (
                        <Check size={14} color="#fff" />
                      ) : null}
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? "#fff" : colors.text, writingDirection },
                        ]}
                      >
                        {isRTL ? c.ar : c.en}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text
                style={[
                  styles.label,
                  { color: colors.text, writingDirection, marginTop: 18 },
                ]}
              >
                {isRTL ? "موضوع البلاغ" : "Subject"}
              </Text>
              <TextInput
                value={subject}
                onChangeText={(v) => setSubject(v.slice(0, SUBJECT_MAX))}
                placeholder={
                  isRTL ? "ملخص قصير للمشكلة" : "Short summary of the issue"
                }
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    writingDirection,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                maxLength={SUBJECT_MAX}
              />
              <Text
                style={[
                  styles.helper,
                  { color: colors.textMuted, writingDirection },
                ]}
              >
                {subject.length}/{SUBJECT_MAX}
              </Text>

              <Text
                style={[
                  styles.label,
                  { color: colors.text, writingDirection, marginTop: 18 },
                ]}
              >
                {isRTL ? "تفاصيل البلاغ" : "Details"}
              </Text>
              <TextInput
                value={description}
                onChangeText={(v) => setDescription(v.slice(0, DESCRIPTION_MAX))}
                placeholder={
                  isRTL
                    ? "اشرح ما حدث بالتفصيل ليقوم فريقنا بمراجعة البلاغ."
                    : "Describe what happened so our team can review your report."
                }
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
                style={[
                  styles.textarea,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    writingDirection,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                maxLength={DESCRIPTION_MAX}
                textAlignVertical="top"
              />
              <Text
                style={[
                  styles.helper,
                  { color: colors.textMuted, writingDirection },
                ]}
              >
                {description.length}/{DESCRIPTION_MAX}
              </Text>

              <Pressable
                disabled={!canSubmit}
                onPress={handleSubmit}
                style={[
                  styles.submit,
                  {
                    backgroundColor: canSubmit
                      ? colors.danger || "#ef4444"
                      : colors.border,
                    opacity: canSubmit ? 1 : 0.6,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {isRTL ? "إرسال البلاغ" : "Submit report"}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { alignItems: "center", gap: 10, flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "700", flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 18, paddingBottom: 32 },
  contextRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 4,
  },
  contextLabel: { fontSize: 12 },
  contextValue: { fontSize: 15, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 130,
  },
  helper: { fontSize: 11, marginTop: 6 },
  submit: {
    marginTop: 22,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
