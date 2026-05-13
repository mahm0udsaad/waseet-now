import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { sendMessage as sendChatMessage, sendSystemMessage } from "@/utils/supabase/chat";
import { checkPaymobStatus, createPaymobIntention } from "@/utils/paymob";
import {
  confirmDaminCardPayment,
  getDaminOrderForChat,
  submitDaminPayment,
  updateDaminOrderMetadata,
  uploadTransferReceipt as uploadDaminTransferReceipt,
} from "@/utils/supabase/daminOrders";
import { getSupabaseSession } from "@/utils/supabase/client";
import {
  getOrdersForConversation,
  submitOrderBankTransfer,
  updateOrderStatus,
  uploadOrderTransferReceipt,
} from "@/utils/supabase/orders";
import { usePaymentFlowStore } from "@/utils/payments/paymentFlowStore";

// Sends the escrow-hold info card that appears after a confirmed card payment.
// Explicitly names Waseet Alan as the custodian and explains funds are locked until both parties confirm.
async function sendEscrowHoldMessage(convId, amount, isRTL) {
  const formatted = Number(amount || 0).toLocaleString();
  const content = isRTL
    ? `تم الدفع — المبلغ محتجز لدى وسيط الان\nتم استلام ${formatted} ر.س بنجاح وسيبقى محتجزاً لدى وسيط الان حتى اكتمال الخدمة وتأكيدها من كلا الطرفين. لن يُحوَّل للبائع إلا بعد موافقة الطرفين.`
    : `Payment received — held by Waseet Alan\nSAR ${formatted} has been successfully received and is securely held by Waseet Alan until the service is completed and confirmed by both parties. Funds will only be released to the seller once both sides confirm.`;
  await sendSystemMessage(convId, content, { card_type: "payment" });
}

// Sends a lighter escrow-pending card for bank-transfer submissions that are
// still awaiting admin approval — funds are not locked yet.
async function sendEscrowPendingMessage(convId, amount, isRTL) {
  const formatted = Number(amount || 0).toLocaleString();
  const content = isRTL
    ? `في انتظار تأكيد التحويل\nبعد مراجعة الإدارة وتأكيد استلام ${formatted} ر.س، سيُحتجز المبلغ لدى وسيط الان حتى اكتمال الخدمة وتأكيدها من كلا الطرفين.`
    : `Awaiting transfer confirmation\nOnce admin verifies receipt of SAR ${formatted}, the amount will be held by Waseet Alan until the service is completed and confirmed by both parties.`;
  await sendSystemMessage(convId, content, { card_type: "payment" });
}

// Sends payment instructions to the buyer immediately after a receipt is accepted.
// Shows bank account details so the buyer can start a transfer without opening the payment modal.
export async function sendPaymentInstructionMessage(convId, amount, isRTL) {
  const formatted = Number(amount || 0).toLocaleString();
  const content = isRTL
    ? `تعليمات الدفع — ${formatted} ر.س\nاضغط على "ادفع الآن" أو حوّل المبلغ مباشرة:\n\n• بطاقة ائتمانية/مدى (Visa · Mastercard · Mada)\n• تحويل بنكي:\n  البنك: مصرف الراجحي\n  اسم الحساب: مؤسسة وسيط الان\n  رقم الحساب: 646000010006087777004\n  IBAN: SA2380000646608017777004\n\nاكتب رقم جوالك في خانة البيان عند التحويل، ثم أرفق الإيصال داخل التطبيق.`
    : `Payment Instructions — SAR ${formatted}\nTap "Pay Now" or transfer directly:\n\n• Credit/Debit Card (Visa · Mastercard · Mada)\n• Bank Transfer:\n  Bank: AlRajhi Bank\n  Account Name: Waseet Alan Est.\n  Account No: 646000010006087777004\n  IBAN: SA2380000646608017777004\n\nWrite your phone number in the transfer narrative, then attach the receipt inside the app.`;
  await sendSystemMessage(convId, content, { card_type: "payment" });
}

/**
 * Handles all payment flows (card + bank transfer) for both regular and damin orders.
 *
 * Returns handlers and state needed by the chat screen's payment UI.
 */
