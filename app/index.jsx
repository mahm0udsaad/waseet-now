import { useLanguage, useTranslation } from "@/utils/i18n/store";
import { useTheme } from "@/utils/theme/store";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Building, ChevronLeft, ChevronRight, FileText, Moon, Shield, Sun } from "lucide-react-native";
import React from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();

  const categories = [
    {
      id: "tanazul",
      title: t.home.tanazul,
      subtitle: t.home.tanazulDesc,
      icon: FileText,
      route: "/tanazul-list",
      delay: 200,
    },
    {
      id: "taqib",
      title: t.home.taqib,
      subtitle: t.home.taqibDesc,
      icon: Building,
      route: "/taqib-list",
      delay: 300,
    },
    {
      id: "dhamen",
      title: t.home.dhamen,
      subtitle: t.home.dhamenDesc,
      icon: Shield,
      route: "/create-dhamen",
      delay: 400,
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
          entering={FadeInDown.delay(100)}
          style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          <View style={isRTL ? styles.headerTextRTL : styles.headerTextLTR}>
            <Text style={[styles.greeting, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {t.home.greeting} 👋
            </Text>
            <Text style={[styles.selectService, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
              {t.home.selectService}
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            {/* Theme Toggle */}
            <Pressable
              onPress={toggleTheme}
              style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {isDark ? (
                <Sun size={18} color={colors.warning} />
              ) : (
                <Moon size={18} color={colors.primary} />
              )}
            </Pressable>
            
            {/* Language Toggle */}
            <Pressable
              onPress={toggleLanguage}
              style={[styles.headerIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.langText, { color: colors.text }]}>
                {language === "ar" ? "EN" : "ع"}
              </Text>
            </Pressable>
            
            {/* Logo */}
            <View style={[styles.logoContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
          </View>
        </Animated.View>

        {/* Categories */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((item) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(item.delay)}
              style={styles.categoryWrapper}
            >
              <Pressable
                onPress={() => router.push(item.route)}
                style={({ pressed }) => [
                  styles.categoryCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    shadowColor: colors.shadow,
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                  <item.icon size={24} color={colors.primary} />
                </View>
                
                <View style={styles.categoryTextContainer}>
                  <Text style={[styles.categoryTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.categorySubtitle, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                    {item.subtitle}
                  </Text>
                </View>

                <View style={styles.arrowContainer}>
                  {isRTL ? (
                    <ChevronLeft size={22} color={colors.textMuted} />
                  ) : (
                    <ChevronRight size={22} color={colors.textMuted} />
                  )}
                </View>
              </Pressable>
            </Animated.View>
          ))}
          
        </ScrollView>
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
  headerTextRTL: {
    flex: 1,
  },
  headerTextLTR: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
  },
  selectService: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  langText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  logoContainer: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logoImage: {
    width: 32,
    height: 32,
  },

  // Scroll Content
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },

  // Category Card
  categoryWrapper: {
    marginBottom: 14,
  },
  categoryCard: {
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTextContainer: {
    flex: 1,
    paddingHorizontal: 14,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  arrowContainer: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
