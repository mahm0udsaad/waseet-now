import { NativeIcon } from "@/components/native/NativeIcon";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { Shadows, Spacing } from "@/constants/theme";
import { useTranslation, getRTLRowDirection, getRTLInverseRowDirection, getRTLTextAlign, getRTLStartAlign } from "@/utils/i18n/store";
import { buildListingSharePayload } from "@/utils/sharing/listings";
import { fetchAdById } from "@/utils/supabase/ads";
import { useTheme } from "@/utils/theme/store";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronRight } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import Animated, {
  FadeInDown,
  SlideInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.4;

export default function TaqibAdDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();

  const [adData, setAdData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const adId = params.id;

  const loadAdData = useCallback(async () => {
    if (!adId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const fetchedAd = await fetchAdById(adId);
      setAdData(fetchedAd);
    } catch (err) {
      console.error("Error fetching ad:", err);
      setError(err.message || "Failed to load ad");
    } finally {
      setLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    loadAdData();
  }, [loadAdData]);

  const handleShare = async () => {
    if (!adData) return;
    try {
      const payload = buildListingSharePayload(adData);
      if (!payload) return;
      await Share.share(payload);
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleChat = () => {
    if (!adData) return;
    router.push({
      pathname: "/chat",
      params: { 
        conversationId: null,
        adId: adData.id,
        ownerId: adData.owner_id, 
        adTitle: adData.title,
        price: 0, 
      },
    });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveSlide(viewableItems[0].index || 0);
    }
  }).current;

  // --- Render Functions ---

  const renderPagination = (images) => {
    if (!images || images.length <= 1) return null;
    return (
      <View style={styles.paginationContainer}>
        {images.map((_, i) => (
          <View
            key={i}
            style={[
              styles.paginationDot,
              { 
                backgroundColor: i === activeSlide ? '#FFF' : 'rgba(255,255,255,0.4)',
                width: i === activeSlide ? 20 : 6 
              }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderLoadingSkeleton = () => (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: isRTL ? "جاري التحميل..." : "Loading...",
          headerBackVisible: false,
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerLeft: isRTL
            ? () => (
                <View style={styles.iconButton}>
                  <NativeIcon name="share" size={20} color={colors.text} style={{ opacity: 0.35 }} />
                </View>
              )
            : undefined,
          headerRight: isRTL
            ? () => (
                <View style={styles.headerBackButton}>
                  <ChevronRight size={22} color={colors.text} style={{ opacity: 0.35 }} />
                </View>
              )
            : () => (
                <View style={styles.iconButton}>
                  <NativeIcon name="share" size={20} color={colors.text} style={{ opacity: 0.35 }} />
                </View>
              ),
        }}
      />
      <StatusBar style="light" />

      <View style={{ height: IMAGE_HEIGHT, width }}>
        <Skeleton height={IMAGE_HEIGHT} radius={0} width="100%" />
        <View style={styles.paginationContainer}>
          <Skeleton height={6} radius={3} width={20} />
          <Skeleton height={6} radius={3} width={6} />
          <Skeleton height={6} radius={3} width={6} />
        </View>
      </View>

      <View
        style={[
          styles.contentContainer,
          {
            backgroundColor: colors.background,
            minHeight: height - IMAGE_HEIGHT,
          },
        ]}
      >
        <SkeletonGroup>
          <View style={[styles.section, styles.loadingTitleRow]}>
            <View style={{ flex: 1 }}>
              <Skeleton height={28} radius={8} width="82%" style={{ marginBottom: 10 }} />
              <Skeleton height={14} radius={6} width="42%" />
            </View>
            <Skeleton height={36} radius={8} width={88} />
          </View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            <View style={[styles.grid, { flexDirection: getRTLInverseRowDirection(isRTL) }]}>
              {[0, 1].map((item) => (
                <View
                  key={item}
                  style={[styles.gridItem, { flexDirection: getRTLInverseRowDirection(isRTL) }]}
                >
                  <Skeleton height={44} radius={12} width={44} />
                  <View style={{ flex: 1 }}>
                    <Skeleton height={12} radius={6} width="48%" style={{ marginBottom: 8 }} />
                    <Skeleton height={16} radius={6} width="68%" />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            <Skeleton height={20} radius={8} width="32%" style={{ marginBottom: 14 }} />
            <Skeleton height={16} radius={6} width="100%" style={{ marginBottom: 10 }} />
            <Skeleton height={16} radius={6} width="94%" style={{ marginBottom: 10 }} />
            <Skeleton height={16} radius={6} width="76%" />
          </View>
        </SkeletonGroup>
      </View>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom }]}>
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.bottomContent, { flexDirection: getRTLInverseRowDirection(isRTL) }]}>
            <View style={{ flex: 1 }}>
              <Skeleton height={12} radius={6} width={72} style={{ marginBottom: 8 }} />
              <Skeleton height={16} radius={6} width={132} />
            </View>
            <Skeleton height={52} radius={16} width={140} />
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return renderLoadingSkeleton();
  }

  if (error || !adData) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <NativeIcon name="alert-circle" size={48} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {isRTL ? "حدث خطأ أثناء تحميل الإعلان" : "Error loading details"}
        </Text>
        <Pressable onPress={loadAdData} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isRTL ? "إعادة المحاولة" : "Retry"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
           <Text style={{ color: colors.textSecondary }}>{isRTL ? "العودة" : "Go Back"}</Text>
        </Pressable>
      </View>
    );
  }

  const images = adData.images && adData.images.length > 0 ? adData.images : null;
  const BottomBar = Platform.OS === "ios" ? BlurView : View;
  const bottomBarProps = Platform.OS === "ios" 
    ? { intensity: 90, tint: isDark ? "dark" : "light" } 
    : { style: { backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border } };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: isRTL ? "تفاصيل الإعلان" : "Ad Details",
          headerBackVisible: !isRTL,
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerLeft: isRTL
            ? () => (
                <Pressable onPress={handleShare} style={styles.iconButton}>
                  <NativeIcon name="share" size={20} color={colors.text} />
                </Pressable>
              )
            : undefined,
          headerRight: isRTL
            ? () => (
                <Pressable onPress={() => router.back()} style={styles.headerBackButton}>
                  <ChevronRight size={22} color={colors.text} />
                </Pressable>
              )
            : () => (
            <Pressable onPress={handleShare} style={styles.iconButton}>
              <NativeIcon name="share" size={20} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <StatusBar style="light" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        bounces={false} // Cleaner feel for header image
      >
        {/* Image Gallery */}
        <View style={{ height: IMAGE_HEIGHT, width }}>
          {images ? (
            <>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                keyExtractor={(_, i) => i.toString()}
                renderItem={({ item }) => (
                  <ImageWithFallback
                    uri={item.publicUrl}
                    width={width}
                    height={IMAGE_HEIGHT}
                    colors={colors}
                    isRTL={isRTL}
                  />
                )}
              />
              {renderPagination(images)}
            </>
          ) : (
            <LinearGradient
              colors={isDark
                ? [colors.primary + '30', colors.surfaceHighlight, colors.background]
                : [colors.primary + '20', colors.surfaceHighlight, colors.background]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.placeholderImage}
            >
              {/* Decorative circles */}
              <View style={[styles.decoCircle, styles.decoCircle1, { backgroundColor: colors.primary + '10' }]} />
              <View style={[styles.decoCircle, styles.decoCircle2, { backgroundColor: colors.primary + '08' }]} />
              <View style={[styles.placeholderIconWrap, { backgroundColor: '#FFFFFF' }]}>
              <Image
  source={require('./../assets/images/logo.png')}
  style={{ width: 40, height: 40, borderRadius: 20 }}
  resizeMode="contain"
/>
              </View>
            </LinearGradient>
          )}
        </View>

        {/* Content Body */}
        <View style={[styles.contentContainer, { backgroundColor: colors.background, minHeight: height - IMAGE_HEIGHT }]}>
          
          {/* Header Info */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.section}>
             <View style={{ flexDirection: getRTLRowDirection(isRTL), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                    {adData.title}
                  </Text>
                  <Text style={[styles.date, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                    {new Date(adData.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-ca-gregory' : 'en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </Text>
                </View>
                {/* Price Tag if exists */}
                {adData.price && (
                   <View style={[styles.priceTag, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.priceText, { color: colors.primary }]}>
                        {adData.price.toLocaleString()} SAR
                      </Text>
                   </View>
                )}
             </View>
          </Animated.View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Details Grid */}
          <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={styles.section}>
             <View style={[styles.grid, { flexDirection: getRTLRowDirection(isRTL) }]}>
                {/* Location */}
                <View style={[styles.gridItem, { flexDirection: getRTLRowDirection(isRTL) }]}>
                   <View style={[styles.gridIcon, { backgroundColor: colors.surfaceHighlight }]}>
                      <NativeIcon name="pin-outline" size={20} color={colors.text} />
                   </View>
                   <View>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                        {isRTL ? "الموقع" : "Location"}
                      </Text>
                      <Text style={[styles.gridValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                        {adData.location || (isRTL ? "غير محدد" : "N/A")}
                      </Text>
                   </View>
                </View>

                {/* Type/Category */}
                <View style={[styles.gridItem, { flexDirection: getRTLRowDirection(isRTL) }]}>
                   <View style={[styles.gridIcon, { backgroundColor: colors.surfaceHighlight }]}>
                      <NativeIcon name="tag" size={20} color={colors.text} />
                   </View>
                   <View>
                      <Text style={[styles.gridLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
                        {isRTL ? "النوع" : "Type"}
                      </Text>
                      <Text style={[styles.gridValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                        {t.home?.[adData.type] || adData.type}
                      </Text>
                   </View>
                </View>
             </View>
          </Animated.View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Description */}
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? "الوصف" : "Description"}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
              {adData.description || (isRTL ? "لا يوجد وصف إضافي." : "No description provided.")}
            </Text>
          </Animated.View>
          
        </View>
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <Animated.View entering={SlideInDown.delay(300)} style={[styles.bottomContainer, { paddingBottom: insets.bottom }]}>
        <BottomBar {...bottomBarProps} style={styles.bottomBar}>
           <View style={[styles.bottomContent, { flexDirection: getRTLRowDirection(isRTL) }]}>
              <View style={{ flex: 1, alignItems: getRTLStartAlign(isRTL) }}>
                 <Text style={[styles.providerLabel, { color: colors.textSecondary }]}>
                    {isRTL ? "مقدم الخدمة" : "Provider"}
                 </Text>
                 <Text style={[styles.providerName, { color: colors.text }]}>
                    {/* Placeholder name until we join users table */}
                    {isRTL ? "مستخدم وسيط الان" : "Waseet Alan User"} 
                 </Text>
              </View>

              <Pressable
                testID="taqib-contact-btn"
                onPress={handleChat}
                style={({pressed}) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
                  Shadows.medium
                ]}
              >
                <NativeIcon name="message-circle" size={20} color="#FFF" />
                <Text style={styles.primaryButtonText}>
                  {isRTL ? "تواصل الآن" : "Chat Now"}
                </Text>
              </Pressable>
           </View>
        </BottomBar>
      </Animated.View>
    </View>
  );
}

const ImageWithFallback = ({ uri, width: w, height: h, colors }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <LinearGradient
        colors={[colors.primary + '20', colors.surfaceHighlight, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      >
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('./../assets/images/logo.png')}
          style={{ width: 40, height: 40, borderRadius: 20 }}
          contentFit="contain"
        />
        </View>
      </LinearGradient>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: w, height: h }}
      contentFit="cover"
      transition={300}
      onError={() => setFailed(true)}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingHeader: { width: '100%', paddingHorizontal: 20, justifyContent: 'center' },
  loadingTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  errorText: { fontSize: 16, marginTop: 12, marginBottom: 20 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  iconButton: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  paginationContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  placeholderImage: {
    width: width,
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decoCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  decoCircle1: {
    width: 200,
    height: 200,
    top: -40,
    right: -60,
  },
  decoCircle2: {
    width: 160,
    height: 160,
    bottom: -20,
    left: -40,
  },
  
  contentContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32, // Overlap image slightly
    paddingTop: 32,
    paddingHorizontal: Spacing.l,
    paddingBottom: 40,
  },
  section: {
    marginBottom: Spacing.l,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 32,
  },
  date: {
    fontSize: 14,
  },
  priceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 16,
  },
  priceText: {
    fontWeight: '700',
    fontSize: 16,
  },
  separator: {
    height: 1,
    width: '100%',
    marginBottom: Spacing.l,
  },
  
  grid: {
    flexWrap: 'wrap',
    gap: 24,
  },
  gridItem: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    gap: 12,
  },
  gridIcon: {
    width: 44, height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
  },

  bottomContainer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
  },
  bottomBar: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.m,
    paddingBottom: Spacing.s, // Handled by safe area padding on container
  },
  bottomContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  },
  providerLabel: {
    fontSize: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
