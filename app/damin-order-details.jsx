import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import {
  User,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  Banknote,
  Circle,
  MessageCircle,
  CreditCard,
  FileText,
  UserCheck,
  Briefcase,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/utils/theme/store';
import { useTranslation, getRTLRowDirection, getRTLTextAlign, getRTLStartAlign } from '@/utils/i18n/store';
import { usePaymentFlowStore } from '@/utils/payments/paymentFlowStore';
import { NativeButton } from '@/components/native';
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import {
  fetchDaminOrderById,
  confirmDaminOrderParticipation,
  rejectDaminOrderParticipation,
  linkUserToDaminOrder,
  confirmDaminServiceCompletion,
  submitDaminPayment,
  confirmDaminCardPayment,
  notifyDaminServiceCompleted,
  updateDaminOrderMetadata,
  uploadTransferReceipt,
  submitDaminDispute,
} from '@/utils/supabase/daminOrders';
import { createDmConversation, sendMessage } from '@/utils/supabase/chat';
import { getSupabaseSession } from '@/utils/supabase/client';
import { hapticFeedback } from '@/utils/native/haptics';
import { showToast } from '@/utils/notifications/inAppStore';
import { checkPaymobStatus, createPaymobIntention } from '@/utils/paymob';

const InfoRow = ({ icon: Icon, label, value, colors, isRTL }) => (
  <View style={[styles.infoRow, { flexDirection: getRTLRowDirection(isRTL) }]}>
    <View style={[styles.infoIconContainer, { backgroundColor: colors.primary + '15' }]}>
      <Icon size={20} color={colors.primary} />
    </View>
    <View style={[styles.infoContent, { alignItems: getRTLStartAlign(isRTL) }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>{value}</Text>
    </View>
  </View>
);

const StatusBadge = ({ status, colors, isRTL }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'completed':
        return { color: '#10B981', label: isRTL ? 'مكتمل' : 'Completed' };
      case 'both_confirmed':
        return { color: '#3B82F6', label: isRTL ? 'تم التأكيد' : 'Confirmed' };
      case 'pending_confirmations':
        return { color: '#F59E0B', label: isRTL ? 'في انتظار التأكيد' : 'Pending' };
      case 'created':
        return { color: '#6B7280', label: isRTL ? 'تم الإنشاء' : 'Created' };
      case 'cancelled':
        return { color: '#EF4444', label: isRTL ? 'ملغي' : 'Cancelled' };
      case 'disputed':
        return { color: '#DC2626', label: isRTL ? 'متنازع عليه' : 'Disputed' };
      case 'awaiting_payment':
        return { color: '#F59E0B', label: isRTL ? 'بانتظار الدفع' : 'Awaiting Payment' };
      case 'payment_submitted':
        return { color: '#8B5CF6', label: isRTL ? 'تم إرسال الدفع' : 'Payment Submitted' };
      case 'awaiting_completion':
        return { color: '#3B82F6', label: isRTL ? 'بانتظار اكتمال الخدمة' : 'Awaiting Completion' };
      case 'completion_requested':
        return { color: '#F97316', label: isRTL ? 'بانتظار موافقة الإدارة' : 'Pending Admin Approval' };
      default:
        return { color: colors.textMuted, label: status };
    }
  };

  const { color, label } = getStatusInfo();

  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20', flexDirection: getRTLRowDirection(isRTL) }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color: color }]}>{label}</Text>
    </View>
  );
};

