import { useLanguage, getRTLRowDirection, getRTLTextAlign, getRTLStartAlign } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  CheckCircle,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import {
  DEFAULT_HOME_SLIDERS,
  getHomeSliders,
  HOME_SLIDER_GRADIENT_PALETTES,
} from "@/utils/supabase/homeSliders";

const CARD_SPACING = 16;

export default function PromotionalBanners() {
  const { width } = useWindowDimensions();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [cards, setCards] = useState(DEFAULT_HOME_SLIDERS);
  const scrollViewRef = useRef(null);
  const { colors } = useTheme();
  const { isRTL, rowDirection } = useLanguage();
  const contentWidth = Math.min(width, 760);
  const cardWidth = Math.max(contentWidth - 40, 280);

  const iconMap = useMemo(
    () => ({
      trending_up: { icon: TrendingUp, color: "#FCD34D" },
      check_circle: { icon: CheckCircle, color: "#6EE7B7" },
      zap: { icon: Zap, color: "#A78BFA" },
      shield: { icon: Shield, color: "#60A5FA" },
    }),
    []
  );

  const promotionalCards = useMemo(
    () =>
      cards.map((card, index) => {
        const iconConfig =
          iconMap[card.icon_name] || iconMap[DEFAULT_HOME_SLIDERS[index % DEFAULT_HOME_SLIDERS.length].icon_name];
        return {
          id: card.id,
          badge: isRTL ? card.badge_ar : card.badge_en,
          title: isRTL ? card.title_ar : card.title_en,
          subtitle: isRTL ? card.subtitle_ar : card.subtitle_en,
          gradient:
            HOME_SLIDER_GRADIENT_PALETTES[card.gradient_palette] ||
            HOME_SLIDER_GRADIENT_PALETTES.ocean_wave,
          icon: iconConfig.icon,
          iconColor: iconConfig.color,
          backgroundImageUrl: card.background_image_url,
        };
      }),
    [cards, iconMap, isRTL]
  );

  useEffect(() => {
    let active = true;

    const loadHomeSliders = async () => {
      try {
        const rows = await getHomeSliders();
        if (active && rows?.length) {
          setCards(rows);
        }
      } catch (error) {
        console.warn("Failed to load home sliders:", error?.message || error);
      }
    };

    loadHomeSliders();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!promotionalCards.length) return undefined;

    const interval = setInterval(() => {
      setActiveCardIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % promotionalCards.length;
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: nextIndex * (cardWidth + CARD_SPACING),
            animated: true,
          });
        }
        return nextIndex;
      });
    }, 3000); // Auto slide every 1 second

    return () => clearInterval(interval);
  }, [cardWidth, promotionalCards.length]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (cardWidth + CARD_SPACING));
    // Only update if the scroll was manual or we want to sync state (but timer updates state too).
    // If we update state here, it might conflict with the timer or be redundant.
    // However, if the user scrolls manually, we want to know the new index so the timer continues from there.
    setActiveCardIndex(index);
  };

  return (
    <Animated.View 
      entering={FadeInUp.delay(200).springify()}
      style={styles.carouselContainer}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={[styles.carouselContent, { flexDirection: getRTLRowDirection(isRTL) }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {promotionalCards.map((card, index) => (
          <View key={card.id} style={[styles.promoCardWrapper, { width: cardWidth }]}>
            <View style={[styles.promoCard, { overflow: 'hidden' }]}>
              {card.backgroundImageUrl ? (
                <Image
                  source={{ uri: card.backgroundImageUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={250}
                />
              ) : null}
              <LinearGradient
                colors={card.gradient}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              
              {/* Decorative Pattern */}
              <View style={styles.promoPattern}>
                <Text style={styles.promoPatternText}>وسيط الان</Text>
              </View>
              
              {/* Decorative Circles */}
              <View style={[styles.promoCircle, { top: -20, right: -30 }]} />
              <View style={[styles.promoCircle, { bottom: -20, left: -30, width: 80, height: 80 }]} />
              
              {/* Content */}
              <View style={styles.promoContent}>
                <View style={[styles.promoHeader, { flexDirection: rowDirection }]}>
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>{card.badge}</Text>
                  </View>
                  <View style={styles.promoIconContainer}>
                    <card.icon size={24} color={card.iconColor} />
                  </View>
                </View>
                
                <View style={{ alignItems: getRTLStartAlign(isRTL) }}>
                  <Text style={[styles.promoTitle, { textAlign: getRTLTextAlign(isRTL) }]}>{card.title}</Text>
                  <Text style={[styles.promoSubtitle, { textAlign: getRTLTextAlign(isRTL) }]}>{card.subtitle}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      
      {/* Pagination Dots */}
      <View style={[styles.pagination, { flexDirection: rowDirection }]}>
        {promotionalCards.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: activeCardIndex === index ? colors.primary : colors.textMuted || '#9CA3AF',
                width: activeCardIndex === index ? 24 : 8,
                opacity: activeCardIndex === index ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  carouselContent: {
    paddingRight: 20,
    paddingLeft: 20, // Add padding left for symmetry/safe area if needed
  },
  promoCardWrapper: {
    marginRight: CARD_SPACING,
  },
  promoCard: {
    height: 200,
    borderRadius: 24,
    position: 'relative',
    backgroundColor: "#0F172A",
  },
  promoPattern: {
    position: 'absolute',
    right: -30,
    top: '50%',
    marginTop: -50,
    opacity: 0.1,
  },
  promoPatternText: {
    fontSize: 100,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: -8,
  },
  promoCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  promoContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    // backdropFilter: 'blur(10px)', // Not supported in React Native natively
  },
  promoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  promoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
});
