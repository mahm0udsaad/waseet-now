import { useLanguage, useTranslation, getRTLTextAlign } from "@/utils/i18n/store";
import { markOnboardingCompleted } from "@/utils/onboarding/store";
import { getMyProfile } from "@/utils/supabase/profile";
import { getSupabaseSession } from "@/utils/supabase/client";
import { useTheme } from "@/utils/theme/store";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, ArrowRight, Check } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInRight,
  FadeInLeft,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentScreen, setCurrentScreen] = useState(0);

  const { colors } = useTheme();
  const { language, setLanguage, isRTL, rowDirection } = useLanguage();
  const { t } = useTranslation();

  const screens = [
    { id: 0, type: "language" },
    {
      id: 1,
      image: require("@/assets/images/onboarding/onboarding-hero.jpg"),
      title: t.onboarding.screen1Title,
      subtitle: t.onboarding.screen1Subtitle,
    },
    {
      id: 2,
      image: require("@/assets/images/onboarding/onboarding-tanazul.jpg"),
      title: t.onboarding.screen2Title,
      subtitle: t.onboarding.screen2Subtitle,
    },
    {
      id: 3,
      image: require("@/assets/images/onboarding/onboarding-taqib.jpg"),
      title: t.onboarding.screen3Title,
      subtitle: t.onboarding.screen3Subtitle,
    },
    {
      id: 4,
      image: require("@/assets/images/onboarding/onboarding-damin.jpg"),
      title: t.onboarding.screen4Title,
      subtitle: t.onboarding.screen4Subtitle,
    },
  ];

  const totalScreens = screens.length;

  const nextScreen = useCallback(() => {
    if (currentScreen < totalScreens - 1) {
      setCurrentScreen((prev) => prev + 1);
    }
  }, [currentScreen, totalScreens]);

  const prevScreen = useCallback(() => {
    if (currentScreen > 0) {
      setCurrentScreen((prev) => prev - 1);
    }
  }, [currentScreen]);

  const handleGetStarted = async () => {
    await markOnboardingCompleted();

    const session = await getSupabaseSession();
    if (!session) {
      router.replace("/register");
      return;
    }

    try {
      const { profile } = await getMyProfile();
      if (profile?.is_profile_complete === true) {
        router.replace("/(tabs)");
        return;
      }
    } catch (error) {
      console.warn("Failed to resolve onboarding destination:", error);
    }

    router.replace("/complete-profile");
  };

  const handleLanguageSelect = async (lang) => {
    await setLanguage(lang);
    nextScreen();
  };

  // --- Render Language Screen (Minimalist) ---
  const renderLanguageScreen = () => (
    <Animated.View
      key="lang-screen"
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={styles.langScreen}
    >
      <View style={styles.langHeader}>
        <View style={styles.logoWrapper}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Welcome to
        </Text>
        <Text style={[styles.appName, { color: colors.text }]}>
          Waseet Alan
        </Text>
      </View>

      <View style={styles.langOptionsContainer}>
        <Text style={[styles.langPrompt, { color: colors.textSecondary }]}>
          Choose your language / اختر لغتك
        </Text>

        <Pressable
          onPress={() => handleLanguageSelect("en")}
          style={[
            styles.langCard,
            {
              backgroundColor: colors.surface,
              borderColor: language === "en" ? colors.primary : colors.border,
            },
          ]}
        >
          <Text style={[styles.langCardText, { color: colors.text }]}>
            English
          </Text>
          <View
            style={[
              styles.radioCircle,
              { borderColor: language === "en" ? colors.primary : colors.border },
              language === "en" && { backgroundColor: colors.primary },
            ]}
          >
            {language === "en" && <Check size={14} color="#FFF" />}
          </View>
        </Pressable>

        <Pressable
          onPress={() => handleLanguageSelect("ar")}
          style={[
            styles.langCard,
            {
              backgroundColor: colors.surface,
              borderColor: language === "ar" ? colors.primary : colors.border,
            },
          ]}
        >
          <Text style={[styles.langCardText, { color: colors.text }]}>
            العربية
          </Text>
          <View
            style={[
              styles.radioCircle,
              { borderColor: language === "ar" ? colors.primary : colors.border },
              language === "ar" && { backgroundColor: colors.primary },
            ]}
          >
            {language === "ar" && <Check size={14} color="#FFF" />}
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );

  // --- Render Content Screen (Minimalist) ---
  const renderContentScreen = (screenData, index) => {
    // Determine animation direction based on RTL and screen transition
    const enterAnim = isRTL ? FadeInLeft : FadeInRight;

    return (
      <Animated.View
        key={`screen-${index}`}
        entering={enterAnim.duration(350).springify().damping(20)}
        exiting={FadeOut.duration(200)}
        style={styles.contentScreen}
      >
        <View style={styles.imageArea}>
          <Image
            source={screenData.image}
            style={styles.heroImage}
            contentFit="contain"
            transition={300}
          />
        </View>

        <View style={styles.textArea}>
          <Text
            style={[
              styles.title,
              { color: colors.text, textAlign: getRTLTextAlign(isRTL) },
            ]}
          >
            {screenData.title}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.subtitleScroll}
          >
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) },
              ]}
            >
              {screenData.subtitle}
            </Text>
          </ScrollView>
        </View>
      </Animated.View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={colors.statusBar} />

      {/* Main Content Area */}
      <View style={styles.mainArea}>
        {currentScreen === 0
          ? renderLanguageScreen()
          : renderContentScreen(screens[currentScreen], currentScreen)}
      </View>

      {/* Unified Footer */}
      {currentScreen > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {/* Progress Indicators */}
          <View style={[styles.indicators, { flexDirection: rowDirection }]}>
            {screens.slice(1).map((_, idx) => {
              const isActive = currentScreen === idx + 1;
              return (
                <Animated.View
                  key={idx}
                  layout={LinearTransition.springify().damping(20)}
                  style={[
                    styles.dot,
                    {
                      width: isActive ? 24 : 8,
                      backgroundColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={[styles.actionRow, { flexDirection: rowDirection }]}>
            {currentScreen > 1 ? (
              <Pressable
                onPress={prevScreen}
                style={[
                  styles.backButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {isRTL ? (
                  <ArrowRight size={20} color={colors.text} />
                ) : (
                  <ArrowLeft size={20} color={colors.text} />
                )}
              </Pressable>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}

            <Pressable
              onPress={
                currentScreen === totalScreens - 1
                  ? handleGetStarted
                  : nextScreen
              }
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryButtonText}>
                {currentScreen === totalScreens - 1
                  ? t.onboarding.getStarted
                  : t.common.next}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainArea: {
    flex: 1,
  },

  // --- Content Screen Styles ---
  contentScreen: {
    flex: 1,
  },
  imageArea: {
    flex: 0.45,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    // Ensures the AI generated images with white backgrounds blend cleanly or look like contained art pieces
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    flex: 0.55,
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitleScroll: {
    paddingBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "400",
  },

  // --- Footer Styles ---
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  indicators: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actionRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 56,
  },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  // --- Language Screen Styles ---
  langScreen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  langHeader: {
    alignItems: "center",
    marginBottom: 60,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  langOptionsContainer: {
    width: "100%",
  },
  langPrompt: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500",
  },
  langCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  langCardText: {
    fontSize: 18,
    fontWeight: "600",
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
