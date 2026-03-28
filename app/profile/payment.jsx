import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/utils/theme/store';
import { useTranslation } from '@/utils/i18n/store';
import { CreditCard } from 'lucide-react-native';

export default function PaymentMethodsScreen() {
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.content}>
        <CreditCard size={48} color={colors.textMuted} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {isRTL
            ? 'يتم الدفع مباشرة عند إتمام كل معاملة'
            : 'Payments are processed per transaction'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
