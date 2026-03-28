import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/utils/theme/store';
import { useTranslation, getRTLRowDirection, getRTLTextAlign, getRTLStartAlign } from '@/utils/i18n/store';
import { supabase } from '@/utils/supabase/client';
import { deleteAllMyPushTokens } from '@/utils/supabase/pushTokens';
import {
  Shield,
  Trash2,
  Lock,
  ChevronRight,
  ChevronLeft,
  FileText,
  Download,
  KeyRound,
  LogOut,
} from 'lucide-react-native';

const PRIVACY_POLICY_URL = 'https://www.wasitalan.com/privacy';
const TERMS_URL = 'https://www.wasitalan.com/terms';
const SUPPORT_EMAIL = 'support@wasitalan.com';

function ActionRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  colors,
  isRTL,
  danger = false,
  disabled = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionRow,
        {
          flexDirection: getRTLRowDirection(isRTL),
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          { backgroundColor: danger ? colors.error + '15' : colors.primaryLight },
        ]}
      >
        <Icon size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={[styles.actionContent, { alignItems: getRTLStartAlign(isRTL) }]}>
        <Text style={[styles.actionTitle, { color: danger ? colors.error : colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.actionSubtitle,
              { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {isRTL ? (
        <ChevronLeft size={18} color={colors.textMuted} />
      ) : (
        <ChevronRight size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

export default function SecurityScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const openExternalUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          isRTL ? 'رابط غير متاح' : 'Unavailable link',
          isRTL ? 'تعذر فتح هذا الرابط حالياً.' : 'Unable to open this link right now.'
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        t.profile.error,
        isRTL ? 'حدث خطأ أثناء فتح الرابط.' : 'Failed to open link.'
      );
    }
  };

  const handlePasswordReset = async () => {
    setSendingReset(true);
    try {
      const { data, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) throw getUserError;
      const email = data?.user?.email;
      if (!email) {
        Alert.alert(
          t.profile.error,
          isRTL ? 'لا يوجد بريد إلكتروني مرتبط بالحساب.' : 'No email is linked to this account.'
        );
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      Alert.alert(
        isRTL ? 'تم الإرسال' : 'Email sent',
        isRTL
          ? 'أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
          : 'We sent a password reset link to your email.'
      );
    } catch (e) {
      Alert.alert(t.profile.error, e?.message || (isRTL ? 'تعذر إرسال رابط التعيين.' : 'Failed to send reset link.'));
    } finally {
      setSendingReset(false);
    }
  };

  const handleSignOutAllDevices = () => {
    Alert.alert(
      isRTL ? 'تسجيل الخروج من جميع الأجهزة' : 'Sign out all devices',
      isRTL
        ? 'سيتم إنهاء جميع الجلسات النشطة على كل الأجهزة. المتابعة؟'
        : 'This will end all active sessions on all devices. Continue?',
      [
        { text: t.profile.cancel, style: 'cancel' },
        {
          text: isRTL ? 'تسجيل الخروج' : 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOutAll(true);
            try {
              await supabase.auth.signOut({ scope: 'global' });
              router.replace('/signin');
            } catch (e) {
              Alert.alert(
                t.profile.error,
                e?.message || (isRTL ? 'فشل تسجيل الخروج من كل الأجهزة.' : 'Failed to sign out all sessions.')
              );
            } finally {
              setSigningOutAll(false);
            }
          },
        },
      ]
    );
  };

  const handleDataExportRequest = async () => {
    const subject = encodeURIComponent(isRTL ? 'طلب تصدير بيانات الحساب' : 'Account data export request');
    const body = encodeURIComponent(
      isRTL
        ? 'مرحباً، أرغب في الحصول على نسخة من بيانات حسابي.'
        : 'Hello, I would like to request a copy of my account data.'
    );
    await openExternalUrl(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t.profile.deleteAccount,
      t.profile.deleteAccountConfirm,
      [
        { text: t.profile.cancel, style: 'cancel' },
        {
          text: t.profile.delete,
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
              try {
                // Clean up push tokens first
                try {
                  await deleteAllMyPushTokens();
                } catch (_e) {
                  // Non-blocking
                }

              const { error } = await supabase.functions.invoke('delete-account', {
                method: 'POST',
              });

              if (error) throw error;

              await supabase.auth.signOut();
              router.replace('/signin');
            } catch (e) {
              setDeleting(false);
              Alert.alert(
                t.profile.error,
                e?.message || t.profile.failedToDeleteAccount
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Docs */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <Lock size={20} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? 'مستندات الخصوصية' : 'Privacy Documents'}
            </Text>
          </View>
          <ActionRow
            icon={FileText}
            title={isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
            subtitle={isRTL ? 'اطلع على كيفية جمع واستخدام بياناتك' : 'How your data is collected and used'}
            onPress={() => openExternalUrl(PRIVACY_POLICY_URL)}
            colors={colors}
            isRTL={isRTL}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ActionRow
            icon={FileText}
            title={isRTL ? 'الشروط والأحكام' : 'Terms of Service'}
            subtitle={isRTL ? 'شروط الاستخدام والحقوق القانونية' : 'Usage terms and legal rights'}
            onPress={() => openExternalUrl(TERMS_URL)}
            colors={colors}
            isRTL={isRTL}
          />
        </View>

        {/* Account Security */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <Shield size={20} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? 'أمان الحساب' : 'Account Security'}
            </Text>
          </View>
          <ActionRow
            icon={KeyRound}
            title={sendingReset ? (isRTL ? 'جارٍ إرسال الرابط...' : 'Sending reset link...') : (isRTL ? 'تغيير كلمة المرور' : 'Change password')}
            subtitle={isRTL ? 'إرسال رابط إعادة التعيين إلى بريدك الإلكتروني' : 'Send reset link to your email'}
            onPress={handlePasswordReset}
            colors={colors}
            isRTL={isRTL}
            disabled={sendingReset}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ActionRow
            icon={LogOut}
            title={signingOutAll ? (isRTL ? 'جارٍ تسجيل الخروج...' : 'Signing out...') : (isRTL ? 'تسجيل الخروج من جميع الأجهزة' : 'Sign out all devices')}
            subtitle={isRTL ? 'إنهاء كل الجلسات النشطة' : 'End all active sessions'}
            onPress={handleSignOutAllDevices}
            colors={colors}
            isRTL={isRTL}
            danger
            disabled={signingOutAll}
          />
        </View>

        {/* Data Controls */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <Download size={20} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {isRTL ? 'البيانات والخصوصية' : 'Data & Privacy'}
            </Text>
          </View>
          <ActionRow
            icon={Download}
            title={isRTL ? 'طلب نسخة من بياناتي' : 'Request my data copy'}
            subtitle={isRTL ? 'سنرسل طلبك إلى الدعم لمعالجته' : 'Send your request to support for processing'}
            onPress={handleDataExportRequest}
            colors={colors}
            isRTL={isRTL}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={handleDeleteAccount}
            disabled={deleting}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: colors.error + '15',
                opacity: pressed || deleting ? 0.6 : 1,
                flexDirection: getRTLRowDirection(isRTL),
              },
            ]}
          >
            <Trash2 size={18} color={colors.error} />
              <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                {deleting
                  ? (isRTL ? 'جاري الحذف...' : 'Deleting...')
                  : (t.profile.deleteAccountButton || (isRTL ? 'حذف الحساب نهائياً' : 'Delete account permanently'))}
              </Text>
            </Pressable>
          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  actionRow: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
