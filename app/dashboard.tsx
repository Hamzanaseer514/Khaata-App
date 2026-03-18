import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { useAuth } from '@/contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Platform } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';

const { LIGHT_COLORS, DARK_COLORS } = config;

export default function DashboardScreen() {
  const { user, logout, token } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
  const styles = createStyles(COLORS, isDarkMode);

  const [isLoading, setIsLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [totalContacts, setTotalContacts] = React.useState(0);
  const [receivablesAmount, setReceivablesAmount] = React.useState(0); // friends owe you
  const [payablesAmount, setPayablesAmount] = React.useState(0); // you owe friends
  const [contactsOwingCount, setContactsOwingCount] = React.useState(0);
  const [contactsYouOweCount, setContactsYouOweCount] = React.useState(0);
  const [topOwing, setTopOwing] = React.useState<{ name: string; amount: number }[]>([]);
  const [monthlyBars, setMonthlyBars] = React.useState<{ label: string; userPaid: number; friendPaid: number; net: number; userCount: number; friendCount: number }[]>([]);
  const [balanceBuckets, setBalanceBuckets] = React.useState<{ label: string; count: number }[]>([]);
  const [rewardSummary, setRewardSummary] = React.useState<{ points: number; level: string } | null>(null);

  React.useEffect(() => {
    loadContactsAnalytics();
    loadRewardSummary();
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      loadContactsAnalytics();
      loadRewardSummary();
      return () => {};
    }, [])
  );

  const loadRewardSummary = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${config.BASE_URL}/rewards/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success) {
        setRewardSummary(data.data);
      }
    } catch (error) {
      console.error('Load reward summary error:', error);
    }
  };

  const loadContactsAnalytics = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${config.BASE_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        const contacts = data.data as { name: string; balance: number }[];
        setTotalContacts(contacts.length);

        let recv = 0; 
        let pay = 0;  
        let recvCount = 0;
        let payCount = 0;
        const owingList: { name: string; amount: number }[] = [];

        contacts.forEach((c) => {
          const bal = Number(c.balance || 0);
          if (bal > 0) {
            recv += bal;
            recvCount += 1;
            owingList.push({ name: c.name, amount: bal });
          } else if (bal < 0) {
            pay += Math.abs(bal);
            payCount += 1;
          }
        });

        owingList.sort((a, b) => b.amount - a.amount);
        setTopOwing(owingList.slice(0, 5));

        setReceivablesAmount(recv);
        setPayablesAmount(pay);
        setContactsOwingCount(recvCount);
        setContactsYouOweCount(payCount);
      }
      const resBars = await fetch(`${config.BASE_URL}/transactions/summary/monthly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const barsJson = await resBars.json();
      if (barsJson?.success) setMonthlyBars(barsJson.data || []);

      const resBuckets = await fetch(`${config.BASE_URL}/contacts/summary/buckets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bucketsJson = await resBuckets.json();
      if (bucketsJson?.success) setBalanceBuckets(bucketsJson.data?.buckets || []);
    } catch (e) {
      console.log('Dashboard analytics error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContactsAnalytics();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const modules = [
    {
      id: 'contacts',
      title: 'Contacts',
      description: 'Manage debt',
      icon: '👥',
      color: COLORS.primary,
      onPress: () => router.push('/contacts')
    },
    {
      id: 'personal-khaata',
      title: 'Personal',
      description: 'Expenses',
      icon: '📝',
      color: COLORS.success,
      onPress: () => router.push('/personal-khaata')
    },
    {
      id: 'group-khaata',
      title: 'Group',
      description: 'Split bills',
      icon: '👨‍👩‍👧‍👦',
      color: COLORS.secondary,
      onPress: () => router.push('/group-khaata')
    },
    {
      id: 'mess',
      title: 'Mess',
      description: 'Daily meals',
      icon: '🍽️',
      color: COLORS.warning,
      onPress: () => router.push('/mess')
    },
    {
      id: 'mess analytics',
      title: 'Mess Analytics',
      description: 'View detailed analytics',
      icon: '📊',
      color: '#f39c12',
      onPress: () => router.push('/mess-analytics')
    },
    {
      id: 'notifications',
      title: 'Alerts',
      description: 'Stay updated',
      icon: '📧',
      color: COLORS.info,
      onPress: () => router.push('/notifications')
    },
    // {
    //   id: 'transactions',
    //   title: 'Transactions',
    //   description: 'View transaction history',
    //   icon: '💰',
    //   color: '#27ae60',
    //   onPress: () => Alert.alert('Coming Soon', 'Transactions module will be available soon!')
    // },
    {
      id: 'reports',
      title: 'Reports',
      description: 'Export data',
      icon: '📊',
      color: COLORS.danger,
      onPress: () => router.push('/reports')
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'App settings',
      icon: '⚙️',
      color: '#95a5a6',
      onPress: () => router.push('/settings')
    }
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
          >
            <Image 
              source={require('../assets/images/avatar.png')} 
              style={styles.avatarImage} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <View style={styles.badgeRow}>
              <TouchableOpacity 
                style={styles.premiumBadge}
                onPress={() => router.push('/rewards')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name={rewardSummary?.level === 'Platinum' ? 'trophy-variant' : 'trophy'} 
                  size={12} 
                  color={isDarkMode ? '#FFD700' : '#b45309'} 
                />
                <Text style={styles.premiumBadgeText}>
                  {rewardSummary?.level?.toUpperCase() || 'SILVER'} TIER
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.miniPointsPill}
                onPress={() => router.push('/rewards')} // Points usually go to rewards history
                activeOpacity={0.7}
              >
                <Text style={styles.miniPointsText}>{rewardSummary?.points || 0} Coins</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.userName}>{user?.name} ✨</Text>
          </View>

          <TouchableOpacity 
            style={styles.headerIconButton} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Total Balance Card with Glassmorphism Effect */}
          <View style={styles.glassCard}>
            <View style={styles.glassContent}>
              <Text style={styles.cardLabel}>TOTAL OUTSTANDING</Text>
              <Text style={styles.cardValue}>Rs {formatAmount(receivablesAmount - payablesAmount)}</Text>
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.smallLabel}>RECEIVABLES</Text>
                  <Text style={[styles.smallValue, { color: COLORS.success }]}>Rs {formatAmount(receivablesAmount)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.smallLabel}>PAYABLES</Text>
                  <Text style={[styles.smallValue, { color: COLORS.danger }]}>Rs {formatAmount(payablesAmount)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.glowEffect} />
          </View>

          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.modulesGrid}>
            {modules.map((module) => (
              <TouchableOpacity
                key={module.id}
                style={[styles.moduleCard, { borderColor: module.color + '44' }]}
                onPress={module.onPress}
              >
                <View style={[styles.moduleIcon, { backgroundColor: module.color + '22' }]}>
                  <Text style={styles.moduleEmoji}>{module.icon}</Text>
                </View>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Text style={styles.moduleDescription}>{module.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statsSection}>
              {/* Top owing contacts */}
            {topOwing.length > 0 && (
              <View style={styles.topOwingSection}>
                <View style={styles.topOwingHeader}>
                  <Text style={styles.topOwingTitle}>TOP OWING</Text>
                  <TouchableOpacity onPress={() => router.push('/contacts')}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>

                {topOwing.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.premiumContactCard}
                    onPress={() => router.push({ pathname: '/contact-detail', params: { name: item.name } })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.contactCardLeft}>
                      <View style={[
                        styles.contactAvatarBorder, 
                        { borderColor: idx % 2 === 0 ? COLORS.primary : COLORS.secondary + '88' }
                      ]}>
                        <Image 
                          source={
                            idx % 3 === 0 
                              ? require('../assets/images/avatar.png') 
                              : idx % 3 === 1 
                                ? require('../assets/images/avatar_female.png') 
                                : require('../assets/images/avatar_male_2.png')
                          } 
                          style={styles.contactAvatarInner} 
                        />
                      </View>
                      <View style={styles.contactNameContainer}>
                        <Text style={styles.contactNameMain} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.contactLastSeen} numberOfLines={1}>Last active: {idx === 0 ? '2h ago' : 'Recently'}</Text>
                      </View>
                    </View>

                    <View style={styles.contactCardRight}>
                      <View style={styles.amountContainer}>
                        <Text 
                          style={[
                            styles.contactAmountLarge, 
                            { color: COLORS.text }
                          ]}
                          numberOfLines={1}
                        >
                          {formatAmount(item.amount)}
                        </Text>
                        <Text style={[styles.rsSuffix, { color: COLORS.primary }]}>RS</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.statsTitle}>Analytics Overlook</Text>

            {/* Monthly totals bar chart */}
            {monthlyBars.length > 0 && (
              <View style={styles.statCardFull}>
                <Text style={styles.cardTitle}>Monthly Transactions</Text>
                <View style={styles.barChartRow}>
                  {monthlyBars.map((m, i) => (
                    <View key={i} style={styles.barCol}>
                      <View style={styles.barStack}>
                        <View style={[styles.barStackUser, { height: getColumnHeight(m.userPaid, monthlyBars, 'userPaid') }]} />
                        <View style={[styles.barStackFriend, { height: getColumnHeight(m.friendPaid, monthlyBars, 'friendPaid') }]} />
                      </View>
                      <Text style={styles.barColLabel}>{m.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.legendText}>You</Text>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} /><Text style={styles.legendText}>Friend</Text>
                </View>
              </View>
            )}

            {/* This Month summary (You paid vs Friend paid) */}
            {monthlyBars.length > 0 && (
              <View style={styles.statCardFull}>
                <Text style={styles.cardTitle}>This Month</Text>
                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                  {renderTwoSlicePie(
                    monthlyBars[monthlyBars.length - 1].userPaid,
                    monthlyBars[monthlyBars.length - 1].friendPaid,
                    110,
                    COLORS
                  )}
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.legendText}>You paid: Rs {formatAmount(monthlyBars[monthlyBars.length - 1].userPaid)}</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
                  <Text style={styles.legendText}>Friend paid: Rs {formatAmount(monthlyBars[monthlyBars.length - 1].friendPaid)}</Text>
                </View>
                <Text style={[styles.kpiLabel, { marginTop: 6 }]}>Net (You − Friend): Rs {formatAmount(monthlyBars[monthlyBars.length - 1].net)}</Text>
              </View>
            )}

            {/* Net position sparkline (You − Friend) */}
            {monthlyBars.length > 0 && (
              <View style={styles.statCardFull}>
                <Text style={styles.cardTitle}>Net Position (You − Friend)</Text>
                <View style={styles.sparklineBox}>
                  {getSparklineSegments(monthlyBars.map(m => m.net), 240, 60).map((seg, idx) => (
                    <View key={idx} style={[styles.sparkSeg, {
                      left: seg.left,
                      top: seg.top,
                      width: seg.length,
                      transform: [{ rotateZ: `${seg.angle}rad` }],
                    }]} />
                  ))}
                  {getSparklinePoints(monthlyBars.map(m => m.net), 240, 60).map((pt, idx) => (
                    <View key={`p-${idx}`} style={[styles.sparkDot, { left: pt.x - 2, top: pt.y - 2 }]} />
                  ))}
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.legendText}>Net by month</Text>
                </View>
              </View>
            )}

            {/* Contacts overview */}
            <View style={styles.statsGrid}>
              <View style={styles.smallCard}>
                <Text style={styles.smallNumber}>{totalContacts}</Text>
                <Text style={styles.statLabel}>Total Contacts</Text>
              </View>
              <View style={styles.smallCard}>
                <Text style={styles.smallNumber}>Rs {formatAmount(receivablesAmount - payablesAmount)}</Text>
                <Text style={styles.statLabel}>Net Receivable</Text>
              </View>
            </View>

            {/* Receivables pie (Top owing vs Others) */}
            {/* {topOwing.length > 0 && (
              <View style={styles.statCardFull}>
                <Text style={styles.cardTitle}>Receivables Split</Text>
                <View style={{ alignItems: 'center' }}>
                  {renderReceivablesPie(topOwing, receivablesAmount, COLORS)}
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.legendText}>Top 5</Text>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} /><Text style={styles.legendText}>Others</Text>
                </View>
              </View>
            )} */}

            {/* Trend lines (You, Friend, Net) */}
            {/* {monthlyBars.length > 0 && (
              <View style={styles.statCardFull}>
                <Text style={styles.cardTitle}>Receivables Trend</Text>
                <View style={styles.lineChartBox}>
                  {renderMultiLineChart(monthlyBars, COLORS)}
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.legendText}>You</Text>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} /><Text style={styles.legendText}>Friend</Text>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.textMuted }]} /><Text style={styles.legendText}>Net</Text>
                </View>
              </View>
            )} */}

            {/* Balance buckets histogram */}
            {balanceBuckets.length > 0 && (
              <View style={styles.statCardFull}>
                <Text style={styles.cardTitle}>Balance Buckets</Text>
                <View style={styles.histRow}>
                  {balanceBuckets.map((b, i) => (
                    <View key={i} style={styles.histCol}>
                      <View style={styles.histBarBg}>
                        <View style={[styles.histBarFill, { height: getHistHeight(b.count, balanceBuckets) }]} />
                      </View>
                      <Text style={styles.histLabel}>{b.label}</Text>
                      <Text style={styles.histCount}>{b.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 2,
    backgroundColor: COLORS.background,
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: Platform.OS === 'ios' ? 60 : 55,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255, 215, 0, 0.15)' : '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 215, 0, 0.3)' : '#fcd34d',
  },
  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: isDarkMode ? '#FFD700' : '#b45309',
    marginLeft: 4,
    letterSpacing: 1,
  },
  miniPointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(10, 126, 164, 0.1)' : '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(10, 126, 164, 0.2)' : '#bae6fd',
    marginLeft: 6,
  },
  miniPointsText: {
    fontSize: 9,
    fontWeight: '900',
    color: isDarkMode ? '#0a7ea4' : '#0369a1',
    letterSpacing: 0.5,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitleMain: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: isDarkMode ? COLORS.primary + '66' : COLORS.primary + '33',
    padding: 2,
    zIndex: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100, // Extra padding for BottomNav
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 2,
    marginBottom: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  glassContent: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 22,
    zIndex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 16,
  },
  smallLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  smallValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  glowEffect: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
    // filter: 'blur(40px)', // Note: This might not work on all RN versions, but good for design intent
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  moduleCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleEmoji: {
    fontSize: 20,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  statsSection: {
    marginTop: 10,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  topOwingSection: {
    marginBottom: 30,
  },
  topOwingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  topOwingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  premiumContactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
  },
  contactCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactAvatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  contactNameContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  contactNameMain: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  contactLastSeen: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  contactCardRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  contactAmountLarge: {
    fontSize: 18,
    fontWeight: '800',
  },
  rsSuffix: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statCardFull: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryCol: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  kpiSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stackBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: 10,
  },
  stackBarRecv: {
    backgroundColor: COLORS.success,
  },
  stackBarPay: {
    backgroundColor: COLORS.danger,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  barName: {
    width: 80,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  barValue: {
    width: 70,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barStack: {
    width: 12,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barStackUser: {
    backgroundColor: COLORS.primary,
    width: '100%',
  },
  barStackFriend: {
    backgroundColor: COLORS.secondary,
    width: '100%',
  },
  barColLabel: {
    marginTop: 8,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    marginRight: 16,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sparklineBox: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 10,
  },
  sparkSeg: {
    position: 'absolute',
    height: 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  sparkDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  statsGrid: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: isDarkMode ? 1 : 2,
    borderColor: isDarkMode ? COLORS.surfaceLight : 'rgba(0, 0, 0, 0.1)',
  },
  smallNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  histRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  histCol: {
    alignItems: 'center',
    flex: 1,
  },
  histBarBg: {
    width: 20,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  histBarFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
  },
  histLabel: {
    marginTop: 8,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  histCount: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

function formatAmount(value: number): string {
  if (!isFinite(value as any)) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}

function getBarWidth(amount: number, list: { amount: number }[]): number {
  const max = Math.max(...list.map((i) => i.amount), 1);
  const pct = Math.max(2, Math.round((amount / max) * 100));
  return pct;
}

function getColumnHeight(value: number, rows: any[], key: 'userPaid' | 'friendPaid' | 'userCount' | 'friendCount'): number {
  const max = Math.max(...rows.map((r) => r[key]), 1);
  const h = Math.round((value / max) * 120); // 120px max height
  return Math.max(2, h);
}

function getSparklinePoints(values: number[], w: number, h: number): { x: number; y: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = w / Math.max(1, values.length - 1);
  const leftPad = 10;
  const topPad = 10;
  return values.map((v, i) => {
    const x = Math.round(i * step) + leftPad;
    const norm = (v - min) / range;
    const y = Math.round(h - norm * h) + topPad;
    return { x, y };
  });
}

function getSparklineSegments(values: number[], w: number, h: number) {
  const pts = getSparklinePoints(values, w, h);
  const segs: { left: number; top: number; length: number; angle: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    segs.push({ left: a.x, top: a.y, length, angle });
  }
  return segs;
}

// Pie chart for receivables: top 5 vs others
function renderReceivablesPie(list: { name: string; amount: number }[], total: number, COLORS: any) {
  const size = 120;
  const radius = size / 2;
  const center = radius;
  const top5 = list.slice(0, 5);
  const topSum = top5.reduce((s, x) => s + x.amount, 0);
  const others = Math.max(0, total - topSum);
  const slices = [
    { value: topSum, color: COLORS.primary },
    { value: others, color: COLORS.danger },
  ];
  const paths: { d: string; color: string }[] = [];
  const full = slices.reduce((s, x) => s + x.value, 0) || 1;
  let angleStart = -Math.PI / 2; // start at top
  slices.forEach((s) => {
    const angle = (s.value / full) * Math.PI * 2;
    const angleEnd = angleStart + angle;
    const x1 = center + radius * Math.cos(angleStart);
    const y1 = center + radius * Math.sin(angleStart);
    const x2 = center + radius * Math.cos(angleEnd);
    const y2 = center + radius * Math.sin(angleEnd);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    paths.push({ d, color: s.color });
    angleStart = angleEnd;
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>
        {paths.map((p, idx) => (
          <Path key={idx} d={p.d} fill={p.color} />
        ))}
      </G>
    </Svg>
  );
}

// Two-slice pie for this month (You vs Friend)
function renderTwoSlicePie(userPaid: number, friendPaid: number, size: number, COLORS: any) {
  const radius = size / 2;
  const center = radius;
  const total = Math.max(1, (userPaid || 0) + (friendPaid || 0));
  const slices = [
    { value: userPaid || 0, color: COLORS.primary },
    { value: friendPaid || 0, color: COLORS.secondary },
  ];
  let angleStart = -Math.PI / 2;
  const paths: { d: string; color: string }[] = [];
  slices.forEach((s) => {
    const angle = (s.value / total) * Math.PI * 2;
    const angleEnd = angleStart + angle;
    const x1 = center + radius * Math.cos(angleStart);
    const y1 = center + radius * Math.sin(angleStart);
    const x2 = center + radius * Math.cos(angleEnd);
    const y2 = center + radius * Math.sin(angleEnd);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    paths.push({ d, color: s.color });
    angleStart = angleEnd;
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>
        {paths.map((p, idx) => (
          <Path key={idx} d={p.d} fill={p.color} />
        ))}
      </G>
    </Svg>
  );
}

// Multi-line chart (You, Friend, Net) – smooth polyline approximation using segments
function renderMultiLineChart(rows: { userPaid: number; friendPaid: number; net: number }[], COLORS: any) {
  const w = 300; const h = 100; const leftPad = 12; const rightPad = 12; const topPad = 10; const bottomPad = 16;
  const width = w - leftPad - rightPad; const height = h - topPad - bottomPad;
  const values = [
    ...rows.map(r => r.userPaid),
    ...rows.map(r => r.friendPaid),
    ...rows.map(r => r.net),
  ];
  const min = Math.min(...values, 0); // baseline at 0
  const max = Math.max(...values, 1);
  const stepX = width / Math.max(1, rows.length - 1);

  const mapPoints = (arr: number[]) => arr.map((v, i) => {
    const x = leftPad + i * stepX;
    const norm = (v - min) / Math.max(1, max - min);
    const y = topPad + (height - norm * height);
    return { x, y };
  });

  const pUser = mapPoints(rows.map(r => r.userPaid));
  const pFriend = mapPoints(rows.map(r => r.friendPaid));
  const pNet = mapPoints(rows.map(r => r.net));

  const pathFromPoints = (pts: {x:number;y:number}[]) => pts.reduce((d, p, idx) => d + `${idx===0? 'M' : 'L'} ${p.x} ${p.y} `, '');

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={pathFromPoints(pUser)} stroke={COLORS.primary} strokeWidth={2} fill="none" />
      <Path d={pathFromPoints(pFriend)} stroke={COLORS.secondary} strokeWidth={2} fill="none" />
      <Path d={pathFromPoints(pNet)} stroke={COLORS.textMuted} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function getHistHeight(value: number, rows: { count: number }[]): number {
  const max = Math.max(...rows.map(r => r.count), 1);
  const h = Math.round((value / max) * 110);
  return Math.max(2, h);
}