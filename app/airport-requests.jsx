import { AppFlatList } from "@/components/layout";
import FadeInView from "@/components/ui/FadeInView";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { NativeButton, NativeIcon } from "@/components/native";
import { useTranslation } from "@/utils/i18n/store";
import { fetchMyAirportRequests } from "@/utils/supabase/airportRequests";
import { useTheme } from "@/utils/theme/store";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MessageCircle, Plane } from "lucide-react-native";
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
  const { isRTL, writingDirection } = useTranslation();

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
    const statusConfig = STATUS_CONFIG[item.status] || { color: colors.textMuted };
    const statusColor = statusConfig.color;

    return (
      <FadeInView delay={index * 80}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: statusColor + "45",
              boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
            },
          ]}
        >
          <View style={[styles.statusAccent, { backgroundColor: statusColor }]} />

          <View style={styles.cardInner}>
            <View style={[styles.cardHeader, { flexDirection: "row" }]}>
              <View style={[styles.titleGroup, { flexDirection: "row" }]}>
                <View style={[styles.inlineIcon, { backgroundColor: colors.primary + "14" }]}>
                  <Plane size={12} color={colors.primary} />
                </View>
                <Text
                  style={[styles.workerName, { color: colors.text, writingDirection }]}
                  numberOfLines={2}
                >
                  {item.worker_name}
                </Text>
              </View>

              <View style={styles.headerMeta}>
                <Text style={[styles.cardDate, { color: colors.textMuted }]}>{date}</Text>
                <StatusBadge status={item.status} isRTL={isRTL} />
              </View>
            </View>

            <View style={styles.cardContent}>
              <Text style={[styles.detail, { color: colors.textSecondary, writingDirection }]} numberOfLines={2}>
                {item.worker_nationality} - {item.flight_date}
              </Text>
              <Text style={[styles.requestId, { color: colors.textMuted, writingDirection }]} numberOfLines={1}>
                {isRTL ? "رقم الطلب" : "Request"} #{item.id.slice(0, 8)}
              </Text>
              <Text style={[styles.price, { color: colors.primary }]}>
                {Number(item.price).toLocaleString()} {isRTL ? "ر.س" : "SAR"}
              </Text>
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
                      <View style={styles.cardInner}>
                        <View style={styles.cardHeader}>
                          <View style={styles.titleGroup}>
                            <Skeleton width={22} height={22} radius={11} />
                            <Skeleton height={16} radius={8} width="58%" />
                          </View>
                          <View style={styles.headerMeta}>
                            <Skeleton height={10} radius={6} width={76} />
                            <Skeleton height={22} radius={11} width={96} />
                          </View>
                        </View>
                        <View style={styles.cardContent}>
                          <Skeleton height={12} radius={8} width="48%" />
                          <Skeleton height={12} radius={8} width="34%" style={{ marginTop: 8 }} />
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
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    position: "relative",
  },
  statusAccent: {
    position: "absolute",
    start: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopEndRadius: 4,
    borderBottomEndRadius: 4,
  },
  cardInner: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 8,
  },
  cardHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleGroup: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  inlineIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerMeta: {
    alignItems: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
  cardDate: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  cardContent: {
    gap: 4,
    alignItems: "flex-start",
  },
  workerName: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
  },
  detail: {
    fontSize: 15,
    lineHeight: 22,
  },
  requestId: {
    fontSize: 12,
    fontWeight: "600",
  },
  price: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "800" },
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
