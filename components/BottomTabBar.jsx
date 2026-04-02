import { useTranslation } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import * as NavigationBar from "expo-navigation-bar";
import { usePathname, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { NativeIcon } from "@/components/native/NativeIcon";
import { NativePressable } from "@/components/native/NativePressable";
import React, { memo, useCallback, useEffect, useMemo } from "react";
import {
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChatUnreadStore } from "@/utils/chat/unreadStore";

const TabItem = memo(function TabItem({
  tab,
  isActive,
  colors,
  onPress,
  badgeCount,
}) {
  return (
    <NativePressable
      key={tab.id}
      onPress={onPress}
      haptic="selection"
      scaleOnPress={0.95}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      style={styles.tabItem}
    >
      <View
        pointerEvents="none"
        style={[
          styles.iconContainer,
          isActive && {
            backgroundColor: colors.primary + "15",
            transform: [{ scale: 1.1 }],
          },
        ]}
      >
        <NativeIcon
          name={tab.iconName}
          size={24}
          color={isActive ? colors.primary : colors.textMuted}
          weight={isActive ? "semibold" : "regular"}
        />
        {!!badgeCount && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.primary, borderColor: colors.surface },
            ]}
          />
        )}
      </View>
      {isActive && (
        <View 
          pointerEvents="none"
          style={[styles.activeDot, { backgroundColor: colors.primary }]} 
        />
      )}
    </NativePressable>
  );
});

export default function BottomTabBar({ activeTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
  const chatUnread = useChatUnreadStore((s) => s.totalUnread);

  const tabs = useMemo(
    () => [
      {
        id: "home",
        iconName: "home",
        label: isRTL ? "الرئيسية" : "Home",
        route: "/",
      },
      {
        id: "orders",
        iconName: "list",
        label: isRTL ? "طلباتي" : "Orders",
        route: "/my-orders",
      },
      {
        id: "chats",
        iconName: "message",
        label: isRTL ? "المحادثات" : "Chats",
        route: "/chats",
      },
      {
        id: "profile",
        iconName: "user",
        label: isRTL ? "حسابي" : "Profile",
        route: "/profile",
      },
    ],
    [isRTL]
  );

  const handleTabPress = useCallback(
    (tab) => {
      if (tab.route) {
        router.push(tab.route);
      }
    },
    [router]
  );

  const isTabActive = useCallback(
    (tab) => {
      if (activeTab) {
        return activeTab === tab.id;
      }
      return pathname === tab.route;
    },
    [activeTab, pathname]
  );

  const renderTab = useCallback(
    (tab) => {
      const isActive = isTabActive(tab);
      const badgeCount = tab.id === "chats" ? chatUnread : 0;
      return (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={isActive}
          colors={colors}
          onPress={() => handleTabPress(tab)}
          badgeCount={badgeCount}
        />
      );
    },
    [colors, handleTabPress, isTabActive, chatUnread]
  );

  // Sync Android navigation bar color with theme
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const navColor = isDark ? colors.surface : colors.primary;
    NavigationBar.setBackgroundColorAsync(navColor);
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
  }, [colors.primary, colors.surface, isDark]);

  const PADDING_BOTTOM = Math.max(insets.bottom, 10);

  // Use BlurView on iOS, regular View on Android
  const Container = Platform.OS === "ios" ? BlurView : View;
  const blurProps = Platform.OS === "ios" 
    ? { intensity: 95, tint: isDark ? "dark" : "light" } 
    : {};

  return (
    <Container
      style={[
        styles.container,
        Platform.OS !== "ios" && { backgroundColor: colors.surface },
        {
          borderTopColor: colors.border,
          paddingBottom: PADDING_BOTTOM,
          height: 60 + PADDING_BOTTOM,
          shadowColor: colors.shadow,
        },
      ]}
      {...blurProps}
    >
      <View style={styles.content}>
        {tabs.map((tab) => renderTab(tab))}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  iconContainer: {
    padding: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    end: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: "absolute",
    bottom: 8,
  },
});
