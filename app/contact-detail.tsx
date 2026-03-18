import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { showError, showSuccess } from '@/utils/toast';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Animated,
    Dimensions,
    Linking,
    StatusBar,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import config from '../config/config';

const { width } = Dimensions.get('window');

const createStyles = (COLORS: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    backgroundColor: isDarkMode ? '#1c1e1f' : '#0a7ea4',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: isDarkMode ? 1 : 0,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  backBtn: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  profileSection: {
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 25,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGlow: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(37, 209, 244, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 209, 244, 0.2)',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  contactName: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  contactPhone: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  trustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  trustedText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Toggle Button Styles
  actionsToggleBtn: {
    marginTop: 15,
    backgroundColor: isDarkMode ? 'rgba(37, 209, 244, 0.15)' : 'rgba(10, 126, 164, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(37, 209, 244, 0.3)' : 'rgba(10, 126, 164, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  actionsToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: isDarkMode ? '#25d1f4' : '#0a7ea4',
    marginHorizontal: 8,
  },
  // Quick Actions Styles
  actionsWrapper: {
    overflow: 'hidden',
    marginVertical: 10,
    marginBottom: 20, // Increased space before the balance card
  },
  actionsContainer: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? '#111827' : '#f1f5f9',
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  },
  actionsItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  payIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payLabel: {
    color: COLORS.primary,
  },
  actionSeparator: {
    width: 1,
    height: 25,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
  },
  // Balance Card Styles (Shrunk)
  balanceCard: {
    backgroundColor: isDarkMode ? '#111827' : '#ffffff',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.3 : 0.04,
    shadowRadius: 15,
    elevation: 6,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  progressBarContainer: {
    width: '45%',
    height: 3,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#eee',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  balanceAmountMain: {
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 2,
    letterSpacing: -1,
  },
  balanceStatusSubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 20,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
    marginBottom: 20,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerItemContent: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  footerValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  pendingValue: {
    color: COLORS.primary,
  },
  // List Styles (Shrunk)
  listSection: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#fff',
    padding: 18,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
  },
  transactionIconContainer: {
    marginRight: 16,
  },
  typeBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionNote: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  transactionValue: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editIconContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    // Refined Shadow (Circular)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
    zIndex: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 35,
    right: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBackdropBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    width: '100%',
    maxHeight: '95%',
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    margin: 0,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  currencyLabel: {
    fontSize: 24,
    fontWeight: '800',
    marginRight: 10,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: '900',
    minWidth: 100,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 32,
  },
  noteInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    maxHeight: 100,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 18,
    shadowColor: '#25d1f4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});

interface Contact {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  email?: string;
  balance: number;
  profilePicture?: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  payer: 'USER' | 'FRIEND';
  note: string;
  createdAt: string;
}

export default function ContactDetailScreen() {
  const { contactId } = useLocalSearchParams();
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const styles = createStyles(COLORS, isDarkMode);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  const actualContactId = Array.isArray(contactId) ? contactId[0] : contactId;

  useEffect(() => {
    if (actualContactId && actualContactId !== 'undefined' && actualContactId !== 'null') {
      fetchContactDetails();
      fetchTransactions();
    } else {
      showError('Invalid contact ID');
      router.back();
    }
  }, [actualContactId]);

  const toggleQuickActions = () => {
    const toValue = showQuickActions ? 0 : 1;
    Animated.spring(actionsAnim, {
      toValue,
      useNativeDriver: false,
      tension: 40,
      friction: 8
    }).start();
    setShowQuickActions(!showQuickActions);
  };

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(headerTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const fetchContactDetails = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/contacts/${actualContactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setContact(data.data);
      } else {
        showError(data.message || 'Failed to fetch contact details');
        router.back();
      }
    } catch (error) {
      showError('Failed to fetch contact details');
      router.back();
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/transactions?contact_id=${actualContactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data);
      } else {
        showError(data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      showError('Failed to fetch transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchContactDetails();
    fetchTransactions();
  };

  const handleCall = () => {
    if (contact?.phone) Linking.openURL(`tel:${contact.phone}`);
  };

  const handleMessage = () => {
    if (contact?.phone) Linking.openURL(`sms:${contact.phone}`);
  };

  const handleEdit = () => {
    if (!contact) return;
    const id = contact._id || contact.id;
    router.push(`/contacts/add?contactId=${id}&editMode=true`);
  };

  const handleExportTransactions = async (format: 'pdf' | 'csv') => {
    if (!contact) return;
    setExporting(true);
    try {
      const response = await fetch(
        `${config.BASE_URL}/reports/contact/${actualContactId}?format=${format}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to export transactions');

      const blob = await response.blob();
      const fileName = `${contact.name.replace(/\s+/g, '_')}_transactions.${format}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
          } else {
            showSuccess(`File saved to: ${fileUri}`);
          }
        } catch (fileError) {
          showError('Failed to process the exported file');
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      showError('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' • ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransaction = ({ item, index }: { item: Transaction, index: number }) => {
    const isUserPaid = item.payer === 'USER';
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => {
          setEditingTransaction(item);
          setShowAddTransaction(true);
        }}
      >
        <Animated.View 
          key={item.id || index}
          style={[
            styles.transactionCard,
            {
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                })
              }]
            }
          ]}
        >
          <View style={styles.transactionIconContainer}>
            <View style={[
              styles.typeBadge,
              { backgroundColor: !isUserPaid ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)' }
            ]}>
              <MaterialCommunityIcons 
                name={!isUserPaid ? "arrow-bottom-left" : "arrow-top-right"} 
                size={26} 
                color={!isUserPaid ? '#059669' : '#dc2626'} 
              />
            </View>
          </View>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionNote} numberOfLines={1}>
              {item.note || (isUserPaid ? "You Paid" : "Friend Paid")}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.transactionValue}>
            <Text style={[
              styles.transactionAmount,
              { color: !isUserPaid ? '#22c55e' : '#ef4444' }
            ]}>
              {!isUserPaid ? '+' : '-'} Rs {Math.round(item.amount)}
            </Text>
            <Text style={styles.transactionStatus}>
              {!isUserPaid ? 'Received' : 'Sent'}
            </Text>
          </View>
          <View style={styles.editIconContainer}>
            <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: COLORS.textMuted }]}>Loading history...</Text>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.loadingText, { color: COLORS.textMuted }]}>Contact not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Contact Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => handleExportTransactions('pdf')}>
            <Ionicons name="share-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleEdit}>
            <Ionicons name="pencil" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Profile Section */}
        <Animated.View style={[styles.profileSection, { opacity: fadeAnim }]}>
          <View style={styles.profileRow}>
            <View style={styles.avatarGlow}>
              <View style={styles.avatarContainer}>
                {contact.profilePicture ? (
                  <Image source={{ uri: contact.profilePicture }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarInitial}>{contact.name.charAt(0).toUpperCase()}</Text>
                )}
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
              <View style={styles.trustedBadge}>
                <View style={styles.dot} />
                <Text style={styles.trustedText}>Trusted Member</Text>
              </View>
              
              <TouchableOpacity style={styles.actionsToggleBtn} onPress={toggleQuickActions}>
                <Ionicons 
                  name="flash-outline" 
                  size={14} 
                  color={isDarkMode ? '#25d1f4' : '#0a7ea4'} 
                />
                <Text style={styles.actionsToggleText}>Quick Actions</Text>
                <Ionicons 
                  name={showQuickActions ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color={isDarkMode ? '#25d1f4' : '#0a7ea4'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions (Animated Toggle) */}
        <Animated.View style={[
          styles.actionsWrapper,
          {
            maxHeight: actionsAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 100], // Expansion height
            }),
            opacity: actionsAnim,
            transform: [{
              scale: actionsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              })
            }]
          }
        ]}>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionsItem} onPress={handleMessage}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.text} />
              </View>
              <Text style={styles.actionLabel}>Message</Text>
            </TouchableOpacity>
            <View style={styles.actionSeparator} />
            <TouchableOpacity style={styles.actionsItem} onPress={handleCall}>
              <View style={styles.actionIconCircle}>
                <Ionicons name="call" size={20} color={COLORS.text} />
              </View>
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>
            <View style={styles.actionSeparator} />
            <TouchableOpacity style={styles.actionsItem} onPress={() => setShowAddTransaction(true)}>
              <View style={styles.payIconCircle}>
                <MaterialCommunityIcons name="wallet-plus" size={22} color="#fff" />
              </View>
              <Text style={[styles.actionLabel, styles.payLabel]}>Pay</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Balance Card Section */}
        <Animated.View style={[
          styles.balanceCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }]
          }
        ]}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>Overall Balance</Text>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: '75%', 
                  backgroundColor: contact.balance >= 0 ? '#22c55e' : '#ef4444' 
                }
              ]} />
            </View>
          </View>

          <Text style={[
            styles.balanceAmountMain,
            { color: contact.balance > 0 ? '#22c55e' : contact.balance < 0 ? '#ef4444' : COLORS.textMuted }
          ]}>
            Rs {Math.round(Math.abs(contact.balance))}
          </Text>
          
          <Text style={styles.balanceStatusSubtext}>
            {contact.balance > 0 ? 'Friend owes you this amount' : contact.balance < 0 ? 'You owe friend this amount' : 'All transactions settled'}
          </Text>

          <View style={styles.cardSeparator} />

          <View style={styles.balanceFooter}>
            <View style={styles.footerItemContent}>
              <Text style={styles.footerLabel}>Total Settled</Text>
              <Text style={styles.footerValue}>Rs {Math.round(transactions.reduce((acc, t) => acc + t.amount, 0))}</Text>
            </View>
            <View style={[styles.footerItemContent, { alignItems: 'flex-end' }]}>
              <Text style={styles.footerLabel}>{contact.balance >= 0 ? 'Pending In' : 'Pending Out'}</Text>
              <Text style={[styles.footerValue, styles.pendingValue]}>Rs {Math.round(Math.abs(contact.balance))}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Transactions List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color={COLORS.surfaceLight} />
              <Text style={styles.emptyText}>No history yet</Text>
            </View>
          ) : (
            transactions.map((item, index) => renderTransaction({ item, index }))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setShowAddTransaction(true)}
        activeOpacity={0.8}
      >
        <View style={styles.fabIconContainer}>
          <Ionicons name="add" size={32} color="#fff" />
        </View>
      </TouchableOpacity>
      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <AddTransactionModal 
          onClose={() => {
            setShowAddTransaction(false);
            setEditingTransaction(null);
          }}
          onSuccess={() => {
            setShowAddTransaction(false);
            setEditingTransaction(null);
            fetchContactDetails();
            fetchTransactions();
          }}
          contactId={(contact._id || contact.id) as string}
          token={token as string}
          COLORS={COLORS}
          editingTransaction={editingTransaction}
          styles={styles}
        />
      )}
    </View>
  );
}
function AddTransactionModal({ contactId, onClose, onSuccess, token, COLORS, editingTransaction, styles }: any) {
  const [amount, setAmount] = useState(editingTransaction ? Math.round(editingTransaction.amount).toString() : '');
  const [payer, setPayer] = useState<'USER' | 'FRIEND'>(editingTransaction?.payer || 'USER');
  const [note, setNote] = useState(editingTransaction?.note || '');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: Dimensions.get('window').height, duration: 300, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(parseFloat(amount))) return showError('Enter valid amount');
    setLoading(true);
    try {
      const url = editingTransaction 
        ? `${config.BASE_URL}/transactions/${editingTransaction.id}`
        : `${config.BASE_URL}/transactions`;
      
      const method = editingTransaction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, amount: parseFloat(amount), payer, note }),
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(editingTransaction ? 'Updated successfully!' : 'Added successfully!');
        onSuccess();
      } else showError(data.message);
    } catch {
      showError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;
    
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction? This will automatically update the overall balance.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const response = await fetch(`${config.BASE_URL}/transactions/${editingTransaction.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await response.json();
              if (data.success) {
                showSuccess('Deleted successfully!');
                onSuccess();
              } else showError(data.message);
            } catch {
              showError('Failed to delete transaction');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal 
      visible 
      transparent 
      animationType="none" 
      onRequestClose={handleClose} 
      statusBarTranslucent
      hardwareAccelerated={true}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.modalOverlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={handleClose}
        >
          <Animated.View style={[styles.modalBackdropBlur, { opacity: fadeAnim }]} />
        </TouchableOpacity>
        
        <Animated.View style={[
          styles.modalSheet,
          { 
            backgroundColor: COLORS.surface,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            keyboardShouldPersistTaps="always" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}
          >
            <View style={styles.modalBody}>
              <View style={styles.amountInputContainer}>
                <Text style={[styles.currencyLabel, { color: COLORS.primary }]}>Rs</Text>
                <TextInput
                  style={[styles.amountInput, { color: COLORS.text }]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  selectionColor={COLORS.primary}
                  autoFocus={!editingTransaction}
                />
              </View>

              <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, payer === 'USER' && { backgroundColor: 'rgba(220, 38, 38, 0.1)', borderColor: '#dc2626' }]}
                  onPress={() => setPayer('USER')}
                >
                  <MaterialCommunityIcons name="arrow-top-right" size={24} color={payer === 'USER' ? '#dc2626' : COLORS.textMuted} />
                  <Text style={[styles.toggleText, { color: payer === 'USER' ? '#dc2626' : COLORS.textMuted }]}>You Paid</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, payer === 'FRIEND' && { backgroundColor: 'rgba(5, 150, 105, 0.1)', borderColor: '#059669' }]}
                  onPress={() => setPayer('FRIEND')}
                >
                  <MaterialCommunityIcons name="arrow-bottom-left" size={24} color={payer === 'FRIEND' ? '#059669' : COLORS.textMuted} />
                  <Text style={[styles.toggleText, { color: payer === 'FRIEND' ? '#059669' : COLORS.textMuted }]}>Friend Paid</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.noteContainer, { backgroundColor: COLORS.background }]}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.noteInput, { color: COLORS.text }]}
                  placeholder="What's this for?"
                  placeholderTextColor={COLORS.textMuted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
              </View>

              <View style={{ gap: 12 }}>
                <TouchableOpacity 
                  style={[styles.saveBtn, { backgroundColor: COLORS.primary }]}
                  onPress={handleSubmit}
                  disabled={loading || deleting}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.saveBtnText}>
                        {editingTransaction ? 'Update Transaction' : 'Save Transaction'}
                      </Text>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>

                {editingTransaction && (
                  <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', shadowOpacity: 0, elevation: 0 }]}
                    onPress={handleDelete}
                    disabled={loading || deleting}
                  >
                    {deleting ? <ActivityIndicator color="#ef4444" /> : (
                      <>
                        <Text style={[styles.saveBtnText, { color: '#ef4444' }]}>Delete Transaction</Text>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Safety Filler for Bottom Gap */}
          <View style={{ 
            height: 100, 
            backgroundColor: COLORS.surface, 
            position: 'absolute', 
            bottom: -100, 
            left: 0, 
            right: 0 
          }} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

