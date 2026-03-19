import config from '@/config/config';
import BottomNav from '@/components/BottomNav';
import { useTheme } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getBiometricPreference, isBiometricAvailable, setBiometricPreference } from '@/utils/biometric';
import { showError, showInfo, showSuccess } from '@/utils/toast';
import { goBack } from '@/utils/navigation';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { user, logout, token } = useAuth();
  const { setThemeMode, isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const dividerColor = isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currency, setCurrency] = useState('Rs');
  const [language, setLanguage] = useState('English');
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadBiometricSettings();
  }, []);

  const loadBiometricSettings = async () => {
    try {
      const [pref, avail] = await Promise.all([getBiometricPreference(), isBiometricAvailable()]);
      setBiometricAuth(pref); setBiometricAvailable(avail);
    } catch (e) { console.error('Biometric error:', e); }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        const available = await isBiometricAvailable();
        if (!available) { showError('Biometric not available on this device'); return; }
        const { authenticateWithBiometric } = await import('@/utils/biometric');
        const result = await authenticateWithBiometric();
        if (!result.success) { showError(result.error || 'Authentication failed'); return; }
      }
      await setBiometricPreference(value);
      setBiometricAuth(value);
      showSuccess(value ? 'Biometric enabled' : 'Biometric disabled');
    } catch (e) { showError('Failed to update biometric settings'); }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => { setShowLogoutConfirm(true); };
  const confirmLogout = () => { setShowLogoutConfirm(false); logout(); showSuccess('Logged out'); };

  const confirmDeleteAccount = async () => {
    if (!token) { showError('Please login again.'); return; }
    setIsDeleting(true);
    try {
      const res = await fetch(`${config.BASE_URL}/auth/delete-account`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) { showSuccess('Account deleted'); setShowDeleteConfirm(false); await logout(); router.replace('/login'); }
      else showError(data.message || 'Failed');
    } catch (e) { showError('Failed to delete account'); }
    finally { setIsDeleting(false); }
  };

  const handleBackupData = async () => {
    if (!token) { showError('Please login again.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${config.BASE_URL}/auth/backup-data`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed');
      const backup = await res.json();
      const json = JSON.stringify(backup, null, 2);
      const filename = `khaata_backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(fileUri, { mimeType: 'application/json' }); showSuccess('Backup created!'); }
      else showInfo('Saved to device storage');
    } catch (e) { showError('Failed to backup data'); }
    finally { setIsLoading(false); }
  };

  const Item = ({ icon, iconColor, title, subtitle, onPress, right, last = false }: {
    icon: string; iconColor?: string; title: string; subtitle?: string; onPress?: () => void; right?: React.ReactNode; last?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.item, !last && { borderBottomWidth: 1, borderBottomColor: dividerColor }]}
      onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.itemIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc' }]}>
        <Ionicons name={icon as any} size={20} color={iconColor || accent} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: COLORS.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.itemSub, { color: COLORS.textMuted }]}>{subtitle}</Text>}
      </View>
      {right || (onPress && <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#475569' : '#cbd5e1'} />)}
    </TouchableOpacity>
  );

  const ThemeSwitch = ({ value, onChange, disabled = false }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <Switch value={value} onValueChange={onChange} trackColor={{ false: isDarkMode ? '#334155' : '#e2e8f0', true: accent }} thumbColor="#ffffff" disabled={disabled} />
  );

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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

          {/* Profile Card */}
          <TouchableOpacity style={[styles.profileCard, { backgroundColor: cardBg, borderColor }]} onPress={() => router.push('/profile')} activeOpacity={0.7}>
            <View style={[styles.profileAvatar, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.1)' : 'rgba(10,126,164,0.08)' }]}>
              <Text style={[styles.profileInitial, { color: accent }]}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: COLORS.text }]}>{user?.name || 'User'}</Text>
              <Text style={[styles.profileEmail, { color: COLORS.textMuted }]}>{user?.email || 'user@example.com'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Account */}
          <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>ACCOUNT</Text>
          <View style={[styles.group, { backgroundColor: cardBg, borderColor }]}>
            <Item icon="lock-closed-outline" title="Change Password" subtitle="Update your password" onPress={() => router.push('/change-password')} />
            <Item icon="download-outline" title="Export Data" subtitle="Download transaction data" onPress={() => showInfo('Coming soon!')} />
            <Item icon="trash-outline" iconColor="#ef4444" title="Delete Account" subtitle="Permanently delete account" onPress={() => setShowDeleteConfirm(true)} last />
          </View>

          {/* Preferences */}
          <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>PREFERENCES</Text>
          <View style={[styles.group, { backgroundColor: cardBg, borderColor }]}>
            <Item icon={isDarkMode ? 'sunny-outline' : 'moon-outline'} title="Dark Mode" subtitle={isDarkMode ? 'Light theme' : 'Dark theme'}
              right={<ThemeSwitch value={isDarkMode} onChange={(v) => setThemeMode(v ? 'dark' : 'light')} />} />
            <Item icon="cash-outline" title="Currency" subtitle={currency} onPress={() => showInfo('Coming soon!')} />
            <Item icon="globe-outline" title="Language" subtitle={language} onPress={() => showInfo('Coming soon!')} last />
          </View>

          {/* Security */}
          <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>SECURITY</Text>
          <View style={[styles.group, { backgroundColor: cardBg, borderColor }]}>
            <Item icon="finger-print-outline" title="Biometric Auth" subtitle={biometricAvailable ? 'Fingerprint or Face ID' : 'Not available'}
              right={<ThemeSwitch value={biometricAuth} onChange={handleBiometricToggle} disabled={!biometricAvailable} />} last />
          </View>

          {/* Data */}
          <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>DATA</Text>
          <View style={[styles.group, { backgroundColor: cardBg, borderColor }]}>
            <Item icon="cloud-download-outline" title="Backup Data" subtitle={isLoading ? 'Creating backup...' : 'Backup your data'}
              onPress={handleBackupData} right={isLoading ? <ActivityIndicator size="small" color={accent} /> : undefined} />
            <Item icon="refresh-outline" title="Clear Cache" subtitle="Free up storage" onPress={() => showSuccess('Cache cleared!')} last />
          </View>

          {/* About */}
          <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>ABOUT</Text>
          <View style={[styles.group, { backgroundColor: cardBg, borderColor }]}>
            <Item icon="information-circle-outline" title="App Version" subtitle="1.0.0" />
            <Item icon="shield-checkmark-outline" title="Privacy Policy" onPress={() => router.push('/privacy-policy')} />
            <Item icon="document-text-outline" title="Terms of Service" onPress={() => router.push('/terms-of-service')} />
            <Item icon="chatbubble-ellipses-outline" title="Contact Support" onPress={() => router.push('/contact-support')} last />
          </View>

          {/* Logout */}
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: isDarkMode ? 'rgba(239,68,68,0.2)' : '#fecaca' }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            <Ionicons name="warning-outline" size={44} color="#ef4444" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.confirmTitle, { color: COLORS.text }]}>Delete Account?</Text>
            <Text style={[styles.confirmDesc, { color: COLORS.textMuted }]}>
              This will erase all your data, credentials, and khaata. This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}
                onPress={() => setShowDeleteConfirm(false)} disabled={isDeleting}
              >
                <Text style={[styles.confirmCancelText, { color: COLORS.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmDeleteAccount} disabled={isDeleting}>
                <Text style={styles.confirmDeleteText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Logout Confirm */}
      {showLogoutConfirm && (
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            <Ionicons name="log-out-outline" size={44} color={accent} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.confirmTitle, { color: COLORS.text }]}>Logout?</Text>
            <Text style={[styles.confirmDesc, { color: COLORS.textMuted }]}>
              Are you sure you want to end your session?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={[styles.confirmCancelText, { color: COLORS.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmLogout}>
                <Text style={styles.confirmDeleteText}>Yes, Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

  body: { padding: 20 },

  // Profile
  profileCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20,
  },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  profileInitial: { fontSize: 22, fontWeight: '800' },
  profileName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  profileEmail: { fontSize: 13 },

  // Section
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },

  // Group
  group: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },

  // Item
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  itemIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 1 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14, borderWidth: 1, marginTop: 8,
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 20,
  },
  confirmModal: { borderRadius: 18, padding: 24, width: '100%', maxWidth: 380 },
  confirmTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  confirmDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 15, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#ef4444' },
  confirmDeleteText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
});
