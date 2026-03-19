import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { showError } from '@/utils/toast';
import { goBack } from '@/utils/navigation';
import React from 'react';
import { Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsOfServiceScreen() {
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const handleWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=03274025364&text=${encodeURIComponent('Hi! I have a question about Khaata Terms of Service.')}`).catch(() => showError('WhatsApp not installed'));
  };
  const handleEmail = () => {
    Linking.openURL(`mailto:khaataapp.co@gmail.com?subject=${encodeURIComponent('Terms of Service Query')}`).catch(() => showError('Unable to open email'));
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

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1c1e1f' : accent, borderBottomWidth: isDarkMode ? 1 : 0, borderColor: 'rgba(34,211,238,0.2)' }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: COLORS.textMuted }]}>Last Updated: December 2024</Text>

        <Section title="Agreement to Terms">
          <P>By downloading, installing, or using the Khaata application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the application.</P>
        </Section>

        <Section title="Use License">
          <P>We grant you a limited, non-exclusive, non-transferable license to use the Khaata application for personal, non-commercial financial management purposes. You may not modify, distribute, or create derivative works based on this application.</P>
        </Section>

        <Section title="User Accounts">
          <P>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, current, and complete information during the registration process.</P>
        </Section>

        <Section title="Financial Transactions">
          <P>Khaata is a financial management tool that helps you track transactions and split bills. You are solely responsible for the accuracy of the financial information you enter and for settling any financial obligations with other users.</P>
        </Section>

        <Section title="Prohibited Uses">
          <P>You may not use the application for any unlawful purpose, to harass or discriminate against others, to transmit harmful content, to attempt unauthorized access to systems, or to engage in any activity that could damage or impair the application.</P>
        </Section>

        <Section title="Disclaimer">
          <P>The application is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the application's reliability, availability, or fitness for a particular purpose.</P>
        </Section>

        <Section title="Limitations">
          <P>In no event shall Khaata or its developers be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the application.</P>
        </Section>

        <Section title="Governing Law">
          <P>These terms shall be governed by and construed in accordance with the laws of Pakistan, without regard to its conflict of law provisions.</P>
        </Section>

        <Section title="Termination">
          <P>We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including breach of these Terms.</P>
        </Section>

        <Section title="Contact Us">
          <P>If you have questions about these Terms of Service, contact us:</P>
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
  paragraph: { fontSize: 14, lineHeight: 21 },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  contactBtnText: { fontSize: 14, fontWeight: '700' },
});
