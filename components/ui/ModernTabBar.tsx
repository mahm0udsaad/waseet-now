import { NativeIcon } from "@/components/native/NativeIcon";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { useTranslation } from "@/utils/i18n/store";
import { useInAppNotificationsStore } from "@/utils/notifications/inAppStore";
import { useTheme } from "@/utils/theme/store";
import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import React, { memo, useCallback, useMemo, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabItem = memo(({ tab, isActive, onPress, badgeCount, colors }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 7,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.tabItem, { transform: [{ scale }] }]}>
      <Pressable
        testID={`tab-${tab.id}`}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.tabButton}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={tab.label}
      >
        <View style={[
          styles.iconContainer,
          isActive && { backgroundColor: colors.primary + '15' }
        ]}>
          <NativeIcon
            name={isActive ? tab.iconName : tab.iconNameOutline || tab.iconName}
            size={24}
            color={isActive ? colors.primary : colors.textMuted}
            weight={isActive ? "semibold" : "regular"}
          />
          {badgeCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.surface }]}>
              <Animated.Text style={styles.badgeText}>
                {badgeCount > 9 ? '9+' : badgeCount}
              </Animated.Text>
            </View>
          )}
        </View>
        {isActive && (
          <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
        )}
      </Pressable>
    </Animated.View>
  );
});

TabItem.displayName = "ModernTabBarTabItem";

export default function ModernTabBar({ activeTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isRTL, rowDirection } = useTranslation();
  const notificationsUnread = useInAppNotificationsStore((s) => s.unreadCount);

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
        iconNameOutline: "message-outline",
        label: isRTL ? "المحادثات" : "Chats",
        route: "/chats",
      },
      {
        id: "profile",
        iconName: "user",
        iconNameOutline: "user-outline",
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

  const containerStyle = {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#18181B' : '#FFFFFF'),
    borderColor: colors.border,
  };
  
  const blurTint = isDark ? "dark" : "light";

  return (
    <View style={[styles.containerWrapper, { paddingBottom: insets.bottom + Spacing.s }]}>
      <BlurView
        intensity={90}
        tint={blurTint}
        style={[
          styles.container,
          containerStyle,
          Platform.OS === 'android' && styles.androidShadow
        ]}
      >
        <View style={[styles.content, { flexDirection: rowDirection }]}>
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={isTabActive(tab)}
              onPress={() => handleTabPress(tab)}
              badgeCount={tab.id === 'chats' ? notificationsUnread : 0}
              colors={colors}
            />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    borderRadius: BorderRadius.xl,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 0.5,
    ...Shadows.medium,
  },
  androidShadow: {
    elevation: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    flex: 1,
  },
  tabItem: {
    flex: 1,
    height: "100%",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.l,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    end: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: "absolute",
    bottom: 6,
  },
});
