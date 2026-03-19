import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { showError } from '@/utils/toast';
import { goBack } from '@/utils/navigation';
import React from 'react';
import { Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const handleWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=03274025364&text=${encodeURIComponent('Hi! I have a question about Khaata privacy policy.')}`).catch(() => showError('WhatsApp not installed'));
  };
  const handleEmail = () => {
    Linking.openURL(`mailto:khaataapp.co@gmail.com?subject=${encodeURIComponent('Privacy Policy Query')}`).catch(() => showError('Unable to open email'));
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
      <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{title}</Text>
      {children}
    </View>
  );

  const P = ({ children }: { children: string }) => (
    <Text style={[styles.paragraph, { color: COLORS.textMuted }]}>{children}</Text>
  );

  const Sub = ({ children }: { children: string }) => (
    <Text style={[styles.subTitle, { color: COLORS.text }]}>{children}</Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1c1e1f' : accent, borderBottomWidth: isDarkMode ? 1 : 0, borderColor: 'rgba(34,211,238,0.2)' }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: COLORS.textMuted }]}>Last Updated: December 2024</Text>

        <Section title="Introduction">
          <P>At Khaata, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our financial management application.</P>
        </Section>

        <Section title="Information We Collect">
          <Sub>Personal Information</Sub>
          <P>We collect information you provide directly, such as your name, email address, and account credentials. All passwords are encrypted and stored securely.</P>
          <Sub>Financial Data</Sub>
          <P>We collect transaction records, contact information for bill splitting, and payment details essential for the core functionality of our app.</P>
          <Sub>Device Information</Sub>
          <P>We automatically collect device type, operating system, app usage statistics, and crash reports to improve our service quality.</P>
        </Section>

        <Section title="How We Use Your Information">
          <P>We use your information to provide and maintain our financial management services, process transactions, manage accounts, send notifications, improve functionality, ensure security, prevent fraud, and comply with legal obligations.</P>
        </Section>

        <Section title="Data Security">
          <P>We implement industry-standard security measures including end-to-end encryption, secure cloud storage with regular backups, multi-factor authentication options, and regular security audits. Access is limited to authorized personnel only.</P>
        </Section>

        <Section title="Data Sharing">
          <P>We do not sell, trade, or rent your personal information. We may share data only with your explicit consent, to comply with legal requirements, to protect our rights, or with trusted service providers under strict confidentiality agreements.</P>
        </Section>

        <Section title="Your Rights">
          <P>You have the right to access your personal data, correct inaccurate information, delete your account and data, export your transaction data, opt-out of non-essential communications, and withdraw consent at any time through app settings or by contacting us.</P>
        </Section>

        <Section title="Contact Us">
          <P>If you have questions about this Privacy Policy, contact us:</P>
          <View style={styles.contactRow}>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: isDarkMode ? 'rgba(37,211,102,0.1)' : '#f0fdf4' }]} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={[styles.contactBtnText, { color: '#25D366' }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.08)' : '#f0f9ff' }]} onPress={handleEmail}>
              <Ionicons name="mail-outline" size={20} color={accent} />
              <Text style={[styles.contactBtnText, { color: accent }]}>Email</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  body: { padding: 20 },
  lastUpdated: { fontSize: 12, fontWeight: '500', marginBottom: 16 },
  section: { borderRadius: 14, borderWidth: 1, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  subTitle: { fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  paragraph: { fontSize: 14, lineHeight: 21 },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  contactBtnText: { fontSize: 14, fontWeight: '700' },
});
