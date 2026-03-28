import MessageBubble from "@/components/chat/MessageBubble";
import SystemMessageCard from "@/components/chat/SystemMessageCard";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { useChatConversation } from "@/hooks/useChatConversation";
import { useChatReceipt } from "@/hooks/useChatReceipt";
import { getRTLInverseRowDirection, getRTLRowDirection, getRTLStartAlign, getRTLTextAlign, useTranslation } from "@/utils/i18n/store";
import { showToast } from "@/utils/notifications/inAppStore";
import { usePaymentFlowStore } from "@/utils/payments/paymentFlowStore";
import { checkPaymobStatus } from "@/utils/paymob";
import { sendMessage as sendChatMessage } from "@/utils/supabase/chat";
import {
  completeDaminService,
  confirmDaminCardPayment,
  confirmDaminOrderParticipation,
  submitDaminDispute,
  submitDaminPayment,
  updateDaminOrderMetadata,
  uploadTransferReceipt as uploadDaminTransferReceipt,
} from "@/utils/supabase/daminOrders";
import { confirmOrderCompletion } from "@/utils/supabase/orders";
import { acceptReceipt, fetchReceiptById } from "@/utils/supabase/receipts";
import { getDaminOrderForChat } from "@/utils/supabase/wallet";
import { useTheme } from "@/utils/theme/store";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput, BottomSheetView } from "@gorhom/bottom-sheet";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle,
  ChevronRight,
  CreditCard,
  FileText,
  Image as ImageIcon,
  MapPin,
  Plus,
  Receipt,
  Send,
  Shield,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Alert, FlatList, Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL, rowDirection } = useTranslation();

  // Custom hooks for cleaner state management
  const {
    currentUserId,
    conversationId,
    messages,
    otherUserProfile,
    otherUserId,
    adContext,
    isAdOwner,
    loadingMessages,
    sending,
    handleSendMessage,
    hasMore,
    loadingMore,
    loadOlderMessages,
    refreshMessages,
  } = useChatConversation(params, t, isRTL);

  const resolvedAdId = adContext?.adId || (Array.isArray(params.adId) ? params.adId[0] : params.adId) || null;
  const resolvedAdTitle = adContext?.title || (Array.isArray(params.adTitle) ? params.adTitle[0] : params.adTitle) || "";
  const resolvedAdDescription =
    (adContext?.description && String(adContext.description).trim().length > 0
      ? adContext.description
      : resolvedAdTitle) || "";
  const resolvedAdPrice =
    (typeof adContext?.price === "number" ? adContext.price : null) ??
    (params.price ? Number(Array.isArray(params.price) ? params.price[0] : params.price) : null);

  const {
    attachments,
    selectedImage,
    setSelectedImage,
    pickImage,
    takePhoto,
    pickDocument,
    shareLocation,
    sharingLocation,
    removeAttachment,
    clearAttachments,
  } = useChatAttachments(t, isRTL);

  const {
    receiptData,
    updateReceiptData,
    resetReceiptData,
    createReceiptWithPdf,
    creating: creatingReceipt,
  } = useChatReceipt();

  // Local UI state
  const [inputText, setInputText] = useState("");
  const [acceptingReceipt, setAcceptingReceipt] = useState(false);
  const [localAcceptedReceiptIds, setLocalAcceptedReceiptIds] = useState(new Set());

  // Regular order context (tanazul/taqib) — supports multiple orders per conversation
  const [ordersForChat, setOrdersForChat] = useState([]);
  const [orderConfirmLoading, setOrderConfirmLoading] = useState(false);

  // Derive accepted receipt IDs: local state + receipts with status "final" + receipts that have a matching order (payment_link sent)
  const acceptedReceiptIds = React.useMemo(() => {
    const ids = new Set(localAcceptedReceiptIds);

    // Collect receipt_ids that have an order created (i.e. payment_link was sent with an order_id)
    // Build a set of receipt_ids from ordersForChat
    const receiptIdsWithOrder = new Set(
      ordersForChat.filter((o) => o.receipt_id).map((o) => String(o.receipt_id))
    );

    for (const msg of messages) {
      for (const att of msg.attachments || []) {
        if (att.type === "receipt" && att.receipt_id) {
          // Mark as accepted if receipt has "final" status or has an order
          if (att.status === "final" || receiptIdsWithOrder.has(String(att.receipt_id))) {
            ids.add(att.receipt_id);
          }
        }
      }
    }
    return ids;
  }, [localAcceptedReceiptIds, messages, ordersForChat]);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [receiptPreviewAttachment, setReceiptPreviewAttachment] = useState(null);
  const [receiptPreviewData, setReceiptPreviewData] = useState(null);
  const [receiptPreviewLoading, setReceiptPreviewLoading] = useState(false);
  const [selectedPaymentContext, setSelectedPaymentContext] = useState(null);
  const selectedPaymentContextRef = useRef(null);
  const [cardPayLoading, setCardPayLoading] = useState(false);
  const openPaymentFlow = usePaymentFlowStore((state) => state.openPaymentFlow);
  const [refreshing, setRefreshing] = useState(false);
  const [orderDisputeModalVisible, setOrderDisputeModalVisible] = useState(false);
  const [orderDisputeReason, setOrderDisputeReason] = useState("");
  const [orderDisputeOrderId, setOrderDisputeOrderId] = useState(null);
  const [orderDisputeLoading, setOrderDisputeLoading] = useState(false);

  // Damin order context
  const [daminOrder, setDaminOrder] = useState(null);
  const [daminActionLoading, setDaminActionLoading] = useState(false);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const lastHandledPayResultRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    getDaminOrderForChat(conversationId)
      .then(setDaminOrder)
      .catch((err) => console.warn("Failed to load damin order context:", err));
  }, [conversationId]);

  // Fetch + subscribe to ALL regular orders for this conversation
  useEffect(() => {
    if (!conversationId) return;
    let unsubscribe;

    const load = async () => {
      try {
        const { getOrdersForConversation, subscribeToConversationOrders } = await import("@/utils/supabase/orders");
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

  // Re-fetch damin order context when a payment receipt arrives via realtime
  // (keeps the other party's daminOrder state fresh after payment)
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

  // Handle return from Paymob checkout for damin payments
  useEffect(() => {
    if (!params.payResult || params.isDamin !== "true" || !params.orderId) return;

    const handleDaminPayReturn = async () => {
      try {
        const payResult = JSON.parse(params.payResult);
        const payResultKey = `${payResult?.paymentId || "no-payment-id"}:${payResult?.status || "unknown"}`;
        if (lastHandledPayResultRef.current === payResultKey) return;
        lastHandledPayResultRef.current = payResultKey;
        const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
        const paymobPaymentId = payResult?.paymentId;
        // Use params.id directly as fallback — conversationId from hook may not be resolved yet
        const convId = conversationId || (Array.isArray(params.id) ? params.id[0] : params.id);

        if (payResult.status === "succeeded") {
          // Re-verify with backend before mutating order state.
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
              isRTL
                ? "لم يتم تأكيد الدفع من مزود الدفع بعد."
                : "Payment is not confirmed by the payment provider yet."
            );
            return;
          }

          // If backend returns payment metadata/order reference, ensure it matches this order.
          const verifiedOrderId =
            verification?.raw?.metadata?.orderId ||
            verification?.raw?.metadata?.order_id ||
            verification?.raw?.orderId ||
            verification?.raw?.order_id ||
            null;
          if (verifiedOrderId && String(verifiedOrderId) !== String(orderId)) {
            Alert.alert(
              isRTL ? "تعذر التحقق من الدفع" : "Payment Verification Failed",
              isRTL
                ? "مرجع العملية لا يطابق هذا الطلب."
                : "Payment reference does not match this order."
            );
            return;
          }

          // Update metadata
          try {
            await updateDaminOrderMetadata(orderId, {
              payment_method: "card_paymob",
              paymob_payment_id: paymobPaymentId,
              payment_completed_at: new Date().toISOString(),
            });
          } catch (metaErr) {
            console.warn("[DaminPay] Failed to update order metadata:", metaErr);
          }

          // Auto-confirm card payment (changes status to awaiting_completion)
          try {
            await confirmDaminCardPayment(orderId);
          } catch (confirmErr) {
            console.error("[DaminPay] Failed to confirm card payment:", confirmErr);
          }

          // Send styled payment receipt card
          if (convId) {
            try {
              const alreadySent = messages.some((m) =>
                (m.attachments || []).some(
                  (a) =>
                    a.type === "payment_receipt" &&
                    a.status === "succeeded" &&
                    String(a.order_id) === String(orderId)
                )
              );
              const receiptPayload = {
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
              };
              if (!alreadySent) {
                await sendChatMessage(convId, null, [receiptPayload]);
              }
            } catch (msgErr) {
              console.warn("[DaminPay] Failed to send payment receipt:", msgErr);
            }
          }

          // Refresh damin context bar
          try {
            const updated = await getDaminOrderForChat(convId || conversationId);
            setDaminOrder(updated);
          } catch (refreshErr) {
            console.warn("[DaminPay] Failed to refresh damin order context:", refreshErr);
          }

          Alert.alert(
            isRTL ? "تم الدفع بنجاح" : "Payment Successful",
            isRTL ? "تم تأكيد الدفع تلقائياً." : "Payment has been automatically confirmed."
          );
          router.setParams({
            payResult: undefined,
            isDamin: undefined,
            orderId: undefined,
            amount: undefined,
          });
        } else if (payResult.status === "failed") {
          Alert.alert(
            isRTL ? "فشل الدفع" : "Payment Failed",
            payResult.reason || (isRTL ? "لم تتم العملية. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.")
          );
          router.setParams({
            payResult: undefined,
            isDamin: undefined,
            orderId: undefined,
            amount: undefined,
          });
        }
      } catch (outerErr) {
        console.error("[DaminPay] handleDaminPayReturn error:", outerErr);
      }
    };

    handleDaminPayReturn();
  }, [params.payResult, params.isDamin, params.orderId, params.id, params.amount, conversationId, isRTL, messages, router]);

  // Handle return from Paymob checkout for regular (receipt-based) payments
  useEffect(() => {
    if (!params.payResult || params.isDamin === "true" || !params.orderId) return;

    const handleRegularPayReturn = async () => {
      try {
        const payResult = JSON.parse(params.payResult);
        const payResultKey = `regular:${payResult?.paymentId || "no-id"}:${payResult?.status || "unknown"}`;
        if (lastHandledPayResultRef.current === payResultKey) return;
        lastHandledPayResultRef.current = payResultKey;
        const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
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

          // Update order status to payment_verified
          try {
            const { updateOrderStatus } = await import("@/utils/supabase/orders");
            await updateOrderStatus(orderId, "payment_verified");
          } catch (statusErr) {
            console.warn("[RegularPay] Failed to update order status:", statusErr);
          }

          // Send payment receipt message in chat
          if (convId) {
            try {
              const alreadySent = messages.some((m) =>
                (m.attachments || []).some(
                  (a) =>
                    a.type === "payment_receipt" &&
                    a.status === "succeeded" &&
                    String(a.order_id) === String(orderId)
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
              }
            } catch (msgErr) {
              console.warn("[RegularPay] Failed to send payment receipt:", msgErr);
            }
          }

          // Refresh orders
          try {
            const { getOrdersForConversation } = await import("@/utils/supabase/orders");
            const updated = await getOrdersForConversation(convId || conversationId);
            setOrdersForChat(updated);
          } catch {}

          Alert.alert(
            isRTL ? "تم الدفع بنجاح" : "Payment Successful",
            isRTL ? "تم تأكيد الدفع." : "Payment has been confirmed."
          );
          router.setParams({ payResult: undefined, orderId: undefined, amount: undefined });
        } else if (payResult.status === "failed") {
          Alert.alert(
            isRTL ? "فشل الدفع" : "Payment Failed",
            payResult.reason || (isRTL ? "لم تتم العملية. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.")
          );
          router.setParams({ payResult: undefined, orderId: undefined, amount: undefined });
        }
      } catch (outerErr) {
        console.error("[RegularPay] handleRegularPayReturn error:", outerErr);
      }
    };

    handleRegularPayReturn();
  }, [params.payResult, params.isDamin, params.orderId, params.id, params.amount, conversationId, isRTL, messages, router]);

  // Derive the latest active order for the context bar / completion bar
  // Priority: first non-completed order, then the latest order overall
  const activeOrder = React.useMemo(() => {
    if (ordersForChat.length === 0) return null;
    const activeStatuses = ["awaiting_payment", "payment_submitted", "awaiting_admin_transfer_approval", "payment_verified", "in_progress", "completion_requested", "paid"];
    const active = ordersForChat.find((o) => activeStatuses.includes(o.status));
    return active || ordersForChat[0]; // ordersForChat is sorted desc by created_at
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

  const handleDaminAction = useCallback(async (action) => {
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
    } else if (action === "pay") {
      const paymentContext = {
        amount: daminOrder.total_amount,
        orderId,
        isDamin: true,
      };
      setSelectedPaymentContext(paymentContext);
      selectedPaymentContextRef.current = paymentContext;
      openPaymentFlow({
        amount: paymentContext.amount,
        onCardPayment: handleCardPayment,
        onPaymentSubmitted: handleBankTransferSubmitted,
      });
      router.push("/payment-modal");
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
                // Send completion message in chat
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

  // Refs
  const receiptBottomSheetRef = useRef(null);
  const libraryBottomSheetRef = useRef(null);
  const attachmentBottomSheetRef = useRef(null);
  const flatListRef = useRef(null);
  const ownerBlockShownRef = useRef(false);

  // Animations
  const sendButtonScale = useRef(new Animated.Value(1)).current;

  // Block opening chat with yourself (owner trying to open chat from their own ad)
  useEffect(() => {
    if (ownerBlockShownRef.current) return;
    if (params.id) return; // existing conversation should remain accessible
    if (!currentUserId) return;
    if (!params.ownerId) return;

    const ownerId = Array.isArray(params.ownerId) ? params.ownerId[0] : params.ownerId;
    if (!ownerId) return;

    if (currentUserId === ownerId) {
      ownerBlockShownRef.current = true;
      Alert.alert(
        isRTL ? "تنبيه" : "Notice",
        isRTL
          ? "لا يمكنك فتح المحادثة لأنك صاحب الإعلان."
          : "You can’t open this chat because you’re the owner.",
        [{ text: isRTL ? "موافق" : "OK", onPress: () => router.back() }]
      );
    }
  }, [params.id, params.ownerId, currentUserId, isRTL, router]);

  // Scroll to bottom when messages load or new messages arrive
  const prevMessageCount = useRef(0);
  useEffect(() => {
    if (loadingMessages) return;
    const isNewMessage = messages.length > prevMessageCount.current;
    prevMessageCount.current = messages.length;
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: isNewMessage });
    }, isNewMessage ? 100 : 50);
  }, [loadingMessages, messages.length]);

  // Bottom sheet callbacks
  const openReceiptSheet = useCallback(() => {
    Keyboard.dismiss();
    // Auto-fill receipt data from ad context
    const updates = {};
    // Description should be service/ad description, but user can edit
    if (resolvedAdDescription) {
      updates.description = resolvedAdDescription;
    }
    if (resolvedAdPrice && Number(resolvedAdPrice) > 0) {
      updates.amount = String(resolvedAdPrice);
    }
    if (Object.keys(updates).length > 0) {
      updateReceiptData(updates);
    }
    receiptBottomSheetRef.current?.expand();
  }, [resolvedAdDescription, resolvedAdPrice, updateReceiptData]);

  const openLibrarySheet = useCallback(() => {
    Keyboard.dismiss();
    libraryBottomSheetRef.current?.expand();
  }, []);

  const openAttachmentSheet = useCallback(() => {
    Keyboard.dismiss();
    attachmentBottomSheetRef.current?.expand();
  }, []);

  const handlePickImage = useCallback(async () => {
    const success = await pickImage();
    if (success) {
      attachmentBottomSheetRef.current?.close();
    }
  }, [pickImage]);

  const handleTakePhoto = useCallback(async () => {
    const success = await takePhoto();
    if (success) {
      attachmentBottomSheetRef.current?.close();
    }
  }, [takePhoto]);

  const handlePickDocument = useCallback(async () => {
    const success = await pickDocument();
    if (success) {
      attachmentBottomSheetRef.current?.close();
    }
  }, [pickDocument]);

  const handleShareLocation = useCallback(async () => {
    const success = await shareLocation();
    if (success) {
      attachmentBottomSheetRef.current?.close();
    }
  }, [shareLocation]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Get file icon based on extension
  const getFileIcon = (fileName) => {
    if (!fileName) return "📄";
    const ext = fileName.split(".").pop()?.toLowerCase();
    const iconMap = {
      pdf: "📕",
      doc: "📘",
      docx: "📘",
      xls: "📗",
      xlsx: "📗",
      ppt: "📙",
      pptx: "📙",
      txt: "📝",
      zip: "🗜️",
      rar: "🗜️",
    };
    return iconMap[ext] || "📄";
  };

  // Open/download file
  const openFile = useCallback(async (attachment) => {
    try {
      const uri = attachment.signedUrl || attachment.uri;
      if (!uri) {
        Alert.alert(t.common.error, isRTL ? "لا يمكن فتح الملف" : "Cannot open file");
        return;
      }

      // Download the file to a temporary location
      const fileName = attachment.name || `file_${Date.now()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const downloadResult = await FileSystem.downloadAsync(uri, fileUri);

      if (downloadResult.status === 200) {
        // Check if sharing is available
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: attachment.mimeType || "application/pdf",
            dialogTitle: isRTL ? "فتح الملف" : "Open file",
            UTI: attachment.mimeType || "public.data",
          });
        } else {
          Alert.alert(
            isRTL ? "نجح" : "Success",
            isRTL ? "تم تحميل الملف في: " + downloadResult.uri : "File downloaded to: " + downloadResult.uri
          );
        }
      } else {
        Alert.alert(t.common.error, isRTL ? "فشل التحميل" : "Download failed");
      }
    } catch (error) {
      console.error("Error opening file:", error);
      Alert.alert(
        t.common.error,
        isRTL ? "تعذر فتح الملف: " + error.message : "Failed to open file: " + error.message
      );
    }
  }, [t, isRTL]);

  const closeReceiptPreview = () => {
    setReceiptPreviewOpen(false);
    setReceiptPreviewAttachment(null);
    setReceiptPreviewData(null);
    setReceiptPreviewLoading(false);
  };

  const openReceiptPreview = useCallback(async (attachment) => {
    if (!attachment?.receipt_id) return;
    setReceiptPreviewAttachment(attachment);
    setReceiptPreviewOpen(true);
    setReceiptPreviewLoading(true);
    try {
      const row = await fetchReceiptById(attachment.receipt_id);
      setReceiptPreviewData(row);
    } catch (e) {
      console.error("Failed to load receipt details:", e);
      setReceiptPreviewData(null);
    } finally {
      setReceiptPreviewLoading(false);
    }
  }, []);

  // Note: pickImage, takePhoto, pickDocument, shareLocation, removeAttachment 
  // are now provided by useChatAttachments hook

  // Send message wrapper
  const sendMessage = async () => {
    Animated.sequence([
      Animated.spring(sendButtonScale, {
        toValue: 0.9,
        friction: 7,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        friction: 7,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const success = await handleSendMessage(inputText, attachments);
    if (success) {
      setInputText("");
      clearAttachments();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Create receipt
  const createReceipt = async () => {
    if (!receiptData.description || !receiptData.amount) {
      Alert.alert(t.common.error, "Please fill in all fields");
      return;
    }

    try {
      if (!conversationId || !resolvedAdId) {
        Alert.alert(
          t.common.error,
          isRTL ? "بيانات الإعلان غير متوفرة" : "Ad context is missing"
        );
        return;
      }

      const receiptAttachment = await createReceiptWithPdf({
        conversation_id: conversationId,
        ad_id: resolvedAdId,
        adTitle: resolvedAdTitle,
        isRTL,
      });

      if (receiptAttachment) {
        // Send receipt as chat message
        await handleSendMessage("", [receiptAttachment]);
        resetReceiptData();
        receiptBottomSheetRef.current?.close();
      }
    } catch (error) {
      console.error("Error creating receipt:", error);
      Alert.alert(
        t.common.error,
        isRTL ? "فشل إنشاء الإيصال" : "Failed to create receipt"
      );
    }
  };

  // Accept receipt (buyer) — use ref guard so callback stays stable
  const acceptingReceiptRef = useRef(false);
  useEffect(() => { acceptingReceiptRef.current = acceptingReceipt; }, [acceptingReceipt]);

  const handleAcceptReceipt = useCallback(async (receiptId) => {
    if (acceptingReceiptRef.current) return;

    Alert.alert(
      isRTL ? "تأكيد" : "Confirm",
      isRTL ? "هل تريد قبول وتوقيع هذا الإيصال؟" : "Do you want to accept and sign this receipt?",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: isRTL ? "قبول وتوقيع" : "Accept & Sign",
          onPress: async () => {
            setAcceptingReceipt(true);
            try {
              const updatedReceipt = await acceptReceipt(
                receiptId,
                resolvedAdTitle || "",
                isRTL
              );

              // Send payment link message with order context (Paymob creates URL on-demand)
              const paymentLinkAttachment = {
                type: "payment_link",
                amount: updatedReceipt.amount,
                order_id: updatedReceipt.order_id,
                buyer_user_id: currentUserId,
              };
              await handleSendMessage("", [paymentLinkAttachment]);

              // Mark receipt as accepted so the button hides immediately
              setLocalAcceptedReceiptIds((prev) => new Set([...prev, receiptId]));

              // Close the preview modal
              closeReceiptPreview();
            } catch (error) {
              console.error("Error accepting receipt:", error);
              Alert.alert(
                t.common.error,
                isRTL ? "فشل قبول الإيصال" : "Failed to accept receipt"
              );
            } finally {
              setAcceptingReceipt(false);
            }
          },
        },
      ]
    );
  }, [resolvedAdTitle, isRTL, t, handleSendMessage, currentUserId]);

  const formatGregorian = (iso) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString(isRTL ? "ar-SA-u-ca-gregory" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        calendar: "gregory",
      });
    } catch {
      return String(iso);
    }
  };

  // Track which order_ids already have a successful payment — per order, not per conversation
  const paidOrderIds = React.useMemo(() => {
    const ids = new Set();

    // 1. Check chat messages for payment_receipt with succeeded status
    for (const msg of messages) {
      for (const att of msg.attachments || []) {
        if (att.type === "payment_receipt" && att.status === "succeeded" && att.order_id) {
          ids.add(String(att.order_id));
        }
      }
    }

    // 2. Check damin order status — if awaiting_completion or completed, payment is done
    if (daminOrder && ["awaiting_completion", "completed", "completion_requested"].includes(daminOrder.status)) {
      ids.add(String(daminOrder.order_id));
      // Mark ALL damin payment_link order_ids as paid
      for (const msg of messages) {
        for (const att of msg.attachments || []) {
          if (att.type === "payment_link" && att.isDamin && att.order_id) {
            ids.add(String(att.order_id));
          }
        }
      }
    }

    // 3. Check ALL regular orders — mark each paid order individually
    const paidStatuses = ["payment_verified", "in_progress", "completion_requested", "completed", "paid"];
    for (const order of ordersForChat) {
      if (paidStatuses.includes(order.status)) {
        ids.add(String(order.id));
      }
    }

    return ids;
  }, [messages, daminOrder, ordersForChat]);

  // Deduplicate receipts: keep only latest message per receipt_id
  // A7: Messages are already sorted from hook; only re-sort if receipt dedup merges items
  const dedupedMessages = React.useMemo(() => {
    const receiptMap = new Map();
    const result = [];

    for (const msg of messages) {
      const receiptAttachment = msg.attachments?.find(a => a.type === 'receipt' && a.receipt_id);

      if (receiptAttachment) {
        const rid = receiptAttachment.receipt_id;
        const existing = receiptMap.get(rid);

        if (!existing ||
            new Date(msg.created_at) > new Date(existing.created_at) ||
            (receiptAttachment.status === 'final' && existing.attachments?.find(a => a.receipt_id === rid)?.status !== 'final')) {
          receiptMap.set(rid, msg);
        }
      } else {
        result.push(msg);
      }
    }

    if (receiptMap.size === 0) return result; // Already sorted, no receipt dedup needed

    for (const msg of receiptMap.values()) {
      result.push(msg);
    }

    return result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [messages]);

  // Animated styles
  const sendButtonStyle = {
    transform: [{ scale: sendButtonScale }],
  };

  // A1: Ref for dedupedMessages so renderMessage callback stays stable
  const dedupedMessagesRef = useRef(dedupedMessages);
  dedupedMessagesRef.current = dedupedMessages;

  // B1+B2: Payment press with full context (amount + orderId)
  const handlePaymentPress = useCallback((paymentData) => {
    // Auto-detect damin context: if a damin order is active and the orderId matches,
    // mark as damin so the checkout flow correctly updates the damin_orders table.
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
  }, [daminOrder, openPaymentFlow, router]);

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
      const { updateOrderStatus, ORDER_STATUSES } = await import("@/utils/supabase/orders");
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

  // B2: Card payment handler — creates Paymob intention and navigates to checkout
  const handleCardPayment = useCallback(async (paymentMethod = 'card') => {
    const ctx = selectedPaymentContextRef.current;
    if (cardPayLoading || !ctx) return;

    setCardPayLoading(true);
    try {
      const { getSupabaseSession } = await import("@/utils/supabase/client");
      const { createPaymobIntention } = await import("@/utils/paymob");

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

  // B5: Bank transfer handler
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

        // Upload receipt image if provided
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

        // Send confirmation message in chat
        const amount = Number(ctx.amount || 0).toFixed(2);
        const msg = isRTL
          ? `تم إرسال إيصال التحويل البنكي\nالمبلغ: ${amount} ر.س\nسيتم مراجعته من قبل الإدارة.`
          : `Bank transfer receipt submitted\nAmount: ${amount} SAR\nUnder admin review.`;
        if (conversationId) {
          try { await sendChatMessage(conversationId, msg); } catch {}
        }

        // Refresh damin context bar
        try {
          const updated = await getDaminOrderForChat(conversationId);
          setDaminOrder(updated);
        } catch {}

        Alert.alert(
          isRTL ? "تم" : "Done",
          isRTL ? "تم إرسال الدفع. سيتم التحقق والتأكيد قريباً." : "Payment submitted. It will be verified and confirmed soon."
        );
      } else {
        const { submitOrderBankTransfer, uploadOrderTransferReceipt } = await import("@/utils/supabase/orders");
        const orderId = ctx.orderId;

        // Upload receipt image if provided
        let receiptUrl = null;
        if (receiptUri) {
          try {
            receiptUrl = await uploadOrderTransferReceipt(orderId, receiptUri);
          } catch (uploadErr) {
            console.warn("Failed to upload order transfer receipt:", uploadErr);
          }
        }

        // Update order with transfer details + status in one call
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

  // A1: Render message — uses ref for grouping so callback is stable
  const renderMessage = useCallback(({ item, index }) => {
    const isMe = item.sender === "me" || (item.sender_id && item.sender_id === currentUserId);

    // Grouping via ref (doesn't cause callback recreation)
    const msgs = dedupedMessagesRef.current;
    const prevMessage = index > 0 ? msgs[index - 1] : null;
    const nextMessage = index < msgs.length - 1 ? msgs[index + 1] : null;

    const isFirstInGroup = !prevMessage ||
      prevMessage.sender_id !== item.sender_id ||
      (new Date(item.created_at) - new Date(prevMessage.created_at) > 5 * 60 * 1000);

    const isLastInGroup = !nextMessage ||
      nextMessage.sender_id !== item.sender_id ||
      (new Date(nextMessage.created_at) - new Date(item.created_at) > 5 * 60 * 1000);

    // System message
    if (item.type === 'system') {
       return <SystemMessageCard content={item.content} />;
    }

    return (
      <View style={[styles.messageRow, { flexDirection: isMe ? getRTLRowDirection(isRTL) : getRTLInverseRowDirection(isRTL), marginBottom: isLastInGroup ? 8 : 2 }]}>
        {!isMe && otherUserProfile && isLastInGroup && (
          <View style={styles.messageAvatarContainer}>
            {otherUserProfile.avatarUrl ? (
              <Image source={{ uri: otherUserProfile.avatarUrl }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatar, { backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>
                  {(otherUserProfile.displayName || "U")[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        )}
        {/* Spacer for non-last messages to align with avatar */}
        {!isMe && !isLastInGroup && <View style={{ width: 32 + 8 }} />}

        <MessageBubble
           item={item}
           isMe={isMe}
           isFirstInGroup={isFirstInGroup}
           isLastInGroup={isLastInGroup}
           onImagePress={setSelectedImage}
           onFilePress={openFile}
           onReceiptPress={openReceiptPreview}
           onAcceptReceipt={handleAcceptReceipt}
           isAcceptingReceipt={acceptingReceipt}
           onPaymentPress={handlePaymentPress}
           onSubmitDispute={handleOpenOrderDispute}
           paidOrderIds={paidOrderIds}
           currentUserId={currentUserId}
           daminPayerUserId={daminOrder?.payer_user_id}
           acceptedReceiptIds={acceptedReceiptIds}
           orderPaidOverride={false}
        />
      </View>
    );
  }, [currentUserId, isRTL, otherUserProfile, colors, acceptingReceipt, handleAcceptReceipt, openFile, openReceiptPreview, handlePaymentPress, handleOpenOrderDispute, paidOrderIds, daminOrder?.payer_user_id, acceptedReceiptIds]);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const skeletonMessages = React.useMemo(
    () =>
      Array.from({ length: 10 }).map((_, idx) => ({
        id: `sk-msg-${idx}`,
        side: idx % 3 === 0 ? "left" : "right",
      })),
    []
  );

  const getDaminStatusLabel = useCallback((status) => {
    if (status === "created" || status === "pending_confirmations") {
      return isRTL ? "بانتظار التأكيد" : "Awaiting Confirmation";
    }
    if (status === "both_confirmed") {
      return isRTL ? "بانتظار الدفع" : "Awaiting Payment";
    }
    if (status === "payment_submitted") {
      return isRTL ? "بانتظار موافقة الإدارة" : "Awaiting Admin Approval";
    }
    if (status === "escrow_deposit") {
      return isRTL ? "تم إيداع المبلغ" : "Escrow Deposit Done";
    }
    if (status === "awaiting_completion") {
      return isRTL ? "تم الدفع · بانتظار إتمام الخدمة" : "Paid · Awaiting Completion";
    }
    if (status === "completion_requested") {
      return isRTL ? "بانتظار موافقة الإدارة" : "Pending Admin Approval";
    }
    if (status === "completed") {
      return isRTL ? "مكتمل" : "Completed";
    }
    return status;
  }, [isRTL]);

  const refreshChat = useCallback(async () => {
    if (!conversationId) return;

    setRefreshing(true);
    try {
      const tasks = [refreshMessages()];

      tasks.push(
        getDaminOrderForChat(conversationId)
          .then((updated) => setDaminOrder(updated || null))
          .catch((err) => {
            console.warn("Failed to refresh damin order context:", err);
          })
      );

      tasks.push((async () => {
        try {
          const { getOrdersForConversation } = await import("@/utils/supabase/orders");
          const orders = await getOrdersForConversation(conversationId);
          setOrdersForChat(orders);
        } catch (err) {
          console.warn("Failed to refresh order context:", err);
        }
      })());

      await Promise.all(tasks);
    } finally {
      setRefreshing(false);
    }
  }, [conversationId, refreshMessages]);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      <KeyboardAvoidingAnimatedView style={styles.container} behavior="padding">
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 10,
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
              flexDirection: "row",
            },
          ]}
        >
          {/* Center: tappable user info + receipt button */}
          <View style={styles.userInfoRow}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/chat-info",
                  params: {
                    conversationId,
                    otherUserId,
                    otherUserName: otherUserProfile?.displayName || params.name,
                    otherUserAvatar: otherUserProfile?.avatarUrl || params.avatar || "",
                  },
                })
              }
              style={[styles.userInfo, { flexDirection: rowDirection }]}
            >
              {((otherUserProfile?.avatarUrl || params.avatar) && (
                <Image
                  source={{ uri: otherUserProfile?.avatarUrl || params.avatar }}
                  style={styles.headerAvatar}
                />
              )) || (
                <View style={[styles.headerAvatar, { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
                    {(otherUserProfile?.displayName || params.name || "U")[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[styles.userTexts, { alignItems: getRTLStartAlign(isRTL) }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {otherUserProfile?.displayName || params.name || params.adTitle || t.chat.title}
                </Text>
                {params.isOnline === "true" && (
                  <View style={[styles.onlineStatus, { flexDirection: rowDirection }]}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>{isRTL ? "متصل" : "Online"}</Text>
                  </View>
                )}
              </View>
            </Pressable>

            {isAdOwner && (
              <Pressable
                testID="chat-receipt-btn"
                onPress={openReceiptSheet}
                style={[styles.headerReceiptButton, { backgroundColor: colors.primaryLight }]}
              >
                <Text style={{ color: colors.primary, fontWeight: "bold", fontSize: 10, lineHeight: 12 }}>
                  {isRTL ? "إصدار فاتورة" : "Receipt"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Back button (right side) */}
          <Pressable
            onPress={() => router.back()}
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
          >
            <ChevronRight size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Ad Context Header */}
        {resolvedAdTitle && !daminOrder ? (
          <View
            style={[
              styles.adContextHeader,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
                flexDirection: rowDirection,
              },
            ]}
          >
            <View style={[styles.adContextContent, { alignItems: getRTLStartAlign(isRTL) }]}>
              <Text style={[styles.adContextTitle, { color: colors.text }]}>
                {resolvedAdTitle}
              </Text>
              <View style={[styles.adContextMeta, { flexDirection: rowDirection }]}>
                {resolvedAdPrice != null && Number(resolvedAdPrice) > 0 && (
                  <Text style={[styles.adContextMetaItem, { color: colors.primary }]}>
                    {Number(resolvedAdPrice).toLocaleString()} {isRTL ? "ر.س" : "SAR"}
                  </Text>
                )}
                {/* Order payment status badge */}
                {activeOrder && (() => {
                  const s = activeOrder.status;
                  const badgeConfig =
                    s === "awaiting_payment" ? { color: "#F59E0B", label: isRTL ? "بانتظار الدفع" : "Awaiting Payment" }
                    : s === "awaiting_admin_transfer_approval" ? { color: "#8B5CF6", label: isRTL ? "بانتظار موافقة الإدارة" : "Awaiting Approval" }
                    : s === "payment_submitted" ? { color: "#8B5CF6", label: isRTL ? "تم إرسال الحوالة" : "Transfer Submitted" }
                    : (s === "payment_verified" || s === "paid") ? { color: "#10B981", label: isRTL ? "تم الدفع" : "Paid" }
                    : s === "in_progress" ? { color: "#3B82F6", label: isRTL ? "قيد التنفيذ" : "In Progress" }
                    : s === "completion_requested" ? { color: "#F97316", label: isRTL ? "بانتظار التأكيد" : "Awaiting Confirmation" }
                    : s === "completed" ? { color: "#10B981", label: isRTL ? "مكتمل" : "Completed" }
                    : null;
                  if (!badgeConfig) return null;
                  return (
                    <View style={{ backgroundColor: badgeConfig.color + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ color: badgeConfig.color, fontSize: 11, fontWeight: "700" }}>{badgeConfig.label}</Text>
                    </View>
                  );
                })()}
                {params.profession && (
                  <Text style={[styles.adContextMetaItem, { color: colors.textSecondary }]}>
                    {params.profession}
                  </Text>
                )}
                {params.nationality && (
                  <Text style={[styles.adContextMetaItem, { color: colors.textSecondary }]}>
                    {params.nationality}
                  </Text>
                )}
                {params.contractDuration && (
                  <Text style={[styles.adContextMetaItem, { color: colors.textSecondary }]}>
                    {params.contractDuration}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {/* Regular Order Completion Action Bar */}
        {activeOrder && ["payment_verified", "in_progress", "completion_requested", "paid"].includes(activeOrder.status) && (() => {
          const isBuyer = currentUserId === activeOrder.buyer_id;
          const alreadyConfirmed = isBuyer ? !!activeOrder.buyer_confirmed_received_at : !!activeOrder.seller_confirmed_completed_at;
          if (alreadyConfirmed) return null;
          return true;
        })() && (
          <View
            style={[
              styles.orderCompletionBar,
              { backgroundColor: colors.surface, borderBottomColor: colors.border, flexDirection: rowDirection },
            ]}
          >
            <View style={styles.orderCompletionIconWrap}>
              <CheckCircle size={16} color="#10B981" />
            </View>
            <View style={{ flex: 1, alignItems: getRTLStartAlign(isRTL) }}>
              <Text style={[styles.orderCompletionTitle, { color: colors.text }]}>
                {isRTL ? "هل اكتملت الخدمة؟" : "Service complete?"}
              </Text>
              <Text style={[styles.orderCompletionSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {activeOrder.status === "completion_requested"
                  ? (activeOrder.buyer_confirmed_received_at
                      ? (isRTL ? "المشتري أكد · بانتظار تأكيدك" : "Buyer confirmed · Awaiting yours")
                      : (isRTL ? "البائع أكد · بانتظار تأكيدك" : "Seller confirmed · Awaiting yours"))
                  : (isRTL ? "أكد لإتمام الطلب" : "Confirm to complete")}
              </Text>
            </View>
            <Pressable
              onPress={handleOrderConfirmCompletion}
              disabled={orderConfirmLoading}
              style={[styles.orderCompletionBtn, { opacity: orderConfirmLoading ? 0.7 : 1 }]}
            >
              {orderConfirmLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.orderCompletionBtnText}>{isRTL ? "تأكيد الاكتمال" : "Confirm"}</Text>
              }
            </Pressable>
          </View>
        )}

        {/* Damin Order Context Bar */}
        {daminOrder && (
          <View
            style={[
              styles.combinedContextBar,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
                flexDirection: rowDirection,
              },
            ]}
          >
            <Pressable
              onPress={() => router.push({ pathname: "/damin-order-details", params: { id: daminOrder.order_id } })}
              style={[styles.combinedContextMain, { flexDirection: rowDirection }]}
            >
              <View style={[styles.combinedContextIcon, { backgroundColor: colors.primary + "15" }]}>
                <Shield size={18} color={colors.primary} />
              </View>
              <View style={[styles.combinedContextInfo, { alignItems: getRTLStartAlign(isRTL) }]}>
                <Text style={[styles.combinedContextTitle, { color: colors.text }]} numberOfLines={1}>
                  {resolvedAdTitle || daminOrder.service_details || (isRTL ? "طلب ضامن" : "Damin Order")}
                </Text>
                {!!resolvedAdTitle && !!daminOrder.service_details && resolvedAdTitle !== daminOrder.service_details && (
                  <Text style={[styles.combinedContextSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {daminOrder.service_details}
                  </Text>
                )}
                <View style={[styles.combinedContextMeta, { flexDirection: rowDirection }]}>
                  <Text style={[styles.combinedContextStatus, { color: colors.primary }]}>
                    {getDaminStatusLabel(daminOrder.status)}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}> • </Text>
                  <Text style={[styles.combinedContextAmount, { color: colors.text }]}>
                    {Number(daminOrder.total_amount || 0).toLocaleString()} {isRTL ? "ر.س" : "SAR"}
                  </Text>
                  {resolvedAdPrice != null && Number(resolvedAdPrice) > 0 && (
                    <>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}> • </Text>
                      <Text style={[styles.combinedContextHint, { color: colors.textSecondary }]}>
                        {Number(resolvedAdPrice).toLocaleString()} {isRTL ? "ر.س" : "SAR"}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </Pressable>

            {daminOrder.available_actions?.length > 0 && (
              <View style={[styles.combinedContextActions, { flexDirection: rowDirection }]}>
                {daminOrder.available_actions.includes("confirm_participation") && (
                  <Pressable
                    onPress={() => handleDaminAction("confirm_participation")}
                    disabled={daminActionLoading}
                    style={[styles.compactActionBtn, { backgroundColor: colors.primary }]}
                  >
                    {daminActionLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <CheckCircle size={14} color="#fff" />
                        <Text style={styles.daminActionText}>{isRTL ? "تأكيد المشاركة" : "Confirm"}</Text>
                      </>
                    )}
                  </Pressable>
                )}
                {daminOrder.available_actions.includes("pay") && (
                  <Pressable
                    onPress={() => handleDaminAction("pay")}
                    style={[styles.compactActionBtn, { backgroundColor: "#10B981" }]}
                  >
                    <CreditCard size={14} color="#fff" />
                    <Text style={styles.compactActionText}>{isRTL ? "ادفع" : "Pay"}</Text>
                  </Pressable>
                )}
                {daminOrder.available_actions.includes("confirm_service") && (
                  <Pressable
                    onPress={() => handleDaminAction("confirm_service")}
                    disabled={daminActionLoading}
                    style={[styles.compactActionBtn, { backgroundColor: "#10B981" }]}
                  >
                    {daminActionLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <CheckCircle size={14} color="#fff" />
                        <Text style={styles.daminActionText}>{isRTL ? "إنهاء الخدمة" : "End Service"}</Text>
                      </>
                    )}
                  </Pressable>
                )}
                {daminOrder.available_actions.includes("dispute") && (
                  <Pressable
                    onPress={() => handleDaminAction("dispute")}
                    style={[styles.compactActionBtn, { backgroundColor: "#EF4444" }]}
                  >
                    <AlertTriangle size={14} color="#fff" />
                    <Text style={styles.compactActionText}>{isRTL ? "نزاع" : "Dispute"}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {/* Messages (keep layout stable: list always flexes) */}
        <View style={{ flex: 1 }}>
          {loadingMessages ? (
            <SkeletonGroup style={{ flex: 1 }}>
              <FlatList
                style={{ flex: 1 }}
                data={skeletonMessages}
                keyExtractor={(item) => item.id}

                contentContainerStyle={[styles.messagesList, { paddingBottom: 20 }]}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  const isMe = item.side === "right";
                  const bubbleBg = isMe ? colors.primary : colors.surface;
                  const skBg = isMe ? "rgba(255,255,255,0.26)" : undefined;
                  return (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.messageRow,
                        {
                          flexDirection: isMe
                            ? getRTLRowDirection(isRTL)
                            : getRTLInverseRowDirection(isRTL),
                        },
                      ]}
                    >
                      {!isMe && (
                        <View style={styles.messageAvatarContainer}>
                          <Skeleton width={32} height={32} radius={16} />
                        </View>
                      )}
                      <View
                        style={[
                          styles.messageBubble,
                          {
                            alignSelf: isMe
                              ? isRTL
                                ? "flex-start"
                                : "flex-end"
                              : isRTL
                              ? "flex-end"
                              : "flex-start",
                            backgroundColor: bubbleBg,
                            borderBottomRightRadius: isMe && !isRTL ? 4 : 18,
                            borderBottomLeftRadius: isMe && isRTL ? 4 : !isMe && !isRTL ? 4 : 18,
                          },
                        ]}
                      >
                        <Skeleton
                          height={12}
                          radius={7}
                          width={180 - (index % 3) * 30}
                          style={skBg ? { backgroundColor: skBg } : null}
                        />
                        <Skeleton
                          height={12}
                          radius={7}
                          width={120 - (index % 2) * 20}
                          style={[{ marginTop: 8 }, skBg ? { backgroundColor: skBg } : null]}
                        />
                      </View>
                    </View>
                  );
                }}
              />
            </SkeletonGroup>
          ) : (
            <FlatList
              ref={flatListRef}
              style={{ flex: 1 }}
              data={dedupedMessages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={[styles.messagesList, { paddingBottom: 20 }]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={loadingMore ? <ActivityIndicator style={{ padding: 10 }} /> : null}
              refreshing={hasMore ? refreshing : false}
              onRefresh={hasMore ? loadOlderMessages : undefined}
            />
          )}
        </View>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <View style={[styles.attachmentsPreview, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <FlatList
              data={attachments}
              horizontal
              showsHorizontalScrollIndicator={false}

              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.attachmentPreviewItem}>
                  {item.type === "image" && (
                    <Image source={{ uri: item.uri }} style={styles.attachmentPreviewImage} />
                  )}
                  {item.type === "location" && (
                    <View style={[styles.attachmentPreviewIcon, { backgroundColor: colors.primaryLight }]}>
                      <MapPin size={20} color={colors.primary} />
                    </View>
                  )}
                  {item.type === "file" && (
                    <View style={[styles.attachmentPreviewIcon, { backgroundColor: colors.surfaceSecondary }]}>
                      <FileText size={20} color={colors.text} />
                    </View>
                  )}
                  <Pressable
                    onPress={() => removeAttachment(item.id)}
                    style={[styles.removeAttachment, { backgroundColor: colors.error }]}
                  >
                    <X size={12} color="#fff" />
                  </Pressable>
                </View>
              )}
            />
          </View>
        )}

        {/* Input Area */}
        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: insets.bottom + 10,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              flexDirection: rowDirection,
            },
          ]}
        >
          {/* Attachment Button */}
          <Pressable
            onPress={openAttachmentSheet}
            style={[styles.attachButton, { backgroundColor: colors.surface }]}
          >
            <Plus size={22} color={colors.primary} />
          </Pressable>

          {/* Text Input */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.surface }]}>
            <TextInput
              testID="chat-text-input"
              style={[
                styles.textInput,
                { color: colors.text, textAlign: getRTLTextAlign(isRTL) },
              ]}
              placeholder={t.chat.typeMessage}
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!loadingMessages}
            />
          </View>

          {/* Send Button */}
          <Animated.View style={sendButtonStyle}>
            <Pressable
              testID="chat-send-btn"
              onPress={sendMessage}
              disabled={loadingMessages || sending || !conversationId || (!inputText.trim() && attachments.length === 0)}
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    loadingMessages || sending || !conversationId
                      ? colors.textMuted
                      : inputText.trim() || attachments.length > 0
                      ? colors.primary
                      : colors.textMuted,
                },
              ]}
            >
              <Send size={20} color="#fff" />
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingAnimatedView>

      {/* Full Screen Image Viewer */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
        animationType="fade"
      >
        <View style={styles.fullScreenContainer}>
          <Pressable
            style={styles.fullScreenCloseButton}
            onPress={() => setSelectedImage(null)}
          >
            <X size={28} color="#fff" />
          </Pressable>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>

      {/* Receipt Preview (iOS native-like page sheet) */}
      <Modal
        visible={receiptPreviewOpen}
        onRequestClose={closeReceiptPreview}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      >
        <View style={[styles.receiptPreviewContainer, { backgroundColor: colors.background, paddingTop: Platform.OS === "android" ? insets.top : 0 }]}>
          {/* Drag handle for iOS page sheet */}
          {Platform.OS === "ios" && (
            <View style={styles.receiptDragHandle}>
              <View style={[styles.receiptDragIndicator, { backgroundColor: colors.textMuted }]} />
            </View>
          )}
          <View
            style={[
              styles.receiptPreviewHeader,
              { borderBottomColor: colors.border, flexDirection: rowDirection },
            ]}
          >
            <Pressable onPress={closeReceiptPreview} style={styles.receiptPreviewClose}>
              <X size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[styles.receiptPreviewTitle, { color: colors.text }]}>
                {isRTL ? "تفاصيل الإيصال" : "Receipt Details"}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.receiptPreviewContent}>
            {receiptPreviewLoading ? (
              <SkeletonGroup>
                <View style={{ paddingVertical: 10 }}>
                  <View style={[styles.receiptPreviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Skeleton height={16} radius={8} width="60%" />
                    <Skeleton height={12} radius={7} width="90%" style={{ marginTop: 16 }} />
                    <Skeleton height={12} radius={7} width="80%" style={{ marginTop: 10 }} />
                    <Skeleton height={12} radius={7} width="70%" style={{ marginTop: 10 }} />
                    <View style={{ height: 14 }} />
                    <Skeleton height={12} radius={7} width="55%" />
                    <Skeleton height={12} radius={7} width="65%" style={{ marginTop: 10 }} />
                  </View>
                </View>
              </SkeletonGroup>
            ) : (
              <>
                <View style={[styles.receiptPreviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.receiptPreviewAdTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                    {resolvedAdTitle || (isRTL ? "الإعلان" : "Ad")}
                  </Text>

                  <View style={[styles.receiptPreviewRow, { flexDirection: rowDirection }]}>
                    <Text style={[styles.receiptPreviewLabel, { color: colors.textSecondary }]}>{isRTL ? "الوصف" : "Description"}</Text>
                    <Text style={[styles.receiptPreviewValue, { color: colors.text }]} numberOfLines={4}>
                      {receiptPreviewData?.description || receiptPreviewAttachment?.description || "-"}
                    </Text>
                  </View>

                  <View style={[styles.receiptPreviewRow, { flexDirection: rowDirection }]}>
                    <Text style={[styles.receiptPreviewLabel, { color: colors.textSecondary }]}>{isRTL ? "المبلغ" : "Amount"}</Text>
                    <Text style={[styles.receiptPreviewValue, { color: colors.primary }]}>
                      {Number(receiptPreviewData?.amount ?? receiptPreviewAttachment?.amount ?? 0).toLocaleString()} {isRTL ? "ر.س" : "SAR"}
                    </Text>
                  </View>

                  <View style={[styles.receiptPreviewRow, { flexDirection: rowDirection }]}>
                    <Text style={[styles.receiptPreviewLabel, { color: colors.textSecondary }]}>{isRTL ? "الحالة" : "Status"}</Text>
                    <Text style={[styles.receiptPreviewValue, { color: colors.text }]}>
                      {(receiptPreviewData?.status || receiptPreviewAttachment?.status) === "final"
                        ? (isRTL ? "نهائي" : "Final")
                        : (isRTL ? "موقع من البائع" : "Signed by Seller")}
                    </Text>
                  </View>

                  <View style={[styles.receiptPreviewDivider, { backgroundColor: colors.border }]} />

                  <Text style={[styles.receiptPreviewSectionTitle, { color: colors.text }]}>
                    {isRTL ? "التوقيعات" : "Signatures"}
                  </Text>

                  <View style={[styles.receiptPreviewSigBox, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.receiptPreviewSigTitle, { color: colors.textSecondary }]}>
                      {isRTL ? "توقيع البائع" : "Seller"}
                    </Text>
                    <Text style={[styles.receiptPreviewSigValue, { color: colors.text }]}>
                      {receiptPreviewData?.seller_signature?.display_name || "-"}
                    </Text>
                    <Text style={[styles.receiptPreviewSigMeta, { color: colors.textMuted }]}>
                      {formatGregorian(receiptPreviewData?.seller_signature?.timestamp)}
                    </Text>
                  </View>

                  <View style={[styles.receiptPreviewSigBox, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.receiptPreviewSigTitle, { color: colors.textSecondary }]}>
                      {isRTL ? "توقيع المشتري" : "Buyer"}
                    </Text>
                    <Text style={[styles.receiptPreviewSigValue, { color: colors.text }]}>
                      {receiptPreviewData?.buyer_signature?.display_name || (isRTL ? "معلق" : "Pending")}
                    </Text>
                    <Text style={[styles.receiptPreviewSigMeta, { color: colors.textMuted }]}>
                      {receiptPreviewData?.buyer_signature?.timestamp ? formatGregorian(receiptPreviewData?.buyer_signature?.timestamp) : "-"}
                    </Text>
                  </View>
                </View>

                <View style={[styles.receiptPreviewActions, { flexDirection: rowDirection }]}>
                  <Pressable
                    onPress={async () => {
                      const url = receiptPreviewAttachment?.signedUrl || receiptPreviewAttachment?.uri;
                      if (!url) return;
                      await WebBrowser.openBrowserAsync(url, {
                        presentationStyle: "pageSheet",
                        readerMode: false,
                      });
                    }}
                    style={[styles.receiptPreviewActionBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.receiptPreviewActionText, { color: "#fff" }]}>
                      {isRTL ? "فتح PDF" : "Open PDF"}
                    </Text>
                  </Pressable>

                  {receiptPreviewAttachment?.status === "seller_signed" &&
                    receiptPreviewAttachment?.receipt_id &&
                    !acceptedReceiptIds.has(receiptPreviewAttachment.receipt_id) &&
                    currentUserId &&
                    !isAdOwner && (
                      <Pressable
                        onPress={() => handleAcceptReceipt(receiptPreviewAttachment.receipt_id)}
                        disabled={acceptingReceipt}
                        style={[styles.receiptPreviewActionBtn, { backgroundColor: colors.primaryLight }]}
                      >
                        <Text style={[styles.receiptPreviewActionText, { color: colors.primary }]}>
                          {acceptingReceipt ? (isRTL ? "جاري..." : "Loading...") : (isRTL ? "قبول وتوقيع" : "Accept & Sign")}
                        </Text>
                      </Pressable>
                    )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        visible={disputeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDisputeModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: insets.bottom + 20,
          }}>
            <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                {isRTL ? "تقديم نزاع" : "Submit Dispute"}
              </Text>
              <Pressable onPress={() => setDisputeModalVisible(false)}>
                <X size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 12, textAlign: getRTLTextAlign(isRTL) }}>
              {isRTL
                ? "يرجى وصف المشكلة بالتفصيل. سيتم مراجعة النزاع من قبل الإدارة."
                : "Please describe the issue in detail. The dispute will be reviewed by admin."}
            </Text>
            <TextInput
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder={isRTL ? "اكتب سبب النزاع هنا..." : "Write your dispute reason here..."}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.text,
                minHeight: 120,
                borderWidth: 1,
                borderColor: colors.border,
                textAlign: getRTLTextAlign(isRTL),
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: rowDirection, gap: 10 }}>
              <Pressable
                onPress={() => setDisputeModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  {isRTL ? "إلغاء" : "Cancel"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDisputeSubmit}
                disabled={daminActionLoading || !disputeReason.trim()}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: !disputeReason.trim() ? colors.border : "#EF4444",
                  alignItems: "center",
                  opacity: daminActionLoading ? 0.6 : 1,
                }}
              >
                {daminActionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>
                    {isRTL ? "تقديم النزاع" : "Submit Dispute"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Regular Order Dispute Modal */}
      <Modal
        visible={orderDisputeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOrderDisputeModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: insets.bottom + 20,
          }}>
            <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                {isRTL ? "رفع نزاع على الطلب" : "Submit Order Dispute"}
              </Text>
              <Pressable onPress={() => setOrderDisputeModalVisible(false)}>
                <X size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <TextInput
              value={orderDisputeReason}
              onChangeText={setOrderDisputeReason}
              placeholder={isRTL ? "اكتب سبب النزاع..." : "Write dispute reason..."}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.text,
                minHeight: 120,
                borderWidth: 1,
                borderColor: colors.border,
                textAlign: getRTLTextAlign(isRTL),
                marginBottom: 16,
              }}
            />
            <View style={{ flexDirection: rowDirection, gap: 10 }}>
              <Pressable
                onPress={() => setOrderDisputeModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  {isRTL ? "إلغاء" : "Cancel"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitOrderDispute}
                disabled={orderDisputeLoading || !orderDisputeReason.trim()}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: !orderDisputeReason.trim() ? colors.border : "#EF4444",
                  alignItems: "center",
                  opacity: orderDisputeLoading ? 0.6 : 1,
                }}
              >
                {orderDisputeLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>
                    {isRTL ? "إرسال النزاع" : "Submit Dispute"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      {/* Receipt Bottom Sheet */}
      <BottomSheet
        ref={receiptBottomSheetRef}
        index={-1}
        snapPoints={["70%", "90%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView style={styles.sheetContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Text style={[styles.sheetTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {t.chat.createReceipt}
          </Text>

          {/* Ad Context Info */}
          {resolvedAdTitle ? (
            <View style={[styles.receiptAdContext, { backgroundColor: colors.primaryLight, flexDirection: rowDirection }]}>
              <Receipt size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.receiptAdContextLabel, { color: colors.primary, textAlign: getRTLTextAlign(isRTL) }]}>
                  {isRTL ? "إيصال لـ:" : "Receipt for:"}
                </Text>
                <Text style={[styles.receiptAdContextValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                  {resolvedAdTitle}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Helper Text */}
          <Text style={[styles.receiptHelper, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL 
              ? "سيتم إنشاء إيصال إلكتروني بتوقيعك. يمكن للمشتري قبوله وتوقيعه." 
              : "An electronic receipt with your signature will be created. The buyer can accept and sign it."}
          </Text>

          <View style={styles.receiptForm}>
            {/* Description Field */}
            <View>
              <Text style={[styles.receiptFieldLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                {isRTL ? "الوصف" : "Description"}
              </Text>
              <View style={[styles.receiptInput, { backgroundColor: colors.surface }]}>
                <BottomSheetTextInput
                  testID="receipt-desc-input"
                  style={[styles.receiptTextInput, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}
                  placeholder={isRTL ? "وصف الخدمة أو المنتج" : "Service or product description"}
                  placeholderTextColor={colors.textMuted}
                  value={receiptData.description}
                  onChangeText={(text) => updateReceiptData({ description: text })}
                  multiline
                />
              </View>
            </View>

            {/* Amount Field */}
            <View>
              <Text style={[styles.receiptFieldLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                {isRTL ? "المبلغ" : "Amount"}
              </Text>
              <View style={[styles.receiptInput, { backgroundColor: colors.surface, flexDirection: rowDirection }]}>
                <BottomSheetTextInput
                  testID="receipt-amount-input"
                  style={[styles.receiptTextInput, { color: colors.text, textAlign: getRTLTextAlign(isRTL), flex: 1 }]}
                  placeholder={isRTL ? "أدخل المبلغ" : "Enter amount"}
                  placeholderTextColor={colors.textMuted}
                  value={receiptData.amount}
                  onChangeText={(text) => updateReceiptData({ amount: text })}
                  keyboardType="numeric"
                />
                <View style={[styles.currencyBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.currencyBadgeText}>{t.common.sar}</Text>
                </View>
              </View>
            </View>

            {/* Date Field (read-only) */}
            <View>
              <Text style={[styles.receiptFieldLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                {isRTL ? "التاريخ" : "Date"}
              </Text>
              <View style={[styles.receiptInput, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.receiptDateText, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                  {new Date(receiptData.date).toLocaleDateString(isRTL ? "ar-SA-u-ca-gregory" : "en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    calendar: "gregory",
                  })}
                </Text>
              </View>
            </View>

            <Pressable
              testID="receipt-create-btn"
              onPress={createReceipt}
              disabled={creatingReceipt}
              style={[styles.createReceiptButton, { backgroundColor: creatingReceipt ? colors.textMuted : colors.primary }]}
            >
              {creatingReceipt ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.createReceiptText}>{t.chat.createReceipt}</Text>
                </>
              )}
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Library Bottom Sheet */}
      <BottomSheet
        ref={libraryBottomSheetRef}
        index={-1}
        snapPoints={["50%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {t.chat.previousMedia}
          </Text>

          <Text style={[styles.noMediaText, { color: colors.textMuted }]}>{t.chat.noMedia}</Text>
        </BottomSheetView>
      </BottomSheet>

      {/* Attachment Options Bottom Sheet */}
      <BottomSheet
        ref={attachmentBottomSheetRef}
        index={-1}
        snapPoints={["35%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.attachmentOptions}>
            <Pressable onPress={handlePickImage} style={styles.attachmentOption}>
              <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.primaryLight }]}>
                <ImageIcon size={24} color={colors.primary} />
              </View>
              <Text style={[styles.attachmentOptionText, { color: colors.text }]}>
                {t.chat.attachImage}
              </Text>
            </Pressable>

            <Pressable onPress={handleTakePhoto} style={styles.attachmentOption}>
              <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Camera size={24} color={colors.text} />
              </View>
              <Text style={[styles.attachmentOptionText, { color: colors.text }]}>
                {isRTL ? "التقاط صورة" : "Take Photo"}
              </Text>
            </Pressable>

            <Pressable onPress={handlePickDocument} style={styles.attachmentOption}>
              <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <FileText size={24} color={colors.text} />
              </View>
              <Text style={[styles.attachmentOptionText, { color: colors.text }]}>
                {t.chat.attachFile}
              </Text>
            </Pressable>

            <Pressable onPress={handleShareLocation} disabled={sharingLocation} style={styles.attachmentOption}>
              <View style={[styles.attachmentOptionIcon, { backgroundColor: colors.primaryLight, opacity: sharingLocation ? 0.7 : 1 }]}>
                {sharingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MapPin size={24} color={colors.primary} />
                )}
              </View>
              <Text style={[styles.attachmentOptionText, { color: colors.text }]}>
                {sharingLocation
                  ? (isRTL ? "جاري تحديد الموقع..." : "Getting location...")
                  : t.chat.shareLocation}
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfoRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 4,
  },
  userInfo: {
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  headerReceiptButton: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userTexts: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontSize: 12,
    color: '#10B981',
  },

  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },
  messageAvatarContainer: {
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  attachmentInMessage: {
    marginBottom: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  locationText: {
    fontSize: 12,
  },
  fileBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    minWidth: 180,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  fileName: {
    fontSize: 13,
    maxWidth: 150,
    fontWeight: "500",
  },
  fileSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },

  // Attachments Preview
  attachmentsPreview: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  attachmentPreviewItem: {
    position: "relative",
    marginRight: 10,
  },
  attachmentPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  attachmentPreviewIcon: {
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  removeAttachment: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Input Area
  inputContainer: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  attachButton: {
    padding: 10,
    borderRadius: 12,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    maxHeight: 80,
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
  },

  // Bottom Sheet
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },

  // Receipt Form
  receiptAdContext: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    gap: 10,
  },
  receiptAdContextLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  receiptAdContextValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  receiptHelper: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  receiptForm: {
    gap: 16,
  },
  receiptFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  receiptInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  receiptTextInput: {
    paddingVertical: 14,
    fontSize: 15,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  currencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  currencyBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  receiptDateText: {
    fontSize: 15,
    paddingVertical: 14,
  },
  createReceiptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  createReceiptText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Media Grid
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  mediaItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  fileMediaItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  mediaFileName: {
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
  noMediaText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },

  // Attachment Options
  attachmentOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    paddingTop: 10,
  },
  attachmentOption: {
    alignItems: "center",
    width: "25%",
    marginBottom: 20,
  },
  attachmentOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  attachmentOptionText: {
    fontSize: 12,
    textAlign: "center",
  },
  
  // Full Screen Image
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
  fullScreenCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },

  // Ad Context Header
  adContextHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  adContextContent: {
    flex: 1,
  },
  adContextTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  adContextMeta: {
    flexWrap: "wrap",
    gap: 8,
  },
  adContextMetaItem: {
    fontSize: 12,
    marginRight: 12,
  },

  // Damin Order Context Bar
  orderCompletionBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  orderCompletionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#10B98115",
    alignItems: "center",
    justifyContent: "center",
  },
  orderCompletionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 1,
  },
  orderCompletionSub: {
    fontSize: 11,
  },
  orderCompletionBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  orderCompletionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  daminContextBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  daminContextTop: {
    alignItems: "center",
    gap: 10,
  },
  daminContextIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  daminContextInfo: {
    flex: 1,
    gap: 2,
  },
  daminContextTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  daminContextMeta: {
    alignItems: "center",
    gap: 4,
  },
  daminContextStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  daminContextAmount: {
    fontSize: 12,
    fontWeight: "600",
  },
  daminContextActions: {
    marginTop: 8,
    gap: 8,
  },
  daminActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  daminActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  combinedContextBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  combinedContextMain: {
    flex: 1,
    alignItems: "center",
    gap: 10,
  },
  combinedContextIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  combinedContextInfo: {
    flex: 1,
    gap: 2,
  },
  combinedContextTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  combinedContextSubtitle: {
    fontSize: 11,
  },
  combinedContextMeta: {
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  combinedContextStatus: {
    fontSize: 11,
    fontWeight: "700",
  },
  combinedContextAmount: {
    fontSize: 11,
    fontWeight: "700",
  },
  combinedContextHint: {
    fontSize: 11,
    fontWeight: "500",
  },
  combinedContextActions: {
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  compactActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  compactActionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  // Receipt Card
  receiptCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    minWidth: 220,
  },
  receiptHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  receiptBody: {
    marginBottom: 12,
  },
  receiptDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
  receiptAmount: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  receiptStatus: {
    fontSize: 12,
    fontStyle: "italic",
  },
  receiptActions: {
    gap: 8,
  },
  receiptButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  receiptButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Payment Card
  paymentCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    minWidth: 220,
    alignItems: "center",
  },
  paymentHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  paymentButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Receipt preview modal
  receiptDragHandle: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  receiptDragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  receiptPreviewContainer: {
    flex: 1,
  },
  receiptPreviewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  receiptPreviewClose: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptPreviewTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  receiptPreviewContent: {
    flex: 1,
    padding: 16,
  },
  receiptPreviewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  receiptPreviewAdTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  receiptPreviewRow: {
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  receiptPreviewLabel: {
    width: 90,
    fontSize: 12,
    fontWeight: "700",
  },
  receiptPreviewValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  receiptPreviewDivider: {
    height: 1,
    marginVertical: 12,
  },
  receiptPreviewSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },
  receiptPreviewSigBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  receiptPreviewSigTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  receiptPreviewSigValue: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  receiptPreviewSigMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  receiptPreviewActions: {
    gap: 10,
    marginTop: 14,
  },
  receiptPreviewActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptPreviewActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
