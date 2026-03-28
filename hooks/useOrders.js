import { useState, useEffect, useCallback } from "react";
import { fetchUserOrders, fetchOrderById } from "@/utils/supabase/orders";
import { fetchUserDaminOrders } from "@/utils/supabase/daminOrders";

/**
 * Hook to fetch and manage user orders (both regular and damin orders)
 */
export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      // Fetch both regular orders and damin orders in parallel
      const [regularOrders, daminOrders] = await Promise.all([
        fetchUserOrders().catch(err => {
          console.warn('Failed to fetch regular orders:', err);
          return [];
        }),
        fetchUserDaminOrders().catch(err => {
          console.warn('Failed to fetch damin orders:', err);
          return [];
        })
      ]);

      // Transform damin orders to match regular order format
      // Keep original damin status in originalStatus for confirmation logic
      const transformedDaminOrders = (daminOrders || []).map(order => ({
        ...order,
        ad: {
          id: order.id,
          title: 'خدمة ضامن', // Always show "Damin Service" instead of full description
          type: 'dhamen',
          owner_id: order.creator_id,
        },
        amount: order.total_amount,
        currency: 'SAR',
        originalDaminStatus: order.status,
        // Map damin order status to regular order status for display
        status: order.status === 'created' || order.status === 'pending_confirmations'
          ? 'pending_payment'
          : order.status === 'both_confirmed'
          ? 'paid'
          : order.status === 'awaiting_payment'
          ? 'awaiting_payment'
          : order.status === 'payment_submitted'
          ? 'payment_submitted'
          : order.status,
        isDaminOrder: true,
      }));

      // Merge, deduplicate by ID, and sort by created_at
      const merged = [...(regularOrders || []), ...transformedDaminOrders];
      const seen = new Set();
      const allOrders = merged
        .filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true; })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setOrders(allOrders);
    } catch (err) {
      console.error("Error loading orders:", err);
      setError(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return {
    orders,
    loading,
    refreshing,
    error,
    refetch: loadOrders,
  };
}

/**
 * Hook to fetch a single order by ID
 * @param {string} orderId - Order ID
 */
export function useOrder(orderId) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrder = async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.error("Error loading order:", err);
      setError(err?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  return {
    order,
    loading,
    error,
    refetch: loadOrder,
  };
}

