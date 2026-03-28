import { useTranslation, getRTLTextAlign, getRTLEndAlign } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Heart,
  MessageCircle,
  Share2
} from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  BounceIn,
  FadeInDown,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TaqibDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL, rowDirection } = useTranslation();
  const [isFavorited, setIsFavorited] = useState(false);

  // Mock data - in real app this would come from route params or API
  const requestData = {
    id: params.id || "tqb_001",
    title: isRTL ? "تجديد سجل تجاري" : "Commercial Registration Renewal",
    category: isRTL ? "وزارة التجارة" : "Ministry of Commerce",
    categoryIcon: Building,
    status: "active",
    statusText: isRTL ? "جاري التنفيذ" : "In Progress",
    budget: "500",
    urgency: "urgent",
    postedTime: isRTL ? "منذ ساعة" : "1 hour ago",
    description: isRTL 
      ? "أحتاج إلى تجديد السجل التجاري الخاص بي قبل انتهاء صلاحيته. المطلوب إتمام جميع الإجراءات والوثائق المطلوبة."
      : "I need to renew my commercial registration before it expires. All required procedures and documents need to be completed.",
    expectedDate: isRTL ? "2024-12-15" : "2024-12-15",
    documents: isRTL 
      ? ["صورة من السجل التجاري الحالي", "الهوية الوطنية", "عقد الإيجار"]
      : ["Copy of current commercial registration", "National ID", "Lease agreement"],
    progress: 60,
    providerRating: 4.5,
    isVerified: true,
  };

  // Animation values
  const callScale = useSharedValue(1);
  const chatScale = useSharedValue(1);
  const submitScale = useSharedValue(1);
  const favoriteScale = useSharedValue(1);

  const handleCall = () => {
    callScale.value = withSpring(0.95, {}, () => {
      callScale.value = withSpring(1);
    });
    Alert.alert(
      isRTL ? "اتصال" : "Call",
      isRTL ? "سيتم الاتصال بمقدم الخدمة عبر رقم محمي" : "You will call the service provider via a protected number",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        { text: isRTL ? "اتصال" : "Call", onPress: () => console.log("Calling...") },
      ]
    );
  };

  const handleChat = () => {
    chatScale.value = withSpring(0.95, {}, () => {
      chatScale.value = withSpring(1);
    });
    router.push({
      pathname: "/chat",
      params: { 
        adId: requestData.id, 
        ownerId: requestData.ownerId || "",
        adTitle: requestData.title,
        price: 0,
      },
    });
  };

  const handleSubmitOffer = () => {
    submitScale.value = withSpring(0.95, {}, () => {
      submitScale.value = withSpring(1);
    });
    Alert.alert(
      isRTL ? "تقديم عرض" : "Submit Offer",
      isRTL ? "هل تريد تقديم عرض لهذا الطلب؟" : "Do you want to submit an offer for this request?",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        { text: isRTL ? "تقديم عرض" : "Submit Offer", onPress: () => console.log("Submitting offer...") },
      ]
    );
  };

  const handleFavorite = () => {
    favoriteScale.value = withSpring(0.95, {}, () => {
      favoriteScale.value = withSpring(1);
    });
    setIsFavorited(!isFavorited);
  };

  const handleShare = () => {
    Alert.alert(
      isRTL ? "مشاركة" : "Share",
      isRTL ? "مشاركة هذا الطلب" : "Share this request",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        { text: isRTL ? "مشاركة" : "Share", onPress: () => console.log("Sharing...") },
      ]
    );
  };

  const callAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: callScale.value }],
  }));

  const chatAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chatScale.value }],
  }));

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const favoriteAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

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

  const CategoryIcon = requestData.categoryIcon;

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const backButton = (
    <Pressable
      onPress={() => router.back()}
      style={[styles.headerButton, { backgroundColor: colors.surface }]}
    >
      {isRTL ? (
        <ArrowRight size={22} color={colors.text} />
      ) : (
        <ArrowLeft size={22} color={colors.text} />
      )}
    </Pressable>
  );

  const headerActions = (
    <View style={[styles.headerActions, { flexDirection: "row" }]}>
      <Animated.View style={favoriteAnimatedStyle}>
        <Pressable
          onPress={handleFavorite}
          style={[styles.headerButton, { backgroundColor: colors.surface }]}
        >
          <Heart
            size={20}
            color={isFavorited ? colors.primary : colors.textSecondary}
            fill={isFavorited ? colors.primary : "transparent"}
          />
        </Pressable>
      </Animated.View>

      <Pressable
        onPress={handleShare}
        style={[styles.headerButton, { backgroundColor: colors.surface, marginLeft: 8 }]}
      >
        <Share2 size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );

  const renderHeader = () => (
    <Animated.View
      entering={SlideInRight.delay(100)}
      style={[styles.header, { flexDirection: "row" }]}
    >
      {isRTL ? headerActions : backButton}

      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isRTL ? "تفاصيل الطلب" : "Request Details"}
        </Text>
      </View>

      {isRTL ? backButton : headerActions}
    </Animated.View>
  );

  const renderMainCard = () => {
    return (
      <Animated.View
        entering={ZoomIn.delay(200)}
        style={[styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {/* Header with Category Icon and Status */}
        <View style={[styles.mainCardHeader, { flexDirection: rowDirection }]}>
          <View style={[styles.categoryRow, { flexDirection: rowDirection }]}>
            <View style={[styles.categoryIcon, { backgroundColor: colors.primary }]}>
              <CategoryIcon size={28} color="#fff" />
            </View>
            <View style={{ marginHorizontal: 16 }}>
              <Text style={[styles.categoryTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                {requestData.title}
              </Text>
              <Text style={[styles.categorySubtitle, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                {requestData.category}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(requestData.status) + "20" }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(requestData.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(requestData.status) }]}>
              {requestData.statusText}
            </Text>
          </View>
        </View>

        {/* Verification Badge */}
        {requestData.isVerified && (
          <Animated.View
            entering={BounceIn.delay(400)}
            style={[styles.verifiedBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
          >
            <CheckCircle size={16} color={colors.primary} />
            <Text style={[styles.verifiedText, { color: colors.primary }]}>
              {isRTL ? "موثق" : "Verified"}
            </Text>
          </Animated.View>
        )}

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={[styles.descriptionLabel, { color: colors.textSecondary }]}>
            {isRTL ? "الوصف" : "Description"}
          </Text>
          <Text style={[styles.descriptionText, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
            {requestData.description}
          </Text>
        </View>

        {/* Data Grid */}
        <View style={styles.dataGrid}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الميزانية" : "Budget"}
            </Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>
              {requestData.budget} {isRTL ? "ر.س" : "SAR"}
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
              {isRTL ? "التاريخ المتوقع" : "Expected Date"}
            </Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>
              {requestData.expectedDate}
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الأولوية" : "Priority"}
            </Text>
            <View style={[styles.urgencyBadge, { backgroundColor: requestData.urgency === "urgent" ? colors.primaryLight : colors.surfaceSecondary }]}>
              <Clock size={12} color={requestData.urgency === "urgent" ? colors.primary : colors.textMuted} />
              <Text style={[styles.urgencyText, { color: requestData.urgency === "urgent" ? colors.primary : colors.textMuted }]}>
                {requestData.urgency === "urgent" ? (isRTL ? "مستعجل" : "Urgent") : (isRTL ? "عادي" : "Normal")}
              </Text>
            </View>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
              {isRTL ? "تاريخ النشر" : "Posted"}
            </Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>
              {requestData.postedTime}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        {requestData.status === "active" && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressHeader, { flexDirection: rowDirection }]}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {isRTL ? "التقدم" : "Progress"}
              </Text>
              <Text style={[styles.progressValue, { color: colors.primary }]}>
                {requestData.progress}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceSecondary }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${requestData.progress}%`,
                    backgroundColor: colors.primary 
                  }
                ]} 
              />
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderDocumentsSection = () => (
    <Animated.View
      entering={FadeInDown.delay(300)}
      style={[styles.documentsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.documentsHeader, { flexDirection: rowDirection }]}>
        <FileText size={20} color={colors.primary} />
        <Text style={[styles.documentsTitle, { color: colors.text }]}>
          {isRTL ? "الوثائق المطلوبة" : "Required Documents"}
        </Text>
      </View>

      <View style={styles.documentsList}>
        {requestData.documents.map((doc, index) => (
          <View key={index} style={[styles.documentItem, { flexDirection: rowDirection }]}>
            <View style={[styles.documentIcon, { backgroundColor: colors.primaryLight }]}>
              <FileText size={14} color={colors.primary} />
            </View>
            <Text style={[styles.documentText, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {doc}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const renderActionSection = () => (
    <View style={[styles.actionSection, { backgroundColor: colors.primary, paddingBottom: insets.bottom + 20 }]}>
      {/* Provider Rating */}
      {requestData.providerRating && (
        <View style={styles.ratingRow}>
          <CheckCircle size={16} color="#fff" />
          <Text style={styles.ratingText}>
            {isRTL ? "مقدم الخدمة موثوق" : "Service Provider Verified"}
          </Text>
        </View>
      )}

      <View style={styles.budgetRow}>
        <View>
          <Text style={styles.budgetLabelMain}>
            {isRTL ? "الميزانية المتوقعة" : "Expected Budget"}
          </Text>
        </View>

        <View style={{ alignItems: getRTLEndAlign(isRTL) }}>
          <Text style={styles.budgetValue}>
            {requestData.budget} {isRTL ? "ر.س" : "SAR"}
          </Text>
          <Text style={styles.budgetNote}>
            {isRTL ? "يمكن التفاوض" : "Negotiable"}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsRow}>
        <Animated.View style={[chatAnimatedStyle, { flex: 1, marginLeft: 12 }]}>
          <Pressable onPress={handleChat} style={styles.secondaryButton}>
            <MessageCircle size={18} color="#fff" />
            <Text style={styles.secondaryButtonText}>
              {isRTL ? "رسالة" : "Message"}
            </Text>
          </Pressable>
        </Animated.View>

        {requestData.status === "pending" && (
          <Animated.View style={[submitAnimatedStyle, { flex: 1, marginLeft: 12 }]}>
            <Pressable onPress={handleSubmitOffer} style={styles.primaryButton}>
              <DollarSign size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {isRTL ? "تقديم عرض" : "Submit Offer"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
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
          {renderMainCard()}
          {renderDocumentsSection()}
          <View style={{ height: 220 }} />
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
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerActions: {
    gap: 8,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },

  // Main Card
  mainCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  mainCardHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  categoryRow: {
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  categorySubtitle: {
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 1,
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  dataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
  },
  dataItem: {
    flex: 1,
    minWidth: "45%",
  },
  dataLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  // Documents Card
  documentsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  documentsHeader: {
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  documentsList: {
    gap: 12,
  },
  documentItem: {
    alignItems: "center",
    gap: 12,
  },
  documentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  documentText: {
    flex: 1,
    fontSize: 14,
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
    paddingTop: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 6,
  },
  ratingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  budgetLabelMain: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  budgetValue: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
  },
  budgetNote: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  actionButtonsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#D83A3A",
    fontSize: 15,
    fontWeight: "bold",
  },
});

