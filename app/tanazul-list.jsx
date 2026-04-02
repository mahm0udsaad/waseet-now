import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useTranslation } from "@/utils/i18n/store";
import { fetchAdsByType } from "@/utils/supabase/ads";
import { useTheme } from "@/utils/theme/store";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Briefcase,
  CheckCircle,
  Clock,
  Filter,
  MapPin,
  Plus,
  Search
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import FadeInView from "@/components/ui/FadeInView";

export default function TanazulListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isRTL, writingDirection } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await fetchAdsByType("tanazul");
      setAds(result);
      setError(null);
    } catch (err) {
      setError(err?.message || "Failed to load ads");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const filteredAds = ads.filter((ad) => {
    const professionSearch =
      ad.metadata?.profession_label_ar ||
      ad.metadata?.profession_label_ar_short ||
      ad.metadata?.profession_label_en ||
      ad.metadata?.profession_label_en_short ||
      ad.metadata?.profession ||
      "";
    const target = `${ad.title || ""} ${professionSearch} ${ad.metadata?.nationality || ""}`.toLowerCase();
    return target.includes(searchQuery.toLowerCase());
  });

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];
  const screenTitle = isRTL ? "إعلانات التنازل" : "Tanazul Ads";

  const renderListSkeleton = () => (
    <SkeletonGroup style={{ paddingTop: 6, paddingBottom: 10 }}>
      {Array.from({ length: 5 }).map((_, idx) => (
        <View
          key={`sk-${idx}`}
          style={[
            styles.adCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.adHeader}>
            <Skeleton height={16} radius={8} width={72} />
            <Skeleton height={12} radius={8} width={110} />
          </View>

          {/* Main */}
          <View style={styles.adMain}>
            <View
              style={[
                styles.adTextContainer,
                { alignItems: 'flex-start' },
              ]}
            >
              <Skeleton height={16} radius={8} width="78%" />
              <Skeleton height={12} radius={8} width="90%" style={{ marginTop: 10 }} />
            </View>
            <Skeleton width={56} height={56} radius={28} style={{ marginHorizontal: 14 }} />
          </View>

          {/* Footer */}
          <View
            style={[
              styles.adFooter,
              {
                backgroundColor: colors.surfaceSecondary,
              },
            ]}
          >
            <View style={styles.footerItem}>
              <Skeleton height={10} radius={6} width={40} />
              <Skeleton height={12} radius={6} width={44} style={{ marginTop: 8 }} />
            </View>
            <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
            <View style={styles.footerItem}>
              <Skeleton height={10} radius={6} width={54} />
              <Skeleton height={12} radius={6} width={62} style={{ marginTop: 8 }} />
            </View>
            <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
            <View style={styles.footerItem}>
              <Skeleton height={10} radius={6} width={40} />
              <Skeleton height={12} radius={6} width={58} style={{ marginTop: 8 }} />
            </View>
          </View>
        </View>
      ))}
    </SkeletonGroup>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          headerTitleAlign: "center",
          title: screenTitle,
          headerBackButtonDisplayMode: "minimal",
          headerBackTitleVisible: false,
          headerBackTitle: "",
          headerRightContainerStyle: styles.headerSideContainer,
          headerRight: () => (
            <Pressable
              testID="tanazul-add-btn"
              onPress={() => router.push("/create-tanazul")}
              style={({ pressed }) => [
                styles.headerAddButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Plus size={18} color="#fff" />
              <Text style={styles.headerAddButtonText}>
                {isRTL ? "إضافة إعلان" : "Add Ad"}
              </Text>
            </Pressable>
          ),
        }}
      />
      <StatusBar style={colors.statusBar} />
      <View style={styles.content}>

        {/* Search Bar */}
        <FadeInView delay={200} style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              testID="tanazul-search-input"
              placeholder={isRTL ? "بحث عن عمالة، مهنة، جنسية..." : "Search workers, profession, nationality..."}
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text, textAlign: 'auto', writingDirection }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable style={[styles.filterButton, { backgroundColor: colors.surfaceSecondary }]}>
              <Filter size={18} color={colors.text} />
            </Pressable>
          </View>
        </FadeInView>

        {loading && !refreshing ? (
          renderListSkeleton()
        ) : (
          <FlatList
            data={filteredAds}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadAds({ isRefresh: true })}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              error ? (
                <Text style={{ color: colors.error, marginBottom: 12, writingDirection: 'rtl' }}>{error}</Text>
              ) : (
                <Text style={{ color: colors.textMuted, writingDirection: 'rtl' }}>
                  {isRTL ? "لا توجد إعلانات حالياً" : "No ads yet"}
                </Text>
              )
            }
            renderItem={({ item: ad, index }) => {
              const arabicProfession = ad.metadata?.profession_label_ar_short || ad.metadata?.profession_label_ar || "";
              const englishProfession = ad.metadata?.profession_label_en_short || ad.metadata?.profession_label_en || "";
              const baseTitle = ad.title || "";
              const titleText = isRTL
                ? arabicProfession
                  ? baseTitle ? (baseTitle.includes(arabicProfession) ? baseTitle : `${baseTitle} - ${arabicProfession}`) : arabicProfession
                  : baseTitle
                : englishProfession || baseTitle;
              const professionText = isRTL
                ? (ad.metadata?.profession_label_ar || ad.metadata?.profession_label_ar_short || ad.metadata?.profession || "")
                : (ad.metadata?.profession_label_en || ad.metadata?.profession_label_en_short || ad.metadata?.profession || "");

              return (
                <FadeInView delay={Math.min(300 + index * 100, 700)}>
                  <Pressable
                    onPress={() => router.push({ pathname: "/tanazul-details", params: { id: ad.id } })}
                    style={({ pressed }) => [
                      styles.adCard,
                      { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.98 : 1 }] },
                    ]}
                  >
                    <View style={styles.adHeader}>
                      {ad.metadata?.verified && (
                        <View style={[styles.verifiedBadge, { backgroundColor: colors.primaryLight }]}>
                          <CheckCircle size={12} color={colors.primary} style={{ marginHorizontal: 4 }} />
                          <Text style={[styles.verifiedText, { color: colors.primary }]}>
                            {isRTL ? "موثق" : "Verified"}
                          </Text>
                        </View>
                      )}
                      <View style={styles.timeRow}>
                        <Clock size={12} color={colors.textMuted} style={{ marginHorizontal: 4 }} />
                        <Text style={[styles.timeText, { color: colors.textMuted }]}>
                          {ad.created_at ? new Date(ad.created_at).toLocaleString(isRTL ? "ar-SA-u-ca-gregory" : "en-US") : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.adMain}>
                      <View style={[styles.flagCircle, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                        <Text style={styles.flagEmoji}>{ad.metadata?.flag || "🏳️"}</Text>
                      </View>
                      <View style={[styles.adTextContainer, { alignItems: 'flex-start' }]}>
                        <Text
                          style={[styles.adTitle, { color: colors.text }]}
                        >
                          {titleText}
                        </Text>
                        <View style={styles.professionRow}>
                          <Briefcase size={12} color={colors.textSecondary} style={{ marginHorizontal: 4 }} />
                          <Text
                            style={[styles.professionText, { color: colors.textSecondary }]}
                          >
                            {professionText} • {ad.metadata?.nationality || ""}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.adFooter, { backgroundColor: colors.surfaceSecondary }]}>
                      <View style={styles.footerItem}>
                        <Text style={[styles.footerLabel, { color: colors.textMuted }]}>{isRTL ? "العمر" : "Age"}</Text>
                        <Text style={[styles.footerValue, { color: colors.text }]}>
                          {ad.metadata?.age ? `${ad.metadata.age} ${isRTL ? "سنة" : "yrs"}` : isRTL ? "غير محدد" : "N/A"}
                        </Text>
                      </View>
                      <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.footerItem}>
                        <Text style={[styles.footerLabel, { color: colors.textMuted }]}>{isRTL ? "الموقع" : "Location"}</Text>
                        <View style={styles.locationRow}>
                          <MapPin size={10} color={colors.primary} style={{ marginHorizontal: 2 }} />
                          <Text style={[styles.footerValue, { color: colors.text }]}>{ad.location || ad.metadata?.location || ""}</Text>
                        </View>
                      </View>
                      <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.footerItem}>
                        <Text style={[styles.footerLabel, { color: colors.textMuted }]}>{isRTL ? "السعر" : "Price"}</Text>
                        <Text style={[styles.priceValue, { color: colors.primary }]}>
                          {ad.price ?? ad.metadata?.transferAmount ?? "-"} {isRTL ? "ر.س" : "SAR"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </FadeInView>
              );
            }}
          />
        )}

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

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
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
  searchIcon: {
    marginHorizontal: 10,
  },
  filterButton: {
    padding: 8,
    borderRadius: 10,
    marginHorizontal: 8,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  headerAddButton: {
    height: 34,
    minWidth: 124,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  headerAddButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginStart: 6,
  },
  headerRightContainer: {
    paddingHorizontal: 4,
  },
  headerSideContainer: {
    paddingHorizontal: 8,
  },
  headerBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  // Ad Card
  adCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  adHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 10,
  },
  adMain: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  flagCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  flagEmoji: {
    fontSize: 24,
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
  professionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  professionText: {
    fontSize: 12,
  },
  adFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
  },
  footerItem: {
    alignItems: "center",
  },
  footerLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  footerDivider: {
    width: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceValue: {
    fontSize: 12,
    fontWeight: "bold",
  },

});
