import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/utils/theme/store';
import { useTranslation, getRTLRowDirection, getRTLTextAlign } from '@/utils/i18n/store';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Mail,
  Phone,
} from 'lucide-react-native';
import Constants from 'expo-constants';

const SUPPORT_EMAIL = 'support@wasitalan.com';
const SUPPORT_PHONE = '+966536300031';

function FAQItem({ question, answer, colors, isRTL }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <Pressable onPress={() => setOpen(!open)} style={styles.faqItem}>
      <View style={[styles.faqHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
        <Text style={[styles.faqQuestion, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
          {question}
        </Text>
        <Chevron size={18} color={colors.textMuted} />
      </View>
      {open && (
        <Text style={[styles.faqAnswer, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
          {answer}
        </Text>
      )}
    </Pressable>
  );
}

export default function HelpScreen() {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useTranslation();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const faqs = [
    { q: t.profile.faqQ1, a: t.profile.faqA1 },
    { q: t.profile.faqQ2, a: t.profile.faqA2 },
    { q: t.profile.faqQ3, a: t.profile.faqA3 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <HelpCircle size={20} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {t.profile.faq}
            </Text>
          </View>
          {faqs.map((faq, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <FAQItem
                question={faq.q}
                answer={faq.a}
                colors={colors}
                isRTL={isRTL}
              />
            </React.Fragment>
          ))}
        </View>

        {/* Contact Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <Mail size={20} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {t.profile.contactUs}
            </Text>
          </View>

          <Pressable
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            style={({ pressed }) => [
              styles.contactRow,
              { flexDirection: getRTLRowDirection(isRTL), opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Mail size={16} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactLabel, { color: colors.textMuted, textAlign: getRTLTextAlign(isRTL) }]}>
                {t.profile.contactEmail}
              </Text>
              <Text style={[styles.contactValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                {SUPPORT_EMAIL}
              </Text>
            </View>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            style={({ pressed }) => [
              styles.contactRow,
              { flexDirection: getRTLRowDirection(isRTL), opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Phone size={16} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactLabel, { color: colors.textMuted, textAlign: getRTLTextAlign(isRTL) }]}>
                {t.profile.contactPhone}
              </Text>
              <Text style={[styles.contactValue, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
                {SUPPORT_PHONE}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <Info size={20} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: getRTLTextAlign(isRTL) }]}>
              {t.profile.aboutApp}
            </Text>
          </View>
          <View style={[styles.aboutRow, { flexDirection: getRTLRowDirection(isRTL) }]}>
            <Text style={[styles.aboutLabel, { color: colors.textSecondary, textAlign: getRTLTextAlign(isRTL) }]}>
              {t.profile.appVersion}
            </Text>
            <Text style={[styles.aboutValue, { color: colors.text }]}>
              {appVersion}
            </Text>
          </View>
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
    paddingBottom: 40,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
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
  divider: {
    height: 1,
    marginVertical: 4,
  },
  // FAQ
  faqItem: {
    paddingVertical: 12,
  },
  faqHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  // Contact
  contactRow: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  contactLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  // About
  aboutRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
    fontSize: 15,
  },
  aboutValue: {
    fontSize: 15,
    fontWeight: '600',
  },
});
