import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { showError } from '@/utils/toast';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/utils/navigation';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import config from '../../config/config';

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

export default function GroupTransactionDetailScreen() {
  const { transactionId } = useLocalSearchParams();
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const { currency: cur } = useCurrency();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const [transaction, setTransaction] = useState<GroupTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (transactionId) fetchTransactionDetails();
  }, [transactionId]);

  const fetchTransactionDetails = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/group-transactions`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        const found = data.data.find((t: GroupTransaction) => t.id === transactionId);
        if (found) setTransaction(found);
        else { showError('Transaction not found'); goBack(); }
      } else { showError(data.message || 'Failed to fetch'); goBack(); }
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to fetch transaction details');
      goBack();
    } finally { setLoading(false); }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, { color: COLORS.textMuted }]}>Loading details...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: COLORS.background }]}>
        <Ionicons name="alert-circle-outline" size={50} color="#ef4444" />
        <Text style={[styles.errorText, { color: COLORS.text }]}>Transaction not found</Text>
        <TouchableOpacity style={[styles.goBackBtn, { backgroundColor: accent }]} onPress={() => goBack()}>
          <Text style={styles.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Overview Card */}
        <View style={[styles.overviewCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.overviewTitle, { color: COLORS.text }]}>{transaction.description}</Text>
          <Text style={[styles.overviewDate, { color: COLORS.textMuted }]}>{formatDate(transaction.createdAt)}</Text>

          <View style={styles.overviewAmounts}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.amountLabel, { color: COLORS.textMuted }]}>Total Amount</Text>
              <Text style={[styles.amountBig, { color: accent }]}>{cur.symbol} {Math.round(transaction.totalAmount).toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.amountLabel, { color: COLORS.textMuted }]}>
                {transaction.splitMode === 'manual' ? 'Split Type' : 'Per Person'}
              </Text>
              <Text style={[styles.amountSmall, { color: isDarkMode ? '#34d399' : '#10b981' }]}>
                {transaction.splitMode === 'manual' ? 'Custom' : `${cur.symbol} ${Math.round(transaction.perPersonShare)}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Payer Card */}
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardLabel, { color: COLORS.textMuted }]}>PAID BY</Text>
          <View style={styles.payerRow}>
            <View style={[styles.payerAvatar, { backgroundColor: isDarkMode ? 'rgba(52, 211, 153, 0.1)' : 'rgba(16, 185, 129, 0.08)' }]}>
              <Ionicons name="card" size={20} color={isDarkMode ? '#34d399' : '#10b981'} />
            </View>
            <Text style={[styles.payerName, { color: COLORS.text }]}>{transaction.payerName}</Text>
            <View style={[styles.payerBadge, { backgroundColor: isDarkMode ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)' }]}>
              <Text style={[styles.payerBadgeText, { color: isDarkMode ? '#34d399' : '#10b981' }]}>PAYER</Text>
            </View>
          </View>
        </View>

        {/* Members Card */}
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardLabel, { color: COLORS.textMuted }]}>GROUP MEMBERS</Text>
          {transaction.contactNames.map((name, index) => {
            const contactId = transaction.contactIds[index]?.toString();
            let amount = transaction.perPersonShare;
            if (transaction.splitMode === 'manual' && transaction.individualAmounts && contactId) {
              amount = transaction.individualAmounts[contactId] || amount;
            }
            return (
              <View key={index} style={[styles.memberRow, { borderBottomColor: borderColor }]}>
                <View style={[styles.memberAvatar, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(10, 126, 164, 0.06)', overflow: 'hidden' }]}>
                  {transaction.contactProfilePictures?.[index] ? (
                    <Image source={{ uri: transaction.contactProfilePictures[index]! }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
                  ) : (
                    <Image source={require('../../assets/images/avatar_male_2.png')} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
                  )}
                </View>
                <Text style={[styles.memberName, { color: COLORS.text }]} numberOfLines={1}>{name}</Text>
                <Text style={[styles.memberAmount, { color: accent }]}>{cur.symbol} {Math.round(amount).toLocaleString()}</Text>
              </View>
            );
          })}

          {/* User amount (manual) */}
          {transaction.splitMode === 'manual' && transaction.userAmount != null && (
            <View style={styles.memberRow}>
              <View style={[styles.memberAvatar, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(10, 126, 164, 0.06)' }]}>
                <Text style={[styles.memberAvatarText, { color: isDarkMode ? '#22d3ee' : '#0a7ea4' }]}>Y</Text>
              </View>
              <Text style={[styles.memberName, { color: COLORS.text }]}>You</Text>
              <Text style={[styles.memberAmount, { color: isDarkMode ? '#22d3ee' : '#0a7ea4' }]}>
                {cur.symbol} {Math.round(transaction.userAmount).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardLabel, { color: COLORS.textMuted }]}>SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Total Members (incl. You)</Text>
            <Text style={[styles.summaryValue, { color: COLORS.text }]}>{transaction.contactNames.length + 1}</Text>
          </View>
          {transaction.splitMode === 'manual' ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Your Share</Text>
                <Text style={[styles.summaryValue, { color: COLORS.text }]}>{cur.symbol} {transaction.userAmount || 0}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Contacts Total</Text>
                <Text style={[styles.summaryValue, { color: COLORS.text }]}>
                  {cur.symbol} {transaction.individualAmounts ? Object.values(transaction.individualAmounts).reduce((s, a) => s + a, 0) : 0}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Per Person Share</Text>
              <Text style={[styles.summaryValue, { color: COLORS.text }]}>{cur.symbol} {transaction.perPersonShare}</Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTotalLabel, { color: COLORS.text }]}>Amount Paid</Text>
            <Text style={[styles.summaryTotalValue, { color: accent }]}>{cur.symbol} {Math.round(transaction.totalAmount).toLocaleString()}</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, fontWeight: '500' },
  errorText: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  goBackBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 12 },
  goBackBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  header: {
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

  body: { padding: 20 },

  overviewCard: {
    borderRadius: 20, borderWidth: 1, padding: 22, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  overviewTitle: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  overviewDate: { fontSize: 13, fontWeight: '500', marginBottom: 20 },
  overviewAmounts: { flexDirection: 'row', alignItems: 'flex-end' },
  amountLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  amountBig: { fontSize: 30, fontWeight: '900' },
  amountSmall: { fontSize: 18, fontWeight: '700' },

  infoCard: {
    borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 },

  payerRow: { flexDirection: 'row', alignItems: 'center' },
  payerAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  payerName: { fontSize: 16, fontWeight: '700', flex: 1 },
  payerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  payerBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarText: { fontSize: 14, fontWeight: '800' },
  memberName: { fontSize: 15, fontWeight: '600', flex: 1 },
  memberAmount: { fontSize: 15, fontWeight: '800' },

  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, marginVertical: 10 },
  summaryTotalLabel: { fontSize: 17, fontWeight: '800' },
  summaryTotalValue: { fontSize: 17, fontWeight: '900' },
});
