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
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

const RTL_ISOLATE_START = "\u2067";
const RTL_ISOLATE_END = "\u2069";
const RTL_MARK = "\u200F";
const BIDI_CONTROL_CHARS = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g;

function formatDisplayText(value, isRTL) {
  if (typeof value !== "string" || value.length === 0) {
    return value;
  }

  const cleanedValue = value
    .replace(BIDI_CONTROL_CHARS, "")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  if (!isRTL) {
    return cleanedValue;
  }

  const rtlPunctuationSafeText = cleanedValue
    .replace(/\(/g, `${RTL_MARK}(${RTL_MARK}`)
    .replace(/\)/g, `${RTL_MARK})${RTL_MARK}`);

  return `${RTL_ISOLATE_START}${rtlPunctuationSafeText}${RTL_ISOLATE_END}`;
}

export default function TaqibListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isRTL } = useTranslation();
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

  const filteredAds = useMemo(() => {
    if (!searchQuery) return ads;
    const query = searchQuery.toLowerCase();
    return ads.filter((ad) => {
      const target = `${ad.title || ""} ${ad.description || ""}`.toLowerCase();
      return target.includes(query);
    });
  }, [ads, searchQuery]);

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];
  const screenTitle = isRTL ? "إعلانات التعقيب" : "Taqib Ads";

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
          <View style={styles.adContent}>
            <Skeleton width={56} height={56} radius={16} />
            <View style={styles.adTextContainer}>
              <Skeleton height={16} radius={8} width="70%" />
              <Skeleton height={12} radius={8} width="92%" style={{ marginTop: 10 }} />
            </View>
            <Skeleton width={36} height={36} radius={12} />
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
          headerTitle: () => (
            <View style={styles.headerTitleWrapper}>
              <Text
                numberOfLines={1}
                style={[
                  styles.headerTitleText,
                  {
                    color: colors.text,
                  },
                ]}
              >
                {screenTitle}
              </Text>
            </View>
          ),
          headerBackButtonDisplayMode: "minimal",
          headerBackTitleVisible: false,
          headerBackTitle: "",
          headerRightContainerStyle: styles.headerSideContainer,
          headerRight: () => (
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
        <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  flexDirection: "row",
                },
              ]}
            >
            <Search size={20} color={colors.textMuted} style={{ marginHorizontal: 10 }} />
            <TextInput
              testID="taqib-search-input"
              placeholder={isRTL ? "بحث عن مكتب أو خدمة..." : "Search office or service..."}
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text, writingDirection: 'rtl' }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable style={[styles.filterButton, { backgroundColor: colors.surfaceSecondary }]}>
              <Filter size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

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
                <Text style={{ color: colors.error, writingDirection: 'rtl', marginBottom: 12 }}>{error}</Text>
              ) : (
                <Text style={{ color: colors.textMuted, writingDirection: 'rtl' }}>
                  {isRTL ? "لا توجد إعلانات" : "No ads yet"}
                </Text>
              )
            }
            initialNumToRender={10}
            maxToRenderPerBatch={6}
            windowSize={7}
            removeClippedSubviews
            renderItem={({ item: ad, index }) => (
                <Pressable
                  testID={`taqib-card-${index}`}
                  onPress={() => router.push({ pathname: "/taqib-ad-details", params: { id: ad.id } })}
                  style={({ pressed }) => [
                    styles.adCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {(() => {
                    const titleText = formatDisplayText(ad.title || "", isRTL);
                    const descriptionText = formatDisplayText(
                      ad.description || (isRTL ? "لا يوجد وصف" : "No description"),
                      isRTL
                    );

                    return (
                  <View style={[styles.adContent, { flexDirection: "row" }]}>
                    <View style={[styles.adIconBox, { backgroundColor: colors.primary }]}>
                      <Building2 size={28} color="#fff" />
                    </View>
                    <View
                      style={[
                        styles.adTextContainer,
                        {
                          alignItems: "flex-start",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.adTitle,
                          {
                            color: colors.text,
                            writingDirection: "rtl",
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {titleText}
                      </Text>
                      <Text
                        style={[
                          styles.adDescription,
                          {
                            color: colors.textSecondary,
                            writingDirection: "rtl",
                          },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {descriptionText}
                      </Text>
                    </View>
                    <Pressable style={[styles.adArrow, { backgroundColor: colors.surfaceSecondary }]}>
                      {isRTL ? (
                        <ChevronLeft size={20} color={colors.primary} />
                      ) : (
                        <ChevronRight size={20} color={colors.primary} />
                      )}
                    </Pressable>
                  </View>
                    );
                  })()}
                </Pressable>
            )}
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
    marginStart: 6,
  },
  headerRightContainer: {
    paddingHorizontal: 4,
  },
  headerSideContainer: {
    paddingHorizontal: 8,
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "700",
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
    flexDirection: "row",
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
    minWidth: 0,
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
