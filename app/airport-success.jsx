import { NativeButton, NativeIcon } from "@/components/native";
import { useTranslation } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { spacing } from "@/utils/native/layout";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AirportSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isRTL } = useTranslation();

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <StatusBar style={colors.statusBar} />

      <View style={styles.content}>
        {/* Success badge */}
        <Animated.View
          style={[
            styles.badge,
            {
              backgroundColor: "#10B981" + "15",
              borderColor: "#10B981",
              transform: [{ scale }],
            },
          ]}
        >
          <View style={[styles.badgeInner, { backgroundColor: "#10B981" }]}>
            <NativeIcon name="check" size={48} color="#fff" weight="semibold" />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity }]}>
          <Text style={[styles.title, { color: colors.text, writingDirection: isRTL ? "rtl" : "ltr" }]}>
            {isRTL ? "تم إرسال طلبك بنجاح" : "Request Submitted Successfully"}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary, writingDirection: isRTL ? "rtl" : "ltr" }]}>
            {isRTL
              ? "سيتم التحقق من الدفع وسيتواصل معك أحد أعضاء الفريق قريباً عبر المحادثة"
              : "Payment will be verified and a team member will contact you soon via chat"}
          </Text>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + "15" }]}>
              <NativeIcon name="message" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary, writingDirection: isRTL ? "rtl" : "ltr" }]}>
              {isRTL
                ? "ستجد المحادثة في قسم المحادثات بعد تأكيد الدفع من الإدارة"
                : "You'll find the chat in the Chats section after admin confirms payment"}
            </Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 8, opacity },
        ]}
      >
        <NativeButton
          testID="airport-success-requests"
          title={isRTL ? "متابعة طلباتي" : "View My Requests"}
          onPress={() => router.replace("/airport-requests")}
          size="lg"
        />
        <NativeButton
          testID="airport-success-home"
          title={isRTL ? "العودة للرئيسية" : "Back to Home"}
          onPress={() => router.replace("/(tabs)/")}
          size="lg"
          variant="outline"
          style={{ marginTop: spacing.sm }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  badgeInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    alignItems: "center",
    width: "100%",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