export function useChatPayments({
  conversationId,
  messages,
  isRTL,
  router,
  params,
  daminOrder,
  setDaminOrder,
  setOrdersForChat,
  handleSendMessage,
}) {
  const [cardPayLoading, setCardPayLoading] = useState(false);
  const [selectedPaymentContext, setSelectedPaymentContext] = useState(null);
  const selectedPaymentContextRef = useRef(null);
  const lastHandledPayResultRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const openPaymentFlow = usePaymentFlowStore((state) => state.openPaymentFlow);

  // ── Handle return from Paymob checkout (damin) ──────────────────────
  useEffect(() => {
    if (!params.payResult || params.isDamin !== "true" || !params.orderId) return;

    const handleDaminPayReturn = async () => {
      try {
        const payResult = JSON.parse(params.payResult);
        const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
        const payResultKey = `damin:${orderId}:${payResult?.paymentId || "no-payment-id"}:${payResult?.status || "unknown"}`;
        if (lastHandledPayResultRef.current === payResultKey) return;
        lastHandledPayResultRef.current = payResultKey;
        const paymobPaymentId = payResult?.paymentId;
        const convId = conversationId || (Array.isArray(params.id) ? params.id[0] : params.id);

        if (payResult.status === "succeeded") {
          if (!paymobPaymentId) {
            Alert.alert(
              isRTL ? "تعذر التحقق من الدفع" : "Payment Verification Failed",
              isRTL ? "معرّف العملية مفقود." : "Missing payment reference."
            );
            return;
          }

          const verification = await checkPaymobStatus(paymobPaymentId);
          if (verification.status !== "succeeded") {
            Alert.alert(
              isRTL ? "الدفع غير مؤكد" : "Payment Not Confirmed",
              isRTL ? "لم يتم تأكيد الدفع من مزود الدفع بعد." : "Payment is not confirmed by the payment provider yet."
            );
            return;
          }

          const verifiedOrderId =
            verification?.raw?.metadata?.orderId ||
            verification?.raw?.metadata?.order_id ||
            verification?.raw?.orderId ||
            verification?.raw?.order_id ||
            null;
          if (verifiedOrderId && String(verifiedOrderId) !== String(orderId)) {
            Alert.alert(
              isRTL ? "تعذر التحقق من الدفع" : "Payment Verification Failed",
              isRTL ? "مرجع العملية لا يطابق هذا الطلب." : "Payment reference does not match this order."
            );
            return;
          }

          try {
            await updateDaminOrderMetadata(orderId, {
              payment_method: "card_paymob",
              paymob_payment_id: paymobPaymentId,
              payment_completed_at: new Date().toISOString(),
            });
          } catch (metaErr) {
            console.warn("[DaminPay] Failed to update order metadata:", metaErr);
          }

          try {
            await confirmDaminCardPayment(orderId);
          } catch (confirmErr) {
            console.error("[DaminPay] Failed to confirm card payment:", confirmErr);
          }

          if (convId) {
            try {
              const currentMessages = messagesRef.current || [];
              const alreadySent = currentMessages.some((m) =>
                (m?.attachments || []).some(
                  (a) => a.type === "payment_receipt" && a.status === "succeeded" && String(a.order_id) === String(orderId)
                )
              );
              if (!alreadySent) {
                await sendChatMessage(convId, null, [{
                  type: "payment_receipt",
                  status: "succeeded",
                  amount: params.amount || 0,
                  currency: "SAR",
                  method: "card",
                  methodLabelAr: "بطاقة ائتمان/خصم",
                  methodLabelEn: "Credit/Debit Card",
                  reference: paymobPaymentId,
                  createdAt: new Date().toISOString(),
                  order_id: orderId,
                }]);
                await sendEscrowHoldMessage(convId, params.amount, isRTL);
              }
            } catch (msgErr) {
              console.warn("[DaminPay] Failed to send payment receipt:", msgErr);
            }
          }

          try {
            const updated = await getDaminOrderForChat(convId || conversationId);
            setDaminOrder(updated);
          } catch (refreshErr) {
            console.warn("[DaminPay] Failed to refresh damin order:", refreshErr);
          }

          Alert.alert(
            isRTL ? "تم الدفع بنجاح" : "Payment Successful",
            isRTL ? "تم تأكيد الدفع تلقائياً." : "Payment has been automatically confirmed."
          );
        } else if (payResult.status === "failed") {
          Alert.alert(
            isRTL ? "فشل الدفع" : "Payment Failed",
            payResult.reason || (isRTL ? "لم تتم العملية. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.")
          );
        }
      } catch (outerErr) {
        console.error("[DaminPay] handleDaminPayReturn error:", outerErr);
      } finally {
        router.setParams({ payResult: undefined, isDamin: undefined, orderId: undefined, amount: undefined });
      }
    };

    handleDaminPayReturn();
  }, [params.payResult, params.isDamin, params.orderId, params.id, params.amount, conversationId, isRTL, router]);

  // ── Handle return from Paymob checkout (regular) ────────────────────
  useEffect(() => {
    if (!params.payResult || params.isDamin === "true" || !params.orderId) return;

    const handleRegularPayReturn = async () => {
      try {
        const payResult = JSON.parse(params.payResult);
        const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
        const payResultKey = `regular:${orderId}:${payResult?.paymentId || "no-id"}:${payResult?.status || "unknown"}`;
        if (lastHandledPayResultRef.current === payResultKey) return;
        lastHandledPayResultRef.current = payResultKey;
        const paymobPaymentId = payResult?.paymentId;
        const convId = conversationId || (Array.isArray(params.id) ? params.id[0] : params.id);

        if (payResult.status === "succeeded") {
          if (!paymobPaymentId) {
            Alert.alert(
              isRTL ? "تعذر التحقق من الدفع" : "Payment Verification Failed",
              isRTL ? "معرّف العملية مفقود." : "Missing payment reference."
            );
            return;
          }

          const verification = await checkPaymobStatus(paymobPaymentId);
          if (verification.status !== "succeeded") {
            Alert.alert(
              isRTL ? "الدفع غير مؤكد" : "Payment Not Confirmed",
              isRTL ? "لم يتم تأكيد الدفع من مزود الدفع بعد." : "Payment is not confirmed by the payment provider yet."
            );
            return;
          }

          try {
            await updateOrderStatus(orderId, "payment_verified");
          } catch (statusErr) {
            console.warn("[RegularPay] Failed to update order status:", statusErr);
          }

          if (convId) {
            try {
              const currentMessages = messagesRef.current || [];
              const alreadySent = currentMessages.some((m) =>
                (m?.attachments || []).some(
                  (a) => a.type === "payment_receipt" && a.status === "succeeded" && String(a.order_id) === String(orderId)
                )
              );
              if (!alreadySent) {
                await sendChatMessage(convId, null, [{
                  type: "payment_receipt",
                  status: "succeeded",
                  amount: params.amount || 0,
                  currency: "SAR",
                  method: "card",
                  methodLabelAr: "بطاقة ائتمان/خصم",
                  methodLabelEn: "Credit/Debit Card",
                  reference: paymobPaymentId,
                  createdAt: new Date().toISOString(),
                  order_id: orderId,
                }]);
                await sendEscrowHoldMessage(convId, params.amount, isRTL);
              }
            } catch (msgErr) {
              console.warn("[RegularPay] Failed to send payment receipt:", msgErr);
            }
          }

          try {
            const updated = await getOrdersForConversation(convId || conversationId);
            setOrdersForChat(updated);
          } catch (refreshErr) {
            console.warn("[RegularPay] Failed to refresh orders:", refreshErr);
          }

          Alert.alert(
            isRTL ? "تم الدفع بنجاح" : "Payment Successful",
            isRTL ? "تم تأكيد الدفع." : "Payment has been confirmed."
          );
        } else if (payResult.status === "failed") {
          Alert.alert(
            isRTL ? "فشل الدفع" : "Payment Failed",
            payResult.reason || (isRTL ? "لم تتم العملية. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.")
          );
        }
      } catch (outerErr) {
        console.error("[RegularPay] handleRegularPayReturn error:", outerErr);
      } finally {
        router.setParams({ payResult: undefined, orderId: undefined, amount: undefined });
      }
    };

    handleRegularPayReturn();
  }, [params.payResult, params.isDamin, params.orderId, params.id, params.amount, conversationId, isRTL, router]);

  // ── Card payment handler ────────────────────────────────────────────
  const handleCardPayment = useCallback(async (paymentMethod = "card") => {
    const ctx = selectedPaymentContextRef.current;
    if (cardPayLoading || !ctx) return;

    setCardPayLoading(true);
    try {
      const session = await getSupabaseSession();
      const user = session?.user;
      const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || "";
      const nameParts = displayName.split(" ");

      const isDamin = !!ctx.isDamin;

      const { paymentId, checkoutUrl } = await createPaymobIntention({
        amountSar: Number(ctx.amount),
        customer: {
          firstName: nameParts[0] || "User",
          lastName: nameParts.slice(1).join(" ") || "N/A",
          email: user?.email || `${user?.id}@wasitalan.com`,
          phone: user?.phone || "",
        },
        metadata: {
          orderId: ctx.orderId,
          orderType: isDamin ? "damin" : "receipt",
          conversationId,
        },
        paymentMethod,
      });

      router.push({
        pathname: "/paymob-checkout",
        params: {
          checkoutUrl,
          paymentId,
          orderId: ctx.orderId,
          conversationId,
          amount: ctx.amount,
          ...(isDamin ? { isDamin: "true" } : {}),
        },
      });
    } catch (err) {
      console.error("Failed to create payment intention:", err);
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        isRTL ? "فشل إنشاء عملية الدفع. حاول مرة أخرى." : "Failed to create payment. Please try again."
      );
    } finally {
      setCardPayLoading(false);
    }
  }, [cardPayLoading, conversationId, isRTL, router]);

  // ── Bank transfer handler ───────────────────────────────────────────
  const handleBankTransferSubmitted = useCallback(async ({ phoneNumber, receiptUri }) => {
    const ctx = selectedPaymentContextRef.current;
    if (!ctx?.orderId) return false;

    const isDamin = !!ctx.isDamin;
    setCardPayLoading(true);

    try {
      if (isDamin) {
        const orderId = ctx.orderId;
        const metadataUpdate = {
          payment_method: "bank_transfer",
          payment_submitted_at_client: new Date().toISOString(),
        };
        if (phoneNumber) metadataUpdate.transfer_phone = phoneNumber;

        if (receiptUri) {
          try {
            const receiptUrl = await uploadDaminTransferReceipt(orderId, receiptUri);
            if (receiptUrl) metadataUpdate.transfer_receipt_url = receiptUrl;
          } catch (uploadErr) {
            console.warn("Failed to upload damin receipt:", uploadErr);
          }
        }

        await updateDaminOrderMetadata(orderId, metadataUpdate);
        await submitDaminPayment(orderId);

        const amount = Number(ctx.amount || 0).toFixed(2);
        const msg = isRTL
          ? `تم إرسال إيصال التحويل البنكي\nالمبلغ: ${amount} ر.س\nسيتم مراجعته من قبل الإدارة.`
          : `Bank transfer receipt submitted\nAmount: ${amount} SAR\nUnder admin review.`;
        if (conversationId) {
          try {
            await sendChatMessage(conversationId, msg);
            await sendEscrowPendingMessage(conversationId, ctx.amount, isRTL);
          } catch {}
        }

        try {
          const updated = await getDaminOrderForChat(conversationId);
          setDaminOrder(updated);
        } catch {}

        Alert.alert(
          isRTL ? "تم" : "Done",
          isRTL ? "تم إرسال الدفع. سيتم التحقق والتأكيد قريباً." : "Payment submitted. It will be verified and confirmed soon."
        );
      } else {
        const orderId = ctx.orderId;

        let receiptUrl = null;
        if (receiptUri) {
          try {
            receiptUrl = await uploadOrderTransferReceipt(orderId, receiptUri);
          } catch (uploadErr) {
            console.warn("Failed to upload order transfer receipt:", uploadErr);
          }
        }

        await submitOrderBankTransfer(orderId, { phoneNumber, receiptUrl });

        await handleSendMessage("", [{
          type: "payment_receipt",
          status: "pending",
          amount: ctx.amount,
          currency: "SAR",
          method: "bank_transfer",
          methodLabelAr: "تحويل بنكي",
          methodLabelEn: "Bank Transfer",
          reference: phoneNumber,
          order_id: orderId,
          createdAt: new Date().toISOString(),
        }]);

        try {
          await sendEscrowPendingMessage(conversationId, ctx.amount, isRTL);
        } catch {}

        Alert.alert(
          isRTL ? "تم" : "Done",
          isRTL
            ? "تم إرسال الحوالة البنكية وبانتظار موافقة الإدارة."
            : "Bank transfer submitted. Waiting for admin approval."
        );
      }
      return true;
    } catch (err) {
      Alert.alert(isRTL ? "خطأ" : "Error", err.message);
      return false;
    } finally {
      setCardPayLoading(false);
    }
  }, [handleSendMessage, isRTL, conversationId]);

  // ── Payment press (from message bubble) ─────────────────────────────
  const handlePaymentPress = useCallback((paymentData) => {
    const isDamin =
      paymentData.isDamin ||
      (daminOrder && String(paymentData.orderId) === String(daminOrder.order_id));
    const paymentContext = { ...paymentData, isDamin: !!isDamin };
    setSelectedPaymentContext(paymentContext);
    selectedPaymentContextRef.current = paymentContext;
    openPaymentFlow({
      amount: paymentContext.amount,
      onCardPayment: handleCardPayment,
      onPaymentSubmitted: handleBankTransferSubmitted,
    });
    router.push("/payment-modal");
  }, [daminOrder, openPaymentFlow, router, handleCardPayment, handleBankTransferSubmitted]);

  // Helper to set payment context externally (for damin "pay" action)
  const setPaymentContextAndOpen = useCallback((paymentContext) => {
    setSelectedPaymentContext(paymentContext);
    selectedPaymentContextRef.current = paymentContext;
    openPaymentFlow({
      amount: paymentContext.amount,
      onCardPayment: handleCardPayment,
      onPaymentSubmitted: handleBankTransferSubmitted,
    });
    router.push("/payment-modal");
  }, [openPaymentFlow, handleCardPayment, handleBankTransferSubmitted, router]);

  return {
    cardPayLoading,
    handleCardPayment,
    handleBankTransferSubmitted,
    handlePaymentPress,
    setPaymentContextAndOpen,
  };
}
