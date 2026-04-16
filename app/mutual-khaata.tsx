import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import BottomNav from '@/components/BottomNav';
import { showError, showSuccess } from '@/utils/toast';
import { tapHaptic, successHaptic } from '@/utils/haptics';
import { goBack } from '@/utils/navigation';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import config from '../config/config';

interface MutualKhaataItem {
  id: string;
  partner: {
    id: string;
    name: string;
    email: string;
    profilePicture: string | null;
  };
  balance: number;
  acceptedAt: string;
  lastTransaction: string | null;
}

interface PendingRequest {
  id: string;
  from?: { id: string; name: string; email: string; profilePicture: string | null };
  to?: { id: string; name: string; email: string; profilePicture: string | null };
  createdAt: string;
  type: 'incoming' | 'outgoing';
}

interface EligibleContact {
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactProfilePicture: string | null;
  appUserId: string;
  appUserName: string;
  appUserEmail: string;
  appUserProfilePicture: string | null;
  alreadyConnected: boolean;
}

export default function MutualKhaataScreen() {
  const { token, user } = useAuth();
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const { currency: cur } = useCurrency();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';

  const [khaatas, setKhaatas] = useState<MutualKhaataItem[]>([]);
  const [incoming, setIncoming] = useState<PendingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [eligibleContacts, setEligibleContacts] = useState<EligibleContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'requests'>('active');

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  const fetchData = async () => {
    try {
      const [khaataRes, requestsRes] = await Promise.all([
        fetch(`${config.BASE_URL}/mutual-khaata`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${config.BASE_URL}/mutual-khaata/requests/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const khaataData = await khaataRes.json();
      const requestsData = await requestsRes.json();

      if (khaataData.success) setKhaatas(khaataData.data);
      if (requestsData.success) {
        setIncoming(requestsData.data.incoming);
        setOutgoing(requestsData.data.outgoing);
      }
    } catch (error) {
      console.error('Error fetching mutual khaata data:', error);
      showError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEligibleContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await fetch(`${config.BASE_URL}/mutual-khaata/eligible-contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setEligibleContacts(data.data);
      else showError(data.message);
    } catch {
      showError('Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
      ]).start();
    }, [])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openContactsPicker = () => {
    tapHaptic();
    setShowContactsModal(true);
    setSearchQuery('');
    fetchEligibleContacts();
  };

  const sendRequest = async (targetUserId: string) => {
    setSendingTo(targetUserId);
    try {
      const res = await fetch(`${config.BASE_URL}/mutual-khaata/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (data.success) {
        successHaptic();
        showSuccess(data.message);
        // Update the eligible list to reflect the change
        setEligibleContacts(prev => prev.map(c =>
          c.appUserId === targetUserId ? { ...c, alreadyConnected: true } : c
        ));
        fetchData();
      } else {
        showError(data.message);
      }
    } catch {
      showError('Failed to send request');
    } finally {
      setSendingTo(null);
    }
  };

  const acceptRequest = async (id: string) => {
    try {
      const res = await fetch(`${config.BASE_URL}/mutual-khaata/requests/${id}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        successHaptic();
        showSuccess('Mutual Khaata accepted!');
        fetchData();
      } else showError(data.message);
    } catch {
      showError('Failed to accept request');
    }
  };

  const declineRequest = async (id: string) => {
    try {
      const res = await fetch(`${config.BASE_URL}/mutual-khaata/requests/${id}/decline`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) { showSuccess('Request declined'); fetchData(); }
      else showError(data.message);
    } catch {
      showError('Failed to decline request');
    }
  };

  const cancelRequest = async (id: string) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes', style: 'destructive', onPress: async () => {
          try {
            const res = await fetch(`${config.BASE_URL}/mutual-khaata/requests/${id}/cancel`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) { showSuccess('Request cancelled'); fetchData(); }
            else showError(data.message);
          } catch { showError('Failed to cancel request'); }
        }
      }
    ]);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalPending = incoming.length + outgoing.length;

  const filteredEligible = eligibleContacts.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.contactName.toLowerCase().includes(q) || c.appUserName.toLowerCase().includes(q) || c.contactPhone.includes(q);
  });

  const renderKhaataItem = ({ item }: { item: MutualKhaataItem }) => {
    const isPositive = item.balance > 0;
    const isZero = item.balance === 0;
    const balanceColor = isZero ? COLORS.textMuted : isPositive ? COLORS.success : COLORS.danger;
    const balanceLabel = isZero ? 'Settled' : isPositive ? 'You\'ll Get' : 'You\'ll Give';

    return (
      <Animated.View style={[styles.card, {
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
        opacity: fadeAnim, transform: [{ translateY: slideAnim }],
      }]}>
        <TouchableOpacity
          style={styles.cardInner}
          onPress={() => { tapHaptic(); router.push({ pathname: '/mutual-khaata/detail', params: { id: item.id } }); }}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.15)' : 'rgba(10, 126, 164, 0.1)' }]}>
            <Text style={[styles.avatarText, { color: accent }]}>{getInitials(item.partner.name)}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: COLORS.text }]} numberOfLines={1}>{item.partner.name}</Text>
            <Text style={[styles.cardMeta, { color: COLORS.textMuted }]} numberOfLines={1}>
              {item.partner.email} {item.lastTransaction ? `· ${formatDate(item.lastTransaction)}` : ''}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.cardAmount, { color: balanceColor }]}>
              {isZero ? '' : (isPositive ? '+' : '')}{cur.symbol} {Math.abs(Math.round(item.balance)).toLocaleString()}
            </Text>
            <Text style={[styles.cardLabel, { color: balanceColor }]}>{balanceLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#475569' : '#cbd5e1'} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRequestItem = ({ item }: { item: PendingRequest }) => {
    const isIncoming = item.type === 'incoming';
    const person = isIncoming ? item.from! : item.to!;

    return (
      <View style={[styles.requestCard, {
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
      }]}>
        <View style={styles.requestTop}>
          <View style={[styles.avatar, { backgroundColor: isIncoming ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', width: 40, height: 40 }]}>
            <Text style={[styles.avatarText, { color: isIncoming ? COLORS.success : COLORS.warning, fontSize: 14 }]}>
              {getInitials(person.name)}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.cardTitle, { color: COLORS.text, fontSize: 14 }]}>{person.name}</Text>
            <Text style={[styles.cardMeta, { color: COLORS.textMuted, fontSize: 12 }]}>{person.email}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: isIncoming ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
            <Ionicons name={isIncoming ? 'arrow-down' : 'arrow-up'} size={12} color={isIncoming ? COLORS.success : COLORS.warning} />
            <Text style={{ color: isIncoming ? COLORS.success : COLORS.warning, fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
              {isIncoming ? 'Incoming' : 'Sent'}
            </Text>
          </View>
        </View>
        {isIncoming ? (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              onPress={() => acceptRequest(item.id)}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}
              onPress={() => declineRequest(item.id)}
            >
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: COLORS.danger }]}
            onPress={() => cancelRequest(item.id)}
          >
            <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '600' }}>Cancel Request</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEligibleContact = ({ item }: { item: EligibleContact }) => (
    <View style={[styles.eligibleCard, {
      backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#f8f9fa',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
    }]}>
      <View style={[styles.avatar, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.15)' : 'rgba(10,126,164,0.1)', width: 42, height: 42 }]}>
        <Text style={[styles.avatarText, { color: accent, fontSize: 14 }]}>{getInitials(item.contactName)}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.cardTitle, { color: COLORS.text, fontSize: 14 }]}>{item.contactName}</Text>
        <Text style={[styles.cardMeta, { color: COLORS.textMuted, fontSize: 11 }]}>
          {item.contactPhone} · {t('mutualKhaata.onApp')}: {item.appUserName}
        </Text>
      </View>
      {item.alreadyConnected ? (
        <View style={[styles.connectedBadge, { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)' }]}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
          <Text style={{ color: COLORS.success, fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Connected</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: accent }]}
          onPress={() => sendRequest(item.appUserId)}
          disabled={sendingTo === item.appUserId}
        >
          {sendingTo === item.appUserId ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{t('mutualKhaata.send')}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
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
        <Text style={styles.headerTitle}>{t('mutualKhaata.title')}</Text>
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={openContactsPicker}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: isDarkMode ? 'rgba(30,41,59,0.5)' : '#f8f9fa' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && { backgroundColor: accent }]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'active' ? '#fff' : COLORS.textMuted }]}>
            Active ({khaatas.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && { backgroundColor: accent }]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'requests' ? '#fff' : COLORS.textMuted }]}>
            Requests {totalPending > 0 ? `(${totalPending})` : ''}
          </Text>
          {incoming.length > 0 && (
            <View style={[styles.badge, { backgroundColor: COLORS.danger }]}>
              <Text style={styles.badgeText}>{incoming.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'active' ? (
        khaatas.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.05)' : 'rgba(10, 126, 164, 0.05)' }]}>
              <Ionicons name="link-outline" size={70} color={isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(10, 126, 164, 0.2)'} />
            </View>
            <Text style={[styles.emptyTitle, { color: COLORS.text }]}>{t('mutualKhaata.noMutualKhaata')}</Text>
            <Text style={[styles.emptyDesc, { color: COLORS.textMuted }]}>
              {t('mutualKhaata.noMutualKhaataMsg')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: accent }]}
              onPress={openContactsPicker}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.emptyBtnText}>{t('mutualKhaata.sendRequest')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={khaatas}
            keyExtractor={(item) => item.id}
            renderItem={renderKhaataItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[accent]} tintColor={accent} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <FlatList
          data={[...incoming, ...outgoing]}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[accent]} tintColor={accent} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={60} color={COLORS.textMuted} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: COLORS.text, fontSize: 18 }]}>No Pending Requests</Text>
              <Text style={[styles.emptyDesc, { color: COLORS.textMuted }]}>
                Send a request to start a mutual khaata with someone
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: accent, shadowColor: isDarkMode ? accent : '#000' }]}
        onPress={openContactsPicker}
        activeOpacity={0.85}
      >
        <Ionicons name="person-add" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Contacts Picker Modal - Shows contacts who are on the app */}
      <Modal visible={showContactsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.text }]}>{t('mutualKhaata.selectContact')}</Text>
              <TouchableOpacity onPress={() => setShowContactsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalDesc, { color: COLORS.textMuted }]}>
              {t('mutualKhaata.selectContactDesc')}
            </Text>

            {/* Search */}
            <View style={[styles.searchBar, {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
            }]}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: COLORS.text }]}
                placeholder={t('mutualKhaata.searchContact')}
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Contacts List */}
            {loadingContacts ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={accent} />
                <Text style={[{ color: COLORS.textMuted, marginTop: 12 }]}>Finding contacts on app...</Text>
              </View>
            ) : filteredEligible.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="people-outline" size={50} color={COLORS.textMuted} style={{ opacity: 0.3, marginBottom: 12 }} />
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
                  {t('mutualKhaata.noContactsOnApp')}
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>
                  {t('mutualKhaata.noContactsOnAppMsg')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredEligible}
                keyExtractor={(item) => item.appUserId}
                renderItem={renderEligibleContact}
                style={{ maxHeight: 400 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

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

  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  badge: {
    width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginLeft: 6,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  listContent: { padding: 20, paddingBottom: 160 },

  card: {
    borderRadius: 16, marginBottom: 10, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800' },
  cardInfo: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardMeta: { fontSize: 12, fontWeight: '400' },
  cardRight: { alignItems: 'flex-end', marginRight: 2 },
  cardAmount: { fontSize: 15, fontWeight: '800' },
  cardLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  requestCard: {
    borderRadius: 16, marginBottom: 12, borderWidth: 1, padding: 14,
  },
  requestTop: { flexDirection: 'row', alignItems: 'center' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  requestActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center',
  },

  eligibleCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  connectedBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },

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

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalDesc: { fontSize: 13, lineHeight: 18, marginBottom: 16 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
});
