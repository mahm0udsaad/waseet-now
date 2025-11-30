import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, SlideInRight } from "react-native-reanimated";
import {
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  Plus,
  MapPin,
  Clock,
  Briefcase,
  CheckCircle,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";

export default function TanazulListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const tanazulAds = [
    {
      id: "tnz_001",
      title: isRTL ? "عاملة فلبينية للتنازل" : "Filipino Worker Transfer",
      profession: isRTL ? "طباخة" : "Cook",
      nationality: isRTL ? "فلبينية" : "Filipino",
      flag: "🇵🇭",
      age: 28,
      location: isRTL ? "الرياض" : "Riyadh",
      price: 8500,
      postedTime: isRTL ? "منذ 3 ساعات" : "3 hours ago",
      verified: true,
      rating: 4.8,
    },
    {
      id: "tnz_002",
      title: isRTL ? "عاملة منزلية للتنازل" : "Domestic Worker Transfer",
      profession: isRTL ? "رعاية أطفال" : "Childcare",
      nationality: isRTL ? "إندونيسية" : "Indonesian",
      flag: "🇮🇩",
      age: 32,
      location: isRTL ? "جدة" : "Jeddah",
      price: 12000,
      postedTime: isRTL ? "منذ يوم" : "1 day ago",
      verified: true,
      rating: 4.5,
    },
    {
      id: "tnz_003",
      title: isRTL ? "سائق خاص للتنازل" : "Private Driver Transfer",
      profession: isRTL ? "سائق" : "Driver",
      nationality: isRTL ? "هندي" : "Indian",
      flag: "🇮🇳",
      age: 35,
      location: isRTL ? "الدمام" : "Dammam",
      price: 5000,
      postedTime: isRTL ? "منذ يومين" : "2 days ago",
      verified: false,
      rating: 4.0,
    },
  ];

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
            {isRTL ? "التنازل عن العقود" : "Contract Transfers"}
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
              placeholder={isRTL ? "بحث عن عمالة، مهنة، جنسية..." : "Search workers, profession, nationality..."}
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
          {tanazulAds.map((ad, index) => (
            <Animated.View key={ad.id} entering={FadeInDown.delay(300 + index * 100)}>
              <Pressable
                onPress={() => router.push("/tanazul-details")}
                style={({ pressed }) => [
                  styles.adCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                {/* Header: Verified & Time */}
                <View style={[styles.adHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  {ad.verified && (
                    <View style={[styles.verifiedBadge, { backgroundColor: colors.primaryLight }]}>
                      <CheckCircle size={12} color={colors.primary} style={{ marginHorizontal: 4 }} />
                      <Text style={[styles.verifiedText, { color: colors.primary }]}>
                        {isRTL ? "موثق" : "Verified"}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.timeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Clock size={12} color={colors.textMuted} style={{ marginHorizontal: 4 }} />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>{ad.postedTime}</Text>
                  </View>
                </View>

                {/* Main Content */}
                <View style={[styles.adMain, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.flagCircle, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <Text style={styles.flagEmoji}>{ad.flag}</Text>
                  </View>

                  <View style={styles.adTextContainer}>
                    <Text style={[styles.adTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                      {ad.title}
                    </Text>
                    <View style={[styles.professionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      <Briefcase size={12} color={colors.textSecondary} style={{ marginHorizontal: 4 }} />
                      <Text style={[styles.professionText, { color: colors.textSecondary }]}>
                        {ad.profession} • {ad.nationality}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Footer: Details Grid */}
                <View style={[styles.adFooter, { backgroundColor: colors.surfaceSecondary, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={styles.footerItem}>
                    <Text style={[styles.footerLabel, { color: colors.textMuted }]}>
                      {isRTL ? "العمر" : "Age"}
                    </Text>
                    <Text style={[styles.footerValue, { color: colors.text }]}>
                      {ad.age} {isRTL ? "سنة" : "yrs"}
                    </Text>
                  </View>
                  <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.footerItem}>
                    <Text style={[styles.footerLabel, { color: colors.textMuted }]}>
                      {isRTL ? "الموقع" : "Location"}
                    </Text>
                    <View style={[styles.locationRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      <MapPin size={10} color={colors.primary} style={{ marginHorizontal: 2 }} />
                      <Text style={[styles.footerValue, { color: colors.text }]}>{ad.location}</Text>
                    </View>
                  </View>
                  <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.footerItem}>
                    <Text style={[styles.footerLabel, { color: colors.textMuted }]}>
                      {isRTL ? "السعر" : "Price"}
                    </Text>
                    <Text style={[styles.priceValue, { color: colors.primary }]}>
                      {ad.price} {isRTL ? "ر.س" : "SAR"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Floating Action Button */}
        <Animated.View entering={FadeInDown.delay(600)} style={[styles.fabContainer, { left: isRTL ? undefined : 20, right: isRTL ? 20 : undefined }]}>
          <Pressable
            onPress={() => router.push("/create-tanazul")}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: colors.primary,
                transform: [{ scale: pressed ? 0.95 : 1 }],
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <Plus size={20} color="#fff" style={{ marginHorizontal: 8 }} />
            <Text style={styles.fabText}>
              {isRTL ? "إضافة إعلان" : "Add Ad"}
            </Text>
          </Pressable>
        </Animated.View>
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
    paddingBottom: 100,
  },

  // Ad Card
  adCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  adHeader: {
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
    alignItems: "center",
  },
  timeText: {
    fontSize: 10,
  },
  adMain: {
    alignItems: "center",
    marginBottom: 14,
  },
  flagCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 14,
    borderWidth: 1,
  },
  flagEmoji: {
    fontSize: 24,
  },
  adTextContainer: {
    flex: 1,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  professionRow: {
    alignItems: "center",
  },
  professionText: {
    fontSize: 12,
  },
  adFooter: {
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
    alignItems: "center",
  },
  priceValue: {
    fontSize: 12,
    fontWeight: "bold",
  },

  // FAB
  fabContainer: {
    position: "absolute",
    bottom: 30,
  },
  fab: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 28,
    shadowColor: "#D83A3A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
