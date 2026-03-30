import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  User,
  Calendar,
  DollarSign,
  Package,
  ExternalLink,
  CheckCircle,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/utils/theme/store';
import { useTranslation, getRTLRowDirection, getRTLTextAlign, getRTLStartAlign } from '@/utils/i18n/store';
import { useOrder } from '@/hooks/useOrders';
import { confirmOrderCompletion } from '@/utils/supabase/orders';
import { getSupabaseSession } from '@/utils/supabase/client';
import { showToast } from '@/utils/notifications/inAppStore';
import FadeInView from "@/components/ui/FadeInView";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";

const InfoRow = ({ icon: Icon, label, value, colors, isRTL, onPress }) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={[
      styles.infoRow,
      { flexDirection: getRTLRowDirection(isRTL) },
      onPress && { opacity: 0.8 }
    ]}
  >
    <View style={[styles.infoIconContainer, { backgroundColor: colors.primary + '15' }]}>
      <Icon size={20} color={colors.primary} />
    </View>
    <View style={[styles.infoContent, { alignItems: getRTLStartAlign(isRTL) }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
    {onPress && (
      <ExternalLink size={16} color={colors.textMuted} />
    )}
  </Pressable>
);

const StatusBadge = ({ status, colors, isRTL, testID }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'payment_verified': return '#3B82F6';
      case 'in_progress': return '#3B82F6';
      case 'completion_requested': return '#F97316';
      case 'awaiting_admin_transfer_approval': return '#8B5CF6';
      case 'payment_submitted': return '#8B5CF6';
      case 'awaiting_payment': return '#F59E0B';
      case 'paid': return '#3B82F6'; // legacy
      case 'pending_payment': return '#F59E0B';
      case 'refunded': return '#EF4444';
      case 'disputed': return '#EF4444';
      case 'cancelled': return '#EF4444';
      default: return colors.textMuted;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'completed': return isRTL ? 'مكتمل' : 'Completed';
      case 'payment_verified': return isRTL ? 'تم التحقق من الدفع' : 'Payment Verified';
      case 'in_progress': return isRTL ? 'قيد التنفيذ' : 'In Progress';
      case 'completion_requested': return isRTL ? 'بانتظار تأكيد الطرف الآخر' : 'Awaiting Other Party Confirmation';
      case 'awaiting_admin_transfer_approval': return isRTL ? 'بانتظار موافقة الإدارة' : 'Awaiting Admin Approval';
      case 'payment_submitted': return isRTL ? 'تم إرسال الحوالة' : 'Transfer Submitted';
      case 'awaiting_payment': return isRTL ? 'بانتظار الدفع' : 'Awaiting Payment';
      case 'paid': return isRTL ? 'مدفوع' : 'Paid'; // legacy
      case 'pending_payment': return isRTL ? 'قيد الانتظار' : 'Pending Payment';
      case 'refunded': return isRTL ? 'مسترد' : 'Refunded';
      case 'disputed': return isRTL ? 'نزاع' : 'Disputed';
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

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const { order, loading, error, refetch } = useOrder(id);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getSupabaseSession();
      setCurrentUserId(session?.user?.id || null);
    })();
  }, []);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar style={colors.statusBar} />
        <View style={[styles.header, { paddingTop: insets.top + 10, flexDirection: getRTLRowDirection(isRTL) }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            {isRTL ? (
              <ArrowRight size={24} color={colors.text} />
            ) : (
              <ArrowLeft size={24} color={colors.text} />
            )}
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isRTL ? 'تفاصيل الطلب' : 'Order Details'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonGroup>
            {Array.from({ length: 4 }).map((_, idx) => (
              <View
                key={`sk-${idx}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Skeleton height={14} radius={8} width="35%" />
                <Skeleton height={22} radius={10} width="55%" style={{ marginTop: 10 }} />
                <Skeleton height={14} radius={8} width="100%" style={{ marginTop: 16 }} />
                <Skeleton height={14} radius={8} width="92%" style={{ marginTop: 10 }} />
              </View>
            ))}
          </SkeletonGroup>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (error || !order) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar style={colors.statusBar} />
        <View style={[styles.header, { paddingTop: insets.top + 10, flexDirection: getRTLRowDirection(isRTL) }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            {isRTL ? (
              <ArrowRight size={24} color={colors.text} />
            ) : (
              <ArrowLeft size={24} color={colors.text} />
            )}
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isRTL ? 'تفاصيل الطلب' : 'Order Details'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || (isRTL ? 'لم يتم العثور على الطلب' : 'Order not found')}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backToOrdersButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.backToOrdersButtonText}>
              {isRTL ? 'العودة إلى الطلبات' : 'Back to Orders'}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const formattedDate = new Date(order.created_at).toLocaleDateString(
    isRTL ? 'ar-SA-u-ca-gregory' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  const userRole = currentUserId === order.buyer_id ? 'buyer' : 'seller';
  const otherParty = userRole === 'buyer' ? order.seller : order.buyer;

  // Completion confirmation state
  const canConfirm = ['payment_verified', 'in_progress', 'completion_requested', 'paid'].includes(order.status);
  const buyerConfirmed = !!order.buyer_confirmed_received_at;
  const sellerConfirmed = !!order.seller_confirmed_completed_at;
  const currentUserConfirmed = userRole === 'buyer' ? buyerConfirmed : sellerConfirmed;
  const otherPartyConfirmed = userRole === 'buyer' ? sellerConfirmed : buyerConfirmed;

  const handleConfirmCompletion = () => {
    Alert.alert(
      isRTL ? 'تأكيد اكتمال الخدمة' : 'Confirm Service Completion',
      isRTL
        ? 'هل أنت متأكد أن الخدمة تمت بنجاح؟ سيتم إطلاق الأموال عند تأكيد الطرفين.'
        : 'Are you sure the service has been completed? Funds will be released when both parties confirm.',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'تأكيد' : 'Confirm',
          onPress: async () => {
            setConfirmLoading(true);
            try {
              const result = await confirmOrderCompletion(id);
              showToast({
                type: 'success',
                title: isRTL ? 'تم التأكيد' : 'Confirmed',
                message: result.completed
                  ? (isRTL ? 'تم اكتمال الطلب وإطلاق الأموال' : 'Order completed and funds released')
                  : (isRTL ? 'تم تأكيدك، بانتظار الطرف الآخر' : 'Your confirmation recorded, waiting for the other party'),
              });
              await refetch();
            } catch (err) {
              console.error('Failed to confirm completion:', err);
              showToast({
                type: 'error',
                title: isRTL ? 'خطأ' : 'Error',
                message: err?.message || (isRTL ? 'فشل التأكيد' : 'Failed to confirm'),
              });
            } finally {
              setConfirmLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, flexDirection: getRTLRowDirection(isRTL) }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
        >
          {isRTL ? (
            <ArrowRight size={24} color={colors.text} />
          ) : (
            <ArrowLeft size={24} color={colors.text} />
          )}
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isRTL ? 'تفاصيل الطلب' : 'Order Details'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Order ID & Status Card */}
        <FadeInView
          delay={100}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.cardHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.orderIdLabel, { color: colors.textSecondary }]}>
                {isRTL ? 'رقم الطلب' : 'Order ID'}
              </Text>
              <Text style={[styles.orderId, { color: colors.text }]}>
                {order.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <StatusBadge status={order.status} colors={colors} isRTL={isRTL} testID="order-status" />
          </View>
        </FadeInView>

        {/* Ad Details Card */}
        <FadeInView
          delay={200}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'تفاصيل الإعلان' : 'Ad Details'}
          </Text>
          <InfoRow
            icon={Package}
            label={isRTL ? 'العنوان' : 'Title'}
            value={order.ad?.title || (isRTL ? 'غير متوفر' : 'N/A')}
            colors={colors}
            isRTL={isRTL}
          />
          {order.ad?.description && (
            <View style={[styles.descriptionContainer, { marginTop: 12 }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                {isRTL ? 'الوصف' : 'Description'}
              </Text>
              <Text style={[styles.descriptionText, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                {order.ad.description}
              </Text>
            </View>
          )}
        </FadeInView>

        {/* Financial Details Card */}
        <FadeInView
          delay={300}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'التفاصيل المالية' : 'Financial Details'}
          </Text>
          <InfoRow
            icon={DollarSign}
            label={isRTL ? 'المبلغ' : 'Amount'}
            value={`${order.amount} ${order.currency}`}
            colors={colors}
            isRTL={isRTL}
          />
          {order.payment_link && (
            <InfoRow
              icon={ExternalLink}
              label={isRTL ? 'رابط الدفع' : 'Payment Link'}
              value={isRTL ? 'اضغط للفتح' : 'Tap to open'}
              colors={colors}
              isRTL={isRTL}
              onPress={() => {
                // TODO: Open payment link in browser
                console.log('Open payment link:', order.payment_link);
              }}
            />
          )}
        </FadeInView>

        {/* Payment & Escrow Status Card (Seller View) */}
        {userRole === 'seller' && (
          <FadeInView
            delay={350}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? 'حالة الدفع والضمان' : 'Payment & Escrow Status'}
            </Text>

            {/* Payment Status */}
            <View style={styles.paymentStatusContainer}>
              <Text style={[styles.paymentStatusLabel, { color: colors.textSecondary }]}>
                {isRTL ? 'حالة الدفع' : 'Payment Status'}
              </Text>
              {(() => {
                const isHeld =
                  ['payment_verified', 'in_progress', 'completion_requested', 'paid'].includes(order.status);
                const isAdminReview = ['payment_submitted', 'awaiting_admin_transfer_approval'].includes(order.status);
                const badgeBg = isHeld ? '#10B98120' : isAdminReview ? '#8B5CF620' : '#F59E0B20';
                const textColor = isHeld ? '#10B981' : isAdminReview ? '#8B5CF6' : '#F59E0B';
                const label = isHeld
                  ? (isRTL ? 'الدفع مؤكد - المبلغ محجوز' : 'Payment Verified - Funds Held')
                  : isAdminReview
                  ? (isRTL ? 'الحوالة قيد مراجعة الإدارة' : 'Transfer Under Admin Review')
                  : (isRTL ? 'في انتظار الدفع' : 'Awaiting Payment');
                return (
              <View style={[styles.paymentStatusBadge, {
                backgroundColor: badgeBg
              }]}>
                <Text style={[styles.paymentStatusText, {
                  color: textColor
                }]}>
                  {label}
                </Text>
              </View>
                );
              })()}
            </View>

            {/* Escrow Information */}
            {['payment_verified', 'in_progress', 'completion_requested', 'paid'].includes(order.status) && (
              <View style={[styles.escrowInfoBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.escrowInfoTitle, { color: colors.text }]}>
                  {isRTL ? 'معلومات الضمان' : 'Escrow Information'}
                </Text>
                <Text style={[styles.escrowInfoText, { color: colors.textSecondary }]}>
                  {isRTL
                    ? 'تم استلام الدفع وهو محجوز بشكل آمن. سيتم إطلاق الأموال إلى محفظتك عند اكتمال الطلب وتأكيده من قبل المشتري.'
                    : 'Payment has been received and is securely held. Funds will be released to your wallet when the order is completed and confirmed by the buyer.'}
                </Text>
                <View style={[styles.escrowAmountRow, { flexDirection: getRTLRowDirection(isRTL) }]}>
                  <Text style={[styles.escrowAmountLabel, { color: colors.textSecondary }]}>
                    {isRTL ? 'المبلغ المحجوز' : 'Held Amount'}
                  </Text>
                  <Text style={[styles.escrowAmountValue, { color: colors.primary }]}>
                    {order.amount} {order.currency}
                  </Text>
                </View>
              </View>
            )}

            {/* Release Timeline (Placeholder) */}
            {['payment_verified', 'in_progress', 'completion_requested', 'paid'].includes(order.status) && (
              <View style={[styles.timelineBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                <Text style={[styles.timelineText, { color: colors.text }]}>
                  {isRTL
                    ? '⏱️ سيتم إطلاق الأموال تلقائيًا خلال 3 أيام عمل إذا لم يتم الإبلاغ عن أي مشكلات.'
                    : '⏱️ Funds will be automatically released within 3 business days if no issues are reported.'}
                </Text>
              </View>
            )}
          </FadeInView>
        )}

        {/* Participants Card */}
        <FadeInView
          delay={400}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'المشاركون' : 'Participants'}
          </Text>
          <InfoRow
            icon={User}
            label={isRTL ? 'دورك' : 'Your Role'}
            value={userRole === 'buyer' ? (isRTL ? 'مشتري' : 'Buyer') : (isRTL ? (order.ad?.type === 'tanazul' ? 'المتنازل' : 'بائع') : 'Seller')}
            colors={colors}
            isRTL={isRTL}
          />
          <InfoRow
            icon={User}
            label={userRole === 'buyer' ? (isRTL ? (order.ad?.type === 'tanazul' ? 'المتنازل' : 'البائع') : 'Seller') : (isRTL ? 'المشتري' : 'Buyer')}
            value={otherParty?.display_name || (isRTL ? 'مستخدم' : 'User')}
            colors={colors}
            isRTL={isRTL}
          />
        </FadeInView>

        {/* Timeline Card */}
        <FadeInView
          delay={500}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'التاريخ' : 'Timeline'}
          </Text>
          <InfoRow
            icon={Calendar}
            label={isRTL ? 'تاريخ الإنشاء' : 'Created'}
            value={formattedDate}
            colors={colors}
            isRTL={isRTL}
          />
        </FadeInView>

        {/* Service Completion Confirmation Card */}
        {canConfirm && (
          <FadeInView
            delay={550}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? 'تأكيد اكتمال الخدمة' : 'Service Completion'}
            </Text>

            {/* Confirmation Status */}
            <View style={styles.confirmationStatusContainer}>
              {/* Buyer confirmation status */}
              <View style={[styles.confirmationRow, { flexDirection: getRTLRowDirection(isRTL) }]}>
                {buyerConfirmed ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <Clock size={20} color="#F59E0B" />
                )}
                <Text style={[styles.confirmationText, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                  {isRTL ? 'المشتري' : 'Buyer'}: {buyerConfirmed
                    ? (isRTL ? 'تم التأكيد' : 'Confirmed')
                    : (isRTL ? 'بانتظار التأكيد' : 'Pending')}
                </Text>
              </View>

              {/* Seller confirmation status */}
              <View style={[styles.confirmationRow, { flexDirection: getRTLRowDirection(isRTL) }]}>
                {sellerConfirmed ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <Clock size={20} color="#F59E0B" />
                )}
                <Text style={[styles.confirmationText, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                  {isRTL ? (order.ad?.type === 'tanazul' ? 'المتنازل' : 'البائع') : 'Seller'}: {sellerConfirmed
                    ? (isRTL ? 'تم التأكيد' : 'Confirmed')
                    : (isRTL ? 'بانتظار التأكيد' : 'Pending')}
                </Text>
              </View>
            </View>

            {/* Confirm Button */}
            {!currentUserConfirmed && (
              <Pressable
                onPress={handleConfirmCompletion}
                disabled={confirmLoading}
                style={[
                  styles.confirmButton,
                  { backgroundColor: '#10B981', opacity: confirmLoading ? 0.7 : 1 },
                ]}
              >
                {confirmLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <CheckCircle size={20} color="#fff" />
                )}
                <Text style={styles.confirmButtonText}>
                  {isRTL ? 'تأكيد اكتمال الخدمة' : 'Confirm Service Completed'}
                </Text>
              </Pressable>
            )}

            {/* Already confirmed message */}
            {currentUserConfirmed && !otherPartyConfirmed && (
              <View style={[styles.waitingBanner, { backgroundColor: '#F59E0B15' }]}>
                <Clock size={16} color="#F59E0B" />
                <Text style={[styles.waitingText, { color: '#F59E0B' }]}>
                  {isRTL ? 'بانتظار تأكيد الطرف الآخر' : 'Waiting for the other party to confirm'}
                </Text>
              </View>
            )}
          </FadeInView>
        )}

        {/* Completed confirmation */}
        {order.status === 'completed' && (
          <FadeInView
            delay={550}
            style={[styles.completedBanner, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}
          >
            <CheckCircle size={20} color="#10B981" />
            <Text style={[styles.completedText, { color: '#10B981' }]}>
              {isRTL
                ? 'تم اكتمال الطلب وإطلاق الأموال بنجاح'
                : 'Order completed and funds released successfully'}
            </Text>
          </FadeInView>
        )}

        {/* Receipt Link */}
        {order.receipt && (
          <FadeInView delay={600}>
            <Pressable
              style={[styles.receiptButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                // TODO: Navigate to receipt or open PDF
                console.log('View receipt:', order.receipt.id);
              }}
            >
              <FileText size={20} color="#fff" />
              <Text style={styles.receiptButtonText}>
                {isRTL ? 'عرض الإيصال' : 'View Receipt'}
              </Text>
            </Pressable>
          </FadeInView>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Courier',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  descriptionContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  receiptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backToOrdersButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backToOrdersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentStatusContainer: {
    marginBottom: 12,
  },
  paymentStatusLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  escrowInfoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  escrowInfoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  escrowInfoText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  escrowAmountRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  escrowAmountLabel: {
    fontSize: 13,
  },
  escrowAmountValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timelineBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  timelineText: {
    fontSize: 13,
    lineHeight: 18,
  },
  confirmationStatusContainer: {
    gap: 10,
    marginBottom: 16,
  },
  confirmationRow: {
    alignItems: 'center',
    gap: 10,
  },
  confirmationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
