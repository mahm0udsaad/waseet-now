import { useTranslation } from '@/utils/i18n/store';
import { useTheme } from '@/utils/theme/store';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Building2,
  Check,
  Info,
  Wallet
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FadeInView from "@/components/ui/FadeInView";
import { getWalletSummary, submitWithdrawalRequest } from '@/utils/supabase/wallet';

export default function WalletWithdrawScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const withdrawalsEnabled =
    String(process.env.EXPO_PUBLIC_ENABLE_WITHDRAWALS ?? 'true').toLowerCase() !== 'false';

  const [availableBalance, setAvailableBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!withdrawalsEnabled) {
      Alert.alert(
        isRTL ? 'غير متاح حالياً' : 'Not Available Yet',
        isRTL
          ? 'السحب غير متاح حالياً وسيتم تفعيله قريباً.'
          : 'Withdrawals are not available yet and will be enabled soon.',
        [{ text: isRTL ? 'موافق' : 'OK', onPress: () => router.back() }]
      );
      return;
    }

    getWalletSummary()
      .then((data) => setAvailableBalance(data?.available_balance || 0))
      .catch((err) => console.error('Failed to load balance:', err))
      .finally(() => setBalanceLoading(false));
  }, [withdrawalsEnabled, isRTL, router]);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  // Withdrawal methods
  const withdrawalMethods = [
    {
      id: 'bank',
      icon: Building2,
      label: isRTL ? 'تحويل بنكي' : 'Bank Transfer',
      description: isRTL ? 'يستغرق 1-3 أيام عمل' : 'Takes 1-3 business days',
      fee: 0,
    },
  ];

  const formatCurrency = (amount) => {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
  };

  const calculateFee = () => {
    const method = withdrawalMethods.find(m => m.id === selectedMethod);
    return method ? method.fee : 0;
  };

  const calculateTotal = () => {
    const amount = parseFloat(withdrawAmount) || 0;
    const fee = calculateFee();
    return amount - fee;
  };

  const handleQuickAmount = (percentage) => {
    const amount = availableBalance * percentage;
    setWithdrawAmount(amount.toFixed(2));
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);

    if (!amount || amount <= 0) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount'
      );
      return;
    }

    if (amount > availableBalance) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'المبلغ يتجاوز الرصيد المتاح' : 'Amount exceeds available balance'
      );
      return;
    }

    if (!iban.trim()) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'الرجاء إدخال رقم الآيبان' : 'Please enter your IBAN'
      );
      return;
    }

    if (!bankName.trim()) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'الرجاء إدخال اسم البنك' : 'Please enter bank name'
      );
      return;
    }

    if (!accountHolderName.trim()) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'الرجاء إدخال اسم صاحب الحساب' : 'Please enter account holder name'
      );
      return;
    }

    setSubmitting(true);
    try {
      await submitWithdrawalRequest({
        amount,
        iban: iban.trim(),
        bankName: bankName.trim(),
        accountHolderName: accountHolderName.trim(),
      });
      Alert.alert(
        isRTL ? 'تم بنجاح' : 'Success',
        isRTL
          ? `تم تقديم طلب السحب بنجاح. سيتم معالجة ${formatCurrency(amount)}.`
          : `Withdrawal request submitted successfully. ${formatCurrency(amount)} will be processed.`,
        [{ text: isRTL ? 'موافق' : 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        e.message || (isRTL ? 'فشل تقديم طلب السحب' : 'Failed to submit withdrawal request')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const MethodCard = ({ method, isSelected, onSelect }) => {
    const Icon = method.icon;
    return (
      <Pressable
        onPress={onSelect}
        style={[
          styles.methodCard,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
            flexDirection: 'row',
          },
        ]}
      >
        <View style={[styles.methodIcon, { backgroundColor: colors.primary + '20' }]}>
          <Icon size={24} color={colors.primary} />
        </View>
        <View style={[styles.methodInfo, { alignItems: 'flex-start' }]}>
          <Text style={[styles.methodLabel, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {method.label}
          </Text>
          <Text style={[styles.methodDescription, { color: colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {method.description}
          </Text>
          {method.fee > 0 && (
            <Text style={[styles.methodFee, { color: colors.textMuted, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isRTL ? `رسوم: ${method.fee} ريال` : `Fee: ${method.fee} SAR`}
            </Text>
          )}
        </View>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
            <Check size={16} color="#fff" />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Available Balance */}
        <FadeInView
          delay={100}
          style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.balanceHeader, { flexDirection: 'row' }]}>
            <Wallet size={20} color={colors.primary} />
            <Text style={[styles.balanceLabel, { color: colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isRTL ? 'الرصيد المتاح' : 'Available Balance'}
            </Text>
          </View>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>
            {balanceLoading ? '...' : formatCurrency(availableBalance)}
          </Text>
        </FadeInView>

        {/* Amount Input */}
        <FadeInView delay={150} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {isRTL ? 'المبلغ' : 'Amount'}
          </Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                flexDirection: 'row',
              },
            ]}
          >
            <TextInput
              testID="withdraw-amount-input"
              style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
              placeholder={isRTL ? 'أدخل المبلغ' : 'Enter amount'}
              placeholderTextColor={colors.textMuted}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              writingDirection={isRTL ? 'rtl' : 'ltr'}
            />
            <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>SAR</Text>
          </View>
          
          {/* Quick Amount Buttons */}
          <View style={[styles.quickAmounts, { flexDirection: 'row' }]}>
            <Pressable
              onPress={() => handleQuickAmount(0.25)}
              style={[styles.quickButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.quickButtonText, { color: colors.text }]}>25%</Text>
            </Pressable>
            <Pressable
              onPress={() => handleQuickAmount(0.50)}
              style={[styles.quickButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.quickButtonText, { color: colors.text }]}>50%</Text>
            </Pressable>
            <Pressable
              onPress={() => handleQuickAmount(0.75)}
              style={[styles.quickButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.quickButtonText, { color: colors.text }]}>75%</Text>
            </Pressable>
            <Pressable
              onPress={() => handleQuickAmount(1.00)}
              style={[styles.quickButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.quickButtonText, { color: '#fff' }]}>
                {isRTL ? 'الكل' : 'All'}
              </Text>
            </Pressable>
          </View>
        </FadeInView>

        {/* Withdrawal Method */}
        <FadeInView delay={200} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {isRTL ? 'طريقة الدفع' : 'Withdrawal Method'}
          </Text>
          {withdrawalMethods.map((method) => (
            <MethodCard
              key={method.id}
              method={method}
              isSelected={selectedMethod === method.id}
              onSelect={() => setSelectedMethod(method.id)}
            />
          ))}
        </FadeInView>

        {/* Bank Details */}
        <FadeInView delay={250} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {isRTL ? 'بيانات الحساب البنكي' : 'Bank Account Details'}
          </Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                flexDirection: 'row',
              },
            ]}
          >
            <TextInput
              testID="withdraw-iban-input"
              style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', fontSize: 15, fontWeight: '400' }]}
              placeholder={isRTL ? 'رقم الآيبان (IBAN)' : 'IBAN Number'}
              placeholderTextColor={colors.textMuted}
              value={iban}
              onChangeText={setIban}
              autoCapitalize="characters"
            />
          </View>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                flexDirection: 'row',
              },
            ]}
          >
            <TextInput
              testID="withdraw-bank-name-input"
              style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', fontSize: 15, fontWeight: '400' }]}
              placeholder={isRTL ? 'اسم البنك' : 'Bank Name'}
              placeholderTextColor={colors.textMuted}
              value={bankName}
              onChangeText={setBankName}
            />
          </View>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                flexDirection: 'row',
              },
            ]}
          >
            <TextInput
              testID="withdraw-holder-name-input"
              style={[styles.input, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', fontSize: 15, fontWeight: '400' }]}
              placeholder={isRTL ? 'اسم صاحب الحساب' : 'Account Holder Name'}
              placeholderTextColor={colors.textMuted}
              value={accountHolderName}
              onChangeText={setAccountHolderName}
            />
          </View>
        </FadeInView>

        {/* Summary */}
        {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
          <FadeInView
            delay={250}
            style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.summaryTitle, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isRTL ? 'ملخص' : 'Summary'}
            </Text>
            <View style={[styles.summaryRow, { flexDirection: 'row' }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {isRTL ? 'المبلغ' : 'Amount'}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text, textAlign: 'auto' }]}>
                {formatCurrency(parseFloat(withdrawAmount))}
              </Text>
            </View>
            {calculateFee() > 0 && (
              <View style={[styles.summaryRow, { flexDirection: 'row' }]}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {isRTL ? 'الرسوم' : 'Fee'}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.error, textAlign: 'auto' }]}>
                  -{formatCurrency(calculateFee())}
                </Text>
              </View>
            )}
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={[styles.summaryRow, { flexDirection: 'row' }]}>
              <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: 'bold', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {isRTL ? 'المجموع' : 'Total'}
              </Text>
              <Text style={[styles.summaryTotal, { color: colors.primary, textAlign: 'auto' }]}>
                {formatCurrency(calculateTotal())}
              </Text>
            </View>
          </FadeInView>
        )}

        {/* Info Banner */}
        <FadeInView
          delay={300}
          style={[
            styles.infoBanner,
            {
              backgroundColor: colors.primary + '10',
              borderColor: colors.primary + '30',
              flexDirection: 'row',
            },
          ]}
        >
          <Info size={20} color={colors.primary} />
          <Text style={[styles.infoBannerText, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {isRTL
              ? 'ستتم معالجة طلب السحب الخاص بك وفقًا لطريقة الدفع المحددة.'
              : 'Your withdrawal request will be processed according to the selected payment method.'}
          </Text>
        </FadeInView>

        {/* Confirm Button */}
        <FadeInView delay={350}>
          <Pressable
            testID="withdraw-submit-btn"
            onPress={handleWithdraw}
            disabled={submitting}
            style={({ pressed }) => [
              styles.confirmButton,
              {
                backgroundColor: colors.primary,
                opacity: submitting ? 0.6 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>
                {isRTL ? 'تأكيد السحب' : 'Confirm Withdrawal'}
              </Text>
            )}
          </Pressable>
        </FadeInView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  balanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
    minWidth: 0,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
  },
  methodFee: {
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
