import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  AppState,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";

import { useTheme } from "@/utils/theme/store";
import { useTranslation, getRTLRowDirection } from "@/utils/i18n/store";
import { pollPaymobStatus, checkPaymobStatus } from "@/utils/paymob";
import { hapticFeedback } from "@/utils/native/haptics";
import { sendMessage } from "@/utils/supabase/chat";
import { ORDER_STATUSES } from "@/utils/supabase/orders";

export default function PaymobCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isRTL } = useTranslation();
  const params = useLocalSearchParams();

  const { checkoutUrl, paymentId, orderId, conversationId, amount, isDamin } = params;

  const [launchingBrowser, setLaunchingBrowser] = useState(false);
  const [browserError, setBrowserError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const verificationStarted = useRef(false);
  const appState = useRef(AppState.currentState);
  const checkoutOpenedRef = useRef(false);

  const openCheckoutInBrowser = useCallback(async () => {
    if (!checkoutUrl) {
      setBrowserError(true);
      return false;
    }

    setBrowserError(false);
    setLaunchingBrowser(true);

    try {
      await Linking.openURL(String(checkoutUrl));
      checkoutOpenedRef.current = true;
      return true;
    } catch (error) {
      console.error("Failed to open Paymob checkout:", error);
      setBrowserError(true);
      return false;
    } finally {
      setLaunchingBrowser(false);
    }
  }, [checkoutUrl]);

  useEffect(() => {
    if (checkoutOpenedRef.current) return;
    openCheckoutInBrowser();
  }, [openCheckoutInBrowser]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active" &&
        paymentId &&
        !result &&
        !verifying
      ) {
        checkPaymobStatus(paymentId)
          .then(({ status }) => {
            if (["succeeded", "failed", "canceled"].includes(status)) {
              setResult({ status });
            }
          })
          .catch(() => {});
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [paymentId, result, verifying]);

  const startVerification = useCallback(async () => {
    if (verificationStarted.current) return;
    verificationStarted.current = true;
    setVerifying(true);

    try {
      const { status, raw } = await pollPaymobStatus(paymentId, {
        intervalMs: 2000,
        timeoutMs: 60000,
      });

      hapticFeedback[status === "succeeded" ? "confirm" : "warning"]();
      setResult({ status, reason: raw?.failure_reason });
    } catch {
      setResult({ status: "pending_timeout" });
    } finally {
      setVerifying(false);
    }
  }, [paymentId]);

  const handleUserClose = useCallback(() => {
    if (result) {
      router.back();
      setTimeout(() => {
        router.setParams({
          payResult: JSON.stringify({
            status: result.status,
            paymentId,
            reason: result.reason,
          }),
        });
      }, 0);
      return;
    }

    if (verifying) return;

    setVerifying(true);
    checkPaymobStatus(paymentId)
      .then(({ status }) => {
        if (status === "succeeded") {
          setResult({ status: "succeeded" });
        } else {
          router.back();
        }
      })
      .catch(() => {
        router.back();
      })
      .finally(() => setVerifying(false));
  }, [result, verifying, paymentId, router]);

  const handleDone = useCallback(async () => {
    const status = result?.status || "canceled";
    const payResultJson = JSON.stringify({
      status,
      paymentId,
      reason: result?.reason,
    });

    if (isDamin === "true" && conversationId) {
      router.replace({
        pathname: "/chat",
        params: {
          id: conversationId,
          payResult: payResultJson,
          isDamin: "true",
          orderId,
          amount,
        },
      });
      return;
    }

    if (status === "succeeded" && conversationId && !isDamin) {
      try {
        const verified = await checkPaymobStatus(paymentId);
        if (verified.status !== "succeeded") {
          throw new Error(
            isRTL
              ? "تعذر تأكيد نجاح العملية من مزود الدفع."
              : "Unable to confirm payment success with payment provider."
          );
        }

        if (orderId) {
          try {
            const { updateOrderStatus } = await import("@/utils/supabase/orders");
            const updatedOrder = await updateOrderStatus(orderId, ORDER_STATUSES.PAYMENT_VERIFIED);
            if (!updatedOrder && __DEV__) {
              console.warn(
                "[PaymobCheckout] Order status was not updated (no rows affected). Check order_id and RLS/update policies."
              );
            }
          } catch (orderErr) {
            console.warn("Order status update skipped:", orderErr);
          }
        }

        const receiptPayload = {
          type: "payment_receipt",
          status: "succeeded",
          amount: amount || 0,
          currency: "SAR",
          method: "card",
          methodLabelAr: "بطاقة ائتمان/خصم",
          methodLabelEn: "Credit/Debit Card",
          reference: paymentId,
          createdAt: new Date().toISOString(),
          order_id: orderId,
        };

        await sendMessage(conversationId, null, [receiptPayload]);

        router.replace({
          pathname: "/chat",
          params: { conversationId },
        });
        return;
      } catch (error) {
        console.error("Failed to send payment receipt message:", error);
        if (__DEV__) {
          console.warn("[PaymobCheckout] Receipt-based success flow halted due to failed verification/updates");
        }
      }
    }

    router.navigate({
      pathname: "/damin-order-details",
      params: {
        id: orderId,
        payResult: payResultJson,
      },
    });
  }, [result, paymentId, orderId, conversationId, amount, isDamin, router, isRTL]);

  const handleRetryCheck = useCallback(() => {
    verificationStarted.current = false;
    setResult(null);
    startVerification();
  }, [startVerification]);

  if (result) {
    const isSuccess = result.status === "succeeded";
    const isFailed = result.status === "failed";
    const isPending = result.status === "pending_timeout";

    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <StatusBar style={colors.statusBar} />
        <View style={styles.resultContainer}>
          {isSuccess && (
            <>
              <View style={[styles.resultIcon, { backgroundColor: "#10B98120" }]}>
                <CheckCircle2 size={48} color="#10B981" />
              </View>
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {isRTL ? "تمت العملية بنجاح!" : "Payment Successful!"}
              </Text>
              <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                {isRTL
                  ? "تم الدفع بنجاح وسيتم تحديث حالة الطلب."
                  : "Payment completed successfully. Order status will be updated."}
              </Text>
            </>
          )}

          {isFailed && (
            <>
              <View style={[styles.resultIcon, { backgroundColor: "#EF444420" }]}>
                <XCircle size={48} color="#EF4444" />
              </View>
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {isRTL ? "فشلت العملية" : "Payment Failed"}
              </Text>
              <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                {result.reason ||
                  (isRTL
                    ? "لم تتم العملية. يرجى المحاولة مرة أخرى."
                    : "The payment could not be processed. Please try again.")}
              </Text>
            </>
          )}

          {isPending && (
            <>
              <View style={[styles.resultIcon, { backgroundColor: "#F59E0B20" }]}>
                <Clock size={48} color="#F59E0B" />
              </View>
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {isRTL ? "جاري المعالجة" : "Processing"}
              </Text>
              <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                {isRTL
                  ? "لم يتم تأكيد العملية بعد. يمكنك التحقق لاحقاً."
                  : "Payment not yet confirmed. You can check again later."}
              </Text>
              <Pressable
                onPress={handleRetryCheck}
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
              >
                <RefreshCw size={18} color="#fff" />
                <Text style={styles.retryButtonText}>
                  {isRTL ? "تحقق مرة أخرى" : "Check Again"}
                </Text>
              </Pressable>
            </>
          )}

          <Pressable
            onPress={handleDone}
            style={[
              styles.doneButton,
              {
                backgroundColor: isSuccess ? "#10B981" : isFailed ? colors.primary : colors.surface,
                borderColor: isPending ? colors.border : "transparent",
                borderWidth: isPending ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.doneButtonText, { color: isPending ? colors.text : "#fff" }]}>
              {isSuccess
                ? (isRTL ? "تم" : "Done")
                : isFailed
                  ? (isRTL ? "المحاولة مرة أخرى" : "Try Again")
                  : (isRTL ? "العودة للطلب" : "Back to Order")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (verifying) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <StatusBar style={colors.statusBar} />
        <View style={styles.resultContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.resultTitle, { color: colors.text, marginTop: 20 }]}>
            {isRTL ? "جاري تأكيد العملية..." : "Confirming payment..."}
          </Text>
          <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
            {isRTL
              ? "يرجى الانتظار وعدم إغلاق التطبيق."
              : "Please wait and don't close the app."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar style={colors.statusBar} />

      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: getRTLRowDirection(isRTL) }]}>
        <Pressable onPress={handleUserClose} style={styles.headerButton}>
          {isRTL ? <ArrowRight size={24} color={colors.text} /> : <ArrowLeft size={24} color={colors.text} />}
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isRTL ? "الدفع" : "Payment"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.resultContainer}>
        <View style={[styles.resultIcon, { backgroundColor: `${colors.primary}20` }]}>
          {launchingBrowser ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <ExternalLink size={42} color={colors.primary} />
          )}
        </View>

        <Text style={[styles.resultTitle, { color: colors.text }]}>
          {launchingBrowser
            ? (isRTL ? "جاري فتح صفحة الدفع..." : "Opening checkout...")
            : (isRTL ? "تم فتح صفحة الدفع" : "Checkout Opened")}
        </Text>

        <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
          {browserError
            ? (isRTL
                ? "تعذر فتح صفحة الدفع. حاول مرة أخرى."
                : "The checkout page could not be opened. Please try again.")
            : (isRTL
                ? "تم تحويلك إلى صفحة Paymob في نافذة كاملة. أكمل الدفع هناك ثم عُد إلى التطبيق لتأكيد العملية."
                : "You were redirected to Paymob in a full browser window. Complete the payment there, then return to the app to confirm it.")}
        </Text>

        <Pressable
          onPress={openCheckoutInBrowser}
          disabled={launchingBrowser}
          style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: launchingBrowser ? 0.7 : 1 }]}
        >
          {launchingBrowser ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <ExternalLink size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {isRTL ? "فتح صفحة الدفع" : "Open Checkout"}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={handleRetryCheck}
          style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <RefreshCw size={18} color={colors.text} />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            {isRTL ? "تحققت من الدفع" : "I've Completed Payment"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  resultIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  primaryButton: {
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  doneButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: "100%",
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
