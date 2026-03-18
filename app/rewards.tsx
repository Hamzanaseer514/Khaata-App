import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
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
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const styles = createStyles(COLORS, isDarkMode);

  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [history, setHistory] = useState<RewardHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, historyRes] = await Promise.all([
        fetch(`${config.BASE_URL}/rewards/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${config.BASE_URL}/rewards/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const summaryData = await summaryRes.json();
      const historyData = await historyRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (historyData.success) setHistory(historyData.data);
      
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Khaata Coins</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Level Card */}
        <Animated.View style={[styles.levelCard, { opacity: fadeAnim }]}>
          <MaterialCommunityIcons name="trophy-outline" size={60} color={levelColor} />
          <Text style={[styles.levelText, { color: levelColor }]}>{summary?.level.toUpperCase()} TIER</Text>
          <Text style={styles.pointsText}>{summary?.points || 0} Coins</Text>
          
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
          <Text style={styles.sectionTitle}>Daily Milestone</Text>
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneTitle}>5 Transactions Daily</Text>
              <Text style={styles.milestoneSub}>Earn bonus +50 coins</Text>
            </View>
            <View style={styles.milestoneProgress}>
              <Text style={styles.milestoneTarget}>{summary?.dailyCount || 0}/5</Text>
              <Text style={styles.milestoneStatus}>{summary?.dailyCount === 5 ? 'COMPLETED' : 'IN PROGRESS'}</Text>
            </View>
          </View>
        </View>

        {/* History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Earnings</Text>
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
  emptyText: { textAlign: 'center', color: COLORS.textMuted, marginTop: 20, fontSize: 14, fontWeight: '500' }
});
