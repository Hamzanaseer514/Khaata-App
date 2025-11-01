import config from '@/config/config';
import { useAuth } from '@/contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

export default function DashboardScreen() {
  const { user, logout, token } = useAuth();

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

  React.useEffect(() => {
    loadContactsAnalytics();
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      // Auto-refresh whenever dashboard regains focus
      loadContactsAnalytics();
      return () => {};
    }, [])
  );

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

        let recv = 0; // positive balances
        let pay = 0;  // negative balances (absolute)
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
      // fetch monthly summary for bar chart
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
      description: 'Manage your contacts',
      icon: '👥',
      color: '#3498db',
      onPress: () => router.push('/contacts')
    },
    {
      id: 'personal-khaata',
      title: 'Personal Khaata',
      description: 'Track your income & expenses',
      icon: '📝',
      color: '#16a085',
      onPress: () => router.push('/personal-khaata')
    },
    {
      id: 'group-khaata',
      title: 'Group Khaata',
      description: 'Split bills with friends',
      icon: '👨‍👩‍👧‍👦',
      color: '#9b59b6',
      onPress: () => router.push('/group-khaata')
    },
    {
      id: 'mess',
      title: 'Mess Attendance',
      description: 'Track daily meals & billing',
      icon: '🍽️',
      color: '#f39c12',
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
      title: 'Notifications',
      description: 'Email notifications & alerts',
      icon: '📧',
      color: '#20B2AA',
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
      description: 'Export transactions & reports',
      icon: '📊',
      color: '#e74c3c',
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
    <ScrollView style={styles.container} refreshControl={undefined /* pull-to-refresh via onRefresh if needed in future */}>
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}!</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Dashboard</Text>
        <Text style={styles.sectionSubtitle}>Choose a module to get started</Text>

        <View style={styles.modulesGrid}>
          {modules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={[styles.moduleCard, { borderLeftColor: module.color }]}
              onPress={module.onPress}
            >
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleEmoji}>{module.icon}</Text>
              </View>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Text style={styles.moduleDescription}>{module.description}</Text>
              </View>
              <View style={styles.moduleArrow}>
                <Text style={styles.arrowText}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Analytics</Text>

          {/* Outstanding summary card */}
          <View style={styles.statCardFull}>
            <Text style={styles.cardTitle}>Outstanding Summary</Text>
            <View style={styles.rowBetween}>
              <View style={styles.summaryCol}>
                <Text style={styles.kpiLabel}>Receivables</Text>
                <Text style={styles.kpiValue}>₹{formatAmount(receivablesAmount)}</Text>
                <Text style={styles.kpiSub}>{contactsOwingCount} contacts</Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.kpiLabel}>Payables</Text>
                <Text style={styles.kpiValue}>₹{formatAmount(payablesAmount)}</Text>
                <Text style={styles.kpiSub}>{contactsYouOweCount} contacts</Text>
              </View>
            </View>
            {/* Stacked bar */}
            <View style={styles.stackBarBg}>
              <View style={[styles.stackBarRecv, { flex: receivablesAmount || 0 }]} />
              <View style={[styles.stackBarPay, { flex: payablesAmount || 0 }]} />
            </View>
          </View>

          {/* Top owing contacts */}
          {topOwing.length > 0 && (
            <View style={styles.statCardFull}>
              <Text style={styles.cardTitle}>Top Owing Contacts</Text>
              {topOwing.map((item, idx) => (
                <View key={idx} style={styles.barRow}>
                  <Text style={styles.barName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: getBarWidth(item.amount, topOwing) }]} />
                  </View>
                  <Text style={styles.barValue}>₹{formatAmount(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}

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
                <View style={[styles.legendDot, { backgroundColor: '#20B2AA' }]} /><Text style={styles.legendText}>You</Text>
                <View style={[styles.legendDot, { backgroundColor: '#f39c12' }]} /><Text style={styles.legendText}>Friend</Text>
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
                  110
                )}
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#20B2AA' }]} />
                <Text style={styles.legendText}>You paid: ₹{formatAmount(monthlyBars[monthlyBars.length - 1].userPaid)}</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#f39c12' }]} />
                <Text style={styles.legendText}>Friend paid: ₹{formatAmount(monthlyBars[monthlyBars.length - 1].friendPaid)}</Text>
              </View>
              <Text style={[styles.kpiLabel, { marginTop: 6 }]}>Net (You − Friend): ₹{formatAmount(monthlyBars[monthlyBars.length - 1].net)}</Text>
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
                <View style={[styles.legendDot, { backgroundColor: '#20B2AA' }]} />
                <Text style={styles.legendText}>Net by month</Text>
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
              <Text style={styles.smallNumber}>₹{formatAmount(receivablesAmount - payablesAmount)}</Text>
              <Text style={styles.statLabel}>Net Receivable</Text>
            </View>
          </View>

          {/* Receivables pie (Top owing vs Others) */}
          {topOwing.length > 0 && (
            <View style={styles.statCardFull}>
              <Text style={styles.cardTitle}>Receivables Split</Text>
              <View style={{ alignItems: 'center' }}>
                {renderReceivablesPie(topOwing, receivablesAmount)}
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#20B2AA' }]} /><Text style={styles.legendText}>Top 5</Text>
                <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} /><Text style={styles.legendText}>Others</Text>
              </View>
            </View>
          )}

          {/* Trend lines (You, Friend, Net) */}
          {/* {monthlyBars.length > 0 && (
            <View style={styles.statCardFull}>
              <Text style={styles.cardTitle}>Receivables Trend</Text>
              <View style={styles.lineChartBox}>
                {renderMultiLineChart(monthlyBars)}
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#20B2AA' }]} /><Text style={styles.legendText}>You</Text>
                <View style={[styles.legendDot, { backgroundColor: '#f39c12' }]} /><Text style={styles.legendText}>Friend</Text>
                <View style={[styles.legendDot, { backgroundColor: '#34495e' }]} /><Text style={styles.legendText}>Net</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#20B2AA',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  modulesGrid: {
    marginBottom: 30,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moduleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  moduleEmoji: {
    fontSize: 24,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  moduleArrow: {
    marginLeft: 10,
  },
  arrowText: {
    fontSize: 24,
    color: '#bdc3c7',
    fontWeight: 'bold',
  },
  statsSection: {
    marginTop: 20,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCardFull: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  smallCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  rowBetween: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryCol: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#20B2AA',
  },
  kpiSub: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  stackBarBg: {
    width: '100%',
    height: 10,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  stackBarRecv: {
    backgroundColor: '#27ae60',
  },
  stackBarPay: {
    backgroundColor: '#e74c3c',
  },
  barRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  barName: {
    width: 90,
    fontSize: 12,
    color: '#2c3e50',
  },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
  },
  barValue: {
    width: 80,
    textAlign: 'right',
    fontSize: 12,
    color: '#2c3e50',
  },
  smallNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 5,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginTop: 6,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barStack: {
    width: 16,
    height: 100,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barStackUser: {
    backgroundColor: '#20B2AA',
    width: '100%',
  },
  barStackFriend: {
    backgroundColor: '#f39c12',
    width: '100%',
  },
  barColLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#2c3e50',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    marginRight: 12,
    fontSize: 12,
    color: '#7f8c8d',
  },
  lineChartBox: {
    width: '100%',
    height: 140,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 8,
  },
  histRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  histCol: {
    alignItems: 'center',
    width: 56,
  },
  histBarBg: {
    width: 26,
    height: 110,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  histBarFill: {
    width: '100%',
    backgroundColor: '#20B2AA',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  histLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#2c3e50',
  },
  histCount: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginTop: 6,
  },
  lineCol: {
    alignItems: 'center',
    flex: 1,
  },
  lineBox: {
    width: 14,
    height: 100,
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  lineUser: {
    width: 5,
    backgroundColor: '#20B2AA',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    alignSelf: 'flex-start',
  },
  lineFriend: {
    width: 5,
    backgroundColor: '#f39c12',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    alignSelf: 'flex-end',
    marginLeft: 4,
  },
  sparklineBox: {
    width: 240,
    height: 60,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  sparkSeg: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#20B2AA',
  },
  sparkDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#20B2AA',
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
function renderReceivablesPie(list: { name: string; amount: number }[], total: number) {
  const size = 120;
  const radius = size / 2;
  const center = radius;
  const top5 = list.slice(0, 5);
  const topSum = top5.reduce((s, x) => s + x.amount, 0);
  const others = Math.max(0, total - topSum);
  const slices = [
    { value: topSum, color: '#20B2AA' },
    { value: others, color: '#e74c3c' },
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
function renderTwoSlicePie(userPaid: number, friendPaid: number, size: number) {
  const radius = size / 2;
  const center = radius;
  const total = Math.max(1, (userPaid || 0) + (friendPaid || 0));
  const slices = [
    { value: userPaid || 0, color: '#20B2AA' },
    { value: friendPaid || 0, color: '#f39c12' },
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
function renderMultiLineChart(rows: { userPaid: number; friendPaid: number; net: number }[]) {
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
      <Path d={pathFromPoints(pUser)} stroke="#20B2AA" strokeWidth={2} fill="none" />
      <Path d={pathFromPoints(pFriend)} stroke="#f39c12" strokeWidth={2} fill="none" />
      <Path d={pathFromPoints(pNet)} stroke="#34495e" strokeWidth={2} fill="none" />
    </Svg>
  );
}

function getHistHeight(value: number, rows: { count: number }[]): number {
  const max = Math.max(...rows.map(r => r.count), 1);
  const h = Math.round((value / max) * 110);
  return Math.max(2, h);
}
