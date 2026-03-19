import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { showError } from '@/utils/toast';
import { goBack } from '@/utils/navigation';
import React, { useState } from 'react';
import { Linking, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ContactSupportScreen() {
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const inputBg = isDarkMode ? COLORS.background : '#f8fafc';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const [message, setMessage] = useState('');

  const handleWhatsApp = () => {
    const msg = message || 'Hello! I need help with Khaata app.';
    Linking.openURL(`whatsapp://send?phone=03274025364&text=${encodeURIComponent(msg)}`).catch(() => showError('WhatsApp not installed'));
  };
  const handleEmail = () => {
    const body = message || 'Hello,\n\nI need assistance with:\n\n';
    Linking.openURL(`mailto:khaataapp.co@gmail.com?subject=${encodeURIComponent('Khaata Support')}&body=${encodeURIComponent(body)}`).catch(() => showError('Unable to open email'));
  };
  const handleCall = () => { Linking.openURL('tel:03274025364'); };

  const handleSend = () => {
    if (!message.trim()) { showError('Please enter your message'); return; }
    handleEmail();
  };

  const CONTACTS = [
    { icon: 'logo-whatsapp' as const, color: '#25D366', title: 'WhatsApp', sub: '03274025364', desc: 'Quick responses', onPress: handleWhatsApp },
    { icon: 'mail-outline' as const, color: accent, title: 'Email', sub: 'khaataapp.co@gmail.com', desc: 'Detailed support', onPress: handleEmail },
    { icon: 'call-outline' as const, color: isDarkMode ? '#34d399' : '#10b981', title: 'Phone', sub: '03274025364', desc: 'Direct voice support', onPress: handleCall },
  ];

  const FAQS = [
    { q: 'How do I reset my password?', a: 'Go to Settings → Change Password. If locked out, contact us directly.' },
    { q: 'How do I add a new contact?', a: 'Navigate to Contacts → tap + button and enter the person\'s details.' },
    { q: 'How do I create a group transaction?', a: 'Go to Group Khaata → Create, add members, and start tracking shared expenses.' },
    { q: 'Is my financial data secure?', a: 'Yes, we use industry-standard encryption. See our Privacy Policy for details.' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1c1e1f' : accent, borderBottomWidth: isDarkMode ? 1 : 0, borderColor: 'rgba(34,211,238,0.2)' }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.06)' : '#f0f9ff', borderColor: isDarkMode ? 'rgba(34,211,238,0.15)' : '#bae6fd' }]}>
          <Ionicons name="headset-outline" size={28} color={accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.introTitle, { color: COLORS.text }]}>We're here to help!</Text>
            <Text style={[styles.introDesc, { color: COLORS.textMuted }]}>Reach out via any channel below. We typically respond within 24 hours.</Text>
          </View>
        </View>

        {/* Contact Methods */}
        <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>CONTACT METHODS</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {CONTACTS.map((c, i) => (
            <TouchableOpacity key={i} style={[styles.contactRow, i < CONTACTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]} onPress={c.onPress} activeOpacity={0.7}>
              <View style={[styles.contactIcon, { backgroundColor: `${c.color}15` }]}>
                <Ionicons name={c.icon} size={22} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactTitle, { color: COLORS.text }]}>{c.title}</Text>
                <Text style={[styles.contactSub, { color: c.color }]}>{c.sub}</Text>
                <Text style={[styles.contactDesc, { color: COLORS.textMuted }]}>{c.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#475569' : '#cbd5e1'} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Message */}
        <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>SEND A MESSAGE</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <TextInput
            style={[styles.msgInput, { backgroundColor: inputBg, borderColor, color: COLORS.text }]}
            placeholder="Describe your issue or question..."
            placeholderTextColor={COLORS.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: accent }]} onPress={handleSend}>
            <Ionicons name="send" size={18} color={isDarkMode ? '#0a0a0c' : '#fff'} />
            <Text style={[styles.sendBtnText, { color: isDarkMode ? '#0a0a0c' : '#fff' }]}>Send via Email</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>FREQUENTLY ASKED</Text>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {FAQS.map((faq, i) => (
            <View key={i} style={[styles.faqItem, i < FAQS.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
              <View style={styles.faqQRow}>
                <Ionicons name="help-circle" size={18} color={accent} />
                <Text style={[styles.faqQ, { color: COLORS.text }]}>{faq.q}</Text>
              </View>
              <Text style={[styles.faqA, { color: COLORS.textMuted }]}>{faq.a}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={[styles.footerCard, { backgroundColor: isDarkMode ? 'rgba(34,197,94,0.06)' : '#f0fdf4', borderColor: isDarkMode ? 'rgba(34,197,94,0.15)' : '#bbf7d0' }]}>
          <Ionicons name="heart" size={18} color={isDarkMode ? '#34d399' : '#10b981'} />
          <Text style={[styles.footerText, { color: COLORS.textMuted }]}>Thank you for using Khaata! We appreciate your feedback.</Text>
        </View>

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

  introCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  introTitle: { fontSize: 16, fontWeight: '700' },
  introDesc: { fontSize: 13, lineHeight: 18, marginTop: 2 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },

  card: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },

  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  contactIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  contactTitle: { fontSize: 15, fontWeight: '700' },
  contactSub: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  contactDesc: { fontSize: 11, marginTop: 2 },

  msgInput: { margin: 14, borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 110 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 14, marginBottom: 14, paddingVertical: 14, borderRadius: 12 },
  sendBtnText: { fontSize: 15, fontWeight: '700' },

  faqItem: { padding: 16 },
  faqQRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  faqQ: { fontSize: 14, fontWeight: '700', flex: 1 },
  faqA: { fontSize: 13, lineHeight: 19, paddingLeft: 26 },

  footerCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  footerText: { flex: 1, fontSize: 13, fontStyle: 'italic' },
});
