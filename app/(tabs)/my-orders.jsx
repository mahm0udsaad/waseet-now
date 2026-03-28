import { AppFlatList } from '@/components/layout';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Briefcase,
  Shield,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/utils/theme/store';
import { useTranslation, getRTLRowDirection, getRTLTextAlign, getRTLStartAlign } from '@/utils/i18n/store';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useOrders } from '@/hooks/useOrders';
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { NativeButton } from '@/components/native';
import { confirmDaminOrderParticipation } from '@/utils/supabase/daminOrders';
import { getSupabaseSession } from '@/utils/supabase/client';
import { showToast } from '@/utils/notifications/inAppStore';
import { hapticFeedback } from '@/utils/native/haptics';

const StatusBadge = ({ status, colors, isRTL, testID }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return '#10B981'; // Emerald
      case 'payment_verified': return '#3B82F6'; // Blue
      case 'in_progress': return '#2563EB'; // Blue
      case 'completion_requested': return '#F97316'; // Orange
      case 'awaiting_admin_transfer_approval': return '#8B5CF6'; // Purple
      case 'payment_submitted': return '#8B5CF6'; // Purple
      case 'awaiting_payment': return '#F59E0B'; // Amber
      case 'paid': return '#3B82F6'; // Legacy
      case 'pending_payment': return '#F59E0B'; // Amber
      case 'awaiting_completion': return '#3B82F6'; // Blue
      case 'disputed': return '#EF4444'; // Red
      case 'refunded': return '#EF4444'; // Red
      case 'cancelled': return '#EF4444'; // Red
      default: return colors.textMuted;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'completed': return isRTL ? 'مكتمل' : 'Completed';
      case 'payment_verified': return isRTL ? 'تم التحقق من الدفع' : 'Payment Verified';
      case 'in_progress': return isRTL ? 'قيد التنفيذ' : 'In Progress';
      case 'completion_requested': return isRTL ? 'بانتظار تأكيد المستفيد' : 'Awaiting Buyer Confirmation';
      case 'awaiting_admin_transfer_approval': return isRTL ? 'بانتظار موافقة الإدارة' : 'Awaiting Admin Approval';
      case 'payment_submitted': return isRTL ? 'تم إرسال الحوالة' : 'Transfer Submitted';
      case 'awaiting_payment': return isRTL ? 'بانتظار الدفع' : 'Awaiting Payment';
      case 'paid': return isRTL ? 'مدفوع' : 'Paid'; // Legacy
      case 'pending_payment': return isRTL ? 'قيد الانتظار' : 'Pending Payment';
      case 'awaiting_completion': return isRTL ? 'بانتظار اكتمال الخدمة' : 'Awaiting Completion';
      case 'disputed': return isRTL ? 'نزاع' : 'Disputed';
      case 'refunded': return isRTL ? 'مسترد' : 'Refunded';
      case 'cancelled': return isRTL ? 'ملغي' : 'Cancelled';
      default: return status;
    }
  };

  const color = getStatusColor();

  return (
    <View testID={testID} style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color: color }]}>{getStatusLabel()}</Text>
    </View>
  );
};

const OrderIcon = ({ type, colors }) => {
    let Icon = FileText;
    let color = colors.primary;

    if (type === 'taqib') {
        Icon = Briefcase;
        color = '#4F46E5';
    } else if (type === 'tanazul') {
        Icon = FileText;
        color = '#059669';
    } else if (type === 'dhamen') {
        Icon = Shield;
        color = '#D97706';
    }

    return (
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <Icon size={24} color={color} />
        </View>
    );
};

