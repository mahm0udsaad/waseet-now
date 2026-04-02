import { useTranslation } from "@/utils/i18n/store";
import { fetchAdById } from "@/utils/supabase/ads";
import { getSupabaseUser } from "@/utils/supabase/client";
import { useTheme } from "@/utils/theme/store";
import { buildListingSharePayload } from "@/utils/sharing/listings";
import { SkeletonGroup } from "@/components/ui/Skeleton";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Share } from "react-native";
import FadeInView from "@/components/ui/FadeInView";
import ScalePressable from "@/components/ui/ScalePressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { NativeIcon } from "@/components/native/NativeIcon";

const PROFESSION_ICONS = {
  domestic_worker: { icon: "user", color: "#FF6B6B" },
  nanny: { icon: "baby", color: "#4ECDC4" },
  cook: { icon: "cook", color: "#95E1D3" },
  driver: { icon: "car", color: "#AA96DA" },
  nurse: { icon: "nurse", color: "#F38181" },
  worker: { icon: "user", color: "#FCBAD3" },
};

export default function TanazulDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isRTL, writingDirection } = useTranslation();
  const [adData, setAdData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const loadAd = async () => {
      if (!params.id) {
        Alert.alert(isRTL ? "خطأ" : "Error", isRTL ? "لم يتم العثور على الإعلان" : "Ad not found");
        return;
      }
      try {
        setLoading(true);
        const data = await fetchAdById(params.id);
        setAdData(data);
      } catch (error) {
        console.error("Error loading ad:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAd();
    getSupabaseUser().then((user) => setCurrentUserId(user?.id || null));
  }, [isRTL, params.id]);

  const handleChat = async () => {
    if (!adData) return;

    if (currentUserId && adData.owner_id === currentUserId) {
      Alert.alert(isRTL ? "تنبيه" : "Notice", isRTL ? "لا يمكنك مراسلة نفسك" : "You cannot message yourself");
      return;
    }

    router.push({
      pathname: "/chat",
      params: {
        adId: adData.id,
        adTitle: adData.title,
        ownerId: adData.owner_id,
        price: adData.price || 0,
      },
    });
  };

  const handleShare = async () => {
    try {
      const payload = buildListingSharePayload(adData);
      if (!payload) return;
      await Share.share(payload);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: isRTL ? "جاري التحميل..." : "Loading...",
          }}
        />
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SkeletonGroup>
            <View style={[styles.card, { backgroundColor: colors.surface, height: 180 }]} />
            <View style={[styles.card, { backgroundColor: colors.surface, height: 120, marginTop: 12 }]} />
            <View style={[styles.card, { backgroundColor: colors.surface, height: 100, marginTop: 12 }]} />
          </SkeletonGroup>
        </ScrollView>
      </View>
    );
  }

  if (!adData) return null;

  const meta = adData.metadata || {};
  const professionConfig = PROFESSION_ICONS[meta.profession] || PROFESSION_ICONS.worker;

  const professionLabel = isRTL
    ? (meta.profession_label_ar || meta.profession_label_ar_short || meta.profession || "")
    : (meta.profession_label_en || meta.profession_label_en_short || meta.profession || "");

  const genderLabel = meta.gender === "female"
    ? (isRTL ? "أنثى" : "Female")
    : meta.gender === "male"
      ? (isRTL ? "ذكر" : "Male")
      : "-";

  const priceFormatted = adData.price
    ? `${adData.price.toLocaleString()} ${isRTL ? "ر.س" : "SAR"}`
    : (isRTL ? "غير محدد" : "N/A");

  const dateFormatted = adData.created_at
    ? new Date(adData.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: isRTL ? "تفاصيل التنازل" : "Tanazul Details",
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerRight: () => (
            <Pressable onPress={handleShare} style={styles.iconButton}>
              <NativeIcon name="share" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 168 }]}
      >
        {/* Hero Card */}
        <FadeInView
          delay={100}
          spring
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.medium]}
        >
          <View style={styles.heroRow}>
            <View style={[styles.professionIcon, { backgroundColor: professionConfig.color + '15' }]}>
              <NativeIcon name={professionConfig.icon} size={32} color={professionConfig.color} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 14, alignItems: 'flex-start' }}>
              <Text style={[styles.professionTitle, { color: colors.text, writingDirection }]}>{professionLabel}</Text>
              <View style={styles.metaRow}>
                <NativeIcon name="pin" size={13} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {adData.location || (isRTL ? "غير محدد" : "Unknown")}
                </Text>
              </View>
              {dateFormatted ? (
                <View style={[styles.metaRow, { marginTop: 2 }]}>
                  <NativeIcon name="time" size={13} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>{dateFormatted}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Price Banner */}
          <View style={[styles.priceBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <NativeIcon name="money" size={20} color={colors.primary} />
              <Text style={[styles.priceLabel, { color: colors.textSecondary, writingDirection }]}>
                {isRTL ? "مبلغ التنازل" : "Transfer Amount"}
              </Text>
            </View>
            <Text style={[styles.priceValue, { color: colors.primary, writingDirection }]}>{priceFormatted}</Text>
          </View>
        </FadeInView>

        {/* Worker Details */}
        <FadeInView
          delay={200}
          spring
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.small]}
        >
          <View style={styles.sectionHeader}>
            <NativeIcon name="user" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, writingDirection }]}>
              {isRTL ? "بيانات العامل" : "Worker Details"}
            </Text>
          </View>

          <View style={styles.detailsGrid}>
            <DetailRow
              icon="globe"
              label={isRTL ? "الجنسية" : "Nationality"}
              value={meta.nationality || "-"}
              colors={colors}
              isRTL={isRTL}
            />
            <DetailRow
              icon="calendar"
              label={isRTL ? "العمر" : "Age"}
              value={meta.age ? `${meta.age} ${isRTL ? "سنة" : "yrs"}` : "-"}
              colors={colors}
              isRTL={isRTL}
            />
            <DetailRow
              icon="user"
              label={isRTL ? "الجنس" : "Gender"}
              value={genderLabel}
              colors={colors}
              isRTL={isRTL}
            />
          </View>
        </FadeInView>

        {/* Contract Info */}
        <FadeInView
          delay={300}
          spring
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.small]}
        >
          <View style={styles.sectionHeader}>
            <NativeIcon name="document" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, writingDirection }]}>
              {isRTL ? "معلومات العقد" : "Contract Info"}
            </Text>
          </View>

          <View style={styles.detailsGrid}>
            <DetailRow
              icon="time"
              label={isRTL ? "مدة العقد المتبقية" : "Remaining Duration"}
              value={meta.contractDuration || "-"}
              colors={colors}
              isRTL={isRTL}
            />
            <DetailRow
              icon="history"
              label={isRTL ? "عدد التنازلات السابقة" : "Previous Transfers"}
              value={meta.previousTransfers || "0"}
              colors={colors}
              isRTL={isRTL}
              highlight={parseInt(meta.previousTransfers) > 2 ? "warning" : null}
            />
          </View>
        </FadeInView>

        {/* Description */}
        {adData.description ? (
          <FadeInView
            delay={400}
            spring
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.small]}
          >
            <View style={styles.sectionHeader}>
              <NativeIcon name="document" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, writingDirection }]}>
                {isRTL ? "ملاحظات إضافية" : "Additional Notes"}
              </Text>
            </View>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {adData.description}
            </Text>
          </FadeInView>
        ) : null}
      </ScrollView>

      {/* Floating Action Bar */}
      <FadeInView
        delay={400}
        style={[styles.floatingBarWrapper, { bottom: insets.bottom + Spacing.m }]}
      >
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.floatingBar}>
          <View style={styles.barContent}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={[styles.barLabel, { color: colors.textSecondary, writingDirection }]}>
                {isRTL ? "مبلغ التنازل" : "Transfer Amount"}
              </Text>
              <Text style={[styles.barPrice, { color: colors.primary, writingDirection }]}>
                {priceFormatted}
              </Text>
            </View>

            <ScalePressable
              testID="tanazul-chat-btn"
              onPress={handleChat}
              style={[
                styles.chatButton,
                { backgroundColor: colors.primary },
                Shadows.small
              ]}
            >
              <NativeIcon name="message" size={20} color="#FFF" />
              <Text style={styles.chatButtonText}>
                {isRTL ? "تواصل" : "Chat"}
              </Text>
            </ScalePressable>
          </View>
        </BlurView>
      </FadeInView>
    </View>
  );
}

const DetailRow = ({ icon, label, value, colors, isRTL, highlight }) => (
  <View style={styles.detailRow}>
    <View style={[styles.detailIconWrap, { backgroundColor: colors.background }]}>
      <NativeIcon name={icon} size={16} color={colors.primary} />
    </View>
    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
      {label}
    </Text>
    <View style={{ flex: 1 }} />
    <Text
      style={[
        styles.detailValue,
        { color: highlight === "warning" ? colors.warning : colors.text },
      ]}
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.m,
  },
  iconButton: {
    padding: 8,
  },
  headerBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  // Card
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.l,
    marginBottom: 12,
    borderWidth: 1,
  },

  // Hero
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  professionIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  professionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  metaText: {
    fontSize: 13,
  },

  // Price Banner
  priceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.l,
    padding: Spacing.m,
    borderRadius: BorderRadius.m,
    borderWidth: 1,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.m,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Detail rows
  detailsGrid: {
    gap: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Description
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
  },

  // Floating bar
  floatingBarWrapper: {
    position: 'absolute',
    start: Spacing.m,
    end: Spacing.m,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  floatingBar: {
    padding: Spacing.m,
  },
  barContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  barPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: BorderRadius.l,
    gap: 8,
  },
  chatButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
