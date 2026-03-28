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
  MessageCircle,
  ShoppingBag,
  Info,
  Paperclip,
  X,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation, getRTLRowDirection, getRTLTextAlign, getRTLStartAlign, pickRTLValue } from "@/utils/i18n/store";
import { useInAppNotificationsStore } from "@/utils/notifications/inAppStore";
import {
  fetchMyNotifications,
  markNotificationRead,
} from "@/utils/supabase/notifications";
import { getNotificationRoute } from "@/utils/notifications/routing";
import Animated, { FadeInDown } from "react-native-reanimated";
import { NativeButton } from "@/components/native";
import { getLocalizedNotificationContent } from "@/utils/notifications/formatNotification";

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isRTL, rowDirection } = useTranslation();
  const notifications = useInAppNotificationsStore((s) => s.notifications);
  const markReadLocal = useInAppNotificationsStore((s) => s.markNotificationRead);
  const setNotifications = useInAppNotificationsStore((s) => s.setNotifications);
  
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
        if (
          !existing ||
          new Date(notif.created_at) > new Date(existing.created_at)
        ) {
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

    return combined.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [notifications]);

  // Format timestamp
  const formatTimestamp = (dateString) => {
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
  };

  // Get human-readable type label
  const getTypeLabel = (type) => {
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
  };

  // Get icon for notification type
  const getTypeIcon = (type) => {
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
  };

  // Get icon color for notification type
  const getTypeColor = (type) => {
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
  };

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
          groupedNotifications.length === 0 && { flexGrow: 1 },
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
        {groupedNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {isRTL ? "لا توجد إشعارات" : "No notifications yet"}
            </Text>
          </View>
        ) : (
          groupedNotifications.map((notification, index) => {
            const Icon = getTypeIcon(notification.type);
            const iconColor = getTypeColor(notification.type);
            const isUnread = !notification.read_at;
            const typeLabel = getTypeLabel(notification.type);
            const localizedContent = getLocalizedNotificationContent(notification, isRTL);

            return (
              <Animated.View
                key={notification.id}
                entering={FadeInDown.delay(index * 50)}
              >
                <Pressable
                  onPress={() => handleNotificationPress(notification)}
                  style={({ pressed }) => [
                    styles.notificationCard,
                    {
                      backgroundColor: isUnread
                        ? colors.surface
                        : colors.background,
                      borderColor: isUnread ? colors.primary + "30" : colors.border,
                      opacity: pressed ? 0.7 : 1,
                      flexDirection: rowDirection,
                    },
                  ]}
                >
                  {/* Icon */}
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: iconColor + "20" },
                    ]}
                  >
                    <Icon size={20} color={iconColor} />
                  </View>

                  {/* Content */}
                  <View
                    style={[
                      styles.notificationContent,
                      { alignItems: getRTLStartAlign(isRTL) },
                    ]}
                  >
                    {/* Type Label */}
                    <Text
                      style={[
                        styles.typeLabel,
                        {
                          color: iconColor,
                          textAlign: getRTLTextAlign(isRTL),
                        },
                      ]}
                    >
                      {typeLabel}
                    </Text>

                    {/* Title */}
                    {shouldShowTitle(typeLabel, localizedContent.title) && (
                      <Text
                        style={[
                          styles.notificationTitle,
                          {
                            color: colors.text,
                            textAlign: getRTLTextAlign(isRTL),
                            fontWeight: isUnread ? "700" : "600",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {localizedContent.title}
                      </Text>
                    )}

                    {/* Body */}
                    {localizedContent.body && (
                      notification.messageCount > 1 ? (
                        <Text
                          style={[
                            styles.notificationBody,
                            {
                              color: colors.textSecondary,
                              textAlign: getRTLTextAlign(isRTL),
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
                            { flexDirection: rowDirection },
                          ]}
                        >
                          <Paperclip size={13} color={colors.textSecondary} />
                          <Text
                            style={[
                              styles.notificationBody,
                              {
                                color: colors.textSecondary,
                                textAlign: getRTLTextAlign(isRTL),
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
                              textAlign: getRTLTextAlign(isRTL),
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {localizedContent.body}
                        </Text>
                      )
                    )}

                    {/* Timestamp */}
                    <Text
                      style={[
                        styles.timestamp,
                        {
                          color: colors.textMuted,
                          textAlign: getRTLTextAlign(isRTL),
                        },
                      ]}
                    >
                      {formatTimestamp(notification.created_at)}
                    </Text>
                  </View>

                  {/* Unread Indicator or Message Count */}
                  {isUnread && notification.messageCount > 1 ? (
                    <View
                      style={[
                        styles.messageCountBadge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.messageCountText}>
                        {notification.messageCount > 99 ? "99+" : notification.messageCount}
                      </Text>
                    </View>
                  ) : isUnread ? (
                    <View
                      style={[
                        styles.unreadDot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  ) : null}
                </Pressable>
              </Animated.View>
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, flexDirection: getRTLRowDirection(isRTL) }]}>
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 12 }}>
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
                  { alignItems: getRTLStartAlign(isRTL) }
                ]}
              >
                <View style={[styles.detailRow, { alignItems: getRTLStartAlign(isRTL) }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "النوع:" : "Type:"}
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                    {getTypeLabel(selectedNotification.type)}
                  </Text>
                </View>

                {shouldShowTitle(
                  getTypeLabel(selectedNotification.type),
                  getLocalizedNotificationContent(selectedNotification, isRTL).title
                ) && (
                  <View style={[styles.detailRow, { alignItems: getRTLStartAlign(isRTL) }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "العنوان:" : "Title:"}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                      {getLocalizedNotificationContent(selectedNotification, isRTL).title}
                    </Text>
                  </View>
                )}

                {getLocalizedNotificationContent(selectedNotification, isRTL).body && (
                  <View style={[styles.detailRow, { alignItems: getRTLStartAlign(isRTL) }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "المحتوى:" : "Content:"}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                      {getLocalizedNotificationContent(selectedNotification, isRTL).body}
                    </Text>
                  </View>
                )}

                {selectedNotification.data && Object.keys(selectedNotification.data).length > 0 && (
                  <View style={[styles.detailRow, { alignItems: getRTLStartAlign(isRTL) }]}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {isRTL ? "المعلومات الإضافية:" : "Additional Information:"}
                    </Text>
                    {selectedNotification.data.role && (
                      <Text style={[styles.detailValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                        {isRTL ? "الدور: " : "Role: "}
                        {selectedNotification.data.role === 'payer'
                          ? (isRTL ? "الدافع" : "Payer")
                          : (isRTL ? "مقدم الخدمة" : "Service Provider")}
                      </Text>
                    )}
                    {selectedNotification.data.amount && (
                      <Text style={[styles.detailValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL), marginTop: 4 }]}>
                        {isRTL ? "المبلغ: " : "Amount: "}
                        {selectedNotification.data.amount} {isRTL ? "ريال" : "SAR"}
                      </Text>
                    )}
                    {selectedNotification.data.service_details && (
                      <Text style={[styles.detailValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL), marginTop: 4 }]}>
                        {isRTL ? "تفاصيل الخدمة: " : "Service: "}
                        {selectedNotification.data.service_details}
                      </Text>
                    )}
                    {selectedNotification.data.order_id && (
                      <Text style={[styles.detailValue, { color: colors.textMuted, textAlign: getRTLTextAlign(isRTL), marginTop: 8, fontSize: 12 }]}>
                        {isRTL ? "رقم الطلب: " : "Order ID: "}
                        {selectedNotification.data.order_id.slice(0, 8)}
                      </Text>
                    )}
                  </View>
                )}

                <View style={[styles.detailRow, { alignItems: getRTLStartAlign(isRTL) }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "التاريخ:" : "Date:"}
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
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
                    iconPosition={pickRTLValue(isRTL, "left", "right")}
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
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: "relative",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  notificationTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  attachmentRow: {
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: 12,
    right: 12,
  },
  messageCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    position: "absolute",
    top: 8,
    right: 8,
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
