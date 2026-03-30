import DaminOrderContent from '@/components/DaminOrderModal';
import { usePendingDaminStore } from '@/utils/damin/pendingDaminStore';
import { createDmConversation } from '@/utils/supabase/chat';
import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';

export default function DaminPendingModalRoute() {
  const order = usePendingDaminStore((s) => s.order);
  const onConfirm = usePendingDaminStore((s) => s.onConfirm);
  const onReject = usePendingDaminStore((s) => s.onReject);
  const hasOrder = React.useRef(!!order);

  useEffect(() => {
    if (!hasOrder.current && !order) {
      router.back();
    }
  }, []);

  const handleConfirm = async (orderId) => {
    await onConfirm?.(orderId);
    usePendingDaminStore.getState().clearPendingDamin();
    // Navigate to the conversation with the payer
    const payerUserId = order?.payer_user_id;
    if (payerUserId) {
      try {
        const { conversation_id } = await createDmConversation(payerUserId);
        router.replace({
          pathname: '/chat',
          params: { id: conversation_id },
        });
        return;
      } catch (e) {
        console.warn('[DaminPendingModal] Failed to open chat:', e);
      }
    }
    router.back();
  };

  const handleClose = () => {
    usePendingDaminStore.getState().clearPendingDamin();
    router.back();
  };

  const handleViewDetails = (id) => {
    usePendingDaminStore.getState().clearPendingDamin();
    router.back();
    setTimeout(() => {
      router.push(`/damin-order-details?id=${id}`);
    }, 300);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DaminOrderContent
        order={order}
        onConfirm={handleConfirm}
        onReject={onReject}
        onViewDetails={handleViewDetails}
        onClose={handleClose}
      />
    </>
  );
}
