import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useTranslation } from "@/utils/i18n/store";
import { fetchAdsByType } from "@/utils/supabase/ads";
import { useTheme } from "@/utils/theme/store";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function TaqibListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isRTL, rowDirection, textAlign } = useTranslation();
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
      const result = await fetchAdsByType("taqib");
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
    const target = `${ad.title || ""} ${ad.description || ""}`.toLowerCase();
    return target.includes(searchQuery.toLowerCase());
  });

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const renderListSkeleton = () => (
    <SkeletonGroup style={{ paddingTop: 6, paddingBottom: 10 }}>
      {Array.from({ length: 6 }).map((_, idx) => (
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
          <View style={[styles.adContent, { flexDirection: rowDirection }]}>
            <Skeleton width={36} height={36} radius={12} />
            <View style={styles.adTextContainer}>
              <Skeleton height={16} radius={8} width="70%" />
              <Skeleton height={12} radius={8} width="92%" style={{ marginTop: 10 }} />
            </View>
            <Skeleton width={56} height={56} radius={16} />
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
          title: isRTL ? "إعلانات التعقيب" : "Taqib Ads",
          headerBackButtonDisplayMode: "minimal",
          headerBackVisible: !isRTL,
          headerBackTitleVisible: false,
          headerBackTitle: "",
          headerLeftContainerStyle: styles.headerSideContainer,
          headerRightContainerStyle: styles.headerSideContainer,
          headerLeft: isRTL
            ? () => (
                <Pressable
                  testID="taqib-add-btn"
                  onPress={() => router.push("/create-taqib")}
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
              )
            : undefined,
          headerRight: isRTL
            ? () => (
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [styles.headerBackButton, { opacity: pressed ? 0.9 : 1 }]}
                >
                  <ChevronRight size={22} color={colors.text} />
                </Pressable>
              )
            : () => (
            <Pressable
              testID="taqib-add-btn"
              onPress={() => router.push("/create-taqib")}
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
        <Animated.View entering={FadeInDown.delay(200)} style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                flexDirection: rowDirection,
              },
            ]}
          >
            <Search size={20} color={colors.textMuted} style={{ marginHorizontal: 10 }} />
            <TextInput
              testID="taqib-search-input"
              placeholder={isRTL ? "بحث عن مكتب أو خدمة..." : "Search office or service..."}
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text, textAlign }]}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAds({ isRefresh: true })}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {loading && !refreshing && renderListSkeleton()}

          {error && (
            <Text style={{ color: colors.error, textAlign, marginBottom: 12 }}>{error}</Text>
          )}

          {!loading && filteredAds.length === 0 && !error && (
            <Text style={{ color: colors.textMuted, textAlign }}>
              {isRTL ? "لا توجد إعلانات" : "No ads yet"}
            </Text>
          )}

          {filteredAds.map((ad, index) => {
            const AdIcon = Building2;
            return (
              <Animated.View key={ad.id} entering={FadeInDown.delay(250 + index * 80)}>
                <Pressable
                  testID={`taqib-card-${index}`}
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
                  <View style={[styles.adContent, { flexDirection: rowDirection }]}>
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
                            textAlign,
                          },
                        ]}
                      >
                        {ad.title}
                      </Text>
                      <Text
                        style={[
                          styles.adDescription,
                          {
                            color: colors.textSecondary,
                            textAlign,
                          },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {ad.description || (isRTL ? "لا يوجد وصف" : "No description")}
                      </Text>
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

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
    marginLeft: 6,
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
    marginBottom: 6,
  },
  adDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  adArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
