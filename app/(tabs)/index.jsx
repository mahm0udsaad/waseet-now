import { AppScrollView } from "@/components/layout";
import HomeFixedHeader, { FIXED_HEADER_HEIGHT } from "@/components/HomeFixedHeader";
import { NativeIcon } from "@/components/native/NativeIcon";
import PromotionalBanners from "@/components/PromotionalBanners";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { Plane, Sparkles, ChevronLeft, ChevronRight } from "lucide-react-native";
import { pickRTLValue, useLanguage } from "@/utils/i18n/store";
import { showToast, useInAppNotificationsStore } from "@/utils/notifications/inAppStore";
import { fetchMyNotifications } from "@/utils/supabase/notifications";
import { useTheme } from "@/utils/theme/store";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const [isHeaderBlurred, setIsHeaderBlurred] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, isRTL, writingDirection } = useLanguage();
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

  const services = useMemo(() => [
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
  ], [isRTL]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={styles.fixedHeaderWrap}>
        <HomeFixedHeader
          isBlurred={isHeaderBlurred}
          isDark={isDark}
          isRTL={isRTL}
          language={language}
          unreadCount={unreadCount}
          onToggleLanguage={toggleLanguage}
          onToggleTheme={toggleTheme}
          onOpenNotifications={() => router.push("/notifications")}
        />
      </View>

      <AppScrollView
        alwaysBounceVertical
        onScroll={handleScroll}
        scrollEventThrottle={16}
        topPadding={0}
        contentContainerStyle={{
          gap: Spacing.xl,
          paddingTop: Math.max(FIXED_HEADER_HEIGHT + 18, insets.top),
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
          <Text style={[styles.sectionTitle, { color: colors.text, writingDirection }]}>
            {isRTL ? "خدماتنا" : "Our Services"}
          </Text>
          <View style={styles.servicesGrid}>
            {services.map((service, index) => (
              <View key={service.id} style={styles.serviceCardWrapper}>
                <Pressable
                  testID={`service-${service.id}`}
                  onPress={() => router.push(service.route)}
                  style={({ pressed }) => [
                    styles.serviceCard,
                    {
                      backgroundColor: colors.surface,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      borderColor: colors.border,
                    },
                    Shadows.small
                  ]}
                >
                  <View style={[styles.serviceIconBox, { backgroundColor: service.color + '15' }]}>
                    <NativeIcon name={service.icon} size={28} color={service.color} />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceTitle, { color: colors.text, writingDirection }]}>{service.title}</Text>
                    <Text style={[styles.serviceSubtitle, { color: colors.textSecondary, writingDirection }]} numberOfLines={2}>
                      {service.subtitle}
                    </Text>
                  </View>
                  <View style={[styles.arrowCircle, { backgroundColor: colors.surfaceHighlight }]}>
                     <NativeIcon name={pickRTLValue(isRTL, "left", "right")} size={16} color={colors.textMuted} />
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Airport Inspection Service Card */}
        <Pressable
          onPress={() => router.push("/airport-inspection")}
          style={({ pressed }) => [
            styles.airportCard,
            {
              backgroundColor: colors.surface,
              borderColor: "#D4AF37",
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
            Shadows.small,
          ]}
        >
          <View style={styles.airportGlow} />
          <View style={styles.airportBadgeRow}>
            <View style={styles.airportBadge}>
              <Sparkles size={12} color="#D4AF37" />
              <Text style={[styles.airportBadgeText, { writingDirection }]}>
                {isRTL ? "مميز" : "PREMIUM"}
              </Text>
            </View>
            <Text style={[styles.airportProvider, { color: colors.textMuted, writingDirection }]}>
              {isRTL ? "خدمة وسيط" : "Waseet Service"}
            </Text>
          </View>
          <View style={styles.airportMain}>
            <View style={styles.airportIconCircle}>
              <Plane size={24} color="#D4AF37" />
            </View>
            <View style={styles.airportTextWrap}>
              <Text style={[styles.airportTitle, { color: colors.text, writingDirection }]}>
                {isRTL
                  ? "خدمة تفتيش وتوصيل للمطار"
                  : "Airport Inspection & Delivery"}
              </Text>
              <Text style={[styles.airportSubtitle, { color: colors.textSecondary, writingDirection }]}>
                {isRTL
                  ? "نوفر لك خدمة متكاملة لتوصيل العاملة للمطار"
                  : "Complete worker airport transfer service"}
              </Text>
            </View>
          </View>
          <View style={styles.airportFooter}>
            <Text style={[styles.airportFooterNote, { color: colors.textMuted, writingDirection }]}>
              {isRTL ? "اطلب الآن" : "Request now"}
            </Text>
            {isRTL ? (
              <ChevronLeft size={16} color="#D4AF37" />
            ) : (
              <ChevronRight size={16} color="#D4AF37" />
            )}
          </View>
        </Pressable>

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
    start: 0,
    end: 0,
    zIndex: 10,
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
    flexDirection: 'row',
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
  airportCard: {
    borderRadius: 20,
    padding: Spacing.m,
    marginBottom: Spacing.xxl,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
  },
  airportGlow: {
    position: "absolute",
    top: -40,
    end: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(212, 175, 55, 0.08)",
  },
  airportBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  airportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  airportBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D4AF37",
  },
  airportProvider: {
    fontSize: 11,
    fontWeight: "600",
  },
  airportMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  airportIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(212, 175, 55, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  airportTextWrap: {
    flex: 1,
  },
  airportTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  airportSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  airportFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(212, 175, 55, 0.15)",
    paddingTop: 10,
  },
  airportFooterNote: {
    fontSize: 12,
    fontWeight: "600",
  },
});