// Progress stepper showing order lifecycle
const ProgressStepper = ({ status, colors, isRTL }) => {
  const steps = [
    { key: 'created', label: isRTL ? 'إنشاء' : 'Created', icon: FileText },
    { key: 'both_confirmed', label: isRTL ? 'تأكيد' : 'Confirmed', icon: UserCheck },
    { key: 'payment_submitted', label: isRTL ? 'الدفع' : 'Paid', icon: Banknote },
    { key: 'under_review', label: isRTL ? 'تنفيذ' : 'Active', icon: Briefcase },
    { key: 'completed', label: isRTL ? 'مكتمل' : 'Done', icon: CheckCircle2 },
  ];

  const isCancelled = status === 'cancelled' || status === 'disputed';

  const getStepIndex = () => {
    if (isCancelled) return -1;
    if (status === 'created' || status === 'pending_confirmations') return 0;
    if (status === 'both_confirmed') return 1;
    if (status === 'payment_submitted') return 2;
    if (status === 'awaiting_completion') return 3;
    if (status === 'completion_requested') return 3;
    if (status === 'completed') return 4;
    return 0;
  };
  const activeStepIndex = getStepIndex();

  return (
    <View style={styles.stepperContainer}>
      <View style={[styles.stepperRow, { flexDirection: getRTLRowDirection(isRTL) }]}>
        {steps.map((step, idx) => {
          const isPast = !isCancelled && idx < activeStepIndex;
          const isCurrent = !isCancelled && idx === activeStepIndex;
          
          const Icon = step.icon;

          return (
            <View key={step.key} style={styles.stepItem}>
              {/* Line Connector */}
              <View style={[styles.stepLineContainer, { flexDirection: getRTLRowDirection(isRTL) }]}>
                <View style={[styles.stepLine, { 
                  backgroundColor: (isPast || isCurrent) ? colors.primary : colors.border,
                  opacity: idx === 0 ? 0 : 1 
                }]} />
                <View style={[styles.stepLine, { 
                  backgroundColor: isPast ? colors.primary : colors.border,
                  opacity: idx === steps.length - 1 ? 0 : 1 
                }]} />
              </View>
              
              {/* Icon Bubble */}
              <View style={[
                styles.stepIconContainer, 
                { 
                  backgroundColor: isPast ? colors.primary : (isCurrent ? colors.background : colors.surface),
                  borderColor: isPast || isCurrent ? colors.primary : colors.border,
                },
                isCurrent && { borderWidth: 2, transform: [{scale: 1.1}] }
              ]}>
                <Icon 
                  size={isCurrent ? 18 : 14} 
                  color={isPast ? '#fff' : (isCurrent ? colors.primary : colors.textMuted)} 
                />
              </View>

              {/* Label */}
              <Text style={[
                styles.stepLabel, 
                { 
                  color: isCurrent ? colors.primary : (isPast ? colors.text : colors.textMuted),
                  fontWeight: isCurrent ? '700' : '500' 
                }
              ]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default function DaminOrderDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { id } = params;
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const lastHandledPayResultRef = useRef(null);
  const openPaymentFlow = usePaymentFlowStore((state) => state.openPaymentFlow);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const handleBack = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      router.back();
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: '(tabs)' }],
      })
    );
  }, [navigation, router]);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const orderData = await fetchDaminOrderById(id);
      setOrder(orderData);

      // Get current user from Supabase session (reliable source for id & phone)
      const session = await getSupabaseSession();
      const currentUserId = session?.user?.id;
      const currentUserPhone = session?.user?.phone;
      if (currentUserPhone) setUserPhone(currentUserPhone);

      // Determine user role
      if (currentUserId === orderData.creator_id) {
        setUserRole('creator');
        // Creator is the payer — ensure payer_user_id is linked
        if (!orderData.payer_user_id && currentUserPhone) {
          try {
            await linkUserToDaminOrder(id, currentUserPhone);
            const updatedOrder = await fetchDaminOrderById(id);
            setOrder(updatedOrder);
          } catch (linkError) {
            console.warn('Could not link creator as payer:', linkError);
          }
        }
      } else if (currentUserId === orderData.payer_user_id) {
        setUserRole('payer');
      } else if (currentUserId === orderData.beneficiary_user_id) {
        setUserRole('beneficiary');
      } else if (currentUserPhone) {
        // Try to link user by phone
        try {
          await linkUserToDaminOrder(id, currentUserPhone);
          const updatedOrder = await fetchDaminOrderById(id);
          setOrder(updatedOrder);

          if (currentUserId === updatedOrder.payer_user_id) {
            setUserRole('payer');
          } else if (currentUserId === updatedOrder.beneficiary_user_id) {
            setUserRole('beneficiary');
          }
        } catch (linkError) {
          console.warn('Could not link user to order:', linkError);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Failed to load order:', err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing || loading || actionLoading) return;
    setRefreshing(true);
    try {
      await loadOrder({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  // Handle return from Paymob checkout
  useEffect(() => {
    if (!params.payResult) return;

    const handlePayResult = async () => {
      try {
        const payResult = JSON.parse(params.payResult);
        const payResultKey = `${payResult?.paymentId || "no-payment-id"}:${payResult?.status || "unknown"}`;
        if (lastHandledPayResultRef.current === payResultKey) return;
        lastHandledPayResultRef.current = payResultKey;
        const paymobPaymentId = payResult?.paymentId;

        if (payResult.status === 'succeeded') {
          // Never trust client route params alone for payment success.
          // Re-verify against backend payment-status endpoint.
          if (!paymobPaymentId) {
            showToast({
              type: 'error',
              title: isRTL ? 'تعذر التحقق من الدفع' : 'Payment Verification Failed',
              message: isRTL
                ? 'معرّف العملية مفقود.'
                : 'Missing payment reference.',
            });
            return;
          }

          const verification = await checkPaymobStatus(paymobPaymentId);
          if (verification.status !== 'succeeded') {
            showToast({
              type: 'warning',
              title: isRTL ? 'الدفع غير مؤكد' : 'Payment Not Confirmed',
              message: isRTL
                ? 'لم يتم تأكيد الدفع من مزود الدفع بعد.'
                : 'Payment is not confirmed by the payment provider yet.',
            });
            return;
          }

          // If backend returns payment metadata/order reference, ensure it matches this order.
          const verifiedOrderId =
            verification?.raw?.metadata?.orderId ||
            verification?.raw?.metadata?.order_id ||
            verification?.raw?.orderId ||
            verification?.raw?.order_id ||
            null;
          if (verifiedOrderId && String(verifiedOrderId) !== String(id)) {
            showToast({
              type: 'error',
              title: isRTL ? 'تعذر التحقق من الدفع' : 'Payment Verification Failed',
              message: isRTL
                ? 'مرجع العملية لا يطابق هذا الطلب.'
                : 'Payment reference does not match this order.',
            });
            return;
          }

          // 1. Update order metadata with Paymob payment info
          try {
            await updateDaminOrderMetadata(id, {
              payment_method: 'card_paymob',
              paymob_payment_id: paymobPaymentId,
              payment_completed_at: new Date().toISOString(),
            });
          } catch (metaErr) {
            console.warn('Failed to update payment metadata:', metaErr);
          }

          // 2. Auto-confirm card payment (skip admin review)
          try {
            await confirmDaminCardPayment(id);
          } catch (submitErr) {
            console.warn('Failed to confirm card payment:', submitErr);
          }

          // 3. Create chat + send payment receipt card
          // Fetch order fresh to avoid stale/null state after returning from WebView
          let freshOrder = order;
          if (!freshOrder?.beneficiary_user_id) {
            try {
              freshOrder = await fetchDaminOrderById(id);
            } catch (fetchErr) {
              console.warn('Failed to fetch order for chat:', fetchErr);
            }
          }
          const otherUserId = freshOrder?.beneficiary_user_id;
          if (otherUserId) {
            try {
              const { conversation_id } = await createDmConversation(otherUserId);

              const receiptPayload = {
                type: 'payment_receipt',
                status: 'succeeded',
                amount: freshOrder?.total_amount || 0,
                currency: 'SAR',
                method: 'card',
                methodLabelAr: 'بطاقة ائتمان/خصم',
                methodLabelEn: 'Credit/Debit Card',
                reference: paymobPaymentId,
                createdAt: new Date().toISOString(),
                order_id: id,
              };

              await sendMessage(conversation_id, null, [receiptPayload]);

              showToast({
                type: 'success',
                title: isRTL ? 'تم الدفع بنجاح' : 'Payment Successful',
                message: isRTL ? 'تم الدفع وتم إرسال التأكيد في المحادثة.' : 'Payment done. Confirmation sent in chat.',
              });

              // Atomically reset stack: home → chat (back goes to home)
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    { name: '(tabs)' },
                    { name: 'chat', params: { id: conversation_id } },
                  ],
                })
              );
              router.setParams({ payResult: undefined });
              return;
            } catch (chatErr) {
              console.warn('Failed to create chat after payment:', chatErr);
            }
          }

          // Fallback: if chat creation failed, just reload the order
          showToast({
            type: 'success',
            title: isRTL ? 'تم الدفع بنجاح' : 'Payment Successful',
            message: isRTL ? 'تم الدفع بنجاح وسيتم تحديث حالة الطلب.' : 'Payment completed. Order status will be updated.',
          });
          loadOrder();
          router.setParams({ payResult: undefined });
        } else if (payResult.status === 'failed') {
          showToast({
            type: 'error',
            title: isRTL ? 'فشل الدفع' : 'Payment Failed',
            message: payResult.reason || (isRTL ? 'لم تتم العملية. يرجى المحاولة مرة أخرى.' : 'Payment failed. Please try again.'),
          });
          router.setParams({ payResult: undefined });
        }
      } catch {}
    };

    handlePayResult();
  }, [params.payResult, id, isRTL, order, navigation, router]);

  // Handle card payment via Paymob
  const handleCardPayment = async (paymentMethod = 'card') => {
    hapticFeedback.tap();
    try {
      const session = await getSupabaseSession();
      const user = session?.user;
      const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || '';
      const nameParts = displayName.split(' ');

      const { paymentId: pmPaymentId, checkoutUrl } = await createPaymobIntention({
        amountSar: order.total_amount,
        customer: {
          firstName: nameParts[0] || 'User',
          lastName: nameParts.slice(1).join(' ') || 'N/A',
          email: user?.email || `${user?.id}@wasitalan.com`,
          phone: user?.phone || order.payer_phone || '',
        },
        metadata: {
          orderId: order.id,
          orderType: 'damin',
          serviceDetails: order.service_type_or_details,
        },
        paymentMethod,
      });

      router.push({
        pathname: '/paymob-checkout',
        params: {
          checkoutUrl,
          paymentId: pmPaymentId,
          orderId: order.id,
        },
      });
    } catch (err) {
      console.error('Failed to create payment intention:', err);
      showToast({
        type: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        message: err?.message || (isRTL ? 'فشل بدء عملية الدفع' : 'Failed to start payment'),
      });
    }
  };

  // Derive what action the current user can take
  const actionContext = useMemo(() => {
    if (!order || !userRole) return { type: 'none' };

    // Pending confirmations: parties need to accept
    if (order.status === 'created' || order.status === 'pending_confirmations') {
      const isPayerSide = userRole === 'payer' || userRole === 'creator';
      const needsConfirmation =
        (userRole === 'beneficiary' && !order.beneficiary_confirmed_at) ||
        (isPayerSide && !order.payer_confirmed_at);
      if (needsConfirmation) {
        return { type: 'confirm_participation' };
      }
      // Creator/payer waiting for service provider to confirm
      if (isPayerSide && !order.beneficiary_confirmed_at) {
        return { type: 'waiting_for_provider_confirmation' };
      }
    }

    // Both confirmed: creator (= payer / business man) should pay
    if (order.status === 'both_confirmed') {
      if (userRole === 'creator' || userRole === 'payer') {
        return { type: 'pay_now' };
      }
      if (userRole === 'beneficiary') {
        return { type: 'waiting_for_payment' };
      }
    }

    // Payment submitted (bank transfer): under admin review
    if (order.status === 'payment_submitted') {
      return { type: 'waiting_for_admin_verification' };
    }

    // Card payment confirmed: both parties can end service
    if (order.status === 'awaiting_completion') {
      return { type: 'can_end_service' };
    }

    // Completion/release requested: pending admin approval
    if (order.status === 'completion_requested') {
      return { type: 'completion_pending_approval' };
    }

    return { type: 'none' };
  }, [order, userRole]);

  const showChatButton = order && userRole && [
    'both_confirmed',
    'payment_submitted',
    'awaiting_completion',
    'completion_requested',
    'completed',
    'awaiting_payment',
  ].includes(order.status);

  const showDisputeLink = order && userRole && [
    'payment_submitted',
    'awaiting_completion',
    'completion_requested',
  ].includes(order.status);

  const hasBottomAction = ['confirm_participation', 'pay_now', 'can_end_service'].includes(actionContext.type) || showChatButton;

  // --- Handlers ---

  const handleConfirm = async () => {
    hapticFeedback.confirm();
    setActionLoading(true);

    let navigated = false;
    try {
      const result = await confirmDaminOrderParticipation(id);

      if (result.both_confirmed) {
        // Both confirmed — route last confirmer to chat with order summary
        showToast({
          type: 'success',
          title: isRTL ? 'تم التأكيد' : 'Confirmed',
          message: isRTL ? 'تم تأكيد كلا الطرفين! جاري فتح المحادثة...' : 'Both parties confirmed! Opening chat...',
        });

        // Determine other party
        const updatedOrder = await fetchDaminOrderById(id);
        const otherUserId = (userRole === 'beneficiary')
          ? updatedOrder.payer_user_id
          : updatedOrder.beneficiary_user_id;

        if (otherUserId) {
          try {
            const { conversation_id } = await createDmConversation(otherUserId);

            // Send order summary message
            const amount = updatedOrder.total_amount?.toFixed(2) || '0';
            const serviceVal = updatedOrder.service_value?.toFixed(2) || '0';
            const commissionVal = updatedOrder.commission?.toFixed(2) || '0';
            const summaryMessage = isRTL
              ? `تم تأكيد طلب الضامن\n\nتفاصيل الخدمة: ${updatedOrder.service_type_or_details}\nقيمة الخدمة: ${serviceVal} ر.س\nعمولة المنصة: ${commissionVal} ر.س\nالإجمالي: ${amount} ر.س\n\nيرجى إتمام الدفع للمتابعة.`
              : `Damin order confirmed\n\nService: ${updatedOrder.service_type_or_details}\nService Value: ${serviceVal} SAR\nCommission: ${commissionVal} SAR\nTotal: ${amount} SAR\n\nPlease complete payment to proceed.`;

            await sendMessage(conversation_id, summaryMessage);

            // Send payment button message
            await sendMessage(conversation_id, '', [{
              type: 'payment_link',
              amount: updatedOrder.total_amount,
              order_id: id,
              isDamin: true,
              payer_user_id: updatedOrder.payer_user_id,
            }]);

            navigated = true;
            // Atomically reset stack: home → chat (back goes to home)
            navigation.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [
                  { name: '(tabs)' },
                  { name: 'chat', params: { id: conversation_id } },
                ],
              })
            );
            return;
          } catch (chatErr) {
            console.warn('Failed to create chat after confirmation:', chatErr);
          }
        }

        // Fallback if chat creation fails — still clean the stack
        navigated = true;
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: '(tabs)' },
              { name: 'damin-order-details', params: { id } },
            ],
          })
        );
        return;
      } else {
        showToast({
          type: 'success',
          title: isRTL ? 'تم التأكيد' : 'Confirmed',
          message: isRTL ? 'تم تأكيد مشاركتك، بانتظار تأكيد الطرف الآخر' : 'Your participation confirmed, waiting for the other party',
        });
        // Atomically reset stack: home → order details (back goes to home)
        navigated = true;
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [
              { name: '(tabs)' },
              { name: 'damin-order-details', params: { id } },
            ],
          })
        );
        return;
      }
    } catch (err) {
      console.error('Failed to confirm:', err);
      showToast({
        type: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        message: err?.message || (isRTL ? 'فشل التأكيد' : 'Failed to confirm'),
      });
    } finally {
      // Skip state update if we already navigated away to prevent crash
      if (!navigated) {
        setActionLoading(false);
      }
    }
  };

  const handleReject = () => {
    Alert.alert(
      isRTL ? 'رفض المشاركة' : 'Reject Participation',
      isRTL ? 'هل أنت متأكد أنك تريد رفض هذا الطلب؟' : 'Are you sure you want to reject this order?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'رفض' : 'Reject',
          style: 'destructive',
          onPress: async () => {
            hapticFeedback.warning();
            setActionLoading(true);
            try {
              await rejectDaminOrderParticipation(id, 'User declined participation');
              showToast({
                type: 'warning',
                title: isRTL ? 'تم الرفض' : 'Rejected',
                message: isRTL ? 'تم رفض مشاركتك' : 'Your participation rejected',
              });
              handleBack();
            } catch (err) {
              console.error('Failed to reject:', err);
              showToast({
                type: 'error',
                title: isRTL ? 'خطأ' : 'Error',
                message: err?.message || (isRTL ? 'فشل الرفض' : 'Failed to reject'),
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmServiceCompletion = () => {
    Alert.alert(
      isRTL ? 'تأكيد استلام الخدمة' : 'Confirm Service Received',
      isRTL
        ? 'هل أنت متأكد أنك استلمت الخدمة/المنتج بنجاح؟ سيتم إشعار الطرف الآخر بدفع العمولة.'
        : 'Are you sure the service/product has been received successfully? The other party will be notified to pay the commission.',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'تأكيد الاستلام' : 'Confirm Receipt',
          onPress: async () => {
            hapticFeedback.confirm();
            setActionLoading(true);
            try {
              await confirmDaminServiceCompletion(id);

              // Send notification to payer
              try {
                await notifyDaminServiceCompleted(
                  id,
                  order.payer_user_id,
                  order.service_type_or_details,
                  order.commission
                );
              } catch (notifError) {
                console.warn('Failed to send completion notification:', notifError);
              }

              showToast({
                type: 'success',
                title: isRTL ? 'تم التأكيد' : 'Service Confirmed',
                message: isRTL ? 'تم تأكيد استلام الخدمة بنجاح' : 'Service receipt confirmed successfully',
              });

              await loadOrder();
            } catch (err) {
              console.error('Failed to confirm completion:', err);
              showToast({
                type: 'error',
                title: isRTL ? 'خطأ' : 'Error',
                message: err?.message || (isRTL ? 'فشل التأكيد' : 'Failed to confirm'),
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePaymentSubmitted = async (paymentInfo) => {
    hapticFeedback.confirm();
    setActionLoading(true);
    try {
      const metadataUpdate = {
        payment_method: paymentInfo.paymentMethod || 'bank_transfer',
        payment_submitted_at_client: new Date().toISOString(),
      };

      if (paymentInfo?.phoneNumber) {
        metadataUpdate.transfer_phone = paymentInfo.phoneNumber;
      }

      // Upload receipt image if provided
      if (paymentInfo?.receiptUri) {
        try {
          const receiptUrl = await uploadTransferReceipt(id, paymentInfo.receiptUri);
          if (receiptUrl) {
            metadataUpdate.transfer_receipt_url = receiptUrl;
          }
        } catch (uploadErr) {
          console.warn('Failed to upload receipt:', uploadErr);
          // Continue with payment submission even if upload fails
        }
      }

      await updateDaminOrderMetadata(id, metadataUpdate);
      await submitDaminPayment(id);

      showToast({
        type: 'success',
        title: isRTL ? 'تم إرسال الدفع' : 'Payment Submitted',
        message: isRTL ? 'سيتم التحقق من الدفع والتأكيد قريباً' : 'Payment will be verified and confirmed soon',
      });

      await loadOrder();
      return true;
    } catch (err) {
      console.error('Failed to submit payment:', err);
      showToast({
        type: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        message: err?.message || (isRTL ? 'فشل إرسال الدفع' : 'Failed to submit payment'),
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleChat = async () => {
    const otherUserId = (userRole === 'beneficiary')
      ? order.payer_user_id
      : order.beneficiary_user_id;

    if (!otherUserId) {
      showToast({
        type: 'warning',
        title: isRTL ? 'غير متاح' : 'Unavailable',
        message: isRTL
          ? 'الطرف الآخر لم يفتح التطبيق بعد. لا يمكن بدء المحادثة حتى يسجل دخوله.'
          : 'The other party has not opened the app yet. Chat will be available once they sign in.',
      });
      return;
    }

    hapticFeedback.tap();
    setChatLoading(true);
    try {
      const { conversation_id } = await createDmConversation(otherUserId);
      router.push({
        pathname: '/chat',
        params: { id: conversation_id },
      });
    } catch (err) {
      console.error('Failed to open chat:', err);
      showToast({
        type: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        message: isRTL ? 'فشل فتح المحادثة' : 'Failed to open chat',
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleOpenDispute = () => {
    Alert.prompt(
      isRTL ? 'فتح نزاع' : 'Open a Dispute',
      isRTL ? 'يرجى كتابة سبب النزاع:' : 'Please describe the reason for the dispute:',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'إرسال' : 'Submit',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason?.trim()) {
              showToast({
                type: 'warning',
                title: isRTL ? 'مطلوب' : 'Required',
                message: isRTL ? 'يرجى كتابة سبب النزاع' : 'Please provide a dispute reason',
              });
              return;
            }
            hapticFeedback.warning();
            setActionLoading(true);
            try {
              await submitDaminDispute(id, reason.trim());
              showToast({
                type: 'success',
                title: isRTL ? 'تم فتح النزاع' : 'Dispute Opened',
                message: isRTL ? 'تم إرسال النزاع وسيتم مراجعته من قبل الإدارة.' : 'Your dispute has been submitted and will be reviewed by admin.',
              });
              await loadOrder();
            } catch (err) {
              console.error('Failed to submit dispute:', err);
              showToast({
                type: 'error',
                title: isRTL ? 'خطأ' : 'Error',
                message: err?.message || (isRTL ? 'فشل فتح النزاع' : 'Failed to open dispute'),
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
      'plain-text',
      '',
    );
  };

  // --- Render: Loading ---
  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerLargeTitle: false,
            title: isRTL ? 'تفاصيل طلب الضامن' : 'Damin Order Details',
            headerBackVisible: !isRTL,
            headerLeft: isRTL ? () => null : undefined,
            headerRight: isRTL
              ? () => (
                  <Pressable onPress={handleBack} style={styles.headerBackButton}>
                    <ChevronRight size={22} color={colors.text} />
                  </Pressable>
                )
              : undefined,
          }}
        />
        <StatusBar style={colors.statusBar} />
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
          <SkeletonGroup>
            {Array.from({ length: 4 }).map((_, idx) => (
              <View key={`sk-${idx}`} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: getRTLStartAlign(isRTL) }]}>
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

  // --- Render: Error ---
  if (error || !order) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerLargeTitle: false,
            title: isRTL ? 'تفاصيل طلب الضامن' : 'Damin Order Details',
            headerBackVisible: !isRTL,
            headerLeft: isRTL ? () => null : undefined,
            headerRight: isRTL
              ? () => (
                  <Pressable onPress={handleBack} style={styles.headerBackButton}>
                    <ChevronRight size={22} color={colors.text} />
                  </Pressable>
                )
              : undefined,
          }}
        />
        <StatusBar style={colors.statusBar} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || (isRTL ? 'لم يتم العثور على الطلب' : 'Order not found')}
          </Text>
          <NativeButton title={isRTL ? 'العودة' : 'Go Back'} onPress={handleBack} />
        </View>
      </LinearGradient>
    );
  }

  const formattedDate = new Date(order.created_at).toLocaleDateString(
    isRTL ? 'ar-SA-u-ca-gregory' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  // --- Alert card renderer ---
  const renderAlertCard = () => {
    const alertCardStyle = [
      styles.alertCard, 
      { flexDirection: getRTLRowDirection(isRTL) }
    ];
    const textAlignment = { textAlign: getRTLTextAlign(isRTL) };

    switch (actionContext.type) {
      case 'confirm_participation':
        return (
          <Animated.View entering={FadeInDown.delay(150)} style={[alertCardStyle, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <AlertCircle size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: colors.primary }, textAlignment]}>
                {isRTL ? 'يتطلب تأكيدك' : 'Your Confirmation Required'}
              </Text>
              <Text style={[styles.alertText, { color: colors.text }, textAlignment]}>
                {isRTL
                  ? 'يرجى مراجعة التفاصيل وتأكيد أو رفض مشاركتك في هذا الطلب.'
                  : 'Please review the details and confirm or reject your participation in this order.'}
              </Text>
            </View>
          </Animated.View>
        );

      case 'pay_now':
        return (
          <Animated.View entering={FadeInDown.delay(150)} style={[alertCardStyle, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
            <Banknote size={24} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: '#F59E0B' }, textAlignment]}>
                {isRTL ? 'مطلوب الدفع' : 'Payment Required'}
              </Text>
              <Text style={[styles.alertText, { color: colors.text }, textAlignment]}>
                {isRTL
                  ? `تم تأكيد مقدم الخدمة. يرجى دفع المبلغ الإجمالي ${order.total_amount.toFixed(2)} ر.س لبدء تنفيذ الخدمة.`
                  : `Service provider confirmed. Please pay the total of ${order.total_amount.toFixed(2)} SAR to begin service execution.`}
              </Text>
            </View>
          </Animated.View>
        );

      case 'waiting_for_provider_confirmation':
        return (
          <Animated.View entering={FadeInDown.delay(150)} style={[alertCardStyle, { backgroundColor: colors.textMuted + '10', borderColor: colors.textMuted + '40' }]}>
            <Clock size={24} color={colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: colors.textSecondary }, textAlignment]}>
                {isRTL ? 'في انتظار تأكيد مقدم الخدمة' : 'Waiting for Provider Confirmation'}
              </Text>
              <Text style={[styles.alertText, { color: colors.textSecondary }, textAlignment]}>
                {isRTL
                  ? 'سيتم إشعارك عندما يؤكد مقدم الخدمة مشاركته.'
                  : 'You will be notified when the service provider confirms participation.'}
              </Text>
            </View>
          </Animated.View>
        );

      case 'waiting_for_payment':
        return (
          <Animated.View entering={FadeInDown.delay(150)} style={[alertCardStyle, { backgroundColor: colors.textMuted + '10', borderColor: colors.textMuted + '40' }]}>
            <Clock size={24} color={colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: colors.textSecondary }, textAlignment]}>
                {isRTL ? 'في انتظار الدفع' : 'Waiting for Payment'}
              </Text>
              <Text style={[styles.alertText, { color: colors.textSecondary }, textAlignment]}>
                {isRTL
                  ? 'في انتظار صاحب الطلب لإتمام الدفع.'
                  : 'Waiting for the order owner to complete payment.'}
              </Text>
            </View>
          </Animated.View>
        );

      case 'waiting_for_admin_verification':
        return (
          <Animated.View entering={FadeInDown.delay(150)} style={[alertCardStyle, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF6' }]}>
            <Clock size={24} color="#8B5CF6" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: '#8B5CF6' }, textAlignment]}>
                {isRTL ? 'قيد المراجعة' : 'Under Review'}
              </Text>
              <Text style={[styles.alertText, { color: colors.text }, textAlignment]}>
                {isRTL
                  ? 'تم استلام الدفع. سيتم مراجعة الطلب من قبل الإدارة وتحويل المبلغ بعد اكتمال الخدمة.'
                  : 'Payment received. The order is under admin review. Funds will be transferred after service completion.'}
              </Text>
            </View>
          </Animated.View>
        );

      case 'can_end_service':
        return (
          <Animated.View entering={FadeInDown.delay(150)} style={[alertCardStyle, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
            <CheckCircle2 size={24} color="#10B981" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: '#10B981' }, textAlignment]}>
                {isRTL ? 'تم تأكيد الدفع' : 'Payment Confirmed'}
              </Text>
              <Text style={[styles.alertText, { color: colors.text }, textAlignment]}>
                {isRTL
                  ? 'المبلغ محجوز بشكل آمن. عند اكتمال الخدمة، اضغط "إنهاء الخدمة" لتحرير المبلغ.'
                  : 'Funds are securely held. When the service is complete, tap "End Service" to release funds.'}
              </Text>
            </View>
          </Animated.View>
        );

      case 'completion_pending_approval':
        return (
          <Animated.View entering={FadeInDown.delay(150)} style={[alertCardStyle, { backgroundColor: '#F9731615', borderColor: '#F97316' }]}>
            <Clock size={24} color="#F97316" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: '#F97316' }, textAlignment]}>
                {isRTL ? 'بانتظار موافقة الإدارة' : 'Pending Admin Approval'}
              </Text>
              <Text style={[styles.alertText, { color: colors.text }, textAlignment]}>
                {isRTL
                  ? 'تم إرسال طلب إنهاء الخدمة وتحرير المبلغ. سيتم مراجعته من قبل الإدارة والرد عليه قريباً.'
                  : 'Your service completion and fund release request has been submitted. Admin will review and respond shortly.'}
              </Text>
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  // --- Render: Bottom action buttons ---
  const renderBottomActions = () => {
    if (actionContext.type === 'confirm_participation') {
      return (
        <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 10) + 10, backgroundColor: colors.background }]}>
          <View style={[styles.actionButtons, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={{ flex: 1, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}>
              <NativeButton
                title={isRTL ? 'رفض' : 'Reject'}
                onPress={handleReject}
                disabled={actionLoading}
                variant="outline"
                icon="x"
              />
            </View>
            <View style={{ flex: 1, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
              <NativeButton
                title={isRTL ? 'تأكيد' : 'Confirm'}
                onPress={handleConfirm}
                loading={actionLoading}
                disabled={actionLoading}
                icon="check"
                testID="damin-confirm-btn"
              />
            </View>
          </View>
        </View>
      );
    }

    if (actionContext.type === 'pay_now') {
      return (
        <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 10) + 10, backgroundColor: colors.background }]}>
          <NativeButton
            title={isRTL ? `ادفع الآن (${order.total_amount.toFixed(2)} ر.س)` : `Pay Now (${order.total_amount.toFixed(2)} SAR)`}
            onPress={() => {
              hapticFeedback.tap();
              openPaymentFlow({
                amount: order?.total_amount || 0,
                initialPhone: userPhone,
                onPaymentSubmitted: handlePaymentSubmitted,
                onCardPayment: handleCardPayment,
              });
              router.push('/payment-modal');
            }}
            loading={actionLoading}
            disabled={actionLoading}
            icon="wallet"
            size="lg"
            testID="damin-pay-btn"
          />
          <Pressable
            onPress={handleChat}
            disabled={chatLoading}
            style={[styles.chatButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5, marginTop: 10 }]}
          >
            {chatLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <MessageCircle size={20} color={colors.primary} />
                <Text style={[styles.chatButtonText, { color: colors.primary }]}>
                  {isRTL ? 'محادثة مع الطرف الآخر' : 'Chat with Other Party'}
                </Text>
              </>
            )}
          </Pressable>
          {showDisputeLink && (
            <Pressable
              onPress={handleOpenDispute}
              disabled={actionLoading}
              style={[styles.disputeLink, { flexDirection: getRTLRowDirection(isRTL) }]}
            >
              <AlertTriangle size={16} color={colors.error} />
              <Text style={[styles.disputeLinkText, { color: colors.error }]}>
                {isRTL ? 'فتح نزاع' : 'Open a Dispute'}
              </Text>
            </Pressable>
          )}
        </View>
      );
    }

    // Payer can end service when awaiting completion
    if (actionContext.type === 'can_end_service') {
      return (
        <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 10) + 10, backgroundColor: colors.background }]}>
          <NativeButton
            title={isRTL ? 'إنهاء الخدمة وتحرير المبلغ' : 'End Service & Release Funds'}
            onPress={handleConfirmServiceCompletion}
            loading={actionLoading}
            disabled={actionLoading}
            icon="check"
            size="lg"
          />
          <Pressable
            onPress={handleChat}
            disabled={chatLoading}
            style={[styles.chatButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5, marginTop: 10 }]}
          >
            {chatLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <MessageCircle size={20} color={colors.primary} />
                <Text style={[styles.chatButtonText, { color: colors.primary }]}>
                  {isRTL ? 'محادثة مع الطرف الآخر' : 'Chat with Other Party'}
                </Text>
              </>
            )}
          </Pressable>
          {showDisputeLink && (
            <Pressable
              onPress={handleOpenDispute}
              disabled={actionLoading}
              style={[styles.disputeLink, { flexDirection: getRTLRowDirection(isRTL) }]}
            >
              <AlertTriangle size={16} color={colors.error} />
              <Text style={[styles.disputeLinkText, { color: colors.error }]}>
                {isRTL ? 'فتح نزاع' : 'Open a Dispute'}
              </Text>
            </Pressable>
          )}
        </View>
      );
    }

    // Standalone chat button for post-payment statuses
    if (showChatButton) {
      return (
        <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 10) + 10, backgroundColor: colors.background }]}>
          <Pressable
            onPress={handleChat}
            disabled={chatLoading}
            style={[styles.chatButton, { backgroundColor: colors.primary }]}
          >
            {chatLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MessageCircle size={20} color="#fff" />
                <Text style={[styles.chatButtonText, { color: '#fff' }]}>
                  {isRTL ? 'محادثة مع الطرف الآخر' : 'Chat with Other Party'}
                </Text>
              </>
            )}
          </Pressable>
          {showDisputeLink && (
            <Pressable
              onPress={handleOpenDispute}
              disabled={actionLoading}
              style={[styles.disputeLink, { flexDirection: getRTLRowDirection(isRTL) }]}
            >
              <AlertTriangle size={16} color={colors.error} />
              <Text style={[styles.disputeLinkText, { color: colors.error }]}>
                {isRTL ? 'فتح نزاع' : 'Open a Dispute'}
              </Text>
            </Pressable>
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          title: isRTL ? 'تفاصيل طلب الضامن' : 'Damin Order Details',
          headerBackVisible: !isRTL,
          headerLeft: isRTL ? () => null : undefined,
          headerRight: isRTL
            ? () => (
                <Pressable onPress={handleBack} style={styles.headerBackButton}>
                  <ChevronRight size={22} color={colors.text} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <StatusBar style={colors.statusBar} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (hasBottomAction ? 160 : 20) }]}
        showsVerticalScrollIndicator={false}
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
        {/* Order ID & Status Card */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.cardHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={{ flex: 1, alignItems: getRTLStartAlign(isRTL) }}>
              <Text style={[styles.orderIdLabel, { color: colors.textSecondary }]}>
                {isRTL ? 'رقم الطلب' : 'Order ID'}
              </Text>
              <Text style={[styles.orderId, { color: colors.text }]}>
                {order.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
            <StatusBadge status={order.status} colors={colors} isRTL={isRTL} />
          </View>
        </Animated.View>

        {/* Progress Stepper */}
        {order.status !== 'cancelled' && order.status !== 'disputed' && (
          <Animated.View
            entering={FadeInDown.delay(120)}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <ProgressStepper status={order.status} colors={colors} isRTL={isRTL} />
          </Animated.View>
        )}

        {/* Contextual Alert Card */}
        {renderAlertCard()}

        {/* Service Details */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'تفاصيل الخدمة' : 'Service Details'}
          </Text>
          <Text style={[styles.serviceDescription, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {order.service_type_or_details}
          </Text>
          {order.service_period_start && (
            <InfoRow icon={Calendar} label={isRTL ? 'تاريخ البدء' : 'Start Date'} value={order.service_period_start} colors={colors} isRTL={isRTL} />
          )}
          {order.completion_days && (
            <InfoRow icon={Clock} label={isRTL ? 'مدة الإنجاز' : 'Completion Days'} value={`${order.completion_days} ${isRTL ? 'يوم' : 'days'}`} colors={colors} isRTL={isRTL} />
          )}
        </Animated.View>

        {/* Parties Information */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'المشاركون' : 'Participants'}
          </Text>

          <InfoRow icon={User} label={isRTL ? 'صاحب الطلب' : 'Order Owner'} value={order.payer_phone} colors={colors} isRTL={isRTL} />
          {order.payer_confirmed_at && (
            <View style={[styles.confirmedBadge, { backgroundColor: '#10B98120', flexDirection: getRTLRowDirection(isRTL), alignSelf: getRTLStartAlign(isRTL) }]}>
              <CheckCircle2 size={16} color="#10B981" />
              <Text style={[styles.confirmedText, { color: '#10B981' }]}>
                {isRTL ? 'تم التأكيد' : 'Confirmed'}
              </Text>
            </View>
          )}

          <View style={{ height: 12 }} />

          <InfoRow icon={User} label={isRTL ? 'مقدم الخدمة' : 'Service Provider'} value={order.beneficiary_phone} colors={colors} isRTL={isRTL} />
          {order.beneficiary_confirmed_at && (
            <View style={[styles.confirmedBadge, { backgroundColor: '#10B98120', flexDirection: getRTLRowDirection(isRTL), alignSelf: getRTLStartAlign(isRTL) }]}>
              <CheckCircle2 size={16} color="#10B981" />
              <Text style={[styles.confirmedText, { color: '#10B981' }]}>
                {isRTL ? 'تم التأكيد' : 'Confirmed'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Financial Details */}
        <Animated.View
          entering={FadeInDown.delay(400)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'التفاصيل المالية' : 'Financial Details'}
          </Text>
          <InfoRow icon={DollarSign} label={isRTL ? 'قيمة الخدمة' : 'Service Value'} value={`${order.service_value.toFixed(2)} SAR`} colors={colors} isRTL={isRTL} />
          <InfoRow icon={DollarSign} label={isRTL ? `عمولة المنصة (${order.commission_rate ?? 10}%)` : `Platform Commission (${order.commission_rate ?? 10}%)`} value={`${order.commission.toFixed(2)} SAR`} colors={colors} isRTL={isRTL} />

          {/* Highlight total amount when payment is needed */}
          {order.status === 'both_confirmed' && (userRole === 'creator' || userRole === 'payer') && (
            <View style={[styles.highlightBox, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
              <Text style={[styles.highlightText, { color: '#F59E0B', textAlign: getRTLTextAlign(isRTL) }]}>
                {isRTL ? `المبلغ المطلوب دفعه: ${order.total_amount.toFixed(2)} ر.س` : `Amount to Pay: ${order.total_amount.toFixed(2)} SAR`}
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={[styles.totalRow, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <Text style={[styles.totalLabel, { color: colors.primary }]}>
              {isRTL ? 'الإجمالي' : 'Total'}
            </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {order.total_amount.toFixed(2)} SAR
            </Text>
          </View>
        </Animated.View>

        {/* Timeline */}
        <Animated.View
          entering={FadeInDown.delay(500)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'التاريخ' : 'Timeline'}
          </Text>
          <InfoRow icon={Calendar} label={isRTL ? 'تاريخ الإنشاء' : 'Created'} value={formattedDate} colors={colors} isRTL={isRTL} />
        </Animated.View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      {renderBottomActions()}
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
  headerBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  alertCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    lineHeight: 20,
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
  serviceDescription: {
    fontSize: 15,
    lineHeight: 22,
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
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  confirmedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  highlightBox: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  totalRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
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
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtons: {
    gap: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
  },
  cardPayButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  // Progress Stepper
  stepperContainer: {
    paddingVertical: 8,
  },
  stepperRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    minHeight: 60,
  },
  stepLineContainer: {
    position: 'absolute',
    top: 15, // Center of 32px icon (16px) - 1px = 15px
    left: 0,
    right: 0,
    height: 2,
    zIndex: 0,
  },
  stepLine: {
    flex: 1,
    height: 2,
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    zIndex: 1,
  },
  activeStepIcon: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    width: '100%',
    fontWeight: '500',
  },
  disputeLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  disputeLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
