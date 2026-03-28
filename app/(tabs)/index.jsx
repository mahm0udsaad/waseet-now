import { AppScrollView } from "@/components/layout";
import { NativeIcon } from "@/components/native/NativeIcon";
import PromotionalBanners from "@/components/PromotionalBanners";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { useLanguage, getRTLTextAlign, getRTLStartAlign, pickRTLValue } from "@/utils/i18n/store";
import { useInAppNotificationsStore, showToast } from "@/utils/notifications/inAppStore";
import { fetchMyNotifications } from "@/utils/supabase/notifications";
import { useTheme } from "@/utils/theme/store";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FIXED_HEADER_HEIGHT = 68;

export default function HomeScreen() {
  const router = useRouter();
  const [isHeaderBlurred, setIsHeaderBlurred] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, isRTL, rowDirection } = useLanguage();
  const unreadCount = useInAppNotificationsStore((s) => s.unreadCount);
  const setNotifications = useInAppNotificationsStore((s) => s.setNotifications);
  const [refreshing, setRefreshing] = useState(false);
  const [bannersRefreshKey, setBannersRefreshKey] = useState(0);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const data = await fetchMyNotifications({ limit: 30 });
      setNotifications(data);
      // Remount banners so they re-fetch latest slider rows.
      setBannersRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error refreshing home data:", error);
      showToast({ id: 'home-refresh-error', title: isRTL ? 'خطأ' : 'Error', body: isRTL ? 'فشل تحديث البيانات' : 'Failed to refresh data', type: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const shouldBlur = offsetY > 12;
    if (shouldBlur !== isHeaderBlurred) {
      setIsHeaderBlurred(shouldBlur);
    }
  };

  const services = [
    {
      id: "tanazul",
      title: isRTL ? "تنازل" : "Tanazul",
      subtitle: isRTL ? "التنازل عن العقود المتبقيه للعماله المنزليه" : "Transfer ownership easily",
      icon: "refresh", // Mapping to 'arrow.clockwise' / 'refresh'
      color: "#3B82F6",
      route: "/tanazul-list",
      delay: 200,
    },
    {
      id: "taqib",
      title: isRTL ? "تعقيب" : "Taqip",
      subtitle: isRTL ? "الخدمات العامه والتعقيب في جميع الدوائر" : "Track status in real-time",
      icon: "eye", // Mapping to 'eye.fill' / 'visibility'
      color: "#8B5CF6",
      route: "/taqib-list",
      delay: 300,
    },
    {
      id: "dhamen",
      title: isRTL ? "الضامن" : "Damen",
      subtitle: isRTL ? "ضمين للخدمات والسلع الغير مصنفه" : "Guaranteed security",
      icon: "shield", // Mapping to 'shield.fill' / 'security'
      color: "#10B981",
      route: "/create-dhamen",
      delay: 400,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.fixedHeaderWrap}>
        {isHeaderBlurred ? (
          <BlurView
            intensity={55}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.fixedHeader,
              {
                borderBottomColor: colors.border,
                paddingTop: insets.top + 6,
              },
            ]}
          >
            <Animated.View
              entering={FadeInUp.delay(50)}
              style={[
                styles.heroCard,
                {
                  flexDirection: rowDirection,
                },
              ]}
            >
              <View style={[styles.actionsSection, { flexDirection: rowDirection }]}>
                <Pressable
                  accessibilityLabel={isRTL ? "تغيير اللغة" : "Change language"}
                  onPress={toggleLanguage}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.surfaceHighlight, opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                    {language === 'ar' ? 'EN' : 'ع'}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityLabel={isDark ? (isRTL ? "تفعيل الوضع الفاتح" : "Switch to light mode") : (isRTL ? "تفعيل الوضع الداكن" : "Switch to dark mode")}
                  onPress={toggleTheme}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.surfaceHighlight, opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  <NativeIcon name={isDark ? "sun" : "moon"} size={20} color={isDark ? colors.warning : colors.primary} />
                </Pressable>

                <Pressable
                  accessibilityLabel={isRTL ? "الإشعارات" : "Notifications"}
                  onPress={() => router.push("/notifications")}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.surfaceHighlight, opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  <NativeIcon name="notification" size={20} color={colors.text} />
                  {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.error }]}>
                      <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              <View style={[styles.brandSection, { flexDirection: rowDirection }]}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.greeting, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "مرحباً بك" : "Welcome back"}
                  </Text>
                  <Text style={[styles.brandName, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "وسيط الان" : "Waseet Alan"}
                  </Text>
                </View>
                <View style={[styles.logoWrapper, Shadows.small]}>
                  <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.logo}
                    contentFit="contain"
                  />
                </View>
              </View>
            </Animated.View>
          </BlurView>
        ) : (
          <View
            style={[
              styles.fixedHeader,
              styles.fixedHeaderClear,
              {
                paddingTop: insets.top + 6,
              },
            ]}
          >
            <Animated.View
              entering={FadeInUp.delay(50)}
              style={[
                styles.heroCard,
                {
                  flexDirection: rowDirection,
                },
              ]}
            >
              <View style={[styles.actionsSection, { flexDirection: rowDirection }]}>
                <Pressable
                  accessibilityLabel={isRTL ? "تغيير اللغة" : "Change language"}
                  onPress={toggleLanguage}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.surfaceHighlight, opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                    {language === 'ar' ? 'EN' : 'ع'}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityLabel={isDark ? (isRTL ? "تفعيل الوضع الفاتح" : "Switch to light mode") : (isRTL ? "تفعيل الوضع الداكن" : "Switch to dark mode")}
                  onPress={toggleTheme}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.surfaceHighlight, opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  <NativeIcon name={isDark ? "sun" : "moon"} size={20} color={isDark ? colors.warning : colors.primary} />
                </Pressable>

                <Pressable
                  accessibilityLabel={isRTL ? "الإشعارات" : "Notifications"}
                  onPress={() => router.push("/notifications")}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: colors.surfaceHighlight, opacity: pressed ? 0.8 : 1 }
                  ]}
                >
                  <NativeIcon name="notification" size={20} color={colors.text} />
                  {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.error }]}>
                      <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              <View style={[styles.brandSection, { flexDirection: rowDirection }]}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[styles.greeting, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "مرحباً بك" : "Welcome back"}
                  </Text>
                  <Text style={[styles.brandName, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                    {isRTL ? "وسيط الان" : "Waseet Alan"}
                  </Text>
                </View>
                <View style={[styles.logoWrapper, Shadows.small]}>
                  <Image
                    source={require("@/assets/images/logo.png")}
                    style={styles.logo}
                    contentFit="contain"
                  />
                </View>
              </View>
            </Animated.View>
          </View>
        )}
      </View>

      <AppScrollView
        alwaysBounceVertical
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          gap: Spacing.xl,
          paddingTop: Math.max(FIXED_HEADER_HEIGHT + 44, insets.top + 56) + 4,
          paddingBottom: insets.bottom + 96,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <PromotionalBanners key={`home-banners-${bannersRefreshKey}`} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {isRTL ? "خدماتنا" : "Our Services"}
          </Text>
          <View style={styles.servicesGrid}>
            {services.map((service, index) => (
              <Animated.View 
                key={service.id} 
                entering={FadeInDown.delay(index * 100).springify()}
                style={styles.serviceCardWrapper}
              >
                <Pressable
                  testID={`service-${service.id}`}
                  onPress={() => router.push(service.route)}
                  style={({ pressed }) => [
                    styles.serviceCard,
                    {
                      backgroundColor: colors.surface,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      borderColor: colors.border,
                      flexDirection: rowDirection,
                    },
                    Shadows.small
                  ]}
                >
                  <View style={[styles.serviceIconBox, { backgroundColor: service.color + '15' }]}>
                    <NativeIcon name={service.icon} size={28} color={service.color} />
                  </View>
                  <View style={[styles.serviceInfo, { alignItems: getRTLStartAlign(isRTL) }]}>
                    <Text style={[styles.serviceTitle, { color: colors.text }]}>{service.title}</Text>
                    <Text style={[styles.serviceSubtitle, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]} numberOfLines={2}>
                      {service.subtitle}
                    </Text>
                  </View>
                  <View style={[styles.arrowCircle, { backgroundColor: colors.surfaceHighlight }]}>
                     <NativeIcon name={pickRTLValue(isRTL, "left", "right")} size={16} color={colors.textMuted} />
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>

        <Animated.View 
          entering={FadeInUp.delay(500)}
          style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.small]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>+5k</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {isRTL ? "مستخدم" : "Users"}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>99%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {isRTL ? "رضا" : "Satisfied"}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>24/7</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {isRTL ? "دعم" : "Support"}
            </Text>
          </View>
        </Animated.View>

      </AppScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fixedHeader: {
    paddingHorizontal: Spacing.m,
    paddingBottom: 2,
    borderBottomWidth: 1,
    minHeight: FIXED_HEADER_HEIGHT + 44,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 26, 47, 0.28)',
  },
  fixedHeaderClear: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  heroCard: {
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.m,
  },
  brandSection: {
    alignItems: 'center',
    gap: Spacing.m,
  },
  logoWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  logo: {
    width: 48,
    height: 48,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionsSection: {
    gap: Spacing.s,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    end: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.m,
  },
  servicesGrid: {
    gap: Spacing.m,
  },
  serviceCardWrapper: {
    width: '100%',
  },
  serviceCard: {
    alignItems: 'center',
    padding: Spacing.m,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  serviceIconBox: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginHorizontal: Spacing.m,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    padding: Spacing.l,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: Spacing.xxl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
});
