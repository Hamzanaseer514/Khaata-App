import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, logout, token } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const styles = createStyles(COLORS, isDarkMode);

  const [summary, setSummary] = React.useState<{ points: number; level: string } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to exit your session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            await logout();
            router.replace('/login');
          } 
        }
      ]
    );
  };

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
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
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
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarGlow} />
            <View style={styles.avatarContainer}>
              <Image 
                source={require('../assets/images/avatar.png')} 
                style={styles.avatarImage} 
              />
            </View>
            <View style={styles.badgeContainer}>
              <MaterialCommunityIcons name="check-decagram" size={24} color="#FFD700" />
            </View>
          </View>

          <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
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
            <Text style={[styles.statLabel, { color: '#22c55e' }]}>MEMBER SINCE</Text>
            <Text style={styles.statValue}>{memberSince}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' }]}>
            <Text style={[styles.statLabel, { color: '#3b82f6' }]}>ACCOUNT TYPE</Text>
            <Text style={styles.statValue}>{user?.role?.toUpperCase() || 'USER'}</Text>
          </View>
        </Animated.View>

        {/* Action List */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/rewards')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
              <MaterialCommunityIcons name="trophy-outline" size={20} color="#FFD700" />
            </View>
            <Text style={styles.actionText}>My Rewards</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/change-password')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#6366f1" />
            </View>
            <Text style={styles.actionText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/notifications')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(10, 126, 164, 0.1)' }]}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/settings')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>Settings & Privacy</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Khaata Wise v1.0.4</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for financial clarity</Text>
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const createStyles = (COLORS: any, isDarkMode: boolean) => StyleSheet.create({
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
    backgroundColor: COLORS.primary + '22',
    borderWidth: 2,
    borderColor: COLORS.primary + '44',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    padding: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
    borderRadius: 15,
    padding: 2,
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
  }
});
