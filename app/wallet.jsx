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
import { useTranslation } from '@/utils/i18n/store';
import { showToast } from '@/utils/notifications/inAppStore';
import FadeInView from "@/components/ui/FadeInView";
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { getWalletSummary } from '@/utils/supabase/wallet';

export default function WalletOverviewScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const withdrawalsEnabled =
    String(process.env.EXPO_PUBLIC_ENABLE_WITHDRAWALS ?? 'true').toLowerCase() !== 'false';

  const [walletData, setWalletData] = useState(null);
  const [walletError, setWalletError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWallet = useCallback(async () => {
    try {
      setWalletError(false);
      const data = await getWalletSummary();
      setWalletData(data);
    } catch (err) {
      console.error('Failed to load wallet:', err);
      setWalletError(true);
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

  const StatCard = ({ icon: Icon, label, value, iconColor, delay, testID }) => (
    <FadeInView
      testID={testID}
      delay={delay}
      style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.statIconContainer, { backgroundColor: iconColor + '20' }]}>
        <Icon size={24} color={iconColor} />
      </View>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </FadeInView>
  );

  const ActionButton = ({ icon: Icon, label, onPress, variant = 'primary', delay, testID }) => {
    const bgColor = variant === 'primary' ? colors.primary : colors.surface;
    const textColor = variant === 'primary' ? '#fff' : colors.text;
    const iconColor = variant === 'primary' ? '#fff' : colors.primary;

    return (
      <FadeInView delay={delay} style={styles.actionButtonWrapper}>
        <Pressable
          testID={testID}
          onPress={onPress}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: bgColor,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
              flexDirection: 'row',
            },
          ]}
        >
          <Icon size={20} color={iconColor} />
          <Text style={[styles.actionButtonText, { color: textColor, writingDirection: 'rtl' }]}>{label}</Text>
        </Pressable>
      </FadeInView>
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

  const available = walletData != null ? (walletData.available_balance ?? 0) : 0;
  const escrow = walletData != null ? (walletData.escrow_held ?? 0) : 0;
  const totalEarned = walletData != null ? (walletData.total_earned ?? 0) : 0;
  const monthIncome = walletData != null ? (walletData.this_month_income ?? 0) : 0;
  const monthWithdrawn = walletData != null ? (walletData.this_month_withdrawn ?? 0) : 0;

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <AppScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Main Balance Card */}
        <FadeInView
          testID="wallet-available-balance"
          delay={100}
          style={[styles.balanceCard, { backgroundColor: colors.primary }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + 'DD']}
            style={styles.balanceGradient}
          >
            <View style={[styles.balanceHeader, { flexDirection: 'row' }]}>
              <WalletIcon size={28} color="#fff" />
              <Text style={[styles.balanceTitle, { writingDirection: 'rtl' }]}>
                {isRTL ? 'الرصيد المتاح' : 'Available Balance'}
              </Text>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(available)}
            </Text>
            <Text style={styles.balanceSubtext}>
              {walletError
                ? (isRTL ? 'فشل تحميل الرصيد — اسحب للتحديث' : 'Failed to load — pull to refresh')
                : available > 0
                  ? (isRTL ? 'جاهز للسحب' : 'Ready to withdraw')
                  : (isRTL ? 'لا يوجد رصيد قابل للسحب' : 'No balance available')}
            </Text>
          </LinearGradient>
        </FadeInView>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon={Clock}
            label={isRTL ? 'قيد الانتظار' : 'In Escrow'}
            value={formatCurrency(escrow)}
            iconColor="#F59E0B"
            delay={200}
            testID="wallet-escrow-held"
          />
          <StatCard
            icon={TrendingUp}
            label={isRTL ? 'إجمالي المكاسب' : 'Total Earnings'}
            value={formatCurrency(totalEarned)}
            iconColor="#10B981"
            delay={250}
          />
        </View>

        {/* Info Banner */}
        <FadeInView
          delay={300}
          style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.infoBannerText, { color: colors.textSecondary, writingDirection: 'rtl' }]}>
            {isRTL
              ? 'المبالغ قيد الانتظار هي أموال محجوزة من المشترين وسيتم إصدارها عند اكتمال الطلب.'
              : 'Escrow amounts are funds held from buyers and will be released when orders are completed.'}
          </Text>
        </FadeInView>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isRTL ? 'الإجراءات' : 'Actions'}
          </Text>

          <ActionButton
            icon={ArrowUpCircle}
            label={isRTL ? 'سحب الأموال' : 'Withdraw Funds'}
            onPress={handleWithdrawPress}
            variant="primary"
            delay={350}
            testID="wallet-withdraw-btn"
          />

          <ActionButton
            icon={History}
            label={isRTL ? 'سجل المعاملات' : 'Transaction History'}
            onPress={() => router.push('/wallet-transactions')}
            variant="secondary"
            delay={400}
            testID="wallet-transactions-list"
          />
        </View>

        {/* Quick Stats */}
        <FadeInView
          delay={450}
          style={[styles.quickStatsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.quickStatsTitle, { color: colors.text }]}>
            {isRTL ? 'هذا الشهر' : 'This Month'}
          </Text>
          <View style={styles.quickStatRow}>
            <View style={[styles.quickStat, { flexDirection: 'row' }]}>
              <TrendingUp size={16} color="#10B981" />
              <Text style={[styles.quickStatLabel, { color: colors.textSecondary, writingDirection: 'rtl' }]}>
                {isRTL ? 'الدخل' : 'Income'}
              </Text>
              <Text style={[styles.quickStatValue, { color: '#10B981' }]}>
                +{formatCurrency(monthIncome)}
              </Text>
            </View>
            <View style={[styles.quickStat, { flexDirection: 'row' }]}>
              <TrendingDown size={16} color="#EF4444" />
              <Text style={[styles.quickStatLabel, { color: colors.textSecondary, writingDirection: 'rtl' }]}>
                {isRTL ? 'المسحوبات' : 'Withdrawn'}
              </Text>
              <Text style={[styles.quickStatValue, { color: '#EF4444' }]}>
                -{formatCurrency(monthWithdrawn)}
              </Text>
            </View>
          </View>
        </FadeInView>
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
