import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from "react-native-reanimated";
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Building2,
  Briefcase,
  CreditCard,
  Plane,
  FileCheck,
  Users,
  Truck,
  UserCheck,
  FileSignature,
  BadgeCheck,
  Star,
  MapPin,
  Clock,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";

export default function TaqibAdDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();

  // Animation values
  const chatScale = useSharedValue(1);

  // Mock data for service providers - in real app this would come from API
  const serviceProviders = {
    "ad_001": {
      id: "ad_001",
      title: isRTL ? "خدمات الجوازات" : "Passport Services",
      providerName: isRTL ? "مكتب الريادة للخدمات" : "Al-Riyada Services Office",
      icon: Plane,
      rating: 4.8,
      reviewCount: 156,
      location: isRTL ? "الرياض، حي العليا" : "Riyadh, Olaya District",
      isVerified: true,
      responseTime: isRTL ? "يرد خلال ساعة" : "Responds within 1 hour",
      services: [
        { name: isRTL ? "نقل كفالة مهني" : "Professional Transfer", price: "300" },
        { name: isRTL ? "نقل كفالة تابع" : "Dependent Transfer", price: "250" },
        { name: isRTL ? "نقل من فردي إلى مهني" : "Transfer from Individual to Professional", price: "400" },
        { name: isRTL ? "تعديل مهنة سائق شاحنة" : "Truck Driver Modification", price: "200" },
        { name: isRTL ? "فصل تابع (غير سعودي)" : "Dependent Separation (Non-National)", price: "350" },
        { name: isRTL ? "تمديد مع ختم السفارة" : "Extension with Embassy Stamp", price: "500" },
        { name: isRTL ? "تجديد إقامة" : "Iqama Renewal", price: null },
        { name: isRTL ? "إصدار تأشيرة خروج وعودة" : "Exit & Re-entry Visa Issuance", price: "150" },
      ],
    },
    "ad_002": {
      id: "ad_002",
      title: isRTL ? "خدمات مكتب العمل" : "Labor Office Services",
      providerName: isRTL ? "مكتب الإنجاز للتعقيب" : "Al-Injaz Follow-up Office",
      icon: Briefcase,
      rating: 4.6,
      reviewCount: 98,
      location: isRTL ? "جدة، حي الصفا" : "Jeddah, Al-Safa District",
      isVerified: true,
      responseTime: isRTL ? "يرد خلال 30 دقيقة" : "Responds within 30 minutes",
      services: [
        { name: isRTL ? "إصدار رخصة عمل" : "Work Permit Issuance", price: "400" },
        { name: isRTL ? "تجديد رخصة عمل" : "Work Permit Renewal", price: "350" },
        { name: isRTL ? "نقل خدمات عامل" : "Worker Service Transfer", price: null },
        { name: isRTL ? "تعديل المهنة" : "Profession Modification", price: "200" },
        { name: isRTL ? "إلغاء بلاغ هروب" : "Cancel Absconding Report", price: "500" },
        { name: isRTL ? "استعلام عن موظف" : "Employee Inquiry", price: null },
      ],
    },
    "ad_003": {
      id: "ad_003",
      title: isRTL ? "خدمات وزارة التجارة" : "Ministry of Commerce Services",
      providerName: isRTL ? "مكتب التميز للخدمات" : "Excellence Services Office",
      icon: Building2,
      rating: 4.9,
      reviewCount: 234,
      location: isRTL ? "الدمام، حي الفيصلية" : "Dammam, Al-Faisaliya District",
      isVerified: true,
      responseTime: isRTL ? "يرد خلال ساعتين" : "Responds within 2 hours",
      services: [
        { name: isRTL ? "إصدار سجل تجاري" : "Commercial Registration Issuance", price: "800" },
        { name: isRTL ? "تجديد سجل تجاري" : "Commercial Registration Renewal", price: "500" },
        { name: isRTL ? "تعديل سجل تجاري" : "Commercial Registration Modification", price: "300" },
        { name: isRTL ? "شطب سجل تجاري" : "Commercial Registration Cancellation", price: "250" },
        { name: isRTL ? "إصدار شهادة الغرفة التجارية" : "Chamber of Commerce Certificate", price: null },
        { name: isRTL ? "تصديق عقود" : "Contract Authentication", price: "150" },
      ],
    },
  };

  const adId = params.id || "ad_001";
  const adData = serviceProviders[adId] || serviceProviders["ad_001"];
  const AdIcon = adData.icon;

  const handleChat = () => {
    chatScale.value = withSpring(0.95, {}, () => {
      chatScale.value = withSpring(1);
    });
    router.push({
      pathname: "/chat",
      params: { providerId: adData.id, providerName: adData.providerName },
    });
  };

  const chatAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chatScale.value }],
  }));

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const renderHeader = () => (
    <Animated.View
      entering={SlideInRight.delay(100)}
      style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}
    >
      <Pressable
        onPress={() => router.back()}
        style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {isRTL ? (
          <ArrowRight size={22} color={colors.text} />
        ) : (
          <ArrowLeft size={22} color={colors.text} />
        )}
      </Pressable>

      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isRTL ? "تفاصيل الخدمة" : "Service Details"}
        </Text>
      </View>

      <View style={{ width: 44 }} />
    </Animated.View>
  );

  const renderProviderCard = () => (
    <Animated.View
      entering={ZoomIn.delay(200)}
      style={[styles.providerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Provider Header */}
      <View style={[styles.providerHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.providerIconContainer, { backgroundColor: colors.primary }]}>
          <AdIcon size={32} color="#fff" />
        </View>
        <View style={[styles.providerInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.providerTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {adData.title}
          </Text>
          <Text style={[styles.providerName, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
            {adData.providerName}
          </Text>
        </View>
      </View>

      {/* Verified Badge */}
      {adData.isVerified && (
        <View style={[styles.verifiedRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <BadgeCheck size={16} color={colors.primary} />
          <Text style={[styles.verifiedText, { color: colors.primary }]}>
            {isRTL ? "مكتب موثق" : "Verified Office"}
          </Text>
        </View>
      )}

      {/* Provider Stats */}
      <View style={[styles.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.statItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Star size={14} color={colors.warning} fill={colors.warning} />
          <Text style={[styles.statText, { color: colors.text }]}>
            {adData.rating} ({adData.reviewCount})
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={[styles.statItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <MapPin size={14} color={colors.textMuted} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {adData.location}
          </Text>
        </View>
      </View>

      {/* Response Time */}
      <View style={[styles.responseTimeRow, { backgroundColor: colors.primaryLight, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Clock size={14} color={colors.primary} />
        <Text style={[styles.responseTimeText, { color: colors.primary }]}>
          {adData.responseTime}
        </Text>
      </View>
    </Animated.View>
  );

  const renderServicesSection = () => (
    <Animated.View
      entering={FadeInDown.delay(300)}
      style={[styles.servicesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "الخدمات المتوفرة" : "Available Services"}
      </Text>

      <View style={styles.servicesList}>
        {adData.services.map((service, index) => (
          <Animated.View
            key={index}
            entering={FadeInDown.delay(400 + index * 50)}
            style={[
              styles.serviceItem,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <View style={[styles.serviceIconWrapper, { backgroundColor: colors.primaryLight }]}>
              <FileCheck size={16} color={colors.primary} />
            </View>
            <View style={[styles.serviceContent, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.serviceName, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                {service.name}
              </Text>
              {service.price && (
                <Text style={[styles.servicePrice, { color: colors.primary }]}>
                  {service.price} {isRTL ? "ر.س" : "SAR"}
                </Text>
              )}
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Note */}
      <View style={[styles.noteContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <Text style={[styles.noteText, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
          {isRTL 
            ? "* الأسعار تقريبية وقد تختلف حسب متطلبات الخدمة. تواصل مع مقدم الخدمة للحصول على عرض سعر دقيق."
            : "* Prices are approximate and may vary based on service requirements. Contact the provider for an accurate quote."
          }
        </Text>
      </View>
    </Animated.View>
  );

  const renderActionSection = () => (
    <View style={[styles.actionSection, { backgroundColor: colors.primary, paddingBottom: insets.bottom + 20 }]}>
      <View style={[styles.actionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.providerMiniInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={styles.actionProviderName}>{adData.providerName}</Text>
          <View style={[styles.actionRating, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Star size={12} color="#FFD700" fill="#FFD700" />
            <Text style={styles.actionRatingText}>{adData.rating}</Text>
          </View>
        </View>
        <View style={styles.servicesCountBadge}>
          <Text style={styles.servicesCountText}>
            {adData.services.length} {isRTL ? "خدمة" : "services"}
          </Text>
        </View>
      </View>

      <Animated.View style={chatAnimatedStyle}>
        <Pressable
          onPress={handleChat}
          style={({ pressed }) => [
            styles.messageButton,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <MessageCircle size={20} color={colors.primary} />
          <Text style={[styles.messageButtonText, { color: colors.primary }]}>
            {isRTL ? "رسالة" : "Message"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      <View style={[styles.content, { paddingTop: insets.top }]}>
        {renderHeader()}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderProviderCard()}
          {renderServicesSection()}
          <View style={{ height: 160 }} />
        </ScrollView>

        {/* Sticky Action Section */}
        <View style={styles.stickyActionContainer}>
          {renderActionSection()}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },

  // Provider Card
  providerCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  providerHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  providerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  providerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  providerName: {
    fontSize: 14,
  },
  verifiedRow: {
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statsRow: {
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  statDivider: {
    width: 1,
    height: 16,
  },
  responseTimeRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  responseTimeText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Services Section
  servicesCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 16,
  },
  servicesList: {
    gap: 10,
  },
  serviceItem: {
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  serviceIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 13,
    fontWeight: "bold",
  },
  noteContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Action Section
  stickyActionContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  actionHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  providerMiniInfo: {
    flex: 1,
  },
  actionProviderName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  actionRating: {
    alignItems: "center",
    gap: 4,
  },
  actionRatingText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
  },
  servicesCountBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  servicesCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  messageButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

