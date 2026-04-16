import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { showError, showSuccess } from '@/utils/toast';
import { tapHaptic, successHaptic } from '@/utils/haptics';
import { goBack } from '@/utils/navigation';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../../config/config';

interface Transaction {
  id: string;
  amount: number;
  payer: { id: string; name: string };
  addedBy: { id: string; name: string };
  note: string;
  createdAt: string;
}

interface KhaataDetail {
  id: string;
  partner: { id: string; name: string; email: string; profilePicture: string | null };
  balance: number;
  user1: { id: string; name: string };
  user2: { id: string; name: string };
  transactions: Transaction[];
  acceptedAt: string;
}

export default function MutualKhaataDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const { currency: cur } = useCurrency();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';

  const [detail, setDetail] = useState<KhaataDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txPayer, setTxPayer] = useState<'me' | 'partner'>('me');
  const [adding, setAdding] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`${config.BASE_URL}/mutual-khaata/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setDetail(data.data);
      else showError(data.message);
    } catch {
      showError('Failed to load details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDetail(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchDetail(); };

  const addTransaction = async () => {
    const amount = parseFloat(txAmount);
    if (!amount || amount <= 0) { showError('Enter a valid amount'); return; }
    if (!detail) return;

    setAdding(true);
    try {
      // Determine actual payer userId
      const payerId = txPayer === 'me' ? user?.id : detail.partner.id;

      const res = await fetch(`${config.BASE_URL}/mutual-khaata/${id}/transactions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, payer: payerId, note: txNote.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        successHaptic();
        showSuccess('Transaction added!');
        setShowAddModal(false);
        setTxAmount('');
        setTxNote('');
        setTxPayer('me');
        fetchDetail();
      } else showError(data.message);
    } catch {
      showError('Failed to add transaction');
    } finally {
      setAdding(false);
    }
  };

  const deleteTransaction = (txId: string) => {
    Alert.alert('Delete Transaction', 'This will be removed for both users. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${config.BASE_URL}/mutual-khaata/${id}/transactions/${txId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) { showSuccess('Transaction deleted'); fetchDetail(); }
            else showError(data.message);
          } catch { showError('Failed to delete'); }
        }
      }
    ]);
  };

  const endKhaata = () => {
    Alert.alert(
      'End Mutual Khaata',
      'This will delete all shared transactions permanently. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Khaata', style: 'destructive', onPress: async () => {
            try {
              const res = await fetch(`${config.BASE_URL}/mutual-khaata/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (data.success) { showSuccess('Mutual Khaata ended'); goBack(); }
              else showError(data.message);
            } catch { showError('Failed to end khaata'); }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: COLORS.background }]}>
        <Text style={{ color: COLORS.text }}>Not found</Text>
      </View>
    );
  }

  const isPositive = detail.balance > 0;
  const isZero = detail.balance === 0;
  const balanceColor = isZero ? COLORS.textMuted : isPositive ? COLORS.success : COLORS.danger;

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
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{detail.partner.name}</Text>
          <Text style={styles.headerSubtitle}>{t('mutualKhaata.title')}</Text>
        </View>
        <TouchableOpacity onPress={endKhaata} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="trash-outline" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={[styles.balanceCard, {
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
      }]}>
        <View style={[styles.balanceAvatar, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.15)' : 'rgba(10,126,164,0.1)' }]}>
          <Text style={[styles.balanceAvatarText, { color: accent }]}>{getInitials(detail.partner.name)}</Text>
        </View>
        <Text style={[styles.balanceLabel, { color: COLORS.textMuted }]}>
          {isZero ? 'All Settled' : isPositive ? `${detail.partner.name} owes you` : `You owe ${detail.partner.name}`}
        </Text>
        <Text style={[styles.balanceAmount, { color: balanceColor }]}>
          {cur.symbol} {Math.abs(Math.round(detail.balance)).toLocaleString()}
        </Text>
        <Text style={[styles.balanceSince, { color: COLORS.textMuted }]}>
          Since {formatDate(detail.acceptedAt)}
        </Text>
      </View>

      {/* Transactions */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
          {t('mutualKhaata.transactions')} ({detail.transactions.length})
        </Text>
      </View>

      <FlatList
        data={detail.transactions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[accent]} tintColor={accent} />}
        contentContainerStyle={[styles.listContent, detail.transactions.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
            <Ionicons name="receipt-outline" size={50} color={COLORS.textMuted} style={{ opacity: 0.3, marginBottom: 12 }} />
            <Text style={{ color: COLORS.textMuted, fontSize: 15 }}>{t('mutualKhaata.noTransactions')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMePayer = item.payer.id === user?.id;
          const isMeAdder = item.addedBy.id === user?.id;

          return (
            <TouchableOpacity
              style={[styles.txCard, {
                backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
              }]}
              onLongPress={() => deleteTransaction(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.txIcon, {
                backgroundColor: isMePayer
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
              }]}>
                <Ionicons
                  name={isMePayer ? 'arrow-up' : 'arrow-down'}
                  size={18}
                  color={isMePayer ? COLORS.success : COLORS.danger}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txTitle, { color: COLORS.text }]}>
                  {isMePayer ? 'You paid' : `${item.payer.name} paid`}
                </Text>
                {item.note ? (
                  <Text style={[styles.txNote, { color: COLORS.textMuted }]} numberOfLines={1}>{item.note}</Text>
                ) : null}
                <Text style={[styles.txMeta, { color: COLORS.textMuted }]}>
                  {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
                  {!isMeAdder ? ` · Added by ${item.addedBy.name}` : ''}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: isMePayer ? COLORS.success : COLORS.danger }]}>
                {isMePayer ? '+' : '-'}{cur.symbol} {Math.round(item.amount).toLocaleString()}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: accent, shadowColor: isDarkMode ? accent : '#000' }]}
        onPress={() => { tapHaptic(); setShowAddModal(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>{t('mutualKhaata.addTransaction')}</Text>

            {/* Payer Selection */}
            <Text style={[styles.fieldLabel, { color: COLORS.textMuted }]}>{t('mutualKhaata.whoPaid')}</Text>
            <View style={styles.payerRow}>
              <TouchableOpacity
                style={[styles.payerBtn, txPayer === 'me' && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setTxPayer('me')}
              >
                <Ionicons name="person" size={16} color={txPayer === 'me' ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.payerBtnText, { color: txPayer === 'me' ? '#fff' : COLORS.text }]}>
                  {t('mutualKhaata.you')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payerBtn, txPayer === 'partner' && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setTxPayer('partner')}
              >
                <Ionicons name="person-outline" size={16} color={txPayer === 'partner' ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.payerBtnText, { color: txPayer === 'partner' ? '#fff' : COLORS.text }]}>
                  {detail.partner.name}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <Text style={[styles.fieldLabel, { color: COLORS.textMuted }]}>{t('mutualKhaata.amount')}</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8f9fa',
                color: COLORS.text,
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
              }]}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              value={txAmount}
              onChangeText={setTxAmount}
              keyboardType="numeric"
            />

            {/* Note */}
            <Text style={[styles.fieldLabel, { color: COLORS.textMuted }]}>{t('mutualKhaata.note')}</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8f9fa',
                color: COLORS.text,
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
              }]}
              placeholder="What's this for? (optional)"
              placeholderTextColor={COLORS.textMuted}
              value={txNote}
              onChangeText={setTxNote}
              maxLength={200}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}
                onPress={() => { setShowAddModal(false); setTxAmount(''); setTxNote(''); }}
              >
                <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: accent }]}
                onPress={addTransaction}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.add')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', marginTop: 2 },

  balanceCard: {
    marginHorizontal: 20, marginTop: 20, borderRadius: 20, borderWidth: 1,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  balanceAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  balanceAvatarText: { fontSize: 20, fontWeight: '800' },
  balanceLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  balanceSince: { fontSize: 12, fontWeight: '400' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  txCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1, paddingRight: 8 },
  txTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  txNote: { fontSize: 12, fontWeight: '400', marginBottom: 2 },
  txMeta: { fontSize: 11, fontWeight: '400' },
  txAmount: { fontSize: 15, fontWeight: '800' },

  fab: {
    position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  payerRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  payerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(100,100,100,0.2)',
  },
  payerBtnText: { fontSize: 14, fontWeight: '700' },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
