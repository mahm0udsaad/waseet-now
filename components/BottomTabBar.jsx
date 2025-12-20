import { useTranslation } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import * as Haptics from "expo-haptics";
import * as NavigationBar from "expo-navigation-bar";
import { usePathname, useRouter } from "expo-router";
import {
  Briefcase,
  FileText,
  Home,
  MessageSquare,
  Plus,
  Shield,
  User
} from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Menu Item Component - simplified animation
const MenuItem = memo(function MenuItem({ item, animationValue, onClose, router }) {
  const animatedStyle = useAnimatedStyle(() => {
    // Simple vertical fade-in for better performance
    const opacity = interpolate(animationValue.value, [0, 1], [0, 1]);
    const translateY = interpolate(animationValue.value, [0, 1], [10, 0]);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <AnimatedPressable
      style={[styles.menuItem, animatedStyle]}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
        router.push(item.route);
      }}
    >
      {/* Icon Circle */}
      <View pointerEvents="none" style={[styles.menuItemIcon, { backgroundColor: item.color }]}>
        <item.icon size={24} color="#fff" />
      </View>
      
      {/* Label below icon */}
      <View pointerEvents="none" style={[styles.menuItemLabelContainer]}>
        <Text style={[styles.menuItemLabel, { color: '#fff', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }]}>{item.label}</Text>
      </View>
    </AnimatedPressable>
  );
});

const TabItem = memo(function TabItem({
  tab,
  isActive,
  colors,
  showNewRequestLabel,
  onPress,
}) {
  const TabIcon = tab.icon;

  if (tab.isCenter) {
    return (
      <View key={tab.id} style={styles.tabItemWrapper}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={tab.label}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.centerButton,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: pressed ? 0.95 : 1 }],
              shadowColor: colors.primary,
              shadowOpacity: Platform.OS === "ios" ? 0.12 : styles.centerButton.shadowOpacity,
              shadowRadius: Platform.OS === "ios" ? 4 : styles.centerButton.shadowRadius,
              elevation: Platform.OS === "android" ? styles.centerButton.elevation : 0,
            },
          ]}
        >
          <Plus size={28} color="#fff" strokeWidth={2.5} />
        </Pressable>
        {showNewRequestLabel && (
          <Text style={[styles.centerLabel, { color: colors.textSecondary }]}>
            {tab.label}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Pressable
      key={tab.id}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
        <TabIcon
          size={24}
          color={isActive ? colors.primary : colors.textMuted}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </View>
      {isActive && (
        <View 
          pointerEvents="none"
          style={[styles.activeDot, { backgroundColor: colors.primary }]} 
        />
      )}
    </Pressable>
  );
});

