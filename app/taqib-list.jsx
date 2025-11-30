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
  Clock,
  Briefcase,
  Building,
  CreditCard,
} from "lucide-react-native";
import { useTheme } from "@/utils/theme/store";
import { useTranslation } from "@/utils/i18n/store";

export default function TaqibListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const taqibRequests = [
    {
      id: "tqb_001",
      title: isRTL ? "تجديد سجل تجاري" : "Commercial Registration Renewal",
      category: isRTL ? "وزارة التجارة" : "Ministry of Commerce",
      categoryIcon: Building,
      status: "active",
      statusText: isRTL ? "جاري التنفيذ" : "In Progress",
      budget: "500",
      urgency: "urgent",
      postedTime: isRTL ? "منذ ساعة" : "1 hour ago",
    },
    {
      id: "tqb_002",
      title: isRTL ? "إصدار رخصة عمل" : "Work Permit Issuance",
      category: isRTL ? "مكتب العمل" : "Labor Office",
      categoryIcon: Briefcase,
      status: "pending",
      statusText: isRTL ? "بانتظار العروض" : "Awaiting Offers",
      budget: "1200",
      urgency: "normal",
      postedTime: isRTL ? "منذ 4 ساعات" : "4 hours ago",
    },
    {
      id: "tqb_003",
      title: isRTL ? "تجديد إقامة عامل" : "Worker Iqama Renewal",
      category: isRTL ? "الجوازات" : "Passports",
      categoryIcon: CreditCard,
      status: "completed",
      statusText: isRTL ? "مكتمل" : "Completed",
      budget: "300",
      urgency: "normal",
      postedTime: isRTL ? "منذ يومين" : "2 days ago",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return colors.warning;
      case "completed":
        return colors.success;
      default:
        return colors.textMuted;
    }
  };

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
              placeholder={isRTL ? "بحث عن خدمة، معاملة..." : "Search service, transaction..."}
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
          {taqibRequests.map((req, index) => (
            <Animated.View key={req.id} entering={FadeInDown.delay(300 + index * 100)}>
              <Pressable
                onPress={() => router.push({ pathname: "/taqib-details", params: { id: req.id } })}
                style={({ pressed }) => [
                  styles.requestCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                {/* Header: Status & Time */}
                <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + "20" }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(req.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                      {req.statusText}
                    </Text>
                  </View>
                  <View style={[styles.timeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Clock size={12} color={colors.textMuted} style={{ marginHorizontal: 4 }} />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>{req.postedTime}</Text>
                  </View>
                </View>

                {/* Main Content */}
                <View style={[styles.cardMain, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.iconBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <req.categoryIcon size={22} color={colors.primary} />
                  </View>

                  <View style={styles.textContainer}>
                    <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                      {req.title}
                    </Text>
                    <Text style={[styles.categoryText, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                      {req.category}
                    </Text>
                  </View>
                </View>

                {/* Footer: Budget & Urgency */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View>
                    <Text style={[styles.budgetLabel, { color: colors.textMuted, textAlign: isRTL ? "right" : "left" }]}>
                      {isRTL ? "الميزانية المتوقعة" : "Expected Budget"}
                    </Text>
                    <Text style={[styles.budgetValue, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                      {req.budget} {isRTL ? "ر.س" : "SAR"}
                    </Text>
                  </View>

                  {req.urgency === "urgent" && (
                    <View style={[styles.urgentBadge, { backgroundColor: colors.primaryLight, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      <Clock size={12} color={colors.primary} style={{ marginHorizontal: 4 }} />
                      <Text style={[styles.urgentText, { color: colors.primary }]}>
                        {isRTL ? "مستعجل" : "Urgent"}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Floating Action Button */}
        <Animated.View entering={FadeInDown.delay(600)} style={[styles.fabContainer, { left: isRTL ? undefined : 20, right: isRTL ? 20 : undefined }]}>
          <Pressable
            onPress={() => router.push("/create-taqib")}
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
              {isRTL ? "طلب جديد" : "New Request"}
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

  // Request Card
  requestCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardHeader: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  timeRow: {
    alignItems: "center",
  },
  timeText: {
    fontSize: 10,
  },
  cardMain: {
    alignItems: "center",
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 14,
    borderWidth: 1,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
  },
  cardFooter: {
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
  },
  budgetLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  urgentBadge: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
  },
  urgentText: {
    fontSize: 11,
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
