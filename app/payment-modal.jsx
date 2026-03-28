import PaymentModal from '@/components/PaymentModal';
import { usePaymentFlowStore } from '@/utils/payments/paymentFlowStore';
import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';

export default function PaymentModalRoute() {
  const onCardPayment = usePaymentFlowStore((state) => state.onCardPayment);
  const onPaymentSubmitted = usePaymentFlowStore((state) => state.onPaymentSubmitted);

  useEffect(() => {
    if (!onCardPayment && !onPaymentSubmitted) {
      router.back();
    }
  }, [onCardPayment, onPaymentSubmitted]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PaymentModal onClose={() => router.back()} />
    </>
  );
}
