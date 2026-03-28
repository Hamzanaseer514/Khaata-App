import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { showError } from '@/utils/toast';
import { router, useFocusEffect } from 'expo-router';
import { goBack } from '@/utils/navigation';
import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../config/config';
import BottomNav from '@/components/BottomNav';

interface Notification {
  id: string;
  transactionId: string;
  contactName: string;
  contactEmail: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt: string | null;
  createdAt: string;
  transactionDetails: {
    amount: number;
    payer: string;
    note: string;
    createdAt: string;
  } | null;
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const { currency: cur } = useCurrency();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'sent' | 'pending' | 'failed'>('all');

  useEffect(() => { fetchNotifications(); }, []);
  useFocusEffect(useCallback(() => { fetchNotifications(); }, []));

  const fetchNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const response = await fetch(`${config.BASE_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) setNotifications(data.data);
      else showError(data.message || 'Failed to fetch notifications');
    } catch (error) { console.error('Error:', error); showError('Failed to fetch notifications'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const filtered = activeFilter === 'all' ? notifications : notifications.filter(n => n.status === activeFilter);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'sent': return { color: isDarkMode ? '#34d399' : '#10b981', icon: 'checkmark-circle' as const, label: 'SENT' };
      case 'pending': return { color: isDarkMode ? '#fbbf24' : '#f59e0b', icon: 'time' as const, label: 'PENDING' };
      case 'failed': return { color: '#ef4444', icon: 'close-circle' as const, label: 'FAILED' };
      default: return { color: COLORS.textMuted, icon: 'mail-outline' as const, label: status.toUpperCase() };
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const counts = { all: notifications.length, sent: notifications.filter(n => n.status === 'sent').length, pending: notifications.filter(n => n.status === 'pending').length, failed: notifications.filter(n => n.status === 'failed').length };

  const renderItem = ({ item }: { item: Notification }) => {
    const status = getStatusInfo(item.status);
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, { color: COLORS.text }]}>{item.contactName}</Text>
            <Text style={[styles.cardEmail, { color: COLORS.textMuted }]}>{item.contactEmail}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={[styles.cardMessage, { color: COLORS.text }]} numberOfLines={2}>{item.message}</Text>

        {item.transactionDetails && (
          <View style={[styles.txDetails, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderColor }]}>
            <View style={styles.txRow}>
              <Text style={[styles.txLabel, { color: COLORS.textMuted }]}>{t('notifications.amount')}</Text>
              <Text style={[styles.txValue, { color: accent }]}>{cur.symbol} {item.transactionDetails.amount}</Text>
            </View>
            <View style={styles.txRow}>
              <Text style={[styles.txLabel, { color: COLORS.textMuted }]}>{t('notifications.type')}</Text>
              <Text style={[styles.txValue, { color: COLORS.text }]}>
                {item.transactionDetails.payer === 'USER' ? t('notifications.debit') : t('notifications.credit')}
              </Text>
            </View>
            {item.transactionDetails.note ? (
              <View style={styles.txRow}>
                <Text style={[styles.txLabel, { color: COLORS.textMuted }]}>{t('notifications.note')}</Text>
                <Text style={[styles.txValue, { color: COLORS.text }]} numberOfLines={1}>{item.transactionDetails.note}</Text>
              </View>
            ) : null}
          </View>
        )}

        <Text style={[styles.cardTimestamp, { color: COLORS.textMuted }]}>
          {item.sentAt ? `Sent: ${formatDate(item.sentAt)}` : `Created: ${formatDate(item.createdAt)}`}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, { color: COLORS.textMuted }]}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, {
        backgroundColor: isDarkMode ? '#1c1e1f' : accent,
        borderBottomWidth: isDarkMode ? 1 : 0, borderColor: 'rgba(34, 211, 238, 0.2)',
      }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: cardBg, borderColor }]}>
        {(['all', 'sent', 'pending', 'failed'] as const).map(f => {
          const active = activeFilter === f;
          const info = f === 'all' ? { color: accent, icon: 'mail' as const } : getStatusInfo(f);
          return (
            <TouchableOpacity key={f}
              style={[styles.statChip, active && { backgroundColor: `${info.color}15`, borderColor: info.color }]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.statNumber, { color: active ? info.color : COLORS.text }]}>{counts[f]}</Text>
              <Text style={[styles.statLabel, { color: active ? info.color : COLORS.textMuted }]}>
                {f === 'all' ? t('notifications.all') : f === 'sent' ? t('notifications.sent') : f === 'pending' ? t('notifications.pending') : t('notifications.failed')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} colors={[accent]} tintColor={accent} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.05)' : 'rgba(10, 126, 164, 0.05)' }]}>
              <Ionicons name="notifications-off-outline" size={60} color={isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(10, 126, 164, 0.2)'} />
            </View>
            <Text style={[styles.emptyTitle, { color: COLORS.text }]}>{t('notifications.noNotifications')}</Text>
            <Text style={[styles.emptyDesc, { color: COLORS.textMuted }]}>You'll receive notifications when transactions are created</Text>
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

  statsRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 8,
    borderRadius: 14, borderWidth: 1, padding: 6, gap: 6,
  },
  statChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  statNumber: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardEmail: { fontSize: 12, marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  cardMessage: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  txDetails: { borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  txLabel: { fontSize: 13 },
  txValue: { fontSize: 13, fontWeight: '700' },
  cardTimestamp: { fontSize: 11, textAlign: 'right' },

  emptyState: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 40 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
