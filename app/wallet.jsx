import { AppScrollView } from '@/components/layout';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Wallet as WalletIcon,
  ArrowUpCircle,
  Clock,
  History,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { useTheme } from '@/utils/theme/store';
import { useTranslation, getRTLRowDirection, getRTLTextAlign } from '@/utils/i18n/store';
import { showToast } from '@/utils/notifications/inAppStore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { getWalletSummary } from '@/utils/supabase/wallet';

export default function WalletOverviewScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const withdrawalsEnabled =
    String(process.env.EXPO_PUBLIC_ENABLE_WITHDRAWALS ?? 'true').toLowerCase() !== 'false';

  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWallet = useCallback(async () => {
    try {
      const data = await getWalletSummary();
      setWalletData(data);
    } catch (err) {
      console.error('Failed to load wallet:', err);
      showToast({ id: 'wallet-load-error', title: isRTL ? 'خطأ' : 'Error', body: isRTL ? 'فشل تحميل المحفظة' : 'Failed to load wallet', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWallet();
  }, [loadWallet]);

  const handleWithdrawPress = useCallback(() => {
    if (withdrawalsEnabled) {
      router.push('/wallet-withdraw');
      return;
    }

    Alert.alert(
      isRTL ? 'غير متاح حالياً' : 'Not Available Yet',
      isRTL
        ? 'السحب غير متاح حالياً وسيتم تفعيله قريباً.'
        : 'Withdrawals are not available yet and will be enabled soon.'
    );
  }, [withdrawalsEnabled, router, isRTL]);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const formatCurrency = (amount) => {
    return `${(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
  };

  const StatCard = ({ icon: Icon, label, value, iconColor, entering, testID }) => (
    <Animated.View
      testID={testID}
      entering={entering}
      style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.statIconContainer, { backgroundColor: iconColor + '20' }]}>
        <Icon size={24} color={iconColor} />
      </View>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </Animated.View>
  );

  const ActionButton = ({ icon: Icon, label, onPress, variant = 'primary', entering, testID }) => {
    const bgColor = variant === 'primary' ? colors.primary : colors.surface;
    const textColor = variant === 'primary' ? '#fff' : colors.text;
    const iconColor = variant === 'primary' ? '#fff' : colors.primary;

    return (
      <Animated.View entering={entering} style={styles.actionButtonWrapper}>
        <Pressable
          testID={testID}
          onPress={onPress}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: bgColor,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1
            },
          ]}
        >
          <Icon size={20} color={iconColor} />
          <Text style={[styles.actionButtonText, { color: textColor }]}>{label}</Text>
        </Pressable>
      </Animated.View>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <LinearGradient colors={gradientColors} style={styles.container}>
        <StatusBar style={colors.statusBar} />
        <AppScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonGroup>
            <Skeleton height={160} radius={20} width="100%" style={{ marginBottom: 20 }} />
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <Skeleton height={120} radius={16} width="48%" />
              <Skeleton height={120} radius={16} width="48%" />
            </View>
            <Skeleton height={60} radius={12} width="100%" style={{ marginBottom: 24 }} />
            <Skeleton height={52} radius={12} width="100%" style={{ marginBottom: 12 }} />
            <Skeleton height={52} radius={12} width="100%" />
          </SkeletonGroup>
        </AppScrollView>
      </LinearGradient>
    );
  }

  const available = walletData?.available_balance || 0;
  const escrow = walletData?.escrow_held || 0;
  const totalEarned = walletData?.total_earned || 0;
  const monthIncome = walletData?.this_month_income || 0;
  const monthWithdrawn = walletData?.this_month_withdrawn || 0;

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <AppScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Main Balance Card */}
        <Animated.View
          testID="wallet-available-balance"
          entering={FadeInDown.delay(100)}
          style={[styles.balanceCard, { backgroundColor: colors.primary }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + 'DD']}
            style={styles.balanceGradient}
          >
            <View style={[styles.balanceHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
              <WalletIcon size={28} color="#fff" />
              <Text style={styles.balanceTitle}>
                {isRTL ? 'الرصيد المتاح' : 'Available Balance'}
              </Text>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(available)}
            </Text>
            <Text style={styles.balanceSubtext}>
              {available > 0
                ? (isRTL ? 'جاهز للسحب' : 'Ready to withdraw')
                : (isRTL ? 'لا يوجد رصيد قابل للسحب' : 'No balance available')}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon={Clock}
            label={isRTL ? 'قيد الانتظار' : 'In Escrow'}
            value={formatCurrency(escrow)}
            iconColor="#F59E0B"
            entering={FadeInDown.delay(200)}
            testID="wallet-escrow-held"
          />
          <StatCard
            icon={TrendingUp}
            label={isRTL ? 'إجمالي المكاسب' : 'Total Earnings'}
            value={formatCurrency(totalEarned)}
            iconColor="#10B981"
            entering={FadeInDown.delay(250)}
          />
        </View>

        {/* Info Banner */}
        <Animated.View
          entering={FadeInDown.delay(300)}
          style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
            {isRTL
              ? 'المبالغ قيد الانتظار هي أموال محجوزة من المشترين وسيتم إصدارها عند اكتمال الطلب.'
              : 'Escrow amounts are funds held from buyers and will be released when orders are completed.'}
          </Text>
        </Animated.View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'الإجراءات' : 'Actions'}
          </Text>

          <ActionButton
            icon={ArrowUpCircle}
            label={isRTL ? 'سحب الأموال' : 'Withdraw Funds'}
            onPress={handleWithdrawPress}
            variant="primary"
            entering={FadeInDown.delay(350)}
            testID="wallet-withdraw-btn"
          />

          <ActionButton
            icon={History}
            label={isRTL ? 'سجل المعاملات' : 'Transaction History'}
            onPress={() => router.push('/wallet-transactions')}
            variant="secondary"
            entering={FadeInDown.delay(400)}
            testID="wallet-transactions-list"
          />
        </View>

        {/* Quick Stats */}
        <Animated.View
          entering={FadeInDown.delay(450)}
          style={[styles.quickStatsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.quickStatsTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? 'هذا الشهر' : 'This Month'}
          </Text>
          <View style={styles.quickStatRow}>
            <View style={[styles.quickStat, { flexDirection: getRTLRowDirection(isRTL) }]}>
              <TrendingUp size={16} color="#10B981" />
              <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>
                {isRTL ? 'الدخل' : 'Income'}
              </Text>
              <Text style={[styles.quickStatValue, { color: '#10B981' }]}>
                +{formatCurrency(monthIncome)}
              </Text>
            </View>
            <View style={[styles.quickStat, { flexDirection: getRTLRowDirection(isRTL) }]}>
              <TrendingDown size={16} color="#EF4444" />
              <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>
                {isRTL ? 'المسحوبات' : 'Withdrawn'}
              </Text>
              <Text style={[styles.quickStatValue, { color: '#EF4444' }]}>
                -{formatCurrency(monthWithdrawn)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </AppScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 20,
  },
  balanceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  balanceGradient: {
    padding: 24,
  },
  balanceHeader: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  infoBannerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButtonWrapper: {
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickStatsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickStatRow: {
    gap: 12,
  },
  quickStat: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  quickStatLabel: {
    fontSize: 13,
    flex: 1,
  },
  quickStatValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});
