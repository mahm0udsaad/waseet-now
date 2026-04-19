import { AppScrollView } from "@/components/layout";
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Bell,
  Info,
  MessageCircle,
  Paperclip,
  ShoppingBag,
  X,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";
import { useInAppNotificationsStore } from "@/utils/notifications/inAppStore";
import {
  fetchMyNotifications,
  markNotificationRead,
} from "@/utils/supabase/notifications";
import { getNotificationRoute } from "@/utils/notifications/routing";
import FadeInView from "@/components/ui/FadeInView";
import { NativeButton } from "@/components/native";
import { getLocalizedNotificationContent } from "@/utils/notifications/formatNotification";

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isRTL, writingDirection } = useTranslation();
  const notifications = useInAppNotificationsStore((s) => s.notifications);
  const markReadLocal = useInAppNotificationsStore((s) => s.markNotificationRead);
  const setNotifications = useInAppNotificationsStore((s) => s.setNotifications);
  
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  // Group notifications: for message types, keep only the latest per conversation
  // and count how many unread messages are in each conversation
  const groupedNotifications = React.useMemo(() => {
    const conversationMap = new Map();
    const conversationCounts = new Map();
    const otherNotifications = [];

    notifications.forEach((notif) => {
      const isMessageType = ["new_message", "message"].includes(
        notif.type?.toLowerCase()
      );

      if (isMessageType && notif.conversation_id) {
        // For message notifications with conversation_id, keep only the latest
        const existing = conversationMap.get(notif.conversation_id);
        // ISO-8601 timestamps are lexicographically comparable — avoid Date allocation
        if (!existing || String(notif.created_at) > String(existing.created_at)) {
          conversationMap.set(notif.conversation_id, notif);
        }

        // Count unread messages for this conversation
        if (!notif.read_at) {
          const currentCount = conversationCounts.get(notif.conversation_id) || 0;
          conversationCounts.set(notif.conversation_id, currentCount + 1);
        }
      } else {
        // For non-message notifications or messages without conversation_id
        otherNotifications.push(notif);
      }
    });

    // Combine and add message counts
    const combined = [
      ...Array.from(conversationMap.values()).map((notif) => ({
        ...notif,
        messageCount: conversationCounts.get(notif.conversation_id) || 0,
      })),
      ...otherNotifications,
    ];

    // ISO-8601 strings sort lexicographically — no Date objects needed per compare
    return combined.sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );
  }, [notifications]);

  const unreadCount = React.useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  const filteredNotifications = React.useMemo(() => {
    if (activeFilter === "unread") {
      return groupedNotifications.filter(
        (notification) => !notification.read_at || notification.messageCount > 0
      );
    }
    return groupedNotifications;
  }, [activeFilter, groupedNotifications]);

  // Format timestamp
  const formatTimestamp = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return isRTL ? "الآن" : "Now";
    if (diffMins < 60) return isRTL ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return isRTL ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7) return isRTL ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;

    // Full date for older notifications
    return date.toLocaleDateString(isRTL ? "ar-SA-u-ca-gregory" : "en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }, [isRTL]);

  // Get human-readable type label
  const getTypeLabel = useCallback((type) => {
    switch (type?.toLowerCase()) {
      case "new_message":
      case "message":
        return isRTL ? "رسالة جديدة" : "New Message";
      case "new_order":
        return isRTL ? "طلب جديد" : "New Order";
      case "damin_order_created":
        return isRTL ? "طلب ضامن جديد" : "New Damin Order";
      case "damin_service_completed":
        return isRTL ? "اكتملت الخدمة" : "Service Completed";
      case "order_update":
        return isRTL ? "تحديث الطلب" : "Order Update";
      case "payment_received":
        return isRTL ? "تم استلام الدفع" : "Payment Received";
      default:
        return isRTL ? "إشعار" : "Notification";
    }
  }, [isRTL]);

  // Get icon for notification type
  const getTypeIcon = useCallback((type) => {
    switch (type?.toLowerCase()) {
      case "new_message":
      case "message":
        return MessageCircle;
      case "new_order":
      case "damin_order_created":
      case "damin_service_completed":
      case "order_update":
      case "payment_received":
        return ShoppingBag;
      default:
        return Bell;
    }
  }, []);

  // Get icon color for notification type
  const getTypeColor = useCallback((type) => {
    switch (type?.toLowerCase()) {
      case "new_message":
      case "message":
        return colors.primary;
      case "new_order":
        return colors.success;
      case "damin_order_created":
        return '#D97706'; // Amber/Orange color for Damin orders
      case "damin_service_completed":
        return '#10B981'; // Green for completed service
      case "order_update":
        return colors.warning;
      case "payment_received":
        return colors.success;
      default:
        return colors.textMuted;
    }
  }, [colors]);

  const normalizeText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const shouldShowTitle = (typeLabel, title) =>
    Boolean(title) && normalizeText(typeLabel) !== normalizeText(title);

  const isAttachmentBody = (value) => {
    const normalized = normalizeText(value);
    return (
      normalized === "[مرفق]" ||
      normalized === "مرفق" ||
      normalized === "[attachment]" ||
      normalized === "attachment" ||
      normalized === "📎 attachment" ||
      normalized === "📎 مرفق"
    );
  };

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const data = await fetchMyNotifications({ limit: 30 });
      setNotifications(data);
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, setNotifications]);

  // Handle notification tap
  const handleNotificationPress = async (notification) => {
    // Mark as read in backend
    try {
      if (!notification.read_at) {
        await markNotificationRead(notification.id);
        markReadLocal(notification.id);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }

    const route = getNotificationRoute(notification);
    if (route) {
      router.push(route);
      return;
    }

    // Unknown type: show details in bottom sheet
    setSelectedNotification(notification);
    setIsBottomSheetOpen(true);
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      {/* Notifications List */}
      <AppScrollView
        contentContainerStyle={[
          styles.scrollContent,
          filteredNotifications.length === 0 && { flexGrow: 1 },
        ]}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {groupedNotifications.length > 0 && (
          <FadeInView delay={30} style={[styles.filterBar, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, flexDirection: 'row' }]}>
            {[
              { id: "all", label: isRTL ? "الكل" : "All", count: groupedNotifications.length },
              { id: "unread", label: isRTL ? "غير مقروءة" : "Unread", count: unreadCount },
            ].map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setActiveFilter(filter.id)}
                  style={({ pressed }) => [
                    styles.filterPill,
                    {
                      backgroundColor: isActive ? colors.primary : "transparent",
                      borderColor: isActive ? colors.primary : "transparent",
                      opacity: pressed ? 0.75 : 1,
                      boxShadow: isActive
                        ? "0 6px 16px rgba(216, 58, 58, 0.22)"
                        : "0 0 0 rgba(0, 0, 0, 0)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: isActive ? "#FFFFFF" : colors.textSecondary, writingDirection },
                    ]}
                  >
                    {filter.label}
                  </Text>
                  <View
                    style={[
                      styles.filterCount,
                      {
                        backgroundColor: isActive ? "rgba(255, 255, 255, 0.22)" : colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        { color: isActive ? "#FFFFFF" : colors.textMuted },
                      ]}
                    >
                      {filter.count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </FadeInView>
        )}

        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSecondary }]}>
              <Bell size={36} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, writingDirection }]}>
              {activeFilter === "unread"
                ? (isRTL ? "لا توجد إشعارات غير مقروءة" : "No unread notifications")
                : (isRTL ? "لا توجد إشعارات" : "No notifications yet")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary, writingDirection }]}>
              {activeFilter === "unread"
                ? (isRTL ? "تمت قراءة كل التنبيهات الحالية" : "Everything here has already been read")
                : (isRTL ? "ستظهر الرسائل والطلبات والتحديثات هنا" : "Messages, orders, and account updates will appear here")}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification, index) => {
            const Icon = getTypeIcon(notification.type);
            const iconColor = getTypeColor(notification.type);
            const isUnread = !notification.read_at || notification.messageCount > 0;
            const typeLabel = getTypeLabel(notification.type);
            const localizedContent = getLocalizedNotificationContent(notification, isRTL);
            const hasCustomTitle = shouldShowTitle(typeLabel, localizedContent.title);
            const displayTitle = hasCustomTitle ? localizedContent.title : typeLabel;

            return (
              <FadeInView
                key={notification.id}
                delay={index * 50}
              >
                <Pressable
                  onPress={() => handleNotificationPress(notification)}
                  style={({ pressed }) => [
                    styles.notificationCard,
                    {
                      backgroundColor: isUnread
                        ? colors.surface
                        : colors.surface + "CC",
                      borderColor: isUnread ? colors.primary + "30" : colors.border,
                      opacity: pressed ? 0.7 : 1,
                      flexDirection: 'row',
                      boxShadow: isUnread
                        ? "0 10px 24px rgba(15, 23, 42, 0.08)"
                        : "0 2px 10px rgba(15, 23, 42, 0.03)",
                    },
                  ]}
                >
                  {isUnread && (
                    <View style={[styles.unreadAccent, { backgroundColor: colors.primary }]} />
                  )}

                  {/* Content */}
                  <View
                    style={[
                      styles.notificationContent,
                      { alignItems: 'flex-start' },
                    ]}
                  >
                    <View style={[styles.notificationHeader, { flexDirection: 'row' }]}>
                      <View style={[styles.headerTitleGroup, { flexDirection: 'row' }]}>
                        <View style={[styles.inlineTypeIcon, { backgroundColor: iconColor + "14" }]}>
                          <Icon size={12} color={iconColor} />
                        </View>
                        <Text
                          style={[
                            styles.notificationTitle,
                            {
                              color: colors.text,
                              writingDirection,
                              fontWeight: isUnread ? "700" : "600",
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {displayTitle}
                        </Text>
                      </View>
                      <View style={styles.headerMeta}>
                        <Text
                          style={[
                            styles.timestamp,
                            {
                              color: colors.textMuted,
                              writingDirection,
                            },
                          ]}
                        >
                          {formatTimestamp(notification.created_at)}
                        </Text>
                        {isUnread && notification.messageCount <= 1 && (
                          <View
                            style={[
                              styles.inlineUnreadDot,
                              { backgroundColor: colors.primary },
                            ]}
                          />
                        )}
                        {isUnread && notification.messageCount > 1 && (
                          <View
                            style={[
                              styles.inlineMessageCountBadge,
                              { backgroundColor: colors.primary },
                            ]}
                          >
                            <Text style={styles.messageCountText}>
                              {notification.messageCount > 99 ? "99+" : notification.messageCount}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Body */}
                    {localizedContent.body && (
                      notification.messageCount > 1 ? (
                        <Text
                          style={[
                            styles.notificationBody,
                            {
                              color: colors.textSecondary,
                              writingDirection,
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {isRTL
                            ? `${notification.messageCount} رسائل جديدة`
                            : `${notification.messageCount} new messages`}
                        </Text>
                      ) : isAttachmentBody(localizedContent.body) ? (
                        <View
                          style={[
                            styles.attachmentRow,
                            { flexDirection: 'row' },
                          ]}
                        >
                          <Paperclip size={13} color={colors.textSecondary} />
                          <Text
                            style={[
                              styles.notificationBody,
                              {
                                color: colors.textSecondary,
                                writingDirection,
                                marginBottom: 0,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {isRTL ? "مرفق" : "Attachment"}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.notificationBody,
                            {
                              color: colors.textSecondary,
                              writingDirection,
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {localizedContent.body}
                        </Text>
                      )
                    )}

                  </View>

                </Pressable>
              </FadeInView>
            );
          })
        )}
      </AppScrollView>

      {/* Modal for Unknown Notification Types */}
      <Modal
        visible={isBottomSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setIsBottomSheetOpen(false);
          setSelectedNotification(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, flexDirection: 'row' }]}>
              <View style={{ flexDirection: 'row', alignItems: "center", gap: 12 }}>
                <Info size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {isRTL ? "تفاصيل الإشعار" : "Notification Details"}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setIsBottomSheetOpen(false);
                  setSelectedNotification(null);
                }}
                style={[styles.closeButton, { backgroundColor: colors.background }]}
              >
                <X size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Modal Content */}
            {selectedNotification && (
              <ScrollView 
                style={styles.modalScroll} 
                contentContainerStyle={[
                  styles.modalScrollContent, 
                  { alignItems: 'flex-start' }
                ]}
              >
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary, writingDirection }]}>
                    {isRTL ? "النوع:" : "Type:"}
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text, writingDirection }]}>
                    {getTypeLabel(selectedNotification.type)}
                  </Text>
                </View>

                {shouldShowTitle(
                  getTypeLabel(selectedNotification.type),
                  getLocalizedNotificationContent(selectedNotification, isRTL).title
                ) && (
                  <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, writingDirection }]}>
                      {isRTL ? "العنوان:" : "Title:"}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text, writingDirection }]}>
                      {getLocalizedNotificationContent(selectedNotification, isRTL).title}
                    </Text>
                  </View>
                )}

                {getLocalizedNotificationContent(selectedNotification, isRTL).body && (
                  <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, writingDirection }]}>
                      {isRTL ? "المحتوى:" : "Content:"}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text, writingDirection }]}>
                      {getLocalizedNotificationContent(selectedNotification, isRTL).body}
                    </Text>
                  </View>
                )}

                {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
                  <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, writingDirection }]}>
                      {isRTL ? "المعلومات الإضافية:" : "Additional Information:"}
                    </Text>
                    {selectedNotification.data.role && (
                      <Text style={[styles.detailValue, { color: colors.text, writingDirection }]}>
                        {isRTL ? "الدور: " : "Role: "}
                        {selectedNotification.data.role === 'payer'
                          ? (isRTL ? "الدافع" : "Payer")
                          : (isRTL ? "مقدم الخدمة" : "Service Provider")}
                      </Text>
                    )}
                    {selectedNotification.data.amount && (
                      <Text style={[styles.detailValue, { color: colors.text, writingDirection, marginTop: 4 }]}>
                        {isRTL ? "المبلغ: " : "Amount: "}
                        {selectedNotification.data.amount} {isRTL ? "ريال" : "SAR"}
                      </Text>
                    )}
                    {selectedNotification.data.service_details && (
                      <Text style={[styles.detailValue, { color: colors.text, writingDirection, marginTop: 4 }]}>
                        {isRTL ? "تفاصيل الخدمة: " : "Service: "}
                        {selectedNotification.data.service_details}
                      </Text>
                    )}
                    {selectedNotification.data.order_id && (
                      <Text style={[styles.detailValue, { color: colors.textMuted, writingDirection, marginTop: 8, fontSize: 12 }]}>
                        {isRTL ? "رقم الطلب: " : "Order ID: "}
                        {selectedNotification.data.order_id.slice(0, 8)}
                      </Text>
                    )}
                  </View>
                )}

                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary, writingDirection }]}>
                    {isRTL ? "التاريخ:" : "Date:"}
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text, writingDirection }]}>
                    {new Date(selectedNotification.created_at).toLocaleString(
                      isRTL ? "ar-SA-u-ca-gregory" : "en-US"
                    )}
                  </Text>
                </View>

                {/* Action Button */}
                <View style={styles.modalActionButton}>
                  <NativeButton
                    title={isRTL ? "عرض التفاصيل" : "View Details"}
                    onPress={() => {
                      setIsBottomSheetOpen(false);
                      setSelectedNotification(null);
                      
                      const route = getNotificationRoute(selectedNotification);
                      if (route) {
                        router.push(route);
                      } else {
                        router.push("/my-orders");
                      }
                    }}
                    icon="arrow-right"
                    iconPosition="left"
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 72,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
  },
  filterBar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  filterPill: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "800",
  },
  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    lineHeight: 13,
    textAlign: "center",
  },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  unreadAccent: {
    position: "absolute",
    start: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopEndRadius: 4,
    borderBottomEndRadius: 4,
  },
  notificationContent: {
    flex: 1,
    gap: 7,
  },
  notificationHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitleGroup: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  inlineTypeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
  },
  notificationBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  headerMeta: {
    alignItems: "flex-end",
    gap: 7,
    flexShrink: 0,
  },
  timestamp: {
    fontSize: 12,
    flexShrink: 0,
    fontVariant: ["tabular-nums"],
  },
  attachmentRow: {
    alignItems: "center",
    gap: 6,
  },
  inlineUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inlineMessageCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  messageCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    minHeight: "40%",
    maxHeight: "70%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    maxHeight: "100%",
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  detailRow: {
    marginBottom: 16,
    width: '100%',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalActionButton: {
    marginTop: 24,
    width: '100%',
  },
});
