import { useEffect, useState, useCallback } from 'react';
import { getSupabaseSession, supabase } from '@/utils/supabase/client';
import {
  confirmDaminOrderParticipation,
  rejectDaminOrderParticipation,
  linkUserToDaminOrder,
} from '@/utils/supabase/daminOrders';

/**
 * Checks for pending Damin orders where the current user is the beneficiary
 * and has not yet confirmed participation. Returns the first pending order
 * and handlers for confirm/reject so a modal can be shown.
 */
export function usePendingDaminOrder(isReady) {
  const [pendingOrder, setPendingOrder] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const session = await getSupabaseSession();
      if (!session?.user) return;

      const userId = session.user.id;
      const userPhone = session.user.phone;
      if (!userPhone) return;

      // Find orders where user is beneficiary and hasn't confirmed yet
      const digitsOnly = userPhone.replace(/[^0-9]/g, '');
      const withPlus = '+' + digitsOnly;

      const { data, error } = await supabase
        .from('damin_orders')
        .select('*')
        .or(
          `beneficiary_phone.eq.${digitsOnly},beneficiary_phone.eq.${withPlus},beneficiary_user_id.eq.${userId}`
        )
        .in('status', ['created', 'pending_confirmations'])
        .is('beneficiary_confirmed_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('[usePendingDaminOrder] fetch error:', error);
        return;
      }

      if (data?.length) {
        setPendingOrder(data[0]);
        setDismissed(false);
      } else {
        setPendingOrder(null);
      }
    } catch (e) {
      console.warn('[usePendingDaminOrder]', e);
    }
  }, []);

  // Check on app ready
  useEffect(() => {
    if (!isReady) return;
    fetchPending();
  }, [isReady, fetchPending]);

  // Listen for new damin orders in real-time
  useEffect(() => {
    if (!isReady) return;

    const channel = supabase
      .channel('damin-pending')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'damin_orders' },
        () => { fetchPending(); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'damin_orders' },
        () => { fetchPending(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, fetchPending]);

  const handleConfirm = useCallback(async (orderId) => {
    // Link user ID to the order first (needed when matched by phone only)
    const session = await getSupabaseSession();
    if (session?.user?.phone) {
      await linkUserToDaminOrder(orderId, session.user.phone);
    }
    await confirmDaminOrderParticipation(orderId);
    setPendingOrder(null);
  }, []);

  const handleReject = useCallback(async (orderId) => {
    // Link user ID to the order first (needed when matched by phone only)
    const session = await getSupabaseSession();
    if (session?.user?.phone) {
      await linkUserToDaminOrder(orderId, session.user.phone);
    }
    await rejectDaminOrderParticipation(orderId, '');
    setPendingOrder(null);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    pendingOrder: dismissed ? null : pendingOrder,
    onConfirm: handleConfirm,
    onReject: handleReject,
    onDismiss: handleDismiss,
    refreshPending: fetchPending,
  };
}