export default function MyOrdersScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isRTL, rowDirection } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('all');
  const { orders, loading, refreshing, error, refetch } = useOrders();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const hasFetchedOnce = useRef(false);

  useEffect(() => {
    getSupabaseSession().then((session) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
    hasFetchedOnce.current = true;
  }, []);

  // Re-fetch orders when tab comes back into focus
  useFocusEffect(
    useCallback(() => {
      if (hasFetchedOnce.current) {
        refetch(true);
      }
    }, [refetch])
  );

  const filters = [
    { id: 'all', label: isRTL ? 'الكل' : 'All' },
    { id: 'awaiting_payment', label: isRTL ? 'بانتظار الدفع' : 'Awaiting Payment' },
    { id: 'awaiting_admin_transfer_approval', label: isRTL ? 'مراجعة الإدارة' : 'Admin Review' },
    { id: 'payment_verified', label: isRTL ? 'دفع مؤكد' : 'Payment Verified' },
    { id: 'in_progress', label: isRTL ? 'قيد التنفيذ' : 'In Progress' },
    { id: 'completion_requested', label: isRTL ? 'بانتظار تأكيد المستفيد' : 'Awaiting Buyer Confirmation' },
    { id: 'completed', label: isRTL ? 'مكتمل' : 'Completed' },
    { id: 'cancelled', label: isRTL ? 'ملغي' : 'Cancelled' },
  ];

  const filteredOrders = activeFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === activeFilter);
  const handleRefresh = useCallback(() => {
    refetch(true);
  }, [refetch]);

  const skeletonOrders = React.useMemo(
    () => Array.from({ length: 6 }).map((_, idx) => ({ id: `sk-order-${idx}` })),
    []
  );

  const handleQuickConfirm = async (orderId) => {
    hapticFeedback.confirm();
    setActionLoading(orderId);

    try {
      const result = await confirmDaminOrderParticipation(orderId);
      
      showToast({
        type: 'success',
        title: isRTL ? 'تم التأكيد' : 'Confirmed',
        message: result.both_confirmed
          ? (isRTL ? 'تم تأكيد كلا الطرفين!' : 'Both parties confirmed!')
          : (isRTL ? 'تم تأكيد مشاركتك' : 'Your participation confirmed'),
      });

      // Reload orders
      await refetch();
    } catch (error) {
      console.error('Failed to confirm:', error);
      showToast({
        type: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        message: error?.message || (isRTL ? 'فشل التأكيد' : 'Failed to confirm'),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const renderOrder = ({ item, index }) => {
    const adTitle = item.ad?.title || (isRTL ? 'طلب' : 'Order');
    const adType = item.ad?.type || 'tanazul';
    const formattedDate = new Date(item.created_at).toLocaleDateString(
      isRTL ? 'ar-SA-u-ca-gregory' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
    const roleLabel = item.userRole === 'buyer'
      ? (isRTL ? 'مشتري' : 'Buyer')
      : (isRTL ? (adType === 'tanazul' ? 'المتنازل' : 'بائع') : 'Seller');
    const formattedAmount = `${item.amount} ${item.currency}`;

    // Check if this is a Damin order that needs confirmation
    const isDaminOrder = item.isDaminOrder;
    let needsConfirmation = false;
    let userRole = null;

    if (isDaminOrder) {
      if (currentUserId === item.payer_user_id) {
        userRole = 'payer';
        needsConfirmation = !item.payer_confirmed_at;
      } else if (currentUserId === item.beneficiary_user_id) {
        userRole = 'beneficiary';
        needsConfirmation = !item.beneficiary_confirmed_at;
      }
      needsConfirmation = needsConfirmation &&
        (item.originalDaminStatus === 'created' || item.originalDaminStatus === 'pending_confirmations');
    }

    return (
      <Animated.View entering={FadeInDown.delay(index * 100)}>
        <Pressable
          testID={`order-card-${index}`}
          onPress={() => {
            const pathname = item.isDaminOrder ? "/damin-order-details" : "/order-details";
            router.push({
              pathname,
              params: { id: item.id }
            });
          }}
          style={({ pressed }) => [
            styles.orderCard,
            {
              backgroundColor: colors.surface,
              borderColor: needsConfirmation ? colors.warning + '40' : colors.border,
              borderWidth: needsConfirmation ? 2 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          {needsConfirmation && (
            <View style={[styles.confirmationBanner, { backgroundColor: colors.warning + '15' }]}>
              <AlertCircle size={16} color={colors.warning} />
              <Text style={[styles.confirmationText, { color: colors.warning }]}>
                {isRTL ? 'يتطلب تأكيدك' : 'Confirmation Required'}
              </Text>
            </View>
          )}
          
          <View style={[styles.cardHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
              <View style={[styles.headerLeft, { flexDirection: getRTLRowDirection(isRTL) }]}>
                  <Text style={[styles.orderId, { color: colors.textMuted }]}>{item.id.slice(0, 8)}</Text>
                  <View style={[styles.dot, { backgroundColor: colors.border }]} />
                  <Text style={[styles.orderDate, { color: colors.textMuted }]}>{formattedDate}</Text>
              </View>
              <StatusBadge status={item.status} colors={colors} isRTL={isRTL} testID="order-status" />
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={[styles.cardBody, { flexDirection: getRTLRowDirection(isRTL) }]}>
              <OrderIcon type={adType} colors={colors} />
              <View style={[styles.cardContent, { alignItems: getRTLStartAlign(isRTL) }]}>
                  <Text style={[styles.cardTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>{adTitle}</Text>
                  <Text style={[styles.providerName, { color: colors.textSecondary }]}>
                    {isDaminOrder
                      ? (userRole === 'payer'
                          ? (isRTL ? 'صاحب الطلب' : 'Order Owner')
                          : (isRTL ? 'مقدم الخدمة' : 'Service Provider'))
                      : roleLabel}
                  </Text>
                  <Text style={[styles.amount, { color: colors.primary }]}>{formattedAmount}</Text>
              </View>
               <View style={styles.arrowContainer}>
                  {isRTL ? (
                     <ChevronLeft size={20} color={colors.textMuted} />
                  ) : (
                     <ChevronRight size={20} color={colors.textMuted} />
                  )}
              </View>
          </View>

          {needsConfirmation && (
            <Pressable 
              style={[styles.cardFooter, { borderTopColor: colors.border }]}
              onPress={(e) => e.stopPropagation()}
            >
              <NativeButton
                title={isRTL ? 'تأكيد المشاركة' : 'Confirm Participation'}
                onPress={() => handleQuickConfirm(item.id)}
                size="sm"
                loading={actionLoading === item.id}
                disabled={actionLoading === item.id}
                icon="check"
              />
            </Pressable>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.headerTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'طلباتي' : 'My Orders'}
        </Text>
        
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filtersContainer, { paddingStart: 20, flexDirection: getRTLRowDirection(isRTL) }]}
        >
            {filters.map((filter) => (
                <Pressable
                    key={filter.id}
                    onPress={() => setActiveFilter(filter.id)}
                    style={[
                        styles.filterChip,
                        { 
                            backgroundColor: activeFilter === filter.id ? colors.primary : colors.surface,
                            borderColor: colors.border,
                            marginEnd: 10,
                        }
                    ]}
                >
                    <Text style={[
                        styles.filterText,
                        { color: activeFilter === filter.id ? '#fff' : colors.text }
                    ]}>
                        {filter.label}
                    </Text>
                </Pressable>
            ))}
        </ScrollView>
      </View>

      {error && (
        <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
          <Text style={{ color: colors.error, textAlign: 'center', marginBottom: 10 }}>
            {error}
          </Text>
          <Pressable
            onPress={refetch}
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryButtonText}>
              {isRTL ? 'إعادة المحاولة' : 'Retry'}
            </Text>
          </Pressable>
        </View>
      )}

      {!error && (
        <AppFlatList
          data={loading ? skeletonOrders : filteredOrders}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={
            loading
              ? ({ item, index }) => (
                  <SkeletonGroup>
                    <View
                      style={[
                        styles.orderCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <View style={[styles.cardHeader, { flexDirection: rowDirection }]}>
                        <View style={[styles.headerLeft, { flexDirection: rowDirection }]}>
                          <Skeleton height={10} radius={6} width={64} />
                          <View style={[styles.dot, { backgroundColor: colors.border }]} />
                          <Skeleton height={10} radius={6} width={84} />
                        </View>
                        <Skeleton height={20} radius={10} width={86} />
                      </View>

                      <View style={[styles.divider, { backgroundColor: colors.border }]} />

                      <View style={[styles.cardBody, { flexDirection: rowDirection }]}>
                        <Skeleton width={48} height={48} radius={12} />
                        <View style={[styles.cardContent, { alignItems: getRTLStartAlign(isRTL) }]}>
                          <Skeleton height={14} radius={8} width="75%" />
                          <Skeleton height={12} radius={8} width="40%" style={{ marginTop: 10 }} />
                          <Skeleton height={14} radius={8} width="45%" style={{ marginTop: 10 }} />
                        </View>
                        <View style={styles.arrowContainer}>
                          <Skeleton width={20} height={20} radius={6} />
                        </View>
                      </View>
                    </View>
                  </SkeletonGroup>
                )
              : renderOrder
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  {isRTL ? 'لا توجد طلبات' : 'No orders yet'}
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                  {isRTL ? 'ستظهر طلباتك هنا بعد قبول الإيصالات' : 'Your orders will appear here after accepting receipts'}
                </Text>
              </View>
            ) : (
              <View style={{ height: 10 }} />
            )
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filtersContainer: {
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Courier', // Monospace look
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  orderDate: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  cardBody: {
    padding: 16,
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  providerName: {
    fontSize: 13,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  arrowContainer: {
    padding: 4,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  confirmationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    marginTop: 12,
  },
});