export default function BottomTabBar({ activeTab, showNewRequestLabel = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnimation = useSharedValue(0);

  const tabs = useMemo(
    () => [
      {
        id: "home",
        icon: Home,
        label: isRTL ? "الرئيسية" : "Home",
        route: "/",
      },
      {
        id: "orders",
        icon: FileText,
        label: isRTL ? "طلباتي" : "Orders",
        route: "/my-orders",
      },
      {
        id: "new",
        icon: Plus,
        label: isRTL ? "طلب جديد" : "New Request",
        isCenter: true,
      },
      {
        id: "chats",
        icon: MessageSquare,
        label: isRTL ? "المحادثات" : "Chats",
        route: "/chats",
      },
      {
        id: "profile",
        icon: User,
        label: isRTL ? "حسابي" : "Profile",
        route: "/profile",
      },
    ],
    [isRTL]
  );

  const menuItems = useMemo(
    () => [
      {
        id: "taqib",
        label: isRTL ? "تعقيب" : "Taqib",
        icon: Briefcase,
        route: "/create-taqib",
        color: "#4F46E5",
      },
      {
        id: "tanazul",
        label: isRTL ? "تنازل" : "Tanazul",
        icon: FileText,
        route: "/create-tanazul",
        color: "#059669",
      },
      {
        id: "dhamen",
        label: isRTL ? "ضامن" : "Dhamen",
        icon: Shield,
        route: "/create-dhamen",
        color: "#D97706",
      },
    ],
    [isRTL]
  );

  const orderedTabs = useMemo(
    () => (isRTL ? [...tabs].reverse() : tabs),
    [tabs, isRTL]
  );

  const displayItems = useMemo(
    () => (isRTL ? [...menuItems].reverse() : menuItems),
    [menuItems, isRTL]
  );

  const closeMenu = useCallback(() => {
    menuAnimation.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(setIsMenuOpen)(false);
      }
    });
  }, [menuAnimation]);

  const toggleMenu = useCallback(() => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      setIsMenuOpen(true);
      // Small delay to ensure modal is mounted before animating in
      requestAnimationFrame(() => {
        menuAnimation.value = withTiming(1, { duration: 200 });
      });
    }
  }, [isMenuOpen, menuAnimation, closeMenu]);

  const handleTabPress = useCallback(
    (tab) => {
      if (tab.isCenter) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleMenu();
      } else if (tab.route) {
        void Haptics.selectionAsync();
        router.push(tab.route);
      }
    },
    [router, toggleMenu]
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
      return (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={isActive}
          colors={colors}
          showNewRequestLabel={showNewRequestLabel}
          onPress={() => handleTabPress(tab)}
        />
      );
    },
    [colors, handleTabPress, isTabActive, showNewRequestLabel]
  );

  const closeButtonRotation = useDerivedValue(() =>
    interpolate(menuAnimation.value, [0, 1], [0, 45])
  );

  const closeButtonRotateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${closeButtonRotation.value}deg` }],
    };
  });

  // Sync Android navigation bar color with theme
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const navColor = isDark ? colors.surface : colors.primary;
    NavigationBar.setBackgroundColorAsync(navColor);
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
  }, [colors.primary, colors.surface, isDark]);

  const PADDING_BOTTOM = Math.max(insets.bottom, 10);
  const OVERLAY_BUTTON_BOTTOM = 32 + PADDING_BOTTOM;

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: PADDING_BOTTOM,
            height: 60 + PADDING_BOTTOM,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View style={styles.content}>
          {orderedTabs.map((tab) => renderTab(tab))}
        </View>
      </View>

      {/* Selection Menu Modal */}
      {isMenuOpen && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={closeMenu}
        >
          <Pressable style={styles.modalOverlay} onPress={closeMenu}>
            <Animated.View
              style={[
                styles.backdrop,
                { opacity: menuAnimation },
              ]}
            />
          </Pressable>

          {/* Menu Items Container - Centered above button */}
          <View style={[styles.menuContainer, { bottom: OVERLAY_BUTTON_BOTTOM + 70 }]}>
            <View style={styles.menuRow}>
               {displayItems.map((item) => (
                 <MenuItem 
                    key={item.id} 
                    item={item} 
                    animationValue={menuAnimation}
                    onClose={closeMenu}
                    router={router}
                 />
               ))}
            </View>
          </View>
          
          {/* Floating Close Button */}
          <View style={[styles.closeButtonContainer, { bottom: OVERLAY_BUTTON_BOTTOM }]}>
              <Pressable 
                  onPress={closeMenu} 
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  style={[styles.closeButton, { backgroundColor: colors.primary }]}
              >
                  <Animated.View style={closeButtonRotateStyle}>
                      <Plus size={28} color="#fff" />
                  </Animated.View>
              </Pressable>
          </View>
        </Modal>
      )}
    </>
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
  tabItemWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    zIndex: 10,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: "absolute",
    bottom: 8,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30, // Pop out
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  centerLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600",
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)", // Darker backdrop for better contrast
  },
  menuContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    height: 100, 
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20, // Space between items
  },
  menuItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
  },
  menuItemIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.3,
    shadowRadius: Platform.OS === "ios" ? 4 : 6,
    elevation: Platform.OS === "android" ? 8 : 0,
  },
  menuItemLabelContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: 'center',
  },
  
  closeButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 21,
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.3,
    shadowRadius: Platform.OS === "ios" ? 4 : 6,
    elevation: Platform.OS === "android" ? 8 : 0,
  }
});
