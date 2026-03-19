import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import BottomNav from '@/components/BottomNav';
import { showError, showSuccess } from '@/utils/toast';
import { goBack } from '@/utils/navigation';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../config/config';

interface Contact {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  email?: string;
  balance: number;
}

export default function ReportsScreen() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchContacts();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/contacts`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) { const data = await response.json(); setContacts(data.data || []); }
      else showError('Failed to fetch contacts');
    } catch (error) { console.error('Error:', error); showError('Failed to fetch contacts'); }
    finally { setLoading(false); }
  };

  const exportFile = async (url: string, fileName: string, id: string) => {
    setExporting(id);
    try {
      const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to export');
      const blob = await response.blob();
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          if (!result) throw new Error('Failed to read');
          const base64 = result.split(',')[1];
          if (!base64) throw new Error('Failed to extract');
          await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
          if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(fileUri); showSuccess('Exported!'); }
          else showSuccess(`Saved: ${fileUri}`);
        } catch (e) { showError('Failed to process file'); }
      };
      reader.onerror = () => showError('Failed to read file');
      reader.readAsDataURL(blob);
    } catch (error) { showError('Failed to export'); }
    finally { setExporting(null); }
  };

  const handleExportContact = (contactId: string, name: string, format: 'pdf' | 'csv') => {
    exportFile(`${config.BASE_URL}/reports/contact/${contactId}?format=${format}`, `${name.replace(/\s+/g, '_')}_transactions.${format}`, contactId);
  };

  const handleExportAll = (format: 'pdf' | 'csv') => {
    exportFile(`${config.BASE_URL}/reports/user?format=${format}`, `all_transactions.${format}`, 'all');
  };

  const handleWhatsApp = (contact: Contact) => {
    const phone = contact.phone.replace(/[^0-9]/g, '');
    const wp = phone.startsWith('0') ? `92${phone.slice(1)}` : phone.startsWith('92') ? phone : `92${phone}`;
    const amt = Math.abs(Math.round(contact.balance)).toLocaleString();

    let msg = '';
    if (contact.balance > 0) {
      // Contact owes you → tell them they need to pay
      msg = `Assalam o Alaikum ${contact.name},\n\nYeh aapko yaad dilana tha ke aapke mere paas *Rs ${amt}* baqaya hain jo aapne dene hain.\n\nBaraye meherbani jaldi se jaldi clear kar dein.\n\nShukriya! 🙏\n\n— Khaata App`;
    } else if (contact.balance < 0) {
      // You owe contact → confirm you know you need to pay
      msg = `Assalam o Alaikum ${contact.name},\n\nYeh confirm karna tha ke mere zimme aapke *Rs ${amt}* hain jo maine dene hain.\n\nInsha'Allah jaldi clear kar dunga.\n\nShukriya! 🙏\n\n— Khaata App`;
    } else {
      // Settled
      msg = `Assalam o Alaikum ${contact.name},\n\nYeh baat karna thi ke hamara hisab kitab bilkul barabar hai. Koi baqaya nahi hai. ✅\n\nShukriya! 🙏\n\n— Khaata App`;
    }

    Linking.openURL(`whatsapp://send?phone=${wp}&text=${encodeURIComponent(msg)}`).catch(() => showError('WhatsApp not installed'));
  };

  // Summary
  const totalReceivable = contacts.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
  const totalPayable = contacts.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);

  const renderContact = ({ item }: { item: Contact }) => {
    const id = item._id || item.id || '';
    const isExp = exporting === id;
    const balColor = item.balance >= 0 ? (isDarkMode ? '#34d399' : '#10b981') : '#ef4444';

    return (
      <Animated.View style={[styles.card, {
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
        opacity: fadeAnim, transform: [{ translateY: slideAnim }],
      }]}>
        {/* Top row: avatar + info + balance + whatsapp */}
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.1)' : 'rgba(10,126,164,0.06)' }]}>
            <Text style={[styles.avatarText, { color: accent }]}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: COLORS.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.cardPhone, { color: COLORS.textMuted }]}>{item.phone}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.cardBalance, { color: balColor }]}>
              Rs {Math.abs(Math.round(item.balance)).toLocaleString()}
            </Text>
            <Text style={[styles.cardBalanceLabel, { color: balColor }]}>
              {item.balance >= 0 ? "YOU'LL GET" : "YOU'LL GIVE"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.whatsappIcon, { backgroundColor: isDarkMode ? 'rgba(37,211,102,0.1)' : 'rgba(37,211,102,0.08)' }]}
            onPress={() => handleWhatsApp(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </TouchableOpacity>
        </View>

        {/* Bottom row: export actions */}
        <View style={[styles.cardActions, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.08)' : '#fef2f2' }]}
            onPress={() => handleExportContact(id, item.name, 'pdf')}
            disabled={isExp}
            activeOpacity={0.7}
          >
            {isExp ? <ActivityIndicator size="small" color="#ef4444" /> : (
              <>
                <Ionicons name="document-text-outline" size={15} color="#ef4444" />
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDarkMode ? 'rgba(34,197,94,0.08)' : '#f0fdf4' }]}
            onPress={() => handleExportContact(id, item.name, 'csv')}
            disabled={isExp}
            activeOpacity={0.7}
          >
            {isExp ? <ActivityIndicator size="small" color="#10b981" /> : (
              <>
                <Ionicons name="grid-outline" size={15} color={isDarkMode ? '#34d399' : '#10b981'} />
                <Text style={[styles.actionBtnText, { color: isDarkMode ? '#34d399' : '#10b981' }]}>CSV</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, { color: COLORS.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: isDarkMode ? '#1c1e1f' : accent,
        borderBottomWidth: isDarkMode ? 1 : 0, borderColor: 'rgba(34,211,238,0.2)',
      }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item._id || item.id || ''}
        renderItem={renderContact}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Summary Row */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, {
                backgroundColor: isDarkMode ? 'rgba(34,197,94,0.06)' : '#f0fdf4',
                borderColor: isDarkMode ? 'rgba(34,197,94,0.15)' : '#bbf7d0',
              }]}>
                <Ionicons name="arrow-down-circle" size={22} color={isDarkMode ? '#34d399' : '#10b981'} />
                <Text style={[styles.summaryValue, { color: isDarkMode ? '#34d399' : '#10b981' }]}>
                  Rs {Math.round(totalReceivable).toLocaleString()}
                </Text>
                <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Receivable</Text>
              </View>
              <View style={[styles.summaryCard, {
                backgroundColor: isDarkMode ? 'rgba(239,68,68,0.06)' : '#fef2f2',
                borderColor: isDarkMode ? 'rgba(239,68,68,0.15)' : '#fecaca',
              }]}>
                <Ionicons name="arrow-up-circle" size={22} color="#ef4444" />
                <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                  Rs {Math.round(totalPayable).toLocaleString()}
                </Text>
                <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Payable</Text>
              </View>
              <View style={[styles.summaryCard, {
                backgroundColor: isDarkMode ? 'rgba(34,211,238,0.06)' : '#f0f9ff',
                borderColor: isDarkMode ? 'rgba(34,211,238,0.15)' : '#bae6fd',
              }]}>
                <Ionicons name="people" size={22} color={accent} />
                <Text style={[styles.summaryValue, { color: accent }]}>{contacts.length}</Text>
                <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Contacts</Text>
              </View>
            </View>

            {/* Export All */}
            <View style={[styles.exportAllCard, {
              backgroundColor: isDarkMode ? COLORS.surface : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
            }]}>
              <View style={styles.exportAllTop}>
                <View style={[styles.exportAllIcon, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.08)' : 'rgba(10,126,164,0.06)' }]}>
                  <Ionicons name="download-outline" size={22} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exportAllTitle, { color: COLORS.text }]}>Export All</Text>
                  <Text style={[styles.exportAllDesc, { color: COLORS.textMuted }]}>Full report of all contacts</Text>
                </View>
                <View style={styles.exportAllBtns}>
                  <TouchableOpacity
                    style={[styles.exportAllBtn, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2' }]}
                    onPress={() => handleExportAll('pdf')}
                    disabled={exporting === 'all'}
                  >
                    {exporting === 'all' ? <ActivityIndicator size="small" color="#ef4444" /> :
                      <Ionicons name="document-text" size={18} color="#ef4444" />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.exportAllBtn, { backgroundColor: isDarkMode ? 'rgba(34,197,94,0.1)' : '#f0fdf4' }]}
                    onPress={() => handleExportAll('csv')}
                    disabled={exporting === 'all'}
                  >
                    {exporting === 'all' ? <ActivityIndicator size="small" color="#10b981" /> :
                      <Ionicons name="grid" size={18} color={isDarkMode ? '#34d399' : '#10b981'} />}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Section label */}
            <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>CONTACTS</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.05)' : 'rgba(10,126,164,0.05)' }]}>
              <Ionicons name="people-outline" size={60} color={isDarkMode ? 'rgba(34,211,238,0.2)' : 'rgba(10,126,164,0.2)'} />
            </View>
            <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No Contacts</Text>
            <Text style={[styles.emptyDesc, { color: COLORS.textMuted }]}>Add contacts to generate reports</Text>
          </View>
        }
      />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500' },

  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  summaryLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  // Export All
  exportAllCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  exportAllTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exportAllIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  exportAllTitle: { fontSize: 15, fontWeight: '700' },
  exportAllDesc: { fontSize: 12, marginTop: 1 },
  exportAllBtns: { flexDirection: 'row', gap: 8 },
  exportAllBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },

  // Contact Card
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 1 },
  cardPhone: { fontSize: 12 },
  cardRight: { alignItems: 'flex-end', marginRight: 10 },
  cardBalance: { fontSize: 14, fontWeight: '800' },
  cardBalanceLabel: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', marginTop: 1, letterSpacing: 0.4 },
  whatsappIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },

  cardActions: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, gap: 8, borderTopWidth: 1 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 10,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 40 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
});
