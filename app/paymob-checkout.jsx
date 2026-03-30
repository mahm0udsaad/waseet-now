import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
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
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

import { useTheme } from "@/utils/theme/store";
import { useTranslation, getRTLRowDirection } from "@/utils/i18n/store";
import { pollPaymobStatus, checkPaymobStatus } from "@/utils/paymob";
import { hapticFeedback } from "@/utils/native/haptics";
import { sendMessage } from "@/utils/supabase/chat";
import { ORDER_STATUSES } from "@/utils/supabase/orders";

const RETURN_URL_BASE = "https://www.wasitalan.com/paymob/return";

export default function PaymobCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isRTL } = useTranslation();
  const params = useLocalSearchParams();

  const { checkoutUrl, paymentId, orderId, conversationId, amount, isDamin } = params;

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const verificationStarted = useRef(false);

  /** Intercept Paymob return URL to detect payment completion */
  const handleNavigationChange = useCallback(
    (navState) => {
      const { url } = navState;
      if (!url || !url.startsWith(RETURN_URL_BASE)) return;

      // Paymob redirected to our return URL — payment flow is done
      // Extract query params for immediate status hints
      try {
        const params = new URL(url).searchParams;
        const success = params.get("success");
        const pending = params.get("pending");

        if (success === "true") {
          setResult({ status: "succeeded" });
          hapticFeedback.confirm();
          return;
        }
        if (success === "false") {
          setResult({ status: "failed", reason: params.get("message") || undefined });
          hapticFeedback.warning();
          return;
        }
      } catch {}

      // Fallback: start polling if we can't determine from URL
      if (!verificationStarted.current) {
        verificationStarted.current = true;
        startVerification();
      }
    },
    [startVerification]
  );

  /** Also intercept via request (before page loads) for faster detection */
  const handleShouldStartLoad = useCallback(
    (event) => {
      const { url } = event;
      if (url && url.startsWith(RETURN_URL_BASE)) {
        handleNavigationChange({ url });
        return false; // Block navigation to return URL
      }
      return true;
    },
    [handleNavigationChange]
  );

  const startVerification = useCallback(async () => {
    if (verificationStarted.current && verifying) return;
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
  }, [paymentId, verifying]);

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

  // ── Result Screen ──
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

  // ── Verifying Screen ──
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

  // ── Embedded WebView Checkout ──
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

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {isRTL ? "جاري تحميل صفحة الدفع..." : "Loading checkout..."}
          </Text>
        </View>
      )}

      <WebView
        source={{ uri: String(checkoutUrl) }}
        style={{ flex: 1, opacity: loading ? 0 : 1 }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        scalesPageToFit
        allowsInlineMediaPlayback
        mixedContentMode="compatibility"
      />
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 56,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
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
