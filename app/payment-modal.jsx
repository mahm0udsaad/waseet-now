import PaymentModal from '@/components/PaymentModal';
import { usePaymentFlowStore } from '@/utils/payments/paymentFlowStore';
import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';

export default function PaymentModalRoute() {
  const onCardPayment = usePaymentFlowStore((state) => state.onCardPayment);
  const onPaymentSubmitted = usePaymentFlowStore((state) => state.onPaymentSubmitted);
  const hasCallbacks = React.useRef(!!(onCardPayment || onPaymentSubmitted));

  useEffect(() => {
    // Only auto-dismiss if we never had callbacks (navigated here by mistake)
    if (!hasCallbacks.current && !onCardPayment && !onPaymentSubmitted) {
      router.back();
    }
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PaymentModal onClose={() => router.back()} />
    </>
  );
}
