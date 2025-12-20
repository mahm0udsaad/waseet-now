import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  ChevronRight,
  ChevronLeft,
  User,
  CreditCard,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Moon,
  Globe,
} from 'lucide-react-native';
import { useTheme } from '@/utils/theme/store';
import { useTranslation } from '@/utils/i18n/store';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const MENU_ITEMS = [
  {
    section: 'Account',
    items: [
      { id: 'personal', icon: User, label: 'Personal Information', route: '/profile/personal' },
      { id: 'payment', icon: CreditCard, label: 'Payment Methods', route: '/profile/payment' },
      { id: 'notifications', icon: Bell, label: 'Notifications', route: '/profile/notifications' },
    ],
  },
  {
    section: 'App Settings',
    items: [
      { id: 'language', icon: Globe, label: 'Language', action: 'toggleLanguage', isValue: true },
      { id: 'theme', icon: Moon, label: 'Dark Mode', action: 'toggleTheme', isSwitch: true },
    ],
  },
  {
    section: 'Support',
    items: [
      { id: 'security', icon: Shield, label: 'Security & Privacy', route: '/profile/security' },
      { id: 'help', icon: HelpCircle, label: 'Help Center', route: '/profile/help' },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, isRTL, language, toggleLanguage } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleAction = (action) => {
    if (action === 'toggleTheme') toggleTheme();
    if (action === 'toggleLanguage') toggleLanguage();
  };

  const handleSignOut = async () => {
    Alert.alert(
      isRTL ? 'تسجيل الخروج' : 'Sign Out',
      isRTL ? 'هل أنت متأكد من تسجيل الخروج؟' : 'Are you sure you want to sign out?',
      [
        {
          text: isRTL ? 'إلغاء' : 'Cancel',
          style: 'cancel',
        },
        {
          text: isRTL ? 'تسجيل الخروج' : 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/signin');
            } catch (error) {
              Alert.alert(
                isRTL ? 'خطأ' : 'Error',
                error.message || (isRTL ? 'فشل تسجيل الخروج' : 'Failed to sign out')
              );
            }
          },
        },
      ]
    );
  };

  const renderMenuItem = (item, index) => (
    <Pressable
      key={item.id}
      onPress={() => item.action ? handleAction(item.action) : null}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <item.icon size={20} color={colors.primary} />
      </View>
      
      <Text style={[styles.menuLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
        {isRTL && item.id === 'language' ? 'اللغة' : item.id === 'theme' && isRTL ? 'الوضع الليلي' : item.label}
      </Text>

      <View style={styles.menuAction}>
        {item.isValue && (
          <Text style={[styles.valueText, { color: colors.textSecondary }]}>
            {item.id === 'language' ? (language === 'ar' ? 'العربية' : 'English') : ''}
          </Text>
        )}
        {item.isSwitch ? (
           <View style={[styles.switch, { backgroundColor: isDark ? colors.primary : colors.border }]}>
              <View style={[styles.switchKnob, { transform: [{ translateX: isDark ? 18 : 2 }] }]} />
           </View>
        ) : (
           isRTL ? <ChevronLeft size={20} color={colors.textMuted} /> : <ChevronRight size={20} color={colors.textMuted} />
        )}
      </View>
    </Pressable>
  );

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={colors.statusBar} />
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
            <View style={styles.profileImageContainer}>
                <Image 
                    source={{ uri: 'https://picsum.photos/id/64/200/200' }} 
                    style={styles.profileImage} 
                />
                <Pressable style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                    <Settings size={14} color="#fff" />
                </Pressable>
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>Mohammed Ali</Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>mohammed.ali@example.com</Text>
            
            <View style={[styles.statsContainer, { borderColor: colors.border }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{isRTL ? 'طلبات' : 'Orders'}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.primary }]}>4.8</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{isRTL ? 'تقييم' : 'Rating'}</Text>
                </View>
            </View>
        </Animated.View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
            {MENU_ITEMS.map((section, sectionIndex) => (
                <Animated.View 
                    key={section.section} 
                    entering={FadeInDown.delay(200 + (sectionIndex * 100))}
                    style={styles.section}
                >
                    <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                        {section.section}
                    </Text>
                    <View style={[styles.sectionItems, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {section.items.map((item, index) => (
                            <React.Fragment key={item.id}>
                                {renderMenuItem(item, index)}
                                {index < section.items.length - 1 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
                            </React.Fragment>
                        ))}
                    </View>
                </Animated.View>
            ))}
            
            <Animated.View entering={FadeInDown.delay(500)}>
                <Pressable 
                  onPress={handleSignOut}
                  style={[styles.logoutButton, { backgroundColor: colors.error + '15' }]}
                >
                    <LogOut size={20} color={colors.error} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>{isRTL ? 'تسجيل الخروج' : 'Logout'}</Text>
                </Pressable>
            </Animated.View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 20,
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionItems: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    marginLeft: 60,
  },
  switch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
