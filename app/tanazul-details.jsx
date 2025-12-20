import { useTranslation } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Baby,
  CheckCircle,
  ChefHat,
  FileText,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
  Star,
  User
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

export default function TanazulDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const [isFavorited, setIsFavorited] = useState(false);

  // Mock data - in real app this would come from props/route params
  const adData = {
    id: "tnz_001",
    nationality: "Filipino",
    nationalityFlag: "🇵🇭",
    profession: "cooking",
    professionAr: "طباخة",
    age: 28,
    religion: "Christian",
    religionAr: "مسيحية",
    maritalStatus: "Married",
    maritalStatusAr: "متزوجة",
    experience: 5,
    entryDate: "2019-03-15",
    remainingTime: "18 شهر",
    transferCount: 1,
    transferPrice: 8500,
    totalPrice: 8755,
    location: "Riyadh",
    locationAr: "الرياض",
    sponsorRating: 4.8,
    isVerified: true,
    postedDate: isRTL ? "منذ 3 أيام" : "3 days ago",
    skills: ["Arabic Speaking", "Cleaning", "Child Care"],
    skillsAr: ["تتحدث العربية", "تنظيف", "رعاية أطفال"],
  };

  // Animation values
  const callScale = useSharedValue(1);
  const chatScale = useSharedValue(1);
  const reserveScale = useSharedValue(1);
  const favoriteScale = useSharedValue(1);

  const handleCall = () => {
    callScale.value = withSpring(0.95, {}, () => {
      callScale.value = withSpring(1);
    });
    Alert.alert(
      isRTL ? "اتصال" : "Call",
      isRTL ? "سيتم الاتصال بالكفيل عبر رقم محمي" : "You will call the sponsor via a protected number",
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
    // Navigate to chat screen with ad context
    router.push({
      pathname: "/chat",
      params: { adId: adData.id, adTitle: adData.professionAr },
    });
  };

  const handleReserve = () => {
    reserveScale.value = withSpring(0.95, {}, () => {
      reserveScale.value = withSpring(1);
    });
    Alert.alert(
      isRTL ? "حجز التنازل" : "Reserve Transfer",
      isRTL ? "سيتم إنشاء اتفاقية ضمان تلقائياً لهذا التنازل" : "An escrow agreement will be created for this transfer",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        { text: isRTL ? "متابعة" : "Continue", onPress: () => console.log("Starting escrow...") },
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
      isRTL ? "مشاركة هذا الإعلان" : "Share this ad",
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

  const reserveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reserveScale.value }],
  }));

  const favoriteAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

  const getProfessionIcon = (profession) => {
    switch (profession) {
      case "cooking":
        return ChefHat;
      case "nanny":
        return Baby;
      case "cleaning":
        return Sparkles;
      default:
        return User;
    }
  };

  const getTransferWarningColor = (count) => {
    if (count <= 1) return colors.textSecondary;
    if (count <= 2) return colors.warning;
    return colors.error;
  };

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
        style={[styles.headerButton, { backgroundColor: colors.surface }]}
      >
        {isRTL ? (
          <ArrowRight size={22} color={colors.text} />
        ) : (
          <ArrowLeft size={22} color={colors.text} />
        )}
      </Pressable>

      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isRTL ? "تفاصيل الإعلان" : "Ad Details"}
        </Text>
      </View>

      <View style={[styles.headerActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
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
    </Animated.View>
  );

  const renderMainCard = () => {
    const ProfessionIcon = getProfessionIcon(adData.profession);

    return (
      <Animated.View
        entering={ZoomIn.delay(200)}
        style={[styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {/* Header with Profession Icon and Flag */}
        <View style={[styles.mainCardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.professionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.professionIcon, { backgroundColor: colors.primary }]}>
              <ProfessionIcon size={28} color="#fff" />
            </View>
            <View style={{ marginHorizontal: 16 }}>
              <Text style={[styles.professionTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? adData.professionAr : adData.profession}
              </Text>
              <Text style={[styles.professionSubtitle, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? adData.profession : adData.professionAr}
              </Text>
            </View>
          </View>

          <View style={styles.flagContainer}>
            <Text style={styles.flagEmoji}>{adData.nationalityFlag}</Text>
            <Text style={[styles.nationalityText, { color: colors.text }]}>
              {adData.nationality}
            </Text>
          </View>
        </View>

        {/* Verification Badge */}
        {adData.isVerified && (
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

        {/* Data Grid */}
        <View style={styles.dataGrid}>
          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
              {isRTL ? "العمر" : "Age"}
            </Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>
              {adData.age} {isRTL ? "سنة" : "years"}
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الديانة" : "Religion"}
            </Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>
              {isRTL ? adData.religionAr : adData.religion}
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الحالة" : "Status"}
            </Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>
              {isRTL ? adData.maritalStatusAr : adData.maritalStatus}
            </Text>
          </View>

          <View style={styles.dataItem}>
            <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
              {isRTL ? "الخبرة" : "Experience"}
            </Text>
            <Text style={[styles.dataValue, { color: colors.text }]}>
              {adData.experience} {isRTL ? "سنوات" : "years"}
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={[styles.locationRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <MapPin size={16} color={colors.textSecondary} />
          <Text style={[styles.locationText, { color: colors.text }]}>
            {isRTL ? adData.locationAr : adData.location}
          </Text>
          <Text style={[styles.postedDate, { color: colors.textMuted }]}>
            {adData.postedDate}
          </Text>
        </View>

        {/* Skills */}
        <View style={styles.skillsContainer}>
          <Text style={[styles.skillsLabel, { color: colors.textSecondary }]}>
            {isRTL ? "المهارات" : "Skills"}
          </Text>
          <View style={styles.skillsRow}>
            {(isRTL ? adData.skillsAr : adData.skills).map((skill, index) => (
              <View key={index} style={[styles.skillTag, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.skillText, { color: colors.text }]}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderContractInfo = () => (
    <Animated.View
      entering={FadeInDown.delay(300)}
      style={[styles.contractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.contractHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <FileText size={20} color={colors.primary} />
        <Text style={[styles.contractTitle, { color: colors.text }]}>
          {isRTL ? "معلومات العقد" : "Contract Info"}
        </Text>
      </View>

      <View style={[styles.contractRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.contractItem}>
          <Text style={[styles.contractLabel, { color: colors.textSecondary }]}>
            {isRTL ? "تاريخ الدخول" : "Entry Date"}
          </Text>
          <Text style={[styles.contractValue, { color: colors.text }]}>{adData.entryDate}</Text>
        </View>

        <View style={styles.contractItem}>
          <Text style={[styles.contractLabel, { color: colors.textSecondary }]}>
            {isRTL ? "المدة المتبقية" : "Remaining"}
          </Text>
          <Text style={[styles.contractValue, { color: colors.text }]}>{adData.remainingTime}</Text>
        </View>
      </View>

      {/* Transfer Count */}
      <View style={[styles.transferCountBox, { backgroundColor: colors.surfaceSecondary, borderColor: getTransferWarningColor(adData.transferCount) }]}>
        <Text style={[styles.transferLabel, { color: colors.textSecondary }]}>
          {isRTL ? "عدد التنازلات السابقة" : "Previous Transfers"}
        </Text>
        <View style={[styles.transferValueRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {adData.transferCount > 2 && (
            <AlertTriangle size={16} color={colors.error} style={{ marginHorizontal: 8 }} />
          )}
          <Text style={[styles.transferValue, { color: getTransferWarningColor(adData.transferCount) }]}>
            {adData.transferCount}
          </Text>
        </View>
      </View>

      {adData.transferCount > 2 && (
        <Text style={[styles.transferWarning, { color: colors.error }]}>
          {isRTL ? "عدد التنازلات مرتفع - قد يؤثر على استقرار العاملة" : "High transfer count - may affect worker stability"}
        </Text>
      )}
    </Animated.View>
  );

  const renderPriceSection = () => (
    <View style={[styles.priceSection, { backgroundColor: colors.primary, paddingBottom: insets.bottom + 20 }]}>
      {/* Sponsor Rating */}
      <View style={styles.ratingRow}>
        <Star size={16} color="#FFD700" fill="#FFD700" />
        <Text style={styles.ratingText}>
          {isRTL ? "تقييم الكفيل:" : "Sponsor Rating:"} {adData.sponsorRating}
        </Text>
        <Text style={styles.ratingBadge}>
          {isRTL ? "(موثوق)" : "(Trusted)"}
        </Text>
      </View>

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabelMain}>
            {isRTL ? "السعر الإجمالي" : "Total Price"}
          </Text>
        </View>

        <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
          <Text style={styles.priceValue}>
            {adData.totalPrice.toLocaleString()} {isRTL ? "ر.س" : "SAR"}
          </Text>
          <Text style={styles.priceNote}>
            {isRTL ? "شامل العمولة والرسوم" : "Including fees"}
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
          {renderContractInfo()}
          <View style={{ height: 220 }} />
        </ScrollView>

        {/* Sticky Price Section */}
        <View style={styles.stickyPriceContainer}>
          {renderPriceSection()}
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
  professionRow: {
    alignItems: "center",
  },
  professionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  professionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  professionSubtitle: {
    fontSize: 14,
  },
  flagContainer: {
    alignItems: "center",
  },
  flagEmoji: {
    fontSize: 32,
  },
  nationalityText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
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
  locationRow: {
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
  },
  postedDate: {
    fontSize: 12,
    marginLeft: 12,
  },
  skillsContainer: {
    marginTop: 8,
  },
  skillsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Contract Card
  contractCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  contractHeader: {
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  contractTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  contractRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  contractItem: {
    flex: 1,
  },
  contractLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  contractValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  transferCountBox: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  transferLabel: {
    fontSize: 12,
  },
  transferValueRow: {
    alignItems: "center",
  },
  transferValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  transferWarning: {
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },

  // Price Section
  stickyPriceContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  priceSection: {
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
  ratingBadge: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  priceLabelMain: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  priceValue: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
  },
  priceNote: {
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
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "bold",
  },
  escrowNote: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
  },
});
