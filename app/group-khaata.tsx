import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import BottomNav from '@/components/BottomNav';
import { showError } from '@/utils/toast';
import { tapHaptic, successHaptic } from '@/utils/haptics';
import { goBack } from '@/utils/navigation';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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

interface GroupTransaction {
  id: string;
  payerId: string;
  payerName: string;
  contactIds: string[];
  contactNames: string[];
  contactProfilePictures?: (string | null)[];
  totalAmount: number;
  perPersonShare: number;
  description: string;
  createdAt: string;
  splitMode?: 'equal' | 'manual';
  individualAmounts?: { [contactId: string]: number };
  userAmount?: number;
}

export default function GroupKhaataScreen() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const { currency: cur } = useCurrency();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';

  const [groupTransactions, setGroupTransactions] = useState<GroupTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  const fetchGroupTransactions = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/group-transactions`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) setGroupTransactions(data.data);
      else showError(data.message || 'Failed to fetch group transactions');
    } catch (error) {
      console.error('Error fetching group transactions:', error);
      showError('Failed to fetch group transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchGroupTransactions(); }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGroupTransactions();
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
      ]).start();
    }, [])
  );

  const onRefresh = () => { setRefreshing(true); fetchGroupTransactions(); };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderTransaction = ({ item }: { item: GroupTransaction }) => (
    <Animated.View style={[
      styles.card,
      {
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}>
      <TouchableOpacity
        style={styles.cardInner}
        onPress={() => router.push({ pathname: '/group-khaata/detail', params: { transactionId: item.id } })}
        activeOpacity={0.7}
      >
        {/* Left icon */}
        <View style={[styles.cardIcon, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(10, 126, 164, 0.08)' }]}>
          <Ionicons name="people" size={22} color={accent} />
        </View>

        {/* Middle */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: COLORS.text }]} numberOfLines={1}>{item.description}</Text>
          <Text style={[styles.cardMeta, { color: isDarkMode ? '#64748b' : '#94a3b8' }]} numberOfLines={1}>
            {formatDate(item.createdAt)} · {item.contactNames.length + 1} {t('groupKhaata.members')}
          </Text>
        </View>

        {/* Right */}
        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, { color: accent }]}>{cur.symbol} {Math.round(item.totalAmount).toLocaleString()}</Text>
          <Text style={[styles.cardSplit, { color: isDarkMode ? '#64748b' : '#94a3b8' }]}>
            {item.splitMode === 'manual' ? 'Custom' : `${cur.symbol} ${Math.round(item.perPersonShare)}/ea`}
          </Text>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#475569' : '#cbd5e1'} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      {/* Footer: payer + members */}
      <View style={[styles.cardFooter, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
        <View style={styles.footerChip}>
          <Ionicons name="card-outline" size={12} color={isDarkMode ? '#34d399' : '#10b981'} />
          <Text style={[styles.footerChipText, { color: isDarkMode ? '#34d399' : '#10b981' }]}>
            {item.payerName}
          </Text>
        </View>
        <Text style={[styles.footerMembers, { color: isDarkMode ? '#475569' : '#94a3b8' }]} numberOfLines={1}>
          {item.contactNames.slice(0, 3).join(', ')}{item.contactNames.length > 3 ? ` +${item.contactNames.length - 3}` : ''}
        </Text>
      </View>
    </Animated.View>
  );

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
        borderBottomWidth: isDarkMode ? 1 : 0,
        borderColor: 'rgba(34, 211, 238, 0.2)',
      }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('groupKhaata.title')}</Text>
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => router.push('/group-khaata/create')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {groupTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.05)' : 'rgba(10, 126, 164, 0.05)' }]}>
            <Ionicons name="people-outline" size={70} color={isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(10, 126, 164, 0.2)'} />
          </View>
          <Text style={[styles.emptyTitle, { color: COLORS.text }]}>{t('groupKhaata.noGroups')}</Text>
          <Text style={[styles.emptyDesc, { color: isDarkMode ? '#64748b' : '#94a3b8' }]}>
            Split expenses with friends and keep track of who owes what
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: accent }]}
            onPress={() => router.push('/group-khaata/create')}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>{t('groupKhaata.createGroup')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groupTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[accent]} tintColor={accent} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      {groupTransactions.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: accent, shadowColor: isDarkMode ? accent : '#000' }]}
          onPress={() => router.push('/group-khaata/create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500' },

  header: {
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  headerAddBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },

  listContent: { padding: 20, paddingBottom: 160 },

  card: {
    borderRadius: 16, marginBottom: 10, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardMeta: { fontSize: 12, fontWeight: '400' },
  cardRight: { alignItems: 'flex-end', marginRight: 2 },
  cardAmount: { fontSize: 15, fontWeight: '800' },
  cardSplit: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, paddingTop: 6,
    borderTopWidth: 1, marginTop: 0,
  },
  footerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 10 },
  footerChipText: { fontSize: 11, fontWeight: '700' },
  footerMembers: { fontSize: 11, fontWeight: '400', flex: 1 },

  emptyState: { flex: 1, alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyIconWrap: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
});
