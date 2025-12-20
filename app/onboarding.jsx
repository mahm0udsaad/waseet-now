import { useLanguage, useTranslation } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { markOnboardingCompleted } from "@/utils/onboarding/store";
import {
    ArrowLeft,
    ArrowRight,
    Building,
    CheckCircle,
    CreditCard,
    FileText,
    Globe,
    Moon,
    Shield,
    Sun,
    UserCheck,
    Users,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeInUp,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentScreen, setCurrentScreen] = useState(0);
  
  const { theme, colors, toggleTheme, isDark } = useTheme();
  const { language, setLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();

  // Animation values
  const floatingAnimation = useSharedValue(0);
  const glowAnimation = useSharedValue(0);
  const logoScale = useSharedValue(1);
  const slideAnimation = useSharedValue(0);
  const stampAnimation = useSharedValue(0);
  const rippleAnimation = useSharedValue(0);
  const screenTransition = useSharedValue(0);

  React.useEffect(() => {
    floatingAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    glowAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  React.useEffect(() => {
    if (currentScreen === 2) {
      slideAnimation.value = withDelay(
        300,
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.85, { duration: 400 }),
          withTiming(1, { duration: 400 }),
        ),
      );
    }
  }, [currentScreen]);

  React.useEffect(() => {
    if (currentScreen === 3) {
      stampAnimation.value = withDelay(
        400,
        withSequence(
          withTiming(1, { duration: 250 }),
          withTiming(0.92, { duration: 100 }),
          withTiming(1, { duration: 150 }),
        ),
      );
      rippleAnimation.value = withDelay(650, withTiming(1, { duration: 500 }));
    }
  }, [currentScreen]);

  // Animated styles
  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatingAnimation.value, [0, 1], [0, -18]) }],
  }));

  const floatingStyle2 = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatingAnimation.value, [0, 1], [0, -14]) }],
  }));

  const floatingStyle3 = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatingAnimation.value, [0, 1], [0, -22]) }],
  }));

  const floatingStyle4 = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatingAnimation.value, [0, 1], [0, -10]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnimation.value, [0, 1], [0.4, 0.9]),
  }));

  const logoScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const documentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(slideAnimation.value, [0, 1], [-40, 40]) }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    opacity: slideAnimation.value,
    transform: [{ scale: slideAnimation.value }],
  }));

  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stampAnimation.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleAnimation.value }],
    opacity: interpolate(rippleAnimation.value, [0, 0.5, 1], [0, 0.6, 0]),
  }));

  const screens = [
    { id: 0, theme: "language" },
    { id: 1, theme: "welcome" },
    { id: 2, theme: "contract" },
    { id: 3, theme: "government" },
  ];

  const nextScreen = () => {
    logoScale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    );

    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const prevScreen = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const getStarted = async () => {
    await markOnboardingCompleted();
    router.replace("/register");
  };

  const handleLanguageSelect = async (lang) => {
    await setLanguage(lang);
    nextScreen();
  };

  // Language Selection Screen
  const renderLanguageScreen = () => (
    <View style={[styles.screenContainer, { width: screenWidth }]}>
      {/* Decorative Elements */}
      <Animated.View style={[styles.decorativeIcon, { top: "18%", left: 25 }, floatingStyle]}>
        <View style={[styles.iconBubble, { backgroundColor: colors.surface }]}>
          <Globe size={22} color={colors.primary} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.decorativeIcon, { top: "22%", right: 35 }, floatingStyle2]}>
        <View style={[styles.iconBubble, { backgroundColor: colors.surface }]}>
          <Shield size={22} color={colors.textSecondary} />
        </View>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.languageContent}>
        {/* Logo */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: colors.surface, shadowColor: colors.primary }]}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImage}
              contentFit="contain"
              transition={200}
            />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.titleContainer}>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
            مرحباً بك في | Welcome to
          </Text>
          <Text style={[styles.appNameText, { color: colors.text }]}>
            كافل
          </Text>
          <Text style={[styles.appNameSubtext, { color: colors.primary }]}>
            Kafel
          </Text>
        </Animated.View>

        {/* Language Selection */}
        <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.languageSection}>
          <Text style={[styles.selectLanguageText, { color: colors.textSecondary }]}>
            اختر لغتك المفضلة
          </Text>
          <Text style={[styles.selectLanguageSubtext, { color: colors.textMuted }]}>
            Choose your preferred language
          </Text>

          <View style={styles.languageButtons}>
            {/* Arabic Button */}
            <Pressable
              onPress={() => handleLanguageSelect("ar")}
              style={({ pressed }) => [
                styles.languageButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Text style={[styles.languageButtonText, { color: colors.text }]}>
                العربية
              </Text>
              <View style={[styles.languageFlag, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.flagEmoji}>🇸🇦</Text>
              </View>
            </Pressable>

            {/* English Button */}
            <Pressable
              onPress={() => handleLanguageSelect("en")}
              style={({ pressed }) => [
                styles.languageButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Text style={[styles.languageButtonText, { color: colors.text }]}>
                English
              </Text>
              <View style={[styles.languageFlag, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={styles.flagEmoji}>🇺🇸</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Theme Toggle */}
        <Animated.View entering={FadeIn.delay(800)} style={styles.themeToggle}>
          <Pressable
            onPress={toggleTheme}
            style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {isDark ? (
              <Sun size={20} color={colors.warning} />
            ) : (
              <Moon size={20} color={colors.primary} />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );

  // Welcome Screen (Screen 1)
  const renderScreen1 = () => (
    <View style={[styles.screenContainer, { width: screenWidth }]}>
      {/* Floating Icons */}
      <Animated.View style={[styles.decorativeIcon, { top: "20%", left: 30 }, floatingStyle]}>
        <Animated.View style={[styles.iconBubble, { backgroundColor: colors.surface }, glowStyle]}>
          <FileText size={22} color={colors.textSecondary} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.decorativeIcon, { top: "16%", right: 40 }, floatingStyle2]}>
        <Animated.View style={[styles.iconBubble, { backgroundColor: colors.surface }, glowStyle]}>
          <CreditCard size={22} color={colors.textSecondary} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.decorativeIcon, { top: "32%", right: 25 }, floatingStyle3]}>
        <Animated.View style={[styles.iconBubble, { backgroundColor: colors.surface }, glowStyle]}>
          <Shield size={22} color={colors.primary} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.decorativeIcon, { top: "28%", left: 55 }, floatingStyle4]}>
        <Animated.View style={[styles.iconBubble, { backgroundColor: colors.surface }, glowStyle]}>
          <Building size={22} color={colors.textSecondary} />
        </Animated.View>
      </Animated.View>

      {/* Main Logo */}
      <Animated.View style={[styles.mainLogoContainer, logoScaleStyle]}>
        <View style={[styles.mainLogoCircle, { backgroundColor: colors.surface, shadowColor: colors.primary }]}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.mainLogoImage}
            contentFit="contain"
            transition={200}
          />
        </View>
      </Animated.View>

      {/* City Skyline */}
      <Animated.View style={[styles.skyline, floatingStyle]}>
        {[60, 80, 45, 95, 55, 75, 50].map((height, index) => (
          <View
            key={index}
            style={[
              styles.building,
              { height, backgroundColor: colors.surface, opacity: 0.15 + index * 0.05 },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );

  // Contract Transfer Screen (Screen 2)
  const renderScreen2 = () => (
    <View style={[styles.screenContainer, { width: screenWidth }]}>
      <View style={styles.contractContent}>
        {/* Two Characters with Document */}
        <View style={styles.charactersRow}>
          <Animated.View style={[styles.characterCircle, { backgroundColor: colors.surface }]}>
            <UserCheck size={28} color={colors.text} />
          </Animated.View>

          <Animated.View style={[styles.slidingDocument, documentStyle, { backgroundColor: colors.card }]}>
            <FileText size={18} color={colors.primary} />
          </Animated.View>

          <Animated.View style={[styles.arrowContainer, arrowStyle]}>
            <ArrowRight size={22} color={colors.primary} />
          </Animated.View>

          <Animated.View style={[styles.characterCircle, { backgroundColor: colors.surface }]}>
            <Users size={28} color={colors.text} />
          </Animated.View>
        </View>

        {/* Feature Icons */}
        <View style={styles.featureIcons}>
          {[
            { icon: Shield, delay: 200 },
            { icon: FileText, delay: 300 },
            { icon: CheckCircle, delay: 400 },
          ].map((item, index) => (
            <Animated.View
              key={index}
              entering={FadeInUp.delay(item.delay).springify()}
              style={[styles.featureIcon, { backgroundColor: colors.surface }]}
            >
              <item.icon size={20} color={colors.primary} />
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );

  // Government Services Screen (Screen 3)
  const renderScreen3 = () => (
    <View style={[styles.screenContainer, { width: screenWidth }]}>
      <View style={styles.governmentContent}>
        {/* Document Icons */}
        <View style={styles.documentsGrid}>
          {[CreditCard, FileText, Building].map((Icon, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 100).springify()}
              style={[styles.documentIcon, { backgroundColor: colors.surface }]}
            >
              <Icon size={22} color={colors.text} />
            </Animated.View>
          ))}
        </View>

        {/* Stamp Animation */}
        <View style={styles.stampContainer}>
          <Animated.View style={[styles.ripple, { borderColor: colors.primary }, rippleStyle]} />
          <Animated.View style={[styles.stamp, { backgroundColor: colors.primary }, stampStyle]}>
            <CheckCircle size={28} color={colors.card} />
          </Animated.View>
        </View>

        {/* Checklist */}
        <View style={styles.checklist}>
          {t.onboarding.services.map((item, index) => (
            <Animated.View
              key={item}
              entering={FadeInUp.delay(500 + index * 100).springify()}
              style={[styles.checklistItem, { backgroundColor: colors.surface }]}
            >
              <CheckCircle size={14} color={colors.primary} />
              <Text style={[styles.checklistText, { color: colors.text }]}>{item}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 0:
        return renderLanguageScreen();
      case 1:
        return renderScreen1();
      case 2:
        return renderScreen2();
      case 3:
        return renderScreen3();
      default:
        return renderLanguageScreen();
    }
  };

  const getScreenTitle = () => {
    if (currentScreen === 0) return "";
    if (currentScreen === 1) return t.onboarding.screen1Title;
    if (currentScreen === 2) return t.onboarding.screen2Title;
    if (currentScreen === 3) return t.onboarding.screen3Title;
    return "";
  };

  const getScreenSubtitle = () => {
    if (currentScreen === 0) return "";
    if (currentScreen === 1) return t.onboarding.screen1Subtitle;
    if (currentScreen === 2) return t.onboarding.screen2Subtitle;
    if (currentScreen === 3) return t.onboarding.screen3Subtitle;
    return "";
  };

  const gradientColors = isDark 
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />

      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* Screen Content */}
        <View style={styles.screenArea}>
          {renderCurrentScreen()}
        </View>

        {/* Text Content (only show for screens 1-3) */}
        {currentScreen > 0 && (
          <Animated.View entering={FadeIn} style={styles.textContent}>
            <Text style={[styles.screenTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {getScreenTitle()}
            </Text>
            <Text style={[styles.screenSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {getScreenSubtitle()}
            </Text>
          </Animated.View>
        )}

        {/* Navigation */}
        {currentScreen > 0 && (
          <View style={[styles.navigation, { paddingBottom: insets.bottom + 20 }]}>
            {/* Back Button */}
            <Pressable
              onPress={prevScreen}
              style={[
                styles.navButton,
                { backgroundColor: colors.surface, opacity: currentScreen === 0 ? 0 : 1 },
              ]}
              disabled={currentScreen === 0}
            >
              {isRTL ? (
                <ArrowRight size={22} color={colors.text} />
              ) : (
                <ArrowLeft size={22} color={colors.text} />
              )}
            </Pressable>

            {/* Page Indicators */}
            <View style={styles.indicators}>
              {screens.slice(1).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    {
                      width: index + 1 === currentScreen ? 24 : 8,
                      backgroundColor: index + 1 === currentScreen ? colors.primary : colors.textMuted,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Next/Get Started Button */}
            <Pressable
              onPress={currentScreen === screens.length - 1 ? getStarted : nextScreen}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {currentScreen === screens.length - 1 ? t.onboarding.getStarted : t.common.next}
              </Text>
              {currentScreen !== screens.length - 1 && (
                isRTL ? (
                  <ArrowLeft size={18} color="#fff" style={{ marginLeft: 6 }} />
                ) : (
                  <ArrowRight size={18} color="#fff" style={{ marginLeft: 6 }} />
                )
              )}
            </Pressable>
          </View>
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
  screenArea: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    position: "relative",
  },

  // Language Screen
  languageContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 65,
    height: 65,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 15,
    marginBottom: 8,
  },
  appNameText: {
    fontSize: 42,
    fontWeight: "bold",
    marginBottom: 4,
  },
  appNameSubtext: {
    fontSize: 24,
    fontWeight: "600",
  },
  languageSection: {
    width: "100%",
    alignItems: "center",
  },
  selectLanguageText: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  selectLanguageSubtext: {
    fontSize: 14,
    marginBottom: 24,
  },
  languageButtons: {
    flexDirection: "row",
    gap: 16,
  },
  languageButton: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    minWidth: 130,
  },
  languageButtonText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  languageFlag: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  flagEmoji: {
    fontSize: 20,
  },
  themeToggle: {
    position: "absolute",
    bottom: 40,
  },
  themeButton: {
    padding: 12,
    borderRadius: 25,
    borderWidth: 1,
  },

  // Decorative Elements
  decorativeIcon: {
    position: "absolute",
    zIndex: 1,
  },
  iconBubble: {
    padding: 14,
    borderRadius: 18,
  },

  // Screen 1 (Welcome)
  mainLogoContainer: {
    alignSelf: "center",
    marginTop: "40%",
  },
  mainLogoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  mainLogoImage: {
    width: 70,
    height: 70,
  },
  skyline: {
    position: "absolute",
    bottom: "28%",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  building: {
    width: 28,
    borderRadius: 4,
  },

  // Screen 2 (Contract)
  contractContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  charactersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "75%",
    marginBottom: 50,
    position: "relative",
  },
  characterCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  slidingDocument: {
    position: "absolute",
    left: "50%",
    width: 38,
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  arrowContainer: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -11 }],
  },
  featureIcons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 30,
  },
  featureIcon: {
    padding: 14,
    borderRadius: 14,
  },

  // Screen 3 (Government)
  governmentContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  documentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    marginBottom: 35,
  },
  documentIcon: {
    padding: 16,
    borderRadius: 14,
  },
  stampContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 30,
  },
  ripple: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  stamp: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  checklist: {
    alignItems: "center",
    gap: 10,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 10,
  },
  checklistText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Text Content
  textContent: {
    paddingHorizontal: 35,
    marginBottom: 30,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  screenSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },

  // Navigation
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  navButton: {
    padding: 12,
    borderRadius: 22,
  },
  indicators: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  primaryButton: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
