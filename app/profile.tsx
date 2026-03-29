import { tapHaptic, warningHaptic, successHaptic } from '@/utils/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { goBack } from '@/utils/navigation';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import BottomNav from '@/components/BottomNav';
import { TEMPLATES } from '@/app/visiting-card';
import { CustomCard, CardWatermark } from '@/components/CustomCardBuilder';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, logout, token, updateUser } = useAuth();
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const styles = createStyles(COLORS, isDarkMode, accent);

  const [summary, setSummary] = React.useState<{ points: number; level: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const savedCardRef = useRef<any>(null);

  const shareProfileCard = async () => {
    try {
      const uri = await captureRef(savedCardRef, { format: 'png', quality: 1 });
      const file = `${FileSystem.documentDirectory}visiting_card_share.png`;
      await FileSystem.copyAsync({ from: uri, to: file });
      await Sharing.shareAsync(file, { mimeType: 'image/png', dialogTitle: 'Share Visiting Card' });
    } catch (e) {
      console.error('Share card error:', e);
    }
  };
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    fetchRewardSummary();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchRewardSummary = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${config.BASE_URL}/rewards/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setSummary(data.data);
    } catch (error) {
      console.error('Fetch rewards error:', error);
    }
  };

  const pickAndUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError('Permission to access gallery is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled || !result.assets || !result.assets[0]) return;

    const asset = result.assets[0];
    const localUri = asset.uri;

    // Show local preview immediately while uploading
    await updateUser({ profilePicture: localUri });
    setIsUploading(true);

    try {
      // Convert image to base64 for reliable upload on Vercel serverless
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const uploadRes = await fetch(`${config.BASE_URL}/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64: `data:image/jpeg;base64,${base64}` }),
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        showError(uploadData.message || 'Upload failed');
        return;
      }

      const cloudUrl = uploadData.data.url;

      // Save to user profile
      const profileRes = await fetch(`${config.BASE_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profilePicture: cloudUrl }),
      });
      const profileData = await profileRes.json();

      if (profileData.success) {
        await updateUser({ profilePicture: cloudUrl });
        successHaptic();
        showSuccess('Profile picture updated!');
      } else {
        showError(profileData.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Profile picture update error:', error?.message || error);
      showError('Failed to update profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => { warningHaptic(); setShowLogoutConfirm(true); };
  const confirmLogout = async () => { setShowLogoutConfirm(false); await logout(); router.replace('/login'); };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'March 2026';

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Background Decor */}
      <View style={styles.topGlow} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => goBack()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <TouchableOpacity style={styles.editButton} activeOpacity={0.7} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.avatarWrapper}
            activeOpacity={0.8}
            onPress={pickAndUploadImage}
            disabled={isUploading}
          >
            <View style={styles.avatarGlow} />
            <View style={styles.avatarContainer}>
              {isUploading ? (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color={accent} />
                </View>
              ) : user?.profilePicture ? (
                <Image
                  source={{ uri: user.profilePicture }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Image
                  source={require('../assets/images/avatar.png')}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              )}
            </View>
            {/* Camera badge */}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name || t('profile.guestUser')}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@khaata-wise.com'}</Text>

          <TouchableOpacity
            style={[styles.rewardBadge, { borderColor: summary?.level === 'Platinum' ? '#e5e7eb' : summary?.level === 'Gold' ? '#fbbf24' : '#94a3b8' }]}
            onPress={() => router.push('/rewards')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={summary?.level === 'Platinum' ? 'trophy-variant' : 'trophy'}
              size={14}
              color={summary?.level === 'Platinum' ? '#94a3b8' : summary?.level === 'Gold' ? '#b8860b' : '#64748b'}
            />
            <Text style={[styles.rewardBadgeText, { color: summary?.level === 'Platinum' ? '#94a3b8' : summary?.level === 'Gold' ? '#b8860b' : '#64748b' }]}>
              {summary?.level?.toUpperCase() || 'SILVER'} TIER
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View
          style={[
            styles.statsRow,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : '#ecfdf5' }]}>
            <Text style={[styles.statLabel, { color: '#22c55e' }]}>{t('profile.memberSince')}</Text>
            <Text style={styles.statValue}>{memberSince}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' }]}>
            <Text style={[styles.statLabel, { color: '#3b82f6' }]}>{t('profile.accountType')}</Text>
            <Text style={styles.statValue}>{user?.role?.toUpperCase() || 'USER'}</Text>
          </View>
        </Animated.View>

        {/* Saved Visiting Card - Exact same design user created */}
        {user?.visitingCard ? (
          <Animated.View style={[{ paddingHorizontal: 20, marginTop: 30, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={styles.sectionTitle}>{t('profile.myVisitingCard')}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={shareProfileCard}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
                >
                  <Ionicons name="share-outline" size={14} color={accent} />
                  <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>{t('common.share')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/visiting-card')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
                >
                  <Ionicons name="create-outline" size={14} color={accent} />
                  <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>{t('common.edit')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View ref={savedCardRef} collapsable={false}>
              {(user.visitingCard as any)?.isCustom ? (
                <CustomCard
                  data={(user.visitingCard as any).cardData}
                  design={(user.visitingCard as any).customDesign}
                />
              ) : (() => {
                const tmpl = TEMPLATES.find(t => t.id === (user.visitingCard as any)?.templateId);
                const CardComp = tmpl?.Component;
                return CardComp ? (
                  <View style={{ position: 'relative' }}>
                    <CardComp data={(user.visitingCard as any).cardData} isDark={isDarkMode} />
                    <CardWatermark light={!isDarkMode} />
                  </View>
                ) : null;
              })()}
            </View>
          </Animated.View>
        ) : null}

        {/* Action List */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>{t('profile.accountSettings')}</Text>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/visiting-card')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(217, 119, 6, 0.1)' }]}>
              <Ionicons name="card-outline" size={20} color="#d97706" />
            </View>
            <Text style={styles.actionText}>{user?.visitingCard ? t('profile.editVisitingCard') : t('profile.createVisitingCard')}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/rewards')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
              <MaterialCommunityIcons name="trophy-outline" size={20} color="#FFD700" />
            </View>
            <Text style={styles.actionText}>{t('profile.myRewards')}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/change-password')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#6366f1" />
            </View>
            <Text style={styles.actionText}>{t('profile.changePassword')}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/notifications')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(10, 126, 164, 0.1)' }]}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>{t('profile.notifications')}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/settings')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>{t('profile.settingsPrivacy')}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.actionText, { color: '#ef4444' }]}>{t('profile.signOut')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Khaata Wise v1.0.4</Text>
          <Text style={styles.footerSubtext}>Made with love for financial clarity</Text>
        </View>
      </ScrollView>

      {/* Logout Confirm */}
      {showLogoutConfirm && (
        <View style={styles.logoutOverlay}>
          <View style={[styles.logoutModal, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            <Ionicons name="log-out-outline" size={44} color={accent} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.logoutTitle, { color: COLORS.text }]}>{t('profile.logout')}</Text>
            <Text style={[styles.logoutDesc, { color: COLORS.textMuted }]}>Are you sure you want to end your session?</Text>
            <View style={styles.logoutActions}>
              <TouchableOpacity
                style={[styles.logoutCancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={[styles.logoutCancelText, { color: COLORS.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutConfirmBtn} onPress={confirmLogout}>
                <Text style={styles.logoutConfirmText}>{t('profile.yesLogout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <BottomNav />
    </View>
  );
}

const createStyles = (COLORS: any, isDarkMode: boolean, accent: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  topGlow: {
    position: 'absolute',
    top: -height * 0.2,
    right: -width * 0.2,
    width: width,
    height: width,
    borderRadius: width / 2,
    backgroundColor: isDarkMode ? 'rgba(10, 126, 164, 0.15)' : 'rgba(10, 126, 164, 0.05)',
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  editButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 70,
    backgroundColor: accent + '22',
    borderWidth: 2,
    borderColor: accent + '44',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderWidth: 2,
    borderColor: accent,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  uploadingOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: isDarkMode ? COLORS.background : '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 16,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255, 215, 0, 0.05)' : '#fffadd',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  rewardBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 35,
    gap: 15,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  actionSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#fff',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
  },
  logoutItem: {
    marginTop: 10,
    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.05)' : '#fef2f2',
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    opacity: 0.7,
  },
  logoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 20,
  },
  logoutModal: { borderRadius: 18, padding: 24, width: '100%', maxWidth: 380 },
  logoutTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  logoutDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  logoutActions: { flexDirection: 'row', gap: 10 },
  logoutCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  logoutCancelText: { fontSize: 15, fontWeight: '600' },
  logoutConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#ef4444' },
  logoutConfirmText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
});
