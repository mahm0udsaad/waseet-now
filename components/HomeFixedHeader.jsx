import { NativeIcon } from "@/components/native/NativeIcon";
import { Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/utils/theme/store";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const FIXED_HEADER_HEIGHT = 68;

export default function HomeFixedHeader({
  isBlurred,
  isDark,
  isRTL,
  language,
  unreadCount,
  onToggleLanguage,
  onToggleTheme,
  onOpenNotifications,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const homeGreeting = isRTL ? "مرحباً بك" : "Welcome to";
  const homeBrand = isRTL ? "وسيط الان" : "Waseet";

  const content = (
    <View style={styles.headerContent}>
      <View style={styles.brandSection}>
        <View style={[styles.logoWrapper, Shadows.small]}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <View style={{ flexShrink: 1 }}>
          <Text
            style={[
              styles.greeting,
              { color: colors.textSecondary },
            ]}
          >
            {homeGreeting}
          </Text>
          <Text
            style={[
              styles.brandName,
              { color: colors.text },
            ]}
          >
            {homeBrand}
          </Text>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <HeaderActionButton
          accessibilityLabel={isRTL ? "الإشعارات" : "Notifications"}
          onPress={onOpenNotifications}
          backgroundColor={colors.surfaceHighlight}
        >
          <NativeIcon name="notification" size={20} color={colors.text} />
          {unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          ) : null}
        </HeaderActionButton>

        <HeaderActionButton
          accessibilityLabel={
            isDark
              ? isRTL
                ? "تفعيل الوضع الفاتح"
                : "Switch to light mode"
              : isRTL
                ? "تفعيل الوضع الداكن"
                : "Switch to dark mode"
          }
          onPress={onToggleTheme}
          backgroundColor={colors.surfaceHighlight}
        >
          <NativeIcon
            name={isDark ? "sun" : "moon"}
            size={20}
            color={isDark ? colors.warning : colors.primary}
          />
        </HeaderActionButton>

        <HeaderActionButton
          accessibilityLabel={isRTL ? "تغيير اللغة" : "Change language"}
          onPress={onToggleLanguage}
          backgroundColor={colors.surfaceHighlight}
        >
          <Text style={[styles.languageText, { color: colors.primary }]}>
            {language === "ar" ? "EN" : "ع"}
          </Text>
        </HeaderActionButton>
      </View>
    </View>
  );

  const wrapperStyle = [
    styles.fixedHeader,
    !isBlurred && styles.fixedHeaderClear,
    isBlurred && { borderBottomColor: colors.border },
    isBlurred && Platform.OS !== "ios" && { backgroundColor: colors.surface },
    { paddingTop: insets.top + 6 },
  ];

  if (isBlurred && Platform.OS === "ios") {
    return (
      <BlurView intensity={55} tint={isDark ? "dark" : "light"} style={wrapperStyle}>
        {content}
      </BlurView>
    );
  }

  return <View style={wrapperStyle}>{content}</View>;
}

function HeaderActionButton({ accessibilityLabel, backgroundColor, children, onPress }) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    paddingHorizontal: Spacing.m,
    paddingBottom: 8,
    borderBottomWidth: 1,
    minHeight: FIXED_HEADER_HEIGHT + 44,
    justifyContent: "flex-end",
    backgroundColor: "rgba(10, 26, 47, 0.28)",
  },
  fixedHeaderClear: {
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  headerContent: {
    minHeight: FIXED_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.m,
  },
  brandSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.m,
  },
  logoWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
  },
  logo: {
    width: 48,
    height: 48,
  },
  greeting: {
    fontSize: 12,
    fontWeight: "500",
  },
  brandName: {
    fontSize: 18,
    fontWeight: "700",
  },
  actionsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  languageText: {
    fontSize: 14,
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    top: 0,
    end: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
