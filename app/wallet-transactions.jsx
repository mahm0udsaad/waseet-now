import { AppFlatList, AppScrollView } from '@/components/layout';
import { useTranslation, getRTLRowDirection, getRTLTextAlign, getRTLStartAlign } from '@/utils/i18n/store';
import { useTheme } from '@/utils/theme/store';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  Clock,
  DollarSign,
  XCircle,
} from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FadeInView from "@/components/ui/FadeInView";
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { getWalletTransactions, getWalletSummary } from '@/utils/supabase/wallet';

export default function WalletTransactionsScreen() {
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 30;

  const loadTransactions = useCallback(async (reset = true) => {
    try {
      if (reset) {
        const [txData, walletData] = await Promise.all([
          getWalletTransactions({ limit: PAGE_SIZE, offset: 0 }),
          getWalletSummary(),
        ]);
        setTransactions(txData);
        setSummary(walletData);
        setHasMore(txData.length >= PAGE_SIZE);
      } else {
        setLoadingMore(true);
        const txData = await getWalletTransactions({ limit: PAGE_SIZE, offset: transactions.length });
        setTransactions(prev => [...prev, ...txData]);
        setHasMore(txData.length >= PAGE_SIZE);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [transactions.length]);

  useEffect(() => {
    loadTransactions(true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions(true);
  }, []);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      loadTransactions(false);
    }
  }, [loadingMore, hasMore, loading]);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount || 0);
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const gregorianDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return isRTL ? `${gregorianDate} - ${time}` : `${gregorianDate} • ${time}`;
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: '#10B981', label: isRTL ? 'مكتمل' : 'Completed' };
      case 'held':
        return { icon: Clock, color: '#F59E0B', label: isRTL ? 'محجوز' : 'Held' };
      case 'pending':
        return { icon: Clock, color: '#F59E0B', label: isRTL ? 'قيد الانتظار' : 'Pending' };
      case 'failed':
        return { icon: XCircle, color: '#EF4444', label: isRTL ? 'فشل' : 'Failed' };
      default:
        return { icon: Clock, color: colors.textMuted, label: status };
    }
  };

  const renderTransaction = ({ item, index }) => {
    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;
    const TypeIcon = item.type === 'incoming' ? ArrowDownCircle : ArrowUpCircle;
    const typeColor = item.type === 'incoming' ? '#10B981' : '#3B82F6';
    const amountValue = item.type === 'incoming' ? item.amount : -item.amount;

    return (
      <FadeInView delay={100 + index * 50}>
        <Pressable
          style={({ pressed }) => [
            styles.transactionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
              flexDirection: getRTLRowDirection(isRTL),
            },
          ]}
        >
          <View style={[styles.transactionIcon, { backgroundColor: typeColor + '20' }]}>
            <TypeIcon size={24} color={typeColor} />
          </View>

          <View style={[styles.transactionContent, { alignItems: getRTLStartAlign(isRTL) }]}>
            <Text
              style={[styles.transactionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View style={[styles.transactionMeta, { flexDirection: getRTLRowDirection(isRTL) }]}>
              <View style={[styles.statusContainer, { flexDirection: getRTLRowDirection(isRTL) }]}>
                <StatusIcon size={14} color={statusConfig.color} />
                <Text style={[styles.transactionStatus, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
              <Text style={[styles.transactionDot, { color: colors.textMuted }]}>&bull;</Text>
              <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                {formatDate(item.timestamp)}
              </Text>
            </View>
          </View>

          <Text style={[styles.transactionAmount, { color: amountValue >= 0 ? '#10B981' : '#EF4444' }]}>
            {formatCurrency(amountValue)}
          </Text>
        </Pressable>
      </FadeInView>
    );
  };

  // Loading state
  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar style={colors.statusBar} />
        <AppScrollView contentContainerStyle={{ gap: 16 }}>
          <SkeletonGroup>
            <Skeleton height={80} radius={16} width="100%" style={{ marginBottom: 16 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={80} radius={16} width="100%" style={{ marginBottom: 12 }} />
            ))}
          </SkeletonGroup>
        </AppScrollView>
      </LinearGradient>
    );
  }

  const totalIncoming = summary?.total_earned || 0;
  const totalWithdrawn = summary?.total_withdrawn || 0;

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      {/* Summary Banner */}
      <FadeInView
        delay={50}
        style={[styles.summaryBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconContainer, { backgroundColor: '#10B981' + '20' }]}>
            <ArrowDownCircle size={20} color="#10B981" />
          </View>
          <View style={[styles.summaryTextContainer, { alignItems: getRTLStartAlign(isRTL) }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? 'إجمالي الدخل' : 'Total Income'}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              +{(totalIncoming || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
            </Text>
          </View>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
            <ArrowUpCircle size={20} color="#3B82F6" />
          </View>
          <View style={[styles.summaryTextContainer, { alignItems: getRTLStartAlign(isRTL) }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? 'إجمالي المسحوبات' : 'Total Withdrawn'}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              -{(totalWithdrawn || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
            </Text>
          </View>
        </View>
      </FadeInView>

      {/* Transactions List */}
      <AppFlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
        ) : null}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <DollarSign size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {isRTL ? 'لا توجد معاملات' : 'No transactions yet'}
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
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
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
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  transactionCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionContent: {
    flex: 1,
    gap: 4,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    width: '100%',
  },
  transactionMeta: {
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusContainer: {
    alignItems: 'center',
    gap: 4,
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionDot: {
    fontSize: 12,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 100,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});
