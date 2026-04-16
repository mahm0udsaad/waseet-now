import { AppFlatList, AppScrollView } from '@/components/layout';
import FadeInView from '@/components/ui/FadeInView';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTranslation } from '@/utils/i18n/store';
import { showToast } from '@/utils/notifications/inAppStore';
import { getMyReceipts, getReceiptSignedUrl } from '@/utils/supabase/receipts';
import { useTheme } from '@/utils/theme/store';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  CheckCircle2,
  Clock,
  FileText,
  Receipt,
  Shield,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const COMPLETED_STATUSES = new Set([
  'completed',
  'final',
  'escrow_released',
  'payment_verified',
]);

const PROGRESS_STATUSES = new Set([
  'paid',
  'in_progress',
  'awaiting_completion',
  'completion_requested',
  'payment_submitted',
  'awaiting_admin_transfer_approval',
]);

const CANCELLED_STATUSES = new Set(['cancelled', 'refunded', 'disputed']);

export default function MyReceiptsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, isRTL, writingDirection } = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingItemId, setOpeningItemId] = useState(null);

  const loadItems = useCallback(async () => {
    try {
      const { items: rows } = await getMyReceipts();
      setItems(rows);
    } catch (err) {
      console.error('Failed to load receipts:', err);
      showToast({
        id: 'receipts-load-error',
        title: isRTL ? 'خطأ' : 'Error',
        body: isRTL ? 'فشل تحميل الإيصالات' : 'Failed to load receipts',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isRTL]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadItems();
  }, [loadItems]);

  const openPdf = useCallback(async (pdfPath, itemId) => {
    try {
      setOpeningItemId(itemId);
      const url = await getReceiptSignedUrl(pdfPath);
      if (!url) {
        showToast({
          id: `receipt-url-fail-${itemId}`,
          title: isRTL ? 'خطأ' : 'Error',
          body: t.profile.pdfNotAvailable,
          type: 'error',
        });
        return;
      }
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: 'pageSheet',
        readerMode: false,
      });
    } catch (err) {
      console.error('Failed to open receipt PDF:', err);
      showToast({
        id: `receipt-open-fail-${itemId}`,
        title: isRTL ? 'خطأ' : 'Error',
        body: isRTL ? 'تعذر فتح الإيصال' : 'Could not open receipt',
        type: 'error',
      });
    } finally {
      setOpeningItemId(null);
    }
  }, [isRTL, t.profile.pdfNotAvailable]);

  const handleItemPress = useCallback((item) => {
    if (item.kind === 'order') {
      router.push({ pathname: '/order-details', params: { id: item.originalId } });
    } else if (item.kind === 'damin') {
      router.push({ pathname: '/damin-order-details', params: { id: item.originalId } });
    } else if (item.kind === 'pending_receipt') {
      if (item.pdf_path) {
        openPdf(item.pdf_path, item.id);
      } else {
        showToast({
          id: `receipt-no-pdf-${item.id}`,
          title: isRTL ? 'تنبيه' : 'Notice',
          body: t.profile.pdfNotAvailable,
          type: 'info',
        });
      }
    }
  }, [openPdf, router, isRTL, t.profile.pdfNotAvailable]);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const formatAmount = (amount, currency) => {
    const n = Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const cur = currency || 'SAR';
    return `${n} ${cur}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusConfig = (status) => {
    if (COMPLETED_STATUSES.has(status)) {
      return { icon: CheckCircle2, color: '#10B981', label: t.profile.receiptStatusFinal };
    }
    if (CANCELLED_STATUSES.has(status)) {
      return { icon: Clock, color: '#EF4444', label: status };
    }
    if (PROGRESS_STATUSES.has(status)) {
      return { icon: Clock, color: '#3B82F6', label: status };
    }
    if (status === 'seller_signed') {
      return { icon: Clock, color: '#F59E0B', label: t.profile.receiptStatusPendingSignature };
    }
    return { icon: Clock, color: '#F59E0B', label: status };
  };

  const getKindConfig = (item) => {
    if (item.kind === 'damin') {
      return {
        icon: Shield,
        color: '#8B5CF6',
        label: t.profile.receiptTypeDamin,
      };
    }
    if (item.kind === 'pending_receipt') {
      return {
        icon: FileText,
        color: '#F59E0B',
        label: t.profile.receiptTypePending,
      };
    }
    return {
      icon: Receipt,
      color: '#3B82F6',
      label: t.profile.receiptTypeOrder,
    };
  };

  const getRoleLabel = (item) => {
    if (item.kind === 'damin') {
      return item.role === 'payer' ? t.profile.asPayer : t.profile.asBeneficiary;
    }
    return item.role === 'buyer' ? t.profile.asBuyer : t.profile.asSeller;
  };

  const renderItem = ({ item, index }) => {
    const kindConfig = getKindConfig(item);
    const KindIcon = kindConfig.icon;
    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;
    const isOpening = openingItemId === item.id;
    const title = item.title || (isRTL ? 'معاملة' : 'Transaction');

    return (
      <FadeInView delay={80 + index * 30}>
        <Pressable
          onPress={() => handleItemPress(item)}
          disabled={isOpening}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed || isOpening ? 0.8 : 1,
            },
          ]}
        >
          <View style={[styles.cardTopRow, { flexDirection: 'row' }]}>
            <View style={[styles.kindBadge, { backgroundColor: kindConfig.color + '20', flexDirection: 'row' }]}>
              <KindIcon size={12} color={kindConfig.color} />
              <Text style={[styles.kindBadgeText, { color: kindConfig.color }]}>
                {kindConfig.label}
              </Text>
            </View>
            <Text style={[styles.cardDate, { color: colors.textMuted }]}>
              {formatDate(item.date)}
            </Text>
          </View>

          <Text
            style={[styles.cardTitle, { color: colors.text, writingDirection }]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {item.description ? (
            <Text
              style={[styles.cardDescription, { color: colors.textSecondary, writingDirection }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}

          <View style={[styles.cardMetaRow, { flexDirection: 'row' }]}>
            <Text style={[styles.roleText, { color: colors.textSecondary }]}>
              {getRoleLabel(item)}
            </Text>
            {item.pdf_path ? (
              <>
                <Text style={[styles.dot, { color: colors.textMuted }]}>&bull;</Text>
                <Text style={[styles.roleText, { color: colors.primary }]}>
                  PDF
                </Text>
              </>
            ) : null}
          </View>

          <View style={[styles.cardBottomRow, { flexDirection: 'row' }]}>
            <View style={[styles.statusRow, { flexDirection: 'row' }]}>
              <StatusIcon size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            <Text style={[styles.cardAmount, { color: colors.primary }]}>
              {formatAmount(item.amount, item.currency)}
            </Text>
          </View>
        </Pressable>
      </FadeInView>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar style={colors.statusBar} />
        <AppScrollView contentContainerStyle={{ gap: 16 }}>
          <SkeletonGroup>
            <Skeleton height={80} radius={16} width="100%" style={{ marginBottom: 16 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={`sk-receipt-${i}`} height={130} radius={16} width="100%" style={{ marginBottom: 12 }} />
            ))}
          </SkeletonGroup>
        </AppScrollView>
      </LinearGradient>
    );
  }

  const orderCount = items.filter((x) => x.kind === 'order').length;
  const daminCount = items.filter((x) => x.kind === 'damin').length;

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      {items.length > 0 && (
        <FadeInView
          delay={50}
          style={[styles.summaryBanner, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row' }]}
        >
          <View style={[styles.summaryItem, { flexDirection: 'row' }]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
              <Receipt size={20} color="#3B82F6" />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, writingDirection }]}>
                {t.profile.receiptTypeOrder}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {orderCount}
              </Text>
            </View>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={[styles.summaryItem, { flexDirection: 'row' }]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
              <Shield size={20} color="#8B5CF6" />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, writingDirection }]}>
                {t.profile.receiptTypeDamin}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {daminCount}
              </Text>
            </View>
          </View>
        </FadeInView>
      )}

      <AppFlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSecondary || colors.border + '40' }]}>
              <FileText size={36} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {t.profile.noReceipts}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted, writingDirection }]}>
              {t.profile.noReceiptsDesc}
            </Text>
          </View>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextContainer: {
    flex: 1,
    gap: 2,
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  cardTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kindBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  kindBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardMetaRow: {
    alignItems: 'center',
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    fontSize: 12,
  },
  cardBottomRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statusRow: {
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
