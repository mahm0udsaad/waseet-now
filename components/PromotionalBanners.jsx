import { useLanguage, getRTLTextAlign, getRTLStartAlign } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  CheckCircle,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  DEFAULT_HOME_SLIDERS,
  getHomeSliders,
  HOME_SLIDER_GRADIENT_PALETTES,
} from "@/utils/supabase/homeSliders";

const STACK_PREVIEW_COUNT = 3;

export default function PromotionalBanners() {
  const { width } = useWindowDimensions();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [cards, setCards] = useState(DEFAULT_HOME_SLIDERS);
  const { colors } = useTheme();
  const { isRTL, rowDirection } = useLanguage();
  const contentWidth = Math.min(width, 760);
  const cardWidth = Math.max(contentWidth - 40, 280);
  const activeCardProgress = useState(() => new Animated.Value(0))[0];

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
      setActiveCardIndex((currentIndex) => (currentIndex + 1) % promotionalCards.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [promotionalCards.length]);

  useEffect(() => {
    activeCardProgress.setValue(0);
    Animated.spring(activeCardProgress, {
      toValue: 1,
      tension: 72,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, [activeCardIndex, activeCardProgress]);

  const stackedCards = useMemo(() => {
    const previewCount = Math.min(STACK_PREVIEW_COUNT, promotionalCards.length);

    return Array.from({ length: previewCount }, (_, depth) => {
      const index = (activeCardIndex + depth) % promotionalCards.length;
      return {
        ...promotionalCards[index],
        index,
        depth,
      };
    }).reverse();
  }, [activeCardIndex, promotionalCards]);

  return (
    <View style={styles.carouselContainer}>
      <View style={[styles.stackViewport, { paddingHorizontal: 20 }]}>
        <View style={[styles.stackStage, { width: cardWidth }]}>
          {stackedCards.map((card) => {
            const xOffset = isRTL ? card.depth * -10 : card.depth * 10;
            const yOffset = card.depth * 14;
            const scale = 1 - card.depth * 0.04;
            const overlayOpacity = card.depth * 0.08;

            return (
              <Animated.View
                key={`${card.id}-${card.index}`}
                style={[
                  styles.promoCardWrapper,
                  {
                    zIndex: STACK_PREVIEW_COUNT - card.depth,
                    opacity:
                      card.depth === 0
                        ? activeCardProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1],
                          })
                        : 1,
                    transform: [
                      { translateX: xOffset },
                      {
                        translateY:
                          card.depth === 0
                            ? activeCardProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [yOffset + 8, yOffset],
                              })
                            : yOffset,
                      },
                      {
                        scale:
                          card.depth === 0
                            ? activeCardProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [scale - 0.02, scale],
                              })
                            : scale,
                      },
                    ],
                  },
                ]}
                pointerEvents={card.depth === 0 ? "auto" : "none"}
              >
                <View style={styles.promoCard}>
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

                  {card.depth > 0 ? (
                    <View style={[styles.stackDimmer, { opacity: overlayOpacity }]} />
                  ) : null}

                  <View style={styles.promoPattern}>
                    <Text style={styles.promoPatternText}>وسيط الان</Text>
                  </View>

                  <View style={[styles.promoCircle, { top: -20, right: -30 }]} />
                  <View style={[styles.promoCircle, { bottom: -20, left: -30, width: 80, height: 80 }]} />

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
              </Animated.View>
            );
          })}
        </View>
      </View>

      <View style={[styles.pagination, { flexDirection: rowDirection }]}>
        {promotionalCards.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: activeCardIndex === index ? colors.primary : colors.textMuted || "#9CA3AF",
                width: activeCardIndex === index ? 24 : 8,
                opacity: activeCardIndex === index ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  stackViewport: {
    alignItems: "center",
  },
  stackStage: {
    height: 236,
    position: "relative",
  },
  promoCardWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  promoCard: {
    height: 200,
    borderRadius: 24,
    position: "relative",
    backgroundColor: "#0F172A",
    overflow: "hidden",
  },
  stackDimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#08111F",
  },
  promoPattern: {
    position: "absolute",
    right: -30,
    top: "50%",
    marginTop: -50,
    opacity: 0.1,
  },
  promoPatternText: {
    fontSize: 100,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: -8,
  },
  promoCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  promoContent: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  promoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  promoBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  promoBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  promoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  promoTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  promoSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
});
