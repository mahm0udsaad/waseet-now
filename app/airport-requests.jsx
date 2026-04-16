import { AppFlatList } from "@/components/layout";
import FadeInView from "@/components/ui/FadeInView";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { NativeButton, NativeIcon } from "@/components/native";
import { useTranslation } from "@/utils/i18n/store";
import { spacing } from "@/utils/native/layout";
import { fetchMyAirportRequests } from "@/utils/supabase/airportRequests";
import { useTheme } from "@/utils/theme/store";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, ChevronRight, MessageCircle, Plane } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

const STATUS_CONFIG = {
  pending_payment: { color: "#F59E0B", ar: "بانتظار الدفع", en: "Pending Payment" },
  awaiting_admin_transfer_approval: { color: "#8B5CF6", ar: "بانتظار موافقة الإدارة", en: "Awaiting Approval" },
  paid: { color: "#3B82F6", ar: "تم الدفع", en: "Paid" },
  in_progress: { color: "#2563EB", ar: "قيد التنفيذ", en: "In Progress" },
  completed: { color: "#10B981", ar: "مكتمل", en: "Completed" },
  cancelled: { color: "#EF4444", ar: "ملغي", en: "Cancelled" },
  rejected: { color: "#EF4444", ar: "مرفوض", en: "Rejected" },
};

function StatusBadge({ status, isRTL }) {
  const cfg = STATUS_CONFIG[status] || { color: "#9CA3AF", ar: status, en: status };
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.color + "20" }]}>
      <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.statusText, { color: cfg.color }]}>
        {isRTL ? cfg.ar : cfg.en}
      </Text>
    </View>
  );
}

