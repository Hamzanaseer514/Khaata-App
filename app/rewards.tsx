import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { goBack } from '@/utils/navigation';
import { tapHaptic, successHaptic } from '@/utils/haptics';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';

const { width } = Dimensions.get('window');

interface RewardSummary {
  points: number;
  level: string;
  dailyCount: number;
  nextMilestone: number;
}

interface RewardHistory {
  _id: string;
  points: number;
  reason: string;
  createdAt: string;
}

export default function RewardsScreen() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const styles = createStyles(COLORS, isDarkMode);

  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [history, setHistory] = useState<RewardHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayShares, setTodayShares] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [totalShares, setTotalShares] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, historyRes, shareRes] = await Promise.all([
        fetch(`${config.BASE_URL}/rewards/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${config.BASE_URL}/rewards/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${config.BASE_URL}/rewards/share-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null),
      ]);

      const summaryData = await summaryRes.json();
      const historyData = await historyRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (historyData.success) setHistory(historyData.data);

      if (shareRes) {
        const shareData = await shareRes.json();
        if (shareData.success) {
          setTodayShares(shareData.data.todayShares);
          setTotalShares(shareData.data.totalShares);
        }
      }
      
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      
      if (summaryData.data) {
        const progress = Math.min(summaryData.data.points / 1000, 1);
        Animated.timing(progressAnim, { toValue: progress, duration: 1500, useNativeDriver: false }).start();
      }
    } catch (error) {
      console.error('Fetch rewards error:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareApp = async () => {
    setIsSharing(true);
    try {
      const result = await Share.share({
        message: 'Try KhaataWise - the smartest way to track money with friends! Download now: https://play.google.com/store/apps/details?id=com.khaata.app',
        title: 'KhaataWise - Smart Ledger App',
      });

      if (result.action === Share.sharedAction) {
        // User actually shared - award points
        const res = await fetch(`${config.BASE_URL}/rewards/share`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.success) {
          if (data.data.pointsAwarded > 0) {
            successHaptic();
            showSuccess(`+${data.data.pointsAwarded} coins earned!`);
            setSummary(prev => prev ? { ...prev, points: data.data.points, level: data.data.level } : prev);
            setTodayShares(data.data.todayShares);
            fetchData(); // refresh history
          } else {
            showSuccess(data.message);
          }
        }
      }
    } catch (e) {
      console.error('Share error:', e);
    } finally {
      setIsSharing(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: RewardHistory }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyIcon}>
        <MaterialCommunityIcons name="star-circle" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyReason}>{item.reason}</Text>
        <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.historyPoints}>+{item.points}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const levelColor = summary?.level === 'Platinum' ? '#e5e7eb' : summary?.level === 'Gold' ? '#fbbf24' : '#94a3b8';

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.topGlow} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('rewards.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Level Card */}
        <Animated.View style={[styles.levelCard, { opacity: fadeAnim }]}>
          <MaterialCommunityIcons name="trophy-outline" size={60} color={levelColor} />
          <Text style={[styles.levelText, { color: levelColor }]}>{summary?.level.toUpperCase()} TIER</Text>
          <Text style={styles.pointsText}>{summary?.points || 0} {t('rewards.coins')}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }),
                    backgroundColor: levelColor
                  }
                ]} 
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>0</Text>
              <Text style={styles.progressLabel}>1000 to Platinum</Text>
            </View>
          </View>
        </Animated.View>

        {/* Milestone Tracker */}
        <View style={styles.milestoneSection}>
          <Text style={styles.sectionTitle}>{t('rewards.dailyMilestone')}</Text>
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneTitle}>{t('rewards.fiveTransactions')}</Text>
              <Text style={styles.milestoneSub}>{t('rewards.earnBonus')}</Text>
            </View>
            <View style={styles.milestoneProgress}>
              <Text style={styles.milestoneTarget}>{summary?.dailyCount || 0}/5</Text>
              <Text style={styles.milestoneStatus}>{summary?.dailyCount === 5 ? t('rewards.completed') : t('rewards.inProgress')}</Text>
            </View>
          </View>
        </View>

        {/* Share & Earn */}
        <View style={styles.milestoneSection}>
          <Text style={styles.sectionTitle}>Share & Earn</Text>
          <View style={[styles.shareCard, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.06)' : '#f0f9ff', borderColor: isDarkMode ? 'rgba(34,211,238,0.15)' : '#bae6fd' }]}>
            <View style={styles.shareCardTop}>
              <View style={[styles.shareIconWrap, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="gift-outline" size={28} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.milestoneTitle, { color: COLORS.text }]}>Share KhaataWise</Text>
                <Text style={[styles.milestoneSub, { color: COLORS.textMuted }]}>Earn 10 coins per share (max 5/day)</Text>
              </View>
            </View>

            {/* Progress dots */}
            <View style={styles.shareDots}>
              {[0, 1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.shareDot, {
                  backgroundColor: i < todayShares ? COLORS.primary : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                }]}>
                  {i < todayShares && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              ))}
              <Text style={[styles.shareProgress, { color: COLORS.textMuted }]}>{todayShares}/5 today</Text>
            </View>

            {/* Share button */}
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: COLORS.primary, opacity: isSharing || todayShares >= 5 ? 0.5 : 1 }]}
              onPress={shareApp}
              disabled={isSharing || todayShares >= 5}
              activeOpacity={0.8}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={20} color="#fff" />
                  <Text style={styles.shareBtnText}>{todayShares >= 5 ? 'Come back tomorrow!' : 'Share & Earn 10 Coins'}</Text>
                </>
              )}
            </TouchableOpacity>

            {totalShares > 0 && (
              <Text style={[styles.shareStats, { color: COLORS.textMuted }]}>
                Total shares: {totalShares} · Earned: {totalShares * 10} coins
              </Text>
            )}
          </View>
        </View>

        {/* History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t('rewards.recentEarnings')}</Text>
          {history.length > 0 ? (
            history.map(item => (
              <View key={item._id}>{renderHistoryItem({ item })}</View>
            ))
          ) : (
            <Text style={styles.emptyText}>No earnings yet. Start adding transactions!</Text>
          )}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const createStyles = (COLORS: any, isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  topGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary + '11',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  levelCard: {
    margin: 20,
    padding: 30,
    borderRadius: 32,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  levelText: { fontSize: 12, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
  pointsText: { fontSize: 42, fontWeight: '900', color: COLORS.text, marginVertical: 10 },
  progressContainer: { width: '100%', marginTop: 20 },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  milestoneSection: { paddingHorizontal: 20, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: 15 },
  milestoneCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '11',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.primary + '22',
  },
  milestoneInfo: { flex: 1 },
  milestoneTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  milestoneSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  milestoneProgress: { alignItems: 'flex-end' },
  milestoneTarget: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  milestoneStatus: { fontSize: 8, fontWeight: '900', color: COLORS.primary, marginTop: 2 },
  historySection: { paddingHorizontal: 20, marginTop: 30, paddingBottom: 120 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '11',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  historyInfo: { flex: 1 },
  historyReason: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  historyDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  historyPoints: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 20, fontSize: 14, fontWeight: '500' },
  shareCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginTop: 12 },
  shareCardTop: { flexDirection: 'row', alignItems: 'center' },
  shareIconWrap: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  shareDots: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 16 },
  shareDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  shareProgress: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  shareStats: { textAlign: 'center', fontSize: 11, fontWeight: '600', marginTop: 12 }
});
