import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useLanguage } from '@/utils/i18n/store';
import { supabase } from '@/utils/supabase/client';
import { deleteAllMyPushTokens } from '@/utils/supabase/pushTokens';
import { showToast } from '@/utils/notifications/inAppStore';
import { useTheme } from '@/utils/theme/store';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  Clock3,
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
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FadeInView from "@/components/ui/FadeInView";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ThemeSwitch({ isDark, colors }) {
  // Layout is always RTL (forceRTL), so knob position always follows RTL.
  const getKnobPosition = React.useCallback(
    (dark) => (dark ? 2 : 20),
    []
  );
  const translateX = React.useRef(new Animated.Value(getKnobPosition(isDark))).current;

  React.useEffect(() => {
    Animated.spring(translateX, {
      toValue: getKnobPosition(isDark),
      damping: 15,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  }, [getKnobPosition, isDark, translateX]);

  return (
    <View style={[styles.switch, { backgroundColor: isDark ? colors.primary : colors.border }]}>
      <Animated.View style={[styles.switchKnob, { transform: [{ translateX }] }]} />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, isRTL, language, toggleLanguage } = useLanguage();
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

  const handleAction = async (action) => {
    if (action === 'toggleTheme') toggleTheme();
    if (action === 'toggleLanguage') {
      // toggleLanguage may restart the app for an RTL/LTR flip.
      // The returned flag isn't needed here — if a restart happens
      // nothing runs after await anyway.
      await toggleLanguage();
    }
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
          flexDirection: 'row',
        },
      ]}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <item.icon size={20} color={colors.primary} />
      </View>

      <Text style={[styles.menuLabel, { color: colors.text, writingDirection: 'rtl' }]}>
        {item.label}
      </Text>

      <View style={[styles.menuAction, { flexDirection: 'row' }]}>
        {item.isValue && (
          <Text style={[styles.valueText, { color: colors.textSecondary, writingDirection: 'rtl' }]}>
            {item.id === 'language' ? (language === 'ar' ? 'العربية' : 'English') : ''}
          </Text>
        )}
        {item.isSwitch ? (
           <ThemeSwitch isDark={isDark} colors={colors} />
        ) : (
           <ChevronLeft size={20} color={colors.textMuted} />
        )}
      </View>
    </Pressable>
  );

  const gradientColors = isDark
    ? [colors.background, colors.backgroundSecondary]
    : [colors.background, colors.backgroundSecondary];

  const getAdTypeLabel = useCallback((type) => {
    if (type === 'tanazul') return isRTL ? 'تنازل' : 'Tanazul';
    if (type === 'taqib') return isRTL ? 'تعقيب' : 'Taqib';
    return isRTL ? 'ضامن' : 'Dhamen';
  }, [isRTL]);

  const getAdMetaLine = useCallback((ad) => {
    const parts = [
      ad.metadata?.profession_label_ar_short,
      ad.metadata?.profession_label_en_short,
      ad.metadata?.profession,
      ad.metadata?.nationality,
      ad.location,
    ].filter(Boolean);

    return parts.slice(0, 2).join(' • ');
  }, []);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          headerTitleAlign: 'center',
          title: isRTL ? 'حسابي' : 'Profile',
          headerBackVisible: false,
          headerLeftContainerStyle: styles.headerSideContainer,
          headerRightContainerStyle: styles.headerSideContainer,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
              >
                <ChevronRight size={24} color={colors.text} />
              </Pressable>
            ) : null,
          headerRight: () => <View style={styles.headerSpacer} />,
        }}
      />
      <StatusBar style={colors.statusBar} />
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
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
        <FadeInView delay={100} style={styles.header}>
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
                      opacity: pressed ? 0.75 : 1,
                      flexDirection: 'row',
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
            
            <View style={[styles.statsContainer, { borderColor: colors.border, flexDirection: 'row' }]}>
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
        </FadeInView>

        {/* My Ads Section */}
        <FadeInView
          delay={150}
          style={styles.adsSection}
          onLayout={(event) => setAdsSectionY(event.nativeEvent.layout.y)}
        >
          <View style={[styles.adsSectionHeader, { flexDirection: 'row' }]}>
            <View style={[styles.adsTitleContainer, { flexDirection: 'row' }]}>
              <Package size={20} color={colors.primary} />
              <Text style={[styles.adsSectionTitle, { color: colors.text, writingDirection: 'rtl' }]}>
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
                <View style={styles.adsList}>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <View
                      key={`sk-ad-${idx}`}
                      style={[
                        styles.adListCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <View style={[styles.adListTopRow, { flexDirection: 'row' }]}>
                        <Skeleton height={26} radius={13} width={86} />
                        <Skeleton height={12} radius={8} width={90} />
                      </View>
                      <Skeleton height={18} radius={8} width="72%" style={{ marginTop: 14 }} />
                      <Skeleton height={13} radius={7} width="58%" style={{ marginTop: 10 }} />
                      <Skeleton height={14} radius={7} width={110} style={{ marginTop: 14 }} />
                      <View style={[styles.adListActions, { flexDirection: 'row' }]}>
                        <Skeleton height={40} radius={12} width="48%" />
                        <Skeleton height={40} radius={12} width="48%" />
                      </View>
                    </View>
                  ))}
                </View>
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
            <View style={styles.adsList}>
              {userAds.map((ad, index) => (
                <FadeInView
                  key={ad.id}
                  delay={200 + index * 45}
                  style={[styles.adListCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.adListTopRow, { flexDirection: 'row' }]}>
                    <View style={[styles.adTypeTag, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.adTypeText, { color: colors.primary }]}>
                        {getAdTypeLabel(ad.type)}
                      </Text>
                    </View>
                    <View style={styles.adMetaRow}>
                      <Clock3 size={14} color={colors.textMuted} />
                      <Text style={[styles.adMetaText, { color: colors.textMuted }]}>
                        {new Date(ad.created_at).toLocaleDateString(
                          isRTL ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US',
                          { year: 'numeric', month: 'short', day: 'numeric' }
                        )}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.adCardTitle, { color: colors.text, writingDirection: 'rtl' }]} numberOfLines={2}>
                    {ad.title}
                  </Text>

                  {getAdMetaLine(ad) ? (
                    <Text style={[styles.adMetaSummary, { color: colors.textSecondary, writingDirection: 'rtl' }]} numberOfLines={1}>
                      {getAdMetaLine(ad)}
                    </Text>
                  ) : null}

                  {ad.price ? (
                    <Text style={[styles.adCardPrice, { color: colors.primary, writingDirection: 'rtl' }]}>
                      {Number(ad.price).toLocaleString()} {t.common.sar}
                    </Text>
                  ) : null}

                  <View style={[styles.adListActions, { flexDirection: 'row' }]}>
                    <Pressable
                      onPress={() => handleEditAd(ad)}
                      style={({ pressed }) => [
                        styles.adActionButton,
                        {
                          backgroundColor: colors.primary + '14',
                          borderColor: colors.primary + '28',
                          opacity: pressed ? 0.75 : 1,
                          flexDirection: 'row',
                        }
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
                        {
                          backgroundColor: colors.error + '12',
                          borderColor: colors.error + '28',
                          opacity: pressed ? 0.75 : 1,
                          flexDirection: 'row',
                        }
                      ]}
                    >
                      <Trash2 size={16} color={colors.error} />
                      <Text style={[styles.adActionText, { color: colors.error }]}>
                        {t.profile.delete}
                      </Text>
                    </Pressable>
                  </View>
                </FadeInView>
              ))}
            </View>
          )}
        </FadeInView>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
            {MENU_ITEMS.map((section, sectionIndex) => (
                <FadeInView
                    key={sectionIndex}
                    delay={200 + (sectionIndex * 100)}
                    style={styles.section}
                >
                    <Text style={[styles.sectionTitle, { color: colors.textMuted, writingDirection: 'rtl' }]}>
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
                </FadeInView>
            ))}

            <FadeInView delay={500}>
                <Pressable 
                  onPress={handleSignOut}
                  style={[styles.logoutButton, { backgroundColor: colors.error + '15', flexDirection: 'row' }]}
                >
                    <LogOut size={20} color={colors.error} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>{t.profile.logout}</Text>
                </Pressable>
            </FadeInView>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerSideContainer: {
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 32,
    height: 32,
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
    flexDirection: 'row',
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
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginStart: 10,
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
    minWidth: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  adsTitleContainer: {
    flexDirection: 'row',
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
    paddingVertical: 4,
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
    flexDirection: 'row',
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
  adsList: {
    gap: 12,
  },
  adListCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  adListTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  adMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  adCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  adMetaSummary: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  adCardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  adListActions: {
    flexDirection: 'row',
    gap: 8,
  },
  adActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