export default function AirportRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL } = useTranslation();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!hasFetched.current) setLoading(true);
    setError(null);

    try {
      const data = await fetchMyAirportRequests();
      setRequests(data);
      hasFetched.current = true;
    } catch (err) {
      console.error("fetchMyAirportRequests error", err);
      setError(err?.message || (isRTL ? "فشل تحميل الطلبات" : "Failed to load requests"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isRTL]);

  useFocusEffect(
    useCallback(() => {
      fetchData(hasFetched.current);
    }, [fetchData])
  );

  const handleOpenChat = (conversationId) => {
    router.push({ pathname: "/chat", params: { conversationId, name: "فريق عمل وسيط الان" } });
  };

  const renderItem = ({ item, index }) => {
    const date = new Date(item.created_at).toLocaleDateString(
      isRTL ? "ar-SA-u-ca-gregory" : "en-US",
      { year: "numeric", month: "short", day: "numeric" }
    );
    const hasChat = !!item.conversation_id;
    const canChat = hasChat && item.status !== "cancelled" && item.status !== "rejected";

    return (
      <FadeInView delay={index * 80}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerStart}>
              <Text style={[styles.cardId, { color: colors.textMuted }]}>
                {item.id.slice(0, 8)}
              </Text>
              <View style={[styles.dot, { backgroundColor: colors.border }]} />
              <Text style={[styles.cardDate, { color: colors.textMuted }]}>{date}</Text>
            </View>
            <StatusBadge status={item.status} isRTL={isRTL} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Body */}
          <View style={styles.cardBody}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
              <Plane size={22} color={colors.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.workerName, { color: colors.text, writingDirection: isRTL ? "rtl" : "ltr" }]}>
                {item.worker_name}
              </Text>
              <Text style={[styles.detail, { color: colors.textSecondary }]}>
                {item.worker_nationality} — {item.flight_date}
              </Text>
              <Text style={[styles.price, { color: colors.primary }]}>
                {Number(item.price).toLocaleString()} {isRTL ? "ر.س" : "SAR"}
              </Text>
            </View>
            <View style={styles.arrowWrap}>
              {isRTL ? (
                <ChevronLeft size={20} color={colors.textMuted} />
              ) : (
                <ChevronRight size={20} color={colors.textMuted} />
              )}
            </View>
          </View>

          {/* Chat button */}
          {canChat && (
            <Pressable
              testID={`airport-chat-${index}`}
              onPress={() => handleOpenChat(item.conversation_id)}
              style={[styles.chatButton, { borderTopColor: colors.border, backgroundColor: colors.primary + "08" }]}
            >
              <MessageCircle size={18} color={colors.primary} />
              <Text style={[styles.chatButtonText, { color: colors.primary }]}>
                {isRTL ? "فتح المحادثة" : "Open Chat"}
              </Text>
            </Pressable>
          )}

          {/* Waiting note for paid but no chat yet */}
          {!hasChat && item.status === "awaiting_admin_transfer_approval" && (
            <View style={[styles.waitingNote, { borderTopColor: colors.border }]}>
              <NativeIcon name="clock" size={16} color={colors.textMuted} />
              <Text style={[styles.waitingText, { color: colors.textMuted, writingDirection: isRTL ? "rtl" : "ltr" }]}>
                {isRTL
                  ? "بانتظار تأكيد الإدارة — سيتم التواصل معك قريباً"
                  : "Awaiting admin confirmation — we'll contact you soon"}
              </Text>
            </View>
          )}
          {!hasChat && item.status === "paid" && (
            <View style={[styles.waitingNote, { borderTopColor: colors.border }]}>
              <NativeIcon name="clock" size={16} color={colors.textMuted} />
              <Text style={[styles.waitingText, { color: colors.textMuted, writingDirection: isRTL ? "rtl" : "ltr" }]}>
                {isRTL
                  ? "تم تأكيد الدفع — سيتواصل معك الفريق قريباً"
                  : "Payment confirmed — team will contact you soon"}
              </Text>
            </View>
          )}
        </View>
      </FadeInView>
    );
  };

  const skeletons = Array.from({ length: 4 }, (_, i) => ({ id: `sk-${i}` }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isRTL ? "طلبات المطار" : "Airport Requests",
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <StatusBar style={colors.statusBar} />

      {error && (
        <View style={styles.errorBlock}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <NativeButton
            title={isRTL ? "إعادة المحاولة" : "Retry"}
            onPress={() => fetchData(false)}
            size="sm"
          />
        </View>
      )}

      {!error && (
        <AppFlatList
          data={loading ? skeletons : requests}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={
            loading
              ? ({ index }) => (
                  <SkeletonGroup>
                    <View
                      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      pointerEvents="none"
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.headerStart}>
                          <Skeleton height={10} radius={6} width={64} />
                          <View style={[styles.dot, { backgroundColor: colors.border }]} />
                          <Skeleton height={10} radius={6} width={84} />
                        </View>
                        <Skeleton height={20} radius={10} width={86} />
                      </View>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <View style={styles.cardBody}>
                        <Skeleton width={48} height={48} radius={24} />
                        <View style={styles.cardContent}>
                          <Skeleton height={14} radius={8} width="70%" />
                          <Skeleton height={12} radius={8} width="50%" style={{ marginTop: 8 }} />
                          <Skeleton height={14} radius={8} width="40%" style={{ marginTop: 8 }} />
                        </View>
                      </View>
                    </View>
                  </SkeletonGroup>
                )
              : renderItem
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Plane size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
                  {isRTL ? "لا توجد طلبات" : "No requests yet"}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {isRTL ? "ستظهر طلباتك هنا" : "Your airport requests will appear here"}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20, paddingBottom: 100 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerStart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardId: { fontSize: 12, fontWeight: "600" },
  cardDate: { fontSize: 12 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  divider: { height: 1 },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1 },
  workerName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  detail: { fontSize: 13, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: "800" },
  arrowWrap: { paddingStart: 4 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  chatButtonText: { fontSize: 14, fontWeight: "700" },
  waitingNote: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  waitingText: { flex: 1, fontSize: 12, lineHeight: 18 },
  errorBlock: {
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  errorText: { textAlign: "center" },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptySub: { fontSize: 13 },
});
