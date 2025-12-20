import { useTranslation } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plane,
  Search,
  Star,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from "react-native";
import Animated, { FadeInDown, SlideInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchAdsByType } from "@/utils/supabase/ads";

export default function TaqibListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    setLoading(true);
    try {
      const result = await fetchAdsByType("taqib");
      setAds(result);
      setError(null);
    } catch (err) {
      setError(err?.message || "Failed to load ads");
    } finally {
      setLoading(false);
    }
  };

  const filteredAds = ads.filter((ad) => {
    const target = `${ad.title || ""} ${ad.description || ""}`.toLowerCase();
    return target.includes(searchQuery.toLowerCase());
  });

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* Header */}
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

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isRTL ? "خدمات التعقيب" : "Follow-up Services"}
          </Text>

          <View style={{ width: 44 }} />
        </Animated.View>

        {/* Search Bar */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <Search size={20} color={colors.textMuted} style={{ marginHorizontal: 10 }} />
            <TextInput
              placeholder={isRTL ? "بحث عن مكتب أو خدمة..." : "Search office or service..."}
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable style={[styles.filterButton, { backgroundColor: colors.surfaceSecondary }]}>
              <Filter size={18} color={colors.text} />
            </Pressable>
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading && (
            <View style={{ paddingVertical: 40 }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {error && (
            <Text style={{ color: colors.error, textAlign: isRTL ? "right" : "left", marginBottom: 12 }}>{error}</Text>
          )}

          {!loading && filteredAds.length === 0 && !error && (
            <Text style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}>
              {isRTL ? "لا توجد إعلانات" : "No ads yet"}
            </Text>
          )}

          {filteredAds.map((ad, index) => {
            const AdIcon = Building2;
            return (
              <Animated.View key={ad.id} entering={FadeInDown.delay(250 + index * 80)}>
                <Pressable
                  onPress={() => router.push({ pathname: "/taqib-ad-details", params: { id: ad.id } })}
                  style={({ pressed }) => [
                    styles.adCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  {/* Ad Content */}
                  <View style={[styles.adContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    {/* Arrow Icon */}
                    <Pressable style={[styles.adArrow, { backgroundColor: colors.surfaceSecondary }]}>
                      {isRTL ? (
                        <ChevronLeft size={20} color={colors.primary} />
                      ) : (
                        <ChevronRight size={20} color={colors.primary} />
                      )}
                    </Pressable>

                    {/* Text Content */}
                    <View style={styles.adTextContainer}>
                      <Text
                        style={[
                          styles.adTitle,
                          {
                            color: colors.text,
                            textAlign: isRTL ? "right" : "left",
                          },
                        ]}
                      >
                        {ad.title}
                      </Text>
                      <Text
                        style={[
                          styles.adProviderName,
                          {
                            color: colors.textSecondary,
                            textAlign: isRTL ? "right" : "left",
                          },
                        ]}
                      >
                        {ad.metadata?.providerName || ad.description || ""}
                      </Text>

                      {/* Rating & Services - single line */}
                      <View style={[styles.adMetaRow, { justifyContent: isRTL ? "flex-end" : "flex-start" }]}>
                        {/* Rating */}
                        <View style={[styles.adRating, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                          <Star size={12} color={colors.warning} fill={colors.warning} />
                          <Text style={[styles.adRatingText, { color: colors.text }]}>
                            {ad.metadata?.rating ?? "4.5"} ({ad.metadata?.reviewCount ?? 0})
                          </Text>
                        </View>

                        <View style={[styles.adDot, { backgroundColor: colors.textMuted }]} />

                        {/* Services count */}
                        <Text style={[styles.adServicesCount, { color: colors.textSecondary }]}>
                          {ad.metadata?.servicesCount ?? 1} {isRTL ? "خدمة" : "services"}
                        </Text>

                        {/* Verified badge */}
                        {ad.metadata?.isVerified && (
                          <>
                            <View style={[styles.adDot, { backgroundColor: colors.textMuted }]} />
                            <View style={[styles.adVerified, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                              <BadgeCheck size={12} color={colors.primary} />
                              <Text style={[styles.adVerifiedText, { color: colors.primary }]}>
                                {isRTL ? "موثق" : "Verified"}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    {/* Service Icon */}
                    <View style={[styles.adIconBox, { backgroundColor: colors.primary }]}>
                      <AdIcon size={28} color="#fff" />
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
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
    paddingVertical: 15,
  },
  headerButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  filterButton: {
    padding: 8,
    borderRadius: 10,
    marginHorizontal: 8,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Ad Card
  adCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  adContent: {
    alignItems: "center",
  },
  adIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  adTextContainer: {
    flex: 1,
    marginHorizontal: 14,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  adProviderName: {
    fontSize: 13,
    marginBottom: 8,
  },
  adMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  adRating: {
    alignItems: "center",
    gap: 4,
  },
  adRatingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  adDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  adServicesCount: {
    fontSize: 12,
  },
  adVerified: {
    alignItems: "center",
    gap: 4,
  },
  adVerifiedText: {
    fontSize: 12,
    fontWeight: "600",
  },
  adArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
