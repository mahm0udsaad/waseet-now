import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { sendMessage as sendChatMessage } from "@/utils/supabase/chat";
import {
  completeDaminService,
  confirmDaminOrderParticipation,
  submitDaminDispute,
  getDaminOrderForChat,
} from "@/utils/supabase/daminOrders";
import {
  confirmOrderCompletion,
  getOrdersForConversation,
  subscribeToConversationOrders,
  updateOrderStatus,
  ORDER_STATUSES,
} from "@/utils/supabase/orders";
import { showToast } from "@/utils/notifications/inAppStore";

// Re-export for convenience (getDaminOrderForChat is also used directly by chat.jsx)
export { getDaminOrderForChat };

/**
 * Manages regular orders + damin order context for a chat conversation.
 */
export function useChatOrders({ conversationId, messages, isRTL }) {
  // ── Regular orders ──────────────────────────────────────────────────
  const [ordersForChat, setOrdersForChat] = useState([]);
  const [orderConfirmLoading, setOrderConfirmLoading] = useState(false);

  // Fetch + subscribe to ALL regular orders for this conversation
  useEffect(() => {
    if (!conversationId) return;
    let unsubscribe;

    const load = async () => {
      try {
        const orders = await getOrdersForConversation(conversationId);
        setOrdersForChat(orders);

        unsubscribe = subscribeToConversationOrders(conversationId, (updated) => {
          setOrdersForChat(updated);
        });
      } catch (err) {
        console.warn("Failed to load order context:", err);
      }
    };

    load();
    return () => unsubscribe?.();
  }, [conversationId]);

  // Derive the latest active order
  const activeOrder = useMemo(() => {
    if (ordersForChat.length === 0) return null;
    const activeStatuses = ["awaiting_payment", "payment_submitted", "awaiting_admin_transfer_approval", "payment_verified", "in_progress", "completion_requested", "paid"];
    const active = ordersForChat.find((o) => activeStatuses.includes(o.status));
    return active || ordersForChat[0];
  }, [ordersForChat]);

  const handleOrderConfirmCompletion = useCallback(() => {
    if (!activeOrder?.id || orderConfirmLoading) return;
    Alert.alert(
      isRTL ? "تأكيد اكتمال الخدمة" : "Confirm Service Completion",
      isRTL
        ? "هل أنت متأكد أن الخدمة تمت بنجاح؟ سيتم إطلاق الأموال عند تأكيد الطرفين."
        : "Are you sure the service has been completed? Funds will be released when both parties confirm.",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: isRTL ? "تأكيد" : "Confirm",
          onPress: async () => {
            setOrderConfirmLoading(true);
            try {
              const result = await confirmOrderCompletion(activeOrder.id);
              showToast({
                type: "success",
                title: isRTL ? "تم التأكيد" : "Confirmed",
                message: result.completed
                  ? (isRTL ? "تم اكتمال الطلب وإطلاق الأموال" : "Order completed and funds released")
                  : (isRTL ? "تم تأكيدك، بانتظار الطرف الآخر" : "Your confirmation recorded, waiting for the other party"),
              });
            } catch (err) {
              console.error("Failed to confirm order completion:", err);
              showToast({
                type: "error",
                title: isRTL ? "خطأ" : "Error",
                message: err?.message || (isRTL ? "فشل التأكيد" : "Failed to confirm"),
              });
            } finally {
              setOrderConfirmLoading(false);
            }
          },
        },
      ]
    );
  }, [activeOrder?.id, orderConfirmLoading, isRTL]);

  // ── Damin order ─────────────────────────────────────────────────────
  const [daminOrder, setDaminOrder] = useState(null);
  const [daminActionLoading, setDaminActionLoading] = useState(false);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  useEffect(() => {
    if (!conversationId) return;
    getDaminOrderForChat(conversationId)
      .then(setDaminOrder)
      .catch((err) => console.warn("Failed to load damin order context:", err));
  }, [conversationId]);

  // Re-fetch damin order when a payment receipt arrives via realtime
  const lastMessageId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (!conversationId || !lastMessageId) return;
    const lastMsg = messages[messages.length - 1];
    const hasPaymentReceipt = lastMsg?.attachments?.some(
      (a) => a.type === "payment_receipt" && a.status === "succeeded"
    );
    if (hasPaymentReceipt) {
      getDaminOrderForChat(conversationId)
        .then((updated) => { if (updated) setDaminOrder(updated); })
        .catch(() => {});
    }
  }, [lastMessageId, conversationId]);

  const handleDaminAction = useCallback(async (action, { openPaymentFlow, handleCardPayment, handleBankTransferSubmitted, router } = {}) => {
    if (!daminOrder?.order_id || daminActionLoading) return;
    const orderId = daminOrder.order_id;

    if (action === "confirm_participation") {
      Alert.alert(
        isRTL ? "تأكيد المشاركة" : "Confirm Participation",
        isRTL ? "هل تريد تأكيد مشاركتك في هذا الطلب؟" : "Do you want to confirm your participation in this order?",
        [
          { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
          {
            text: isRTL ? "تأكيد" : "Confirm",
            onPress: async () => {
              setDaminActionLoading(true);
              try {
                await confirmDaminOrderParticipation(orderId);
                const updated = await getDaminOrderForChat(conversationId);
                setDaminOrder(updated);
              } catch (e) {
                Alert.alert(isRTL ? "خطأ" : "Error", e.message);
              } finally {
                setDaminActionLoading(false);
              }
            },
          },
        ]
      );
    } else if (action === "confirm_service") {
      Alert.alert(
        isRTL ? "إنهاء الخدمة وتحرير المبلغ" : "End Service & Release Funds",
        isRTL
          ? "هل تريد تأكيد إتمام الخدمة وتحرير المبلغ إلى محفظة مقدم الخدمة؟"
          : "Confirm service completion and release funds to the service provider's wallet?",
        [
          { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
          {
            text: isRTL ? "تأكيد وتحرير" : "Confirm & Release",
            onPress: async () => {
              setDaminActionLoading(true);
              try {
                await completeDaminService(orderId);
                const serviceValue = Number(daminOrder.service_value || 0).toLocaleString();
                const completionMsg = isRTL
                  ? `✅ تم إنهاء الخدمة وتحرير المبلغ (${serviceValue} ر.س) إلى محفظة مقدم الخدمة.`
                  : `✅ Service completed. Funds (${serviceValue} SAR) released to the service provider's wallet.`;
                await sendChatMessage(conversationId, completionMsg);
                const updated = await getDaminOrderForChat(conversationId);
                setDaminOrder(updated);
              } catch (e) {
                Alert.alert(isRTL ? "خطأ" : "Error", e.message);
              } finally {
                setDaminActionLoading(false);
              }
            },
          },
        ]
      );
    } else if (action === "dispute") {
      setDisputeReason("");
      setDisputeModalVisible(true);
    } else if (action === "pay" && openPaymentFlow && router) {
      // Payment action — delegate to caller-provided payment flow
      openPaymentFlow({
        amount: daminOrder.total_amount,
        orderId,
        isDamin: true,
        handleCardPayment,
        handleBankTransferSubmitted,
        router,
      });
    }
  }, [daminOrder, daminActionLoading, conversationId, isRTL]);

  const handleDisputeSubmit = useCallback(async () => {
    if (!daminOrder?.order_id || !disputeReason.trim()) return;
    setDaminActionLoading(true);
    try {
      await submitDaminDispute(daminOrder.order_id, disputeReason);
      setDisputeModalVisible(false);
      setDisputeReason("");
      const updated = await getDaminOrderForChat(conversationId);
      setDaminOrder(updated);
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Error", e.message);
    } finally {
      setDaminActionLoading(false);
    }
  }, [daminOrder, disputeReason, conversationId, isRTL]);

  // ── Order dispute (regular) ─────────────────────────────────────────
  const [orderDisputeModalVisible, setOrderDisputeModalVisible] = useState(false);
  const [orderDisputeReason, setOrderDisputeReason] = useState("");
  const [orderDisputeOrderId, setOrderDisputeOrderId] = useState(null);
  const [orderDisputeLoading, setOrderDisputeLoading] = useState(false);

  const handleOpenOrderDispute = useCallback((orderId) => {
    if (!orderId) return;
    setOrderDisputeOrderId(orderId);
    setOrderDisputeReason("");
    setOrderDisputeModalVisible(true);
  }, []);

  const handleSubmitOrderDispute = useCallback(async () => {
    if (!orderDisputeOrderId || !orderDisputeReason.trim()) return;
    setOrderDisputeLoading(true);
    try {
      await updateOrderStatus(orderDisputeOrderId, ORDER_STATUSES.DISPUTED);
      const disputeMsg = isRTL
        ? `⚠️ تم رفع نزاع على الطلب.\nالسبب: ${orderDisputeReason.trim()}`
        : `⚠️ A dispute has been submitted for this order.\nReason: ${orderDisputeReason.trim()}`;
      if (conversationId) {
        try { await sendChatMessage(conversationId, disputeMsg); } catch {}
      }
      setOrderDisputeModalVisible(false);
      setOrderDisputeOrderId(null);
      setOrderDisputeReason("");
      Alert.alert(
        isRTL ? "تم" : "Done",
        isRTL ? "تم إرسال النزاع وسيتم مراجعته من الإدارة." : "Dispute submitted and will be reviewed by admin."
      );
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Error", e?.message || (isRTL ? "فشل إرسال النزاع" : "Failed to submit dispute"));
    } finally {
      setOrderDisputeLoading(false);
    }
  }, [orderDisputeOrderId, orderDisputeReason, isRTL, conversationId]);

  // ── Derived: paid order IDs ─────────────────────────────────────────
  const paidOrderIds = useMemo(() => {
    const ids = new Set();
    for (const msg of messages) {
      for (const att of msg.attachments || []) {
        if (att.type === "payment_receipt" && att.status === "succeeded" && att.order_id) {
          ids.add(String(att.order_id));
        }
      }
    }
    if (daminOrder && ["awaiting_completion", "completed", "completion_requested"].includes(daminOrder.status)) {
      ids.add(String(daminOrder.order_id));
      for (const msg of messages) {
        for (const att of msg.attachments || []) {
          if (att.type === "payment_link" && att.isDamin && att.order_id) {
            ids.add(String(att.order_id));
          }
        }
      }
    }
    const paidStatuses = ["payment_verified", "in_progress", "completion_requested", "completed", "paid"];
    for (const order of ordersForChat) {
      if (paidStatuses.includes(order.status)) {
        ids.add(String(order.id));
      }
    }
    return ids;
  }, [messages, daminOrder, ordersForChat]);

  // ── Damin status label ──────────────────────────────────────────────
  const getDaminStatusLabel = useCallback((status) => {
    const labels = {
      created: isRTL ? "بانتظار التأكيد" : "Awaiting Confirmation",
      pending_confirmations: isRTL ? "بانتظار التأكيد" : "Awaiting Confirmation",
      both_confirmed: isRTL ? "بانتظار الدفع" : "Awaiting Payment",
      payment_submitted: isRTL ? "بانتظار موافقة الإدارة" : "Awaiting Admin Approval",
      escrow_deposit: isRTL ? "تم إيداع المبلغ" : "Escrow Deposit Done",
      awaiting_completion: isRTL ? "تم الدفع · بانتظار إتمام الخدمة" : "Paid · Awaiting Completion",
      completion_requested: isRTL ? "بانتظار موافقة الإدارة" : "Pending Admin Approval",
      completed: isRTL ? "مكتمل" : "Completed",
    };
    return labels[status] || status;
  }, [isRTL]);

  // ── Refresh all ─────────────────────────────────────────────────────
  const refreshOrderContexts = useCallback(async () => {
    if (!conversationId) return;
    const tasks = [];
    tasks.push(
      getDaminOrderForChat(conversationId)
        .then((updated) => setDaminOrder(updated || null))
        .catch((err) => console.warn("Failed to refresh damin order context:", err))
    );
    tasks.push((async () => {
      try {
        const orders = await getOrdersForConversation(conversationId);
        setOrdersForChat(orders);
      } catch (err) {
        console.warn("Failed to refresh order context:", err);
      }
    })());
    await Promise.all(tasks);
  }, [conversationId]);

  return {
    // Regular orders
    ordersForChat,
    setOrdersForChat,
    activeOrder,
    orderConfirmLoading,
    handleOrderConfirmCompletion,
    // Damin
    daminOrder,
    setDaminOrder,
    daminActionLoading,
    handleDaminAction,
    disputeModalVisible,
    setDisputeModalVisible,
    disputeReason,
    setDisputeReason,
    handleDisputeSubmit,
    // Order dispute
    orderDisputeModalVisible,
    setOrderDisputeModalVisible,
    orderDisputeReason,
    setOrderDisputeReason,
    orderDisputeOrderId,
    orderDisputeLoading,
    handleOpenOrderDispute,
    handleSubmitOrderDispute,
    // Derived
    paidOrderIds,
    getDaminStatusLabel,
    // Refresh
    refreshOrderContexts,
  };
}
