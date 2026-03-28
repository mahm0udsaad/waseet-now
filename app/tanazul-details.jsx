import { useTranslation, getRTLTextAlign, getRTLStartAlign, pickRTLValue } from "@/utils/i18n/store";
import { fetchAdById } from "@/utils/supabase/ads";
import { getSupabaseUser } from "@/utils/supabase/client";
import { useTheme } from "@/utils/theme/store";
import { buildListingSharePayload } from "@/utils/sharing/listings";
import { SkeletonGroup } from "@/components/ui/Skeleton";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { ChevronRight } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Share } from "react-native";
import Animated, {
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
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
  const { isRTL, rowDirection } = useTranslation();
  const [adData, setAdData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const chatScale = useSharedValue(1);

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
    chatScale.value = withSpring(0.95, {}, () => chatScale.value = withSpring(1));

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

  const chatAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: chatScale.value }] }));

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
          headerBackVisible: !isRTL,
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerLeft: isRTL
            ? () => (
                <Pressable onPress={handleShare} style={styles.iconButton}>
                  <NativeIcon name="share" size={22} color={colors.text} />
                </Pressable>
              )
            : undefined,
          headerRight: isRTL
            ? () => (
                <View style={{ flexDirection: "row" }}>
                  <Pressable onPress={() => router.back()} style={styles.headerBackButton}>
                    <ChevronRight size={22} color={colors.text} />
                  </Pressable>
                </View>
              )
            : () => (
            <View style={{ flexDirection: "row" }}>
              <Pressable onPress={handleShare} style={styles.iconButton}>
                <NativeIcon name="share" size={22} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 168 }]}
      >
        {/* Hero Card */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.medium]}
        >
          <View style={[styles.heroRow, { flexDirection: rowDirection }]}>
            <View style={[styles.professionIcon, { backgroundColor: professionConfig.color + '15' }]}>
              <NativeIcon name={professionConfig.icon} size={32} color={professionConfig.color} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 14, alignItems: getRTLStartAlign(isRTL) }}>
              <Text style={[styles.professionTitle, { color: colors.text }]}>{professionLabel}</Text>
              <View style={[styles.metaRow, { flexDirection: rowDirection }]}>
                <NativeIcon name="pin" size={13} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {adData.location || (isRTL ? "غير محدد" : "Unknown")}
                </Text>
              </View>
              {dateFormatted ? (
                <View style={[styles.metaRow, { flexDirection: rowDirection, marginTop: 2 }]}>
                  <NativeIcon name="time" size={13} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>{dateFormatted}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Price Banner */}
          <View style={[styles.priceBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]}>
            <View style={{ flexDirection: rowDirection, alignItems: 'center', gap: 8 }}>
              <NativeIcon name="money" size={20} color={colors.primary} />
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                {isRTL ? "مبلغ التنازل" : "Transfer Amount"}
              </Text>
            </View>
            <Text style={[styles.priceValue, { color: colors.primary }]}>{priceFormatted}</Text>
          </View>
        </Animated.View>

        {/* Worker Details */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.small]}
        >
          <View style={[styles.sectionHeader, { flexDirection: rowDirection }]}>
            <NativeIcon name="user" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
              rowDirection={rowDirection}
            />
            <DetailRow
              icon="calendar"
              label={isRTL ? "العمر" : "Age"}
              value={meta.age ? `${meta.age} ${isRTL ? "سنة" : "yrs"}` : "-"}
              colors={colors}
              isRTL={isRTL}
              rowDirection={rowDirection}
            />
            <DetailRow
              icon="user"
              label={isRTL ? "الجنس" : "Gender"}
              value={genderLabel}
              colors={colors}
              isRTL={isRTL}
              rowDirection={rowDirection}
            />
          </View>
        </Animated.View>

        {/* Contract Info */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.small]}
        >
          <View style={[styles.sectionHeader, { flexDirection: rowDirection }]}>
            <NativeIcon name="document" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
              rowDirection={rowDirection}
            />
            <DetailRow
              icon="history"
              label={isRTL ? "عدد التنازلات السابقة" : "Previous Transfers"}
              value={meta.previousTransfers || "0"}
              colors={colors}
              isRTL={isRTL}
              rowDirection={rowDirection}
              highlight={parseInt(meta.previousTransfers) > 2 ? "warning" : null}
            />
          </View>
        </Animated.View>

        {/* Description */}
        {adData.description ? (
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.small]}
          >
            <View style={[styles.sectionHeader, { flexDirection: rowDirection }]}>
              <NativeIcon name="document" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isRTL ? "ملاحظات إضافية" : "Additional Notes"}
              </Text>
            </View>
            <Text style={[styles.descriptionText, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
              {adData.description}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Floating Action Bar */}
      <Animated.View
        entering={SlideInDown.delay(400)}
        style={[styles.floatingBarWrapper, { bottom: insets.bottom + Spacing.m }]}
      >
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.floatingBar}>
          <View style={[styles.barContent, { flexDirection: rowDirection }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.barLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                {isRTL ? "مبلغ التنازل" : "Transfer Amount"}
              </Text>
              <Text style={[styles.barPrice, { color: colors.primary, textAlign: getRTLTextAlign(isRTL) }]}>
                {priceFormatted}
              </Text>
            </View>

            <Animated.View style={chatAnimatedStyle}>
              <Pressable
                testID="tanazul-chat-btn"
                onPress={handleChat}
                style={({ pressed }) => [
                  styles.chatButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
                  Shadows.small
                ]}
              >
                <NativeIcon name="message" size={20} color="#FFF" />
                <Text style={styles.chatButtonText}>
                  {isRTL ? "تواصل" : "Chat"}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const DetailRow = ({ icon, label, value, colors, isRTL, rowDirection, highlight }) => (
  <View style={[styles.detailRow, { flexDirection: rowDirection }]}>
    <View style={[styles.detailIconWrap, { backgroundColor: colors.background }]}>
      <NativeIcon name={icon} size={16} color={colors.primary} />
    </View>
    <Text style={[styles.detailLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
      {label}
    </Text>
    <View style={{ flex: 1 }} />
    <Text
      style={[
        styles.detailValue,
        { color: highlight === "warning" ? colors.warning : colors.text, textAlign: pickRTLValue(isRTL, 'left', 'right') },
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
    left: Spacing.m,
    right: Spacing.m,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  floatingBar: {
    padding: Spacing.m,
  },
  barContent: {
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
