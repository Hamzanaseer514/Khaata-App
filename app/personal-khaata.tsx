import config from '@/config/config';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { showError, showSuccess } from '@/utils/toast';
import { goBack } from '@/utils/navigation';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Predefined categories
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Rent', 'Utilities', 'Shopping', 'Entertainment', 'Medical', 'Education', 'Other'];

// Month names
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  Salary: 'wallet-outline',
  Freelance: 'laptop-outline',
  Business: 'briefcase-outline',
  Investment: 'trending-up-outline',
  Gift: 'gift-outline',
  Food: 'fast-food-outline',
  Transport: 'car-outline',
  Rent: 'home-outline',
  Utilities: 'flash-outline',
  Shopping: 'bag-outline',
  Entertainment: 'game-controller-outline',
  Medical: 'medkit-outline',
  Education: 'school-outline',
  Other: 'ellipsis-horizontal-outline',
};

interface PersonalTransaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export default function PersonalKhaataScreen() {
  const { user, token } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';

  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<PersonalTransaction | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // Year and Month filter state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const filterAnim = React.useRef(new Animated.Value(0)).current;

  // All transactions (before filtering)
  const [allTransactions, setAllTransactions] = useState<PersonalTransaction[]>([]);

  // Summary state
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalTransactions: 0,
  });

  // Animation
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (user && token) {
      loadTransactions();
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  }, [user, token, filterType]);

  useEffect(() => {
    filterAndCalculateSummary();
  }, [allTransactions, selectedYear, selectedMonth, filterType]);

  const loadTransactions = async () => {
    if (!user?.id || !token) return;
    setIsLoading(true);
    try {
      const url = filterType === 'ALL'
        ? `${config.BASE_URL}/personal-transactions`
        : `${config.BASE_URL}/personal-transactions?type=${filterType}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        const fetched = data.data.transactions || [];
        setAllTransactions(fetched);
      } else {
        showError(data.message || 'Failed to load transactions');
      }
    } catch (error) {
      console.error('Load transactions error:', error);
      showError('Failed to load transactions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const filterAndCalculateSummary = () => {
    let filtered = allTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
    if (filterType !== 'ALL') filtered = filtered.filter(t => t.type === filterType);
    const income = filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    setTransactions(filtered);
    setSummary({ totalIncome: income, totalExpense: expense, netBalance: income - expense, totalTransactions: filtered.length });
  };

  const handleDelete = (id: string) => { setTransactionToDelete(id); setShowDeleteConfirm(true); };

  const confirmDelete = async () => {
    if (!transactionToDelete || !token) { setShowDeleteConfirm(false); setTransactionToDelete(null); return; }
    try {
      const response = await fetch(`${config.BASE_URL}/personal-transactions/${transactionToDelete}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) { showSuccess('Transaction deleted!'); loadTransactions(); }
      else showError(data.message || 'Failed to delete');
    } catch (error) { console.error('Delete error:', error); showError('Failed to delete transaction.'); }
    finally { setShowDeleteConfirm(false); setTransactionToDelete(null); }
  };

  const handleEdit = (transaction: PersonalTransaction) => { setEditingTransaction(transaction); setShowEditModal(true); };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatAmount = (amount: number) => `Rs ${Math.abs(amount).toLocaleString()}`;

  const renderTransaction = ({ item }: { item: PersonalTransaction }) => {
    const isIncome = item.type === 'INCOME';
    const iconName = CATEGORY_ICONS[item.category] || (isIncome ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline');

    return (
      <Animated.View style={[
        styles.transactionCard,
        {
          backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
          borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}>
        {/* Left icon */}
        <View style={[
          styles.txIconWrap,
          {
            backgroundColor: isIncome
              ? (isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(16, 185, 129, 0.08)')
              : (isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)'),
          }
        ]}>
          <Ionicons
            name={iconName as any}
            size={22}
            color={isIncome ? (isDarkMode ? '#34d399' : '#10b981') : (isDarkMode ? '#f87171' : '#ef4444')}
          />
        </View>

        {/* Middle: info */}
        <View style={styles.txInfo}>
          <Text style={[styles.txCategory, { color: COLORS.text }]} numberOfLines={1}>
            {item.category || item.type.charAt(0) + item.type.slice(1).toLowerCase()}
          </Text>
          <Text style={[styles.txMeta, { color: isDarkMode ? '#64748b' : '#94a3b8' }]} numberOfLines={1}>
            {formatDate(item.date)}{item.description ? ` · ${item.description}` : ''}
          </Text>
        </View>

        {/* Right: amount */}
        <View style={styles.txRight}>
          <Text style={[
            styles.txAmount,
            { color: isIncome ? (isDarkMode ? '#34d399' : '#10b981') : (isDarkMode ? '#f87171' : '#ef4444') }
          ]}>
            {isIncome ? '+' : '-'}{formatAmount(item.amount)}
          </Text>
          <Text style={[styles.txTypeLabel, {
            color: isIncome ? (isDarkMode ? '#34d399' : '#10b981') : (isDarkMode ? '#f87171' : '#ef4444'),
          }]}>
            {isIncome ? 'INCOME' : 'EXPENSE'}
          </Text>
        </View>

        {/* Action icons (compact, like contacts) */}
        <View style={styles.compactActions}>
          <TouchableOpacity style={styles.smallIconBtn} onPress={() => handleEdit(item)} activeOpacity={0.6}>
            <Ionicons name="pencil" size={14} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallIconBtn} onPress={() => handleDelete(item.id)} activeOpacity={0.6}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" opacity={0.6} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Year list: current year + all unique years from transactions (dynamic)
  const currentYear = new Date().getFullYear();
  const transactionYears = [...new Set(allTransactions.map(t => new Date(t.date).getFullYear()))];
  const yearList = [...new Set([currentYear, ...transactionYears])].sort((a, b) => b - a);

  // All 12 months always available
  const allMonths = monthNames.map((name, idx) => ({ label: name, value: idx + 1 }));

  if (isLoading && allTransactions.length === 0) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingScreenText, { color: isDarkMode ? '#94a3b8' : '#7f8c8d' }]}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ─── Header ─── */}
      {/* ─── Header ─── */}
      <View style={[styles.header, {
        backgroundColor: isDarkMode ? '#1c1e1f' : accent,
        borderBottomWidth: isDarkMode ? 1 : 0,
        borderColor: 'rgba(34, 211, 238, 0.2)',
      }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Khaata</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={styles.headerAddBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="print-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Date Bar: "March 2026" left + filter icon right ─── */}
      <View style={styles.dateBar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dateBarTitle, { color: COLORS.text }]}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </Text>
          <Text style={[styles.dateBarSub, { color: COLORS.textMuted }]}>
            {summary.totalTransactions} transaction{summary.totalTransactions !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterIconBtn, {
            backgroundColor: showFilters ? accent : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
            borderColor: showFilters ? accent : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
          }]}
          onPress={() => {
            const toValue = showFilters ? 0 : 1;
            setShowFilters(!showFilters);
            Animated.spring(filterAnim, { toValue, tension: 50, friction: 8, useNativeDriver: false }).start();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name={showFilters ? 'options' : 'options-outline'} size={20} color={showFilters ? '#ffffff' : COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ─── Collapsible Filters ─── */}
      <Animated.View style={{
        overflow: 'hidden',
        maxHeight: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }),
        opacity: filterAnim,
      }}>
        {/* Row 1: Year + Month Dropdowns */}
        <View style={styles.dropdownRow}>
          <TouchableOpacity
            style={[styles.dropdownBtn, {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            }]}
            onPress={() => setShowYearDropdown(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={accent} />
            <Text style={[styles.dropdownBtnText, { color: COLORS.text }]}>{selectedYear}</Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dropdownBtn, { flex: 1.4 }, {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            }]}
            onPress={() => setShowMonthDropdown(true)}
          >
            <Ionicons name="time-outline" size={16} color={accent} />
            <Text style={[styles.dropdownBtnText, { color: COLORS.text }]}>{monthNames[selectedMonth - 1]}</Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Row 2: Type Filter Tabs */}
        <View style={styles.typeTabRow}>
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map((f) => {
            const active = filterType === f;
            const chipColor = f === 'INCOME' ? (isDarkMode ? '#34d399' : '#10b981')
              : f === 'EXPENSE' ? (isDarkMode ? '#f87171' : '#ef4444') : accent;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.typeTab, {
                  backgroundColor: active
                    ? (f === 'ALL' ? accent : (isDarkMode ? `${chipColor}20` : `${chipColor}15`))
                    : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff'),
                  borderColor: active ? chipColor : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                }]}
                onPress={() => setFilterType(f)}
              >
                <Text style={[styles.typeTabText, {
                  color: active ? (f === 'ALL' ? '#fff' : chipColor) : (isDarkMode ? '#94a3b8' : '#475569'),
                }]}>
                  {f === 'ALL' ? 'All' : f === 'INCOME' ? 'Income' : 'Expense'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Year Dropdown Modal */}
      <DropdownModal
        visible={showYearDropdown}
        onClose={() => setShowYearDropdown(false)}
        title="Select Year"
        items={yearList.map(y => ({ label: String(y), value: y }))}
        selected={selectedYear}
        onSelect={(v) => { setSelectedYear(v as number); setShowYearDropdown(false); }}
        isDarkMode={isDarkMode}
        COLORS={COLORS}
        accent={accent}
      />

      {/* Month Dropdown Modal */}
      <DropdownModal
        visible={showMonthDropdown}
        onClose={() => setShowMonthDropdown(false)}
        title="Select Month"
        items={allMonths}
        selected={selectedMonth}
        onSelect={(v) => { setSelectedMonth(v as number); setShowMonthDropdown(false); }}
        isDarkMode={isDarkMode}
        COLORS={COLORS}
        accent={accent}
      />

      {/* ─── Summary Cards ─── */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, {
          backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.08)' : '#f0fdf4',
          borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#bbf7d0',
        }]}>
          <Ionicons name="arrow-down-circle" size={20} color={isDarkMode ? '#34d399' : '#10b981'} />
          <Text style={[styles.summaryLabel, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>Income</Text>
          <Text style={[styles.summaryValue, { color: isDarkMode ? '#34d399' : '#10b981' }]} numberOfLines={1}>
            +Rs {summary.totalIncome.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.summaryCard, {
          backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
          borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fecaca',
        }]}>
          <Ionicons name="arrow-up-circle" size={20} color={isDarkMode ? '#f87171' : '#ef4444'} />
          <Text style={[styles.summaryLabel, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>Expense</Text>
          <Text style={[styles.summaryValue, { color: isDarkMode ? '#f87171' : '#ef4444' }]} numberOfLines={1}>
            -Rs {summary.totalExpense.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.summaryCard, {
          backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.06)' : '#f0f9ff',
          borderColor: isDarkMode ? 'rgba(34, 211, 238, 0.2)' : '#bae6fd',
        }]}>
          <Ionicons name="wallet" size={20} color={accent} />
          <Text style={[styles.summaryLabel, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>Balance</Text>
          <Text style={[styles.summaryValue, {
            color: summary.netBalance >= 0 ? (isDarkMode ? '#34d399' : '#10b981') : (isDarkMode ? '#f87171' : '#ef4444')
          }]} numberOfLines={1}>
            {summary.netBalance >= 0 ? '+' : ''}Rs {summary.netBalance.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ─── Transactions List ─── */}
      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.05)' : 'rgba(10, 126, 164, 0.05)' }]}>
            <Ionicons name="receipt-outline" size={70} color={isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(10, 126, 164, 0.2)'} />
          </View>
          <Text style={[styles.emptyTitle, { color: COLORS.text }]}>
            {allTransactions.length === 0 ? 'No Transactions Yet' : 'No Results'}
          </Text>
          <Text style={[styles.emptyDesc, { color: isDarkMode ? '#64748b' : '#94a3b8' }]}>
            {allTransactions.length === 0
              ? 'Tap + to add your first income or expense'
              : `No transactions for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[accent]} tintColor={accent} />
          }
        />
      )}

      {/* ─── FAB ─── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: accent, shadowColor: isDarkMode ? accent : '#000' }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={isDarkMode ? '#0a0a0c' : '#ffffff'} />
      </TouchableOpacity>

      {/* ─── Add Modal ─── */}
      {showAddModal && (
        <TransactionFormModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); loadTransactions(); }}
        />
      )}

      {/* ─── Edit Modal ─── */}
      {showEditModal && editingTransaction && (
        <TransactionFormModal
          mode="edit"
          transaction={editingTransaction}
          onClose={() => { setShowEditModal(false); setEditingTransaction(null); }}
          onSuccess={() => { setShowEditModal(false); setEditingTransaction(null); loadTransactions(); }}
        />
      )}

      {/* ─── Delete Confirm ─── */}
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            <Ionicons name="warning-outline" size={40} color="#ef4444" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.confirmTitle, { color: COLORS.text }]}>Delete transaction?</Text>
            <Text style={[styles.confirmDesc, { color: isDarkMode ? '#94a3b8' : '#7f8c8d' }]}>
              This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}
                onPress={() => { setShowDeleteConfirm(false); setTransactionToDelete(null); }}
              >
                <Text style={[styles.confirmCancelText, { color: COLORS.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmDelete}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <BottomNav />
    </View>
  );
}

// ─── Reusable Dropdown Modal ───
function DropdownModal({ visible, onClose, title, items, selected, onSelect, isDarkMode, COLORS, accent }: {
  visible: boolean; onClose: () => void; title: string;
  items: { label: string; value: any }[];
  selected: any; onSelect: (v: any) => void;
  isDarkMode: boolean; COLORS: any; accent: string;
}) {
  if (!visible) return null;
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.dropdownCard, {
          backgroundColor: cardBg,
          borderColor: isDarkMode ? 'rgba(34, 211, 238, 0.15)' : '#e2e8f0',
        }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dropdownHead, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
            <Text style={[styles.dropdownTitle, { color: COLORS.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {items.map((item) => (
              <TouchableOpacity
                key={String(item.value)}
                style={[styles.dropdownItem, selected === item.value && {
                  backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.08)' : '#f0f9ff'
                }]}
                onPress={() => onSelect(item.value)}
              >
                <Text style={[styles.dropdownItemText, { color: COLORS.text },
                  selected === item.value && { color: accent, fontWeight: '600' }
                ]}>{item.label}</Text>
                {selected === item.value && <Ionicons name="checkmark" size={18} color={accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Unified Add/Edit Transaction Form Modal ───
function TransactionFormModal({ mode, transaction, onClose, onSuccess }: {
  mode: 'add' | 'edit';
  transaction?: PersonalTransaction;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const inputBg = isDarkMode ? COLORS.background : '#f8fafc';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';
  const placeholderColor = isDarkMode ? COLORS.textMuted : '#9ca3af';

  const [amount, setAmount] = useState(transaction ? transaction.amount.toString() : '');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(transaction?.type || 'EXPENSE');
  const [category, setCategory] = useState(transaction?.category || '');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [description, setDescription] = useState(transaction?.description || '');
  const [selectedDate, setSelectedDate] = useState(transaction ? new Date(transaction.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  React.useEffect(() => {
    if (mode === 'edit' && type !== transaction?.type) setCategory('');
    if (mode === 'add') setCategory('');
  }, [type]);

  const formatDateForAPI = (d: Date) => d.toISOString().split('T')[0];
  const formatDateForDisplay = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) { showError('Please enter a valid amount'); return; }
    if (!token) { showError('Authentication token missing'); return; }
    setIsLoading(true);
    try {
      const url = mode === 'add'
        ? `${config.BASE_URL}/personal-transactions/add`
        : `${config.BASE_URL}/personal-transactions/${transaction!.id}`;
      const response = await fetch(url, {
        method: mode === 'add' ? 'POST' : 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount), type,
          category: category.trim(), description: description.trim(),
          date: formatDateForAPI(selectedDate),
        }),
      });
      const data = await response.json();
      if (data.success) { showSuccess(mode === 'add' ? 'Transaction added!' : 'Transaction updated!'); onSuccess(); }
      else showError(data.message || 'Failed');
    } catch (error) { console.error(`${mode} error:`, error); showError('Something went wrong.'); }
    finally { setIsLoading(false); }
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent hardwareAccelerated>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        </TouchableOpacity>

        <View style={[styles.formSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)' }]} />

          {/* Header */}
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: COLORS.text }]}>
              {mode === 'add' ? 'Add Transaction' : 'Edit Transaction'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
            <View style={styles.formBody}>
              {/* Big Amount */}
              <View style={styles.bigAmountRow}>
                <Text style={[styles.bigCurrency, { color: COLORS.primary }]}>Rs</Text>
                <TextInput
                  style={[styles.bigAmountInput, { color: COLORS.text }]}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  selectionColor={COLORS.primary}
                  autoFocus={mode === 'add'}
                />
              </View>

              {/* Type Toggle */}
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[styles.typeToggle, {
                    backgroundColor: type === 'INCOME' ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
                    borderColor: type === 'INCOME' ? '#059669' : borderColor,
                  }]}
                  onPress={() => setType('INCOME')}
                >
                  <Ionicons name="arrow-down-circle" size={24} color={type === 'INCOME' ? '#059669' : COLORS.textMuted} />
                  <Text style={[styles.typeToggleText, { color: type === 'INCOME' ? '#059669' : COLORS.textMuted }]}>Income</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeToggle, {
                    backgroundColor: type === 'EXPENSE' ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
                    borderColor: type === 'EXPENSE' ? '#dc2626' : borderColor,
                  }]}
                  onPress={() => setType('EXPENSE')}
                >
                  <Ionicons name="arrow-up-circle" size={24} color={type === 'EXPENSE' ? '#dc2626' : COLORS.textMuted} />
                  <Text style={[styles.typeToggleText, { color: type === 'EXPENSE' ? '#dc2626' : COLORS.textMuted }]}>Expense</Text>
                </TouchableOpacity>
              </View>

              {/* Category */}
              <TouchableOpacity
                style={[styles.formFieldRow, { backgroundColor: inputBg }]}
                onPress={() => setShowCategoryDropdown(true)}
              >
                <Ionicons name={(category ? (CATEGORY_ICONS[category] || 'ellipsis-horizontal-outline') : 'grid-outline') as any} size={20} color={COLORS.textMuted} />
                <Text style={[styles.formFieldText, { color: category ? COLORS.text : COLORS.textMuted }]}>
                  {category || 'Select category'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Description */}
              <View style={[styles.formFieldRow, { backgroundColor: inputBg }]}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 2 }} />
                <TextInput
                  style={[styles.formFieldInput, { color: COLORS.text }]}
                  placeholder="What's this for?"
                  placeholderTextColor={COLORS.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              {/* Date */}
              <TouchableOpacity
                style={[styles.formFieldRow, { backgroundColor: inputBg }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} />
                <Text style={[styles.formFieldText, { color: COLORS.text }]}>{formatDateForDisplay(selectedDate)}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: COLORS.primary, shadowColor: COLORS.primary }, isLoading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.saveButtonText}>
                      {mode === 'add' ? 'Save Transaction' : 'Update Transaction'}
                    </Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

            {/* Calendar Date Picker Modal */}
            <CalendarPicker
              visible={showDatePicker}
              selectedDate={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setShowDatePicker(false); }}
              onClose={() => setShowDatePicker(false)}
              isDarkMode={isDarkMode}
              COLORS={COLORS}
              accent={accent}
            />

            {/* Category Dropdown */}
            <DropdownModal
              visible={showCategoryDropdown}
              onClose={() => setShowCategoryDropdown(false)}
              title="Select Category"
              items={[{ label: 'None', value: '' }, ...categories.map(c => ({ label: c, value: c }))]}
              selected={category}
              onSelect={(v) => { setCategory(v as string); setShowCategoryDropdown(false); }}
              isDarkMode={isDarkMode}
              COLORS={COLORS}
              accent={accent}
            />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Calendar Date Picker Component ───
function CalendarPicker({ visible, selectedDate, onSelect, onClose, isDarkMode, COLORS, accent }: {
  visible: boolean; selectedDate: Date; onSelect: (d: Date) => void; onClose: () => void;
  isDarkMode: boolean; COLORS: any; accent: string;
}) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
  const today = new Date();

  React.useEffect(() => {
    if (visible) setViewDate(new Date(selectedDate));
  }, [visible]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Get days in month and first day offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build calendar grid
  const calendarDays: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    calendarDays.push({ day: d, isCurrentMonth: false, date: new Date(year, month - 1, d) });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
  }
  // Next month leading days (fill to 42 = 6 rows)
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isToday = (d: Date) => isSameDay(d, today);
  const isSelected = (d: Date) => isSameDay(d, selectedDate);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={calStyles.overlay}>
        <View style={[calStyles.card, { backgroundColor: cardBg, borderColor }]}>
          {/* Month/Year Header with arrows */}
          <View style={calStyles.calHeader}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn} activeOpacity={0.6}>
              <Ionicons name="chevron-back" size={22} color={accent} />
            </TouchableOpacity>
            <Text style={[calStyles.calHeaderText, { color: COLORS.text }]}>
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn} activeOpacity={0.6}>
              <Ionicons name="chevron-forward" size={22} color={accent} />
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={calStyles.weekRow}>
            {weekDays.map((wd) => (
              <View key={wd} style={calStyles.weekCell}>
                <Text style={[calStyles.weekLabel, { color: COLORS.textMuted }]}>{wd}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={calStyles.grid}>
            {calendarDays.map((item, idx) => {
              const selected = isSelected(item.date);
              const todayDay = isToday(item.date);
              return (
                <TouchableOpacity
                  key={idx}
                  style={calStyles.dayCell}
                  onPress={() => onSelect(item.date)}
                  activeOpacity={0.6}
                >
                  <View style={[
                    calStyles.dayCircle,
                    selected && { backgroundColor: accent },
                    todayDay && !selected && { borderWidth: 1.5, borderColor: accent },
                  ]}>
                    <Text style={[
                      calStyles.dayText,
                      { color: item.isCurrentMonth ? COLORS.text : (isDarkMode ? '#3b4252' : '#cbd5e1') },
                      selected && { color: isDarkMode ? '#0a0a0c' : '#ffffff', fontWeight: '700' },
                      todayDay && !selected && { color: accent, fontWeight: '700' },
                    ]}>
                      {item.day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={calStyles.footer}>
            <TouchableOpacity
              style={[calStyles.todayBtn, {
                backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(10, 126, 164, 0.08)',
                borderColor: isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(10, 126, 164, 0.15)',
              }]}
              onPress={() => onSelect(new Date())}
            >
              <Ionicons name="today-outline" size={16} color={accent} />
              <Text style={[calStyles.todayBtnText, { color: accent }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[calStyles.cancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}
              onPress={onClose}
            >
              <Text style={[calStyles.cancelBtnText, { color: COLORS.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { borderRadius: 20, paddingVertical: 16, paddingHorizontal: 12, width: '92%', maxWidth: 360, borderWidth: 1 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  calHeaderText: { fontSize: 17, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekLabel: { fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 12, paddingHorizontal: 4 },
  todayBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1,
  },
  todayBtnText: { fontSize: 14, fontWeight: '600' },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
});

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingScreenText: { marginTop: 16, fontSize: 16, fontWeight: '500' },

  // Header
  header: {
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  // Date bar
  dateBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
  },
  dateBarTitle: { fontSize: 18, fontWeight: '700' },
  dateBarSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  filterIconBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  headerAddBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },

  // Dropdown row
  dropdownRow: {
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, gap: 10,
  },
  dropdownBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1,
  },
  dropdownBtnText: { flex: 1, fontSize: 15, fontWeight: '600' },

  // Type tab row
  typeTabRow: {
    flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 8, paddingTop: 4, gap: 10,
  },
  typeTab: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: 1,
  },
  typeTabText: { fontSize: 13, fontWeight: '600' },

  // Summary
  summaryRow: { flexDirection: 'row', marginBottom:10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 8 },
  summaryCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 14, borderWidth: 1,
  },
  summaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },


  // Transaction card
  transactionCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, height: 72,
    paddingHorizontal: 14, marginBottom: 8, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  txIconWrap: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  txInfo: { flex: 1, paddingRight: 8 },
  txCategory: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  txMeta: { fontSize: 12, fontWeight: '400' },
  txRight: { alignItems: 'flex-end', minWidth: 80 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txTypeLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 },
  compactActions: {
    flexDirection: 'column', justifyContent: 'center', gap: 8, marginLeft: 6, width: 24, alignItems: 'center',
  },
  smallIconBtn: { padding: 2 },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', paddingHorizontal: 40, paddingTop: 50 },
  emptyIconWrap: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // FAB
  fab: {
    position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 160 },

  // Dropdown Modal
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownCard: { borderRadius: 16, width: '80%', maxHeight: '60%', borderWidth: 1, overflow: 'hidden' },
  dropdownHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1,
  },
  dropdownTitle: { fontSize: 17, fontWeight: '700' },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  dropdownItemText: { fontSize: 15 },

  // Confirm delete
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  confirmModal: { borderRadius: 18, padding: 24, width: '85%', maxWidth: 380 },
  confirmTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  confirmDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 15, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#ef4444' },
  confirmDeleteText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },

  // Form Modal (matching contact-detail style)
  formSheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '95%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  handleBar: {
    width: 40, height: 5, borderRadius: 2.5, alignSelf: 'center', marginTop: 12,
  },
  formHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 15,
  },
  formTitle: { fontSize: 22, fontWeight: '900' },
  formBody: { paddingHorizontal: 24, paddingTop: 10 },
  bigAmountRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 30,
  },
  bigCurrency: { fontSize: 24, fontWeight: '800', marginRight: 10 },
  bigAmountInput: { fontSize: 56, fontWeight: '900', minWidth: 100, textAlign: 'center' },
  typeToggleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  typeToggle: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  typeToggleText: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  formFieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 12,
  },
  formFieldText: { flex: 1, fontSize: 15, fontWeight: '600' },
  formFieldInput: { flex: 1, fontSize: 15, fontWeight: '600', maxHeight: 100 },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 18, marginTop: 12,
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },

});
