import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useLanguage, getRTLRowDirection, getRTLTextAlign, getRTLStartAlign } from '@/utils/i18n/store';
import { supabase } from '@/utils/supabase/client';
import { deleteAllMyPushTokens } from '@/utils/supabase/pushTokens';
import { showToast } from '@/utils/notifications/inAppStore';
import { useTheme } from '@/utils/theme/store';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Edit,
  Globe,
  HelpCircle,
  LogOut,
  Moon,
  Package,
  Shield,
  Trash2,
  User,
  Wallet,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ThemeSwitch({ isDark, colors }) {
  const animatedKnobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(isDark ? 20 : 2, { damping: 15, stiffness: 150 }) }],
  }));

  return (
    <View style={[styles.switch, { backgroundColor: isDark ? colors.primary : colors.border }]}>
      <Animated.View style={[styles.switchKnob, animatedKnobStyle]} />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, isRTL, language, toggleLanguage, rowDirection } = useLanguage();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userAds, setUserAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef(null);
  const [adsSectionY, setAdsSectionY] = useState(0);

  const MENU_ITEMS = useMemo(() => [
    {
      section: t.profile.account,
      items: [
        { id: 'personal', icon: User, label: t.profile.personal, route: '/profile/personal' },
        { id: 'wallet', icon: Wallet, label: t.profile.wallet, route: '/wallet' },
        { id: 'notifications', icon: Bell, label: t.profile.notifications, route: '/notifications' },
      ],
    },
    {
      section: t.profile.appSettings,
      items: [
        { id: 'language', icon: Globe, label: t.profile.language, action: 'toggleLanguage', isValue: true },
        { id: 'theme', icon: Moon, label: t.profile.darkMode, action: 'toggleTheme', isSwitch: true },
      ],
    },
    {
      section: t.profile.support,
      items: [
        { id: 'security', icon: Shield, label: t.profile.security, route: '/profile/security' },
        { id: 'help', icon: HelpCircle, label: t.profile.help, route: '/profile/help' },
      ],
    },
  ], [t]);

  const loadProfile = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setProfile(null);
        setCurrentUserId(null);
        return null;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, email, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data ?? null);
      return user.id;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadUserAds = useCallback(async (userIdOverride) => {
    const userId = userIdOverride || currentUserId;
    if (!userId) return;
    
    setAdsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserAds(data || []);
    } catch (error) {
      console.error('Error loading user ads:', error);
      showToast({ id: 'ads-load-error', title: isRTL ? 'خطأ' : 'Error', body: isRTL ? 'فشل تحميل الإعلانات' : 'Failed to load ads', type: 'error' });
      setUserAds([]);
    } finally {
      setAdsLoading(false);
    }
  }, [currentUserId]);

  const loadOrdersCount = useCallback(async (userIdOverride) => {
    const userId = userIdOverride || currentUserId;
    if (!userId) return;
    try {
      const [{ count: ordCount }, { count: daminCount }] = await Promise.all([
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
        supabase
          .from('damin_orders')
          .select('*', { count: 'exact', head: true })
          .or(`creator_id.eq.${userId},payer_user_id.eq.${userId},beneficiary_user_id.eq.${userId}`),
      ]);
      setOrdersCount((ordCount || 0) + (daminCount || 0));
    } catch (e) {
      console.error('Error loading orders count:', e);
      showToast({ id: 'orders-count-error', title: isRTL ? 'خطأ' : 'Error', body: isRTL ? 'فشل تحميل عدد الطلبات' : 'Failed to load orders count', type: 'error' });
    }
  }, [currentUserId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const userId = await loadProfile();
      if (!userId) {
        setUserAds([]);
        setOrdersCount(0);
        return;
      }
      await Promise.all([
        loadUserAds(userId),
        loadOrdersCount(userId),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadOrdersCount, loadProfile, loadUserAds]);

  useEffect(() => {
    if (!currentUserId) return;
    loadUserAds();
    loadOrdersCount();
  }, [currentUserId, loadOrdersCount, loadUserAds]);

  const handleAction = (action) => {
    if (action === 'toggleTheme') toggleTheme();
    if (action === 'toggleLanguage') toggleLanguage();
  };

  const handleDeleteAd = async (adId, adTitle) => {
    Alert.alert(
      t.profile.deleteAd,
      `${t.profile.deleteAdConfirm} "${adTitle}"?`,
      [
        {
          text: t.profile.cancel,
          style: 'cancel',
        },
        {
          text: t.profile.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('ads')
                .delete()
                .eq('id', adId);

              if (error) throw error;

              setUserAds((prev) => prev.filter((ad) => ad.id !== adId));
              Alert.alert(
                t.profile.deleted,
                t.profile.adDeleted
              );
            } catch (error) {
              Alert.alert(
                t.profile.error,
                error.message || t.profile.failedToDelete
              );
            }
          },
        },
      ]
    );
  };

  const handleEditAd = (ad) => {
    // Navigate to the appropriate edit screen based on ad type
    if (ad.type === 'tanazul') {
      router.push({ pathname: '/create-tanazul', params: { editId: ad.id } });
    } else if (ad.type === 'taqib') {
      router.push({ pathname: '/create-taqib', params: { editId: ad.id } });
    } else if (ad.type === 'dhamen') {
      router.push({ pathname: '/create-dhamen', params: { editId: ad.id } });
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      t.profile.logout,
      t.profile.logoutConfirm,
      [
        {
          text: t.profile.cancel,
          style: 'cancel',
        },
        {
          text: t.profile.logout,
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove push tokens before signing out so the old account
              // stops receiving notifications on this device
              try {
                await deleteAllMyPushTokens();
              } catch (e) {
                console.warn('[SignOut] Failed to delete push tokens:', e);
              }
              await supabase.auth.signOut();
              router.replace('/signin');
            } catch (error) {
              Alert.alert(
                t.profile.error,
                error.message || t.profile.failedToSignOut
              );
            }
          },
        },
      ]
    );
  };

  const renderMenuItem = (item) => (
    <Pressable
      key={item.id}
      testID={item.id === 'wallet' ? 'profile-wallet-btn' : undefined}
      onPress={() => {
        if (item.action) return handleAction(item.action);
        if (item.route) return router.push(item.route);
        return null;
      }}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
          flexDirection: getRTLRowDirection(isRTL),
        },
      ]}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <item.icon size={20} color={colors.primary} />
      </View>
      
      <Text style={[styles.menuLabel, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
        {item.label}
      </Text>

      <View style={[styles.menuAction, { flexDirection: getRTLRowDirection(isRTL) }]}>
        {item.isValue && (
          <Text style={[styles.valueText, { color: colors.textSecondary }]}>
            {item.id === 'language' ? (language === 'ar' ? 'العربية' : 'English') : ''}
          </Text>
        )}
        {item.isSwitch ? (
           <ThemeSwitch isDark={isDark} colors={colors} />
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
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* Profile Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
            <View style={styles.profileImageContainer}>
                {profileLoading ? (
                  <SkeletonGroup>
                    <Skeleton width={100} height={100} radius={50} />
                  </SkeletonGroup>
                ) : (
                  <Image
                    source={
                      profile?.avatar_url
                        ? { uri: profile.avatar_url }
                        : require('@/assets/images/logo.png')
                    }
                    style={[styles.profileImage, !profile?.avatar_url && { backgroundColor: '#FFFFFF' }]}
                  />
                )}
                <Pressable 
                  onPress={() => router.push('/profile/personal')}
                  style={[styles.editBadge, { backgroundColor: colors.primary }]}
                >
                    <Edit size={14} color="#fff" />
                </Pressable>
            </View>
            {profileLoading ? (
              <SkeletonGroup style={{ alignItems: "center" }}>
                <Skeleton height={22} radius={10} width={160} />
                <Skeleton height={14} radius={8} width={220} style={{ marginTop: 10 }} />
              </SkeletonGroup>
            ) : (
              <>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {profile?.display_name || t.profile.guest}
                </Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {profile?.email || ''}
                </Text>
                <Pressable
                  onPress={() => router.push('/profile/personal')}
                  style={({ pressed }) => [
                    styles.editProfileButton,
                    {
                      backgroundColor: colors.primary + '14',
                      borderColor: colors.primary + '35',
                      flexDirection: getRTLRowDirection(isRTL),
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Edit size={14} color={colors.primary} />
                  <Text style={[styles.editProfileButtonText, { color: colors.primary }]}>
                    {isRTL ? 'تعديل الملف الشخصي' : 'Edit Profile'}
                  </Text>
                </Pressable>
              </>
            )}
            
            <View style={[styles.statsContainer, { borderColor: colors.border }]}>
                <Pressable
                  onPress={() => router.push('/my-orders')}
                  style={({ pressed }) => [styles.statItem, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <Text style={[styles.statValue, { color: colors.primary }]}>{ordersCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.profile.orders}</Text>
                </Pressable>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <Pressable
                  onPress={() => scrollViewRef.current?.scrollTo({ y: Math.max(adsSectionY - 16, 0), animated: true })}
                  style={({ pressed }) => [styles.statItem, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <Text style={[styles.statValue, { color: colors.primary }]}>{userAds.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.profile.myAds}</Text>
                </Pressable>
            </View>
        </Animated.View>

        {/* My Ads Section */}
        <Animated.View
          entering={FadeInDown.delay(150)}
          style={styles.adsSection}
          onLayout={(event) => setAdsSectionY(event.nativeEvent.layout.y)}
        >
          <View style={[styles.adsSectionHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={[styles.adsTitleContainer, { flexDirection: getRTLRowDirection(isRTL) }]}>
              <Package size={20} color={colors.primary} />
              <Text style={[styles.adsSectionTitle, { color: colors.text }]}>
                {t.profile.myAds}
              </Text>
            </View>
            {userAds.length > 0 && (
              <Text style={[styles.adsCount, { color: colors.textSecondary }]}>
                {userAds.length}
              </Text>
            )}
          </View>

          {adsLoading ? (
            <View style={styles.adsLoadingContainer}>
              <SkeletonGroup>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.adsScrollContent,
                    { flexDirection: rowDirection },
                  ]}
                  pointerEvents="none"
                >
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <View
                      key={`sk-ad-${idx}`}
                      style={[
                        { height: 220 },
                        styles.adCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Skeleton height={16} radius={8} width={70} />
                      <Skeleton height={16} radius={8} width="90%" style={{ marginTop: 16 }} />
                      <Skeleton height={12} radius={8} width="100%" style={{ marginTop: 12 }} />
                      <Skeleton height={12} radius={8} width="80%" style={{ marginTop: 10 }} />
                      <Skeleton height={16} radius={8} width={90} style={{ marginTop: 14 }} />
                      <View style={{ height: 12 }} />
                      <View style={[styles.adCardActions, { flexDirection: rowDirection }]}>
                        <Skeleton height={34} radius={10} width="48%" />
                        <Skeleton height={34} radius={10} width="48%" />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </SkeletonGroup>
            </View>
          ) : userAds.length === 0 ? (
            <View style={[styles.noAdsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Package size={48} color={colors.textMuted} />
              <Text style={[styles.noAdsText, { color: colors.textSecondary }]}>
                {t.profile.noAds}
              </Text>
              <Pressable
                onPress={() => router.push('/create-tanazul')}
                style={({ pressed }) => [
                  styles.createAdButton,
                  {
                    backgroundColor: colors.primary,
                    flexDirection: getRTLRowDirection(isRTL),
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Package size={16} color="#fff" />
                <Text style={styles.createAdButtonText}>
                  {isRTL ? 'إنشاء إعلانك الأول' : 'Create Your First Ad'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.adsScrollContent, { flexDirection: getRTLRowDirection(isRTL) }]}
            >
              {userAds.map((ad, index) => (
                <Animated.View 
                  key={ad.id} 
                  entering={FadeInDown.delay(200 + index * 50)}
                  style={[styles.adCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.adTypeTag, { backgroundColor: colors.primaryLight, alignSelf: getRTLStartAlign(isRTL) }]}>
                    <Text style={[styles.adTypeText, { color: colors.primary }]}>
                      {ad.type === 'tanazul' ? (isRTL ? 'تنازل' : 'Tanazul') :
                       ad.type === 'taqib' ? (isRTL ? 'تعقيب' : 'Taqib') :
                       (isRTL ? 'ضامن' : 'Dhamen')}
                    </Text>
                  </View>
                  
                  <Text style={[styles.adCardTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]} numberOfLines={2}>
                    {ad.title}
                  </Text>
                  
                  {ad.description && (
                    <Text style={[styles.adCardDescription, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]} numberOfLines={2}>
                      {ad.description}
                    </Text>
                  )}
                  
                  {ad.price && (
                    <Text style={[styles.adCardPrice, { color: colors.primary, textAlign: getRTLTextAlign(isRTL) }]}>
                      {ad.price.toLocaleString()} {t.common.sar}
                    </Text>
                  )}
                  
                  <View style={[styles.adCardActions, { flexDirection: getRTLRowDirection(isRTL) }]}>
                    <Pressable
                      onPress={() => handleEditAd(ad)}
                      style={({ pressed }) => [
                        styles.adActionButton,
                        { backgroundColor: colors.primaryLight, opacity: pressed ? 0.7 : 1, flexDirection: getRTLRowDirection(isRTL) }
                      ]}
                    >
                      <Edit size={16} color={colors.primary} />
                      <Text style={[styles.adActionText, { color: colors.primary }]}>
                        {t.profile.edit}
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      onPress={() => handleDeleteAd(ad.id, ad.title)}
                      style={({ pressed }) => [
                        styles.adActionButton,
                        { backgroundColor: colors.error + '15', opacity: pressed ? 0.7 : 1, flexDirection: getRTLRowDirection(isRTL) }
                      ]}
                    >
                      <Trash2 size={16} color={colors.error} />
                      <Text style={[styles.adActionText, { color: colors.error }]}>
                        {t.profile.delete}
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
            {MENU_ITEMS.map((section, sectionIndex) => (
                <Animated.View 
                    key={sectionIndex} 
                    entering={FadeInDown.delay(200 + (sectionIndex * 100))}
                    style={styles.section}
                >
                    <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: getRTLTextAlign(isRTL) }]}>
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
                  style={[styles.logoutButton, { backgroundColor: colors.error + '15', flexDirection: getRTLRowDirection(isRTL) }]}
                >
                    <LogOut size={20} color={colors.error} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>{t.profile.logout}</Text>
                </Pressable>
            </Animated.View>
        </View>

        <View style={{ height: insets.bottom + 28 }} />
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
    end: 0,
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
  editProfileButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 18,
  },
  editProfileButtonText: {
    fontSize: 13,
    fontWeight: '600',
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
    marginStart: 10,
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
    marginStart: 60,
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
  
  // Ads Section
  adsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  adsSectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  adsTitleContainer: {
    alignItems: 'center',
    gap: 8,
  },
  adsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  adsCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  adsLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noAdsContainer: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  noAdsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  createAdButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  createAdButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  adsScrollContent: {
    paddingVertical: 4,
    gap: 12,
  },
  adCard: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginEnd: 12,
  },
  adTypeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  adTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  adCardDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  adCardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  adCardActions: {
    gap: 8,
    marginTop: 'auto',
  },
  adActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  adActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
