import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import { supabase } from "@/utils/supabase/client";
import { AlertTriangle, ShieldCheck, ShieldX, Clock } from "lucide-react-native";
import { showToast } from "@/utils/notifications/inAppStore";

const STATUS_META = {
  open: { ar: "مفتوح", en: "Open", icon: Clock, key: "warning" },
  in_review: { ar: "قيد المراجعة", en: "In review", icon: AlertTriangle, key: "primary" },
  resolved: { ar: "تم الحل", en: "Resolved", icon: ShieldCheck, key: "success" },
  rejected: { ar: "مرفوض", en: "Rejected", icon: ShieldX, key: "danger" },
};

const CATEGORY_LABELS = {
  fraud: { ar: "احتيال", en: "Fraud" },
  no_response: { ar: "عدم الرد", en: "Not responding" },
  service_not_delivered: { ar: "لم تتم الخدمة", en: "Service not delivered" },
  inappropriate_behavior: { ar: "تصرفات غير لائقة", en: "Inappropriate behavior" },
  payment_issue: { ar: "مشكلة في الدفع", en: "Payment issue" },
  other: { ar: "سبب آخر", en: "Other" },
};

export default function MyDisputesScreen() {
  const { colors, isDark } = useTheme();
  const { isRTL, writingDirection } = useTranslation();

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setDisputes([]);
        return;
      }
      const { data, error } = await supabase
        .from("disputes")
        .select("id, category, subject, description, status, admin_notes, created_at, resolved_at")
        .eq("reporter_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDisputes(data || []);
    } catch (e) {
      showToast({
        id: "disputes-load-error",
        title: isRTL ? "خطأ" : "Error",
        body: e?.message || (isRTL ? "تعذّر تحميل البلاغات" : "Failed to load disputes"),
        type: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isRTL]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const formatDate = useCallback(
    (iso) => (iso ? new Date(iso).toLocaleDateString(isRTL ? "ar-SA" : "en-US") : ""),
    [isRTL]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const meta = STATUS_META[item.status] || STATUS_META.open;
      const Icon = meta.icon;
      const toneColor =
        meta.key === "success"
          ? colors.success
          : meta.key === "danger"
          ? colors.danger || "#ef4444"
          : meta.key === "warning"
          ? colors.warning || "#f59e0b"
          : colors.primary;
      const cat = CATEGORY_LABELS[item.category];

      return (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.cardHeader, { flexDirection: "row" }]}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.subject, { color: colors.text, writingDirection }]}
                numberOfLines={2}
              >
                {item.subject}
              </Text>
              <Text style={[styles.cat, { color: colors.textMuted, writingDirection }]}>
                {cat ? (isRTL ? cat.ar : cat.en) : item.category}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: toneColor + "22" }]}>
              <Icon size={12} color={toneColor} />
              <Text style={[styles.badgeText, { color: toneColor }]}>
                {isRTL ? meta.ar : meta.en}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.desc, { color: colors.textSecondary, writingDirection }]}
            numberOfLines={3}
          >
            {item.description}
          </Text>
          {item.admin_notes ? (
            <View
              style={[
                styles.noteBox,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary + "40",
                },
              ]}
            >
              <Text style={[styles.noteLabel, { color: colors.primary, writingDirection }]}>
                {isRTL ? "رد فريق وسيط" : "Wasit team note"}
              </Text>
              <Text style={[styles.noteBody, { color: colors.text, writingDirection }]}>
                {item.admin_notes}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.date, { color: colors.textMuted, writingDirection }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      );
    },
    [colors, isRTL, writingDirection, formatDate]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <ShieldCheck size={42} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text, writingDirection }]}>
                {isRTL ? "لا توجد بلاغات" : "No reports yet"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted, writingDirection }]}>
                {isRTL
                  ? "ستظهر هنا بلاغاتك التي تقدمها لفريق وسيط."
                  : "Reports you submit to our team will appear here."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  cardHeader: { alignItems: "flex-start", gap: 8 },
  subject: { fontSize: 15, fontWeight: "700" },
  cat: { fontSize: 12, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  desc: { fontSize: 13, lineHeight: 19 },
  noteBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
    marginTop: 4,
  },
  noteLabel: { fontSize: 11, fontWeight: "700" },
  noteBody: { fontSize: 13, lineHeight: 18 },
  date: { fontSize: 11, marginTop: 4 },
  empty: { alignItems: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
