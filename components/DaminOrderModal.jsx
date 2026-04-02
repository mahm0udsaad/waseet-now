import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  Shield,
  Check,
  X,
  ChevronRight,
  CircleDollarSign,
  Clock3,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/utils/theme/store';
import { useLanguageStore } from '@/utils/i18n/store';
import { hairlineWidth } from '@/utils/native/layout';
import { typography } from '@/utils/native/typography';
import { hapticFeedback } from '@/utils/native/haptics';

function StatCard({ icon, label, value, colors, isRTL }) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          alignItems: 'flex-start',
        },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: colors.primaryLight }]}>
        {icon}
      </View>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

export default function DaminOrderContent({
  order,
  onConfirm,
  onReject,
  onViewDetails,
  onClose,
}) {
  const colors = useThemeStore((s) => s.colors);
  const isRTL = useLanguageStore((s) => s.isRTL);
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  if (!order) return null;

  const currency = isRTL ? 'ر.س' : 'SAR';
  const total = Number(order.total_amount || 0).toLocaleString();
  const durationText = order.completion_days
    ? isRTL
      ? `${order.completion_days} يوم`
      : `${order.completion_days} days`
    : isRTL
      ? 'غير محدد'
      : 'Flexible';

  const handleConfirm = async () => {
    hapticFeedback.confirm();
    setConfirming(true);
    try {
      await onConfirm?.(order.id);
      onClose?.();
    } finally {
      setConfirming(false);
    }
  };

  const handleReject = async () => {
    hapticFeedback.heavy();
    setRejecting(true);
    try {
      await onReject?.(order.id);
      onClose?.();
    } finally {
      setRejecting(false);
    }
  };

  const handleViewDetails = () => {
    hapticFeedback.tap();
    onViewDetails?.(order.id);
  };

  const busy = confirming || rejecting;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>
          {isRTL ? 'طلب ضمان' : 'Damin Request'}
        </Text>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={({ pressed }) => [
            styles.closeButton,
            {
              backgroundColor: colors.background,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Scrollable content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View
          style={[
            styles.heroCard,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <View style={styles.heroRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
              <Shield size={20} color={colors.primary} />
            </View>
            <View style={[styles.heroTextWrap, { marginStart: 14 }]}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                {isRTL ? 'طلب ضمان جديد' : 'New Damin Request'}
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {isRTL
                  ? 'راجع الطلب ثم اختر الإجراء المناسب.'
                  : 'Review the request and choose an action.'}
              </Text>
            </View>
          </View>

          <View style={[styles.totalBanner, { borderTopColor: colors.border }]}>
            <Text
              style={[
                styles.totalBannerLabel,
                { color: colors.textSecondary },
              ]}
            >
              {isRTL ? 'إجمالي الطلب' : 'Order total'}
            </Text>
            <Text
              style={[
                styles.totalBannerValue,
                { color: colors.primary },
              ]}
            >
              {total} {currency}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.summaryGrid}>
          <StatCard
            icon={<CircleDollarSign size={16} color={colors.primary} />}
            label={isRTL ? 'المبلغ' : 'Amount'}
            value={`${total} ${currency}`}
            colors={colors}
            isRTL={isRTL}
          />
          <StatCard
            icon={<Clock3 size={16} color={colors.primary} />}
            label={isRTL ? 'المدة' : 'Timeline'}
            value={durationText}
            colors={colors}
            isRTL={isRTL}
          />
        </View>

        {/* Details */}
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.textSecondary },
            ]}
          >
            {isRTL ? 'التفاصيل' : 'Details'}
          </Text>
          <Text
            style={[
              styles.serviceDescription,
              { color: colors.text },
            ]}
          >
            {order.service_type_or_details}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky action buttons */}
      <View
        style={[
          styles.actions,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Pressable
          onPress={handleConfirm}
          disabled={busy}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || busy ? 0.88 : 1,
            },
          ]}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {isRTL ? 'تأكيد الطلب' : 'Confirm request'}
              </Text>
            </>
          )}
        </Pressable>

        <View style={styles.secondaryActions}>
          <Pressable
            onPress={handleReject}
            disabled={busy}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                opacity: pressed || busy ? 0.72 : 1,
              },
            ]}
          >
            {rejecting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <X size={18} color={colors.error} />
                <Text style={[styles.secondaryButtonText, { color: colors.error }]}>
                  {isRTL ? 'رفض' : 'Reject'}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleViewDetails}
            disabled={busy}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                opacity: pressed || busy ? 0.72 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              {isRTL ? 'التفاصيل الكاملة' : 'Full details'}
            </Text>
            <ChevronRight
              size={16}
              color={colors.text}
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: hairlineWidth,
  },
  topBarTitle: {
    ...typography.headline,
    fontWeight: '700',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 8,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroTextWrap: {
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    ...typography.headline,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroSubtitle: {
    ...typography.subheadline,
  },
  totalBanner: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: hairlineWidth,
  },
  totalBannerLabel: {
    ...typography.footnote,
    marginBottom: 4,
  },
  totalBannerValue: {
    ...typography.title3,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 14,
    borderWidth: hairlineWidth,
    padding: 12,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    ...typography.footnote,
    marginBottom: 4,
  },
  statValue: {
    ...typography.subheadline,
    fontWeight: '700',
  },
  detailsCard: {
    borderRadius: 16,
    borderWidth: hairlineWidth,
    padding: 14,
  },
  sectionLabel: {
    ...typography.footnote,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  serviceDescription: {
    ...typography.subheadline,
    fontWeight: '500',
  },
  actions: {
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: hairlineWidth,
    gap: 10,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '800',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    ...typography.subheadline,
    fontWeight: '700',
  },
});
