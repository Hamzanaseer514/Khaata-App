import config from '@/config/config';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';

// Predefined categories
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Rent', 'Utilities', 'Shopping', 'Entertainment', 'Medical', 'Education', 'Other'];

// Month names
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
  
  // All transactions (before filtering)
  const [allTransactions, setAllTransactions] = useState<PersonalTransaction[]>([]);
  
  // Summary state
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    if (user && token) {
      loadTransactions();
    }
  }, [user, token, filterType]);

  // Filter transactions and update summary when filters change
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
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const fetchedTransactions = data.data.transactions || [];
        setAllTransactions(fetchedTransactions);
        
        // Set initial year/month to latest transaction or current
        if (fetchedTransactions.length > 0) {
          const latestTransaction = fetchedTransactions[0];
          const latestDate = new Date(latestTransaction.date);
          setSelectedYear(latestDate.getFullYear());
          setSelectedMonth(latestDate.getMonth() + 1);
        } else {
          setSelectedYear(new Date().getFullYear());
          setSelectedMonth(new Date().getMonth() + 1);
        }
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
    // Filter by year and month
    let filtered = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getFullYear() === selectedYear && 
             transactionDate.getMonth() + 1 === selectedMonth;
    });

    // Filter by type (ALL, INCOME, EXPENSE)
    if (filterType !== 'ALL') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Calculate summary from filtered transactions
    const income = filtered.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);

    setTransactions(filtered);
    setSummary({
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      totalTransactions: filtered.length,
    });
  };

  const handleDelete = (id: string) => {
    setTransactionToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete || !token) {
      setShowDeleteConfirm(false);
      setTransactionToDelete(null);
      return;
    }

    try {
      const response = await fetch(`${config.BASE_URL}/personal-transactions/${transactionToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Transaction deleted successfully!');
        loadTransactions();
      } else {
        showError(data.message || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Delete transaction error:', error);
      showError('Failed to delete transaction. Please try again.');
    } finally {
      setShowDeleteConfirm(false);
      setTransactionToDelete(null);
    }
  };

  const handleEdit = (transaction: PersonalTransaction) => {
    setEditingTransaction(transaction);
    setShowEditModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return `₹${Math.abs(amount).toFixed(2)}`;
  };

  const renderTransaction = ({ item }: { item: PersonalTransaction }) => {
    const isIncome = item.type === 'INCOME';
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionLeft}>
            <View style={[styles.typeBadge, isIncome ? styles.incomeBadge : styles.expenseBadge]}>
              <Text style={styles.typeBadgeText}>
                {isIncome ? '💰 Income' : '💸 Expense'}
              </Text>
            </View>
            <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
          </View>
          <Text style={[
            styles.transactionAmount,
            isIncome ? styles.incomeAmount : styles.expenseAmount
          ]}>
            {isIncome ? '+' : '-'}{formatAmount(item.amount)}
          </Text>
        </View>
        
        {item.category && (
          <Text style={styles.transactionCategory}>Category: {item.category}</Text>
        )}
        
        {item.description && (
          <Text style={styles.transactionDescription}>{item.description}</Text>
        )}
        
        <View style={styles.transactionActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.editButtonText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📝 Personal Khaata</Text>
          <Text style={styles.headerSubtitle}>Track your income & expenses</Text>
        </View>
      </View>

      {/* Year and Month Filter */}
      {(() => {
        // Get unique years from transactions (or default to current year if no transactions)
        const uniqueYears = allTransactions.length > 0
          ? [...new Set(allTransactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a)
          : [new Date().getFullYear()];
        
        // Get unique months for selected year
        const transactionsForYear = allTransactions.filter(t => new Date(t.date).getFullYear() === selectedYear);
        const uniqueMonths = transactionsForYear.length > 0
          ? [...new Set(transactionsForYear.map(t => new Date(t.date).getMonth() + 1))].sort((a, b) => b - a)
          : [new Date().getMonth() + 1];
        
        // Default months if no transactions for selected year
        const availableMonths = uniqueMonths.length > 0 ? uniqueMonths : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        
        return (
          <View style={styles.yearMonthFilterContainer}>
            <View style={styles.filterRow}>
              {/* Year Filter */}
              <View style={styles.filterItem}>
                <Text style={styles.filterItemLabel}>Year</Text>
                <TouchableOpacity
                  style={styles.yearDropdown}
                  onPress={() => setShowYearDropdown(true)}
                >
                  <Text style={styles.yearDropdownText}>{selectedYear}</Text>
                  <Text style={styles.yearDropdownArrow}>▼</Text>
                </TouchableOpacity>
                
                {/* Year Dropdown Modal */}
                <Modal
                  visible={showYearDropdown}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowYearDropdown(false)}
                >
                  <TouchableOpacity
                    style={styles.dropdownModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowYearDropdown(false)}
                  >
                    <View style={styles.dropdownContainer} onStartShouldSetResponder={() => true}>
                      <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>Select Year</Text>
                        <TouchableOpacity onPress={() => setShowYearDropdown(false)}>
                          <Text style={styles.dropdownClose}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.dropdownScroll}>
                        {uniqueYears.length > 0 ? uniqueYears.map((year) => (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.dropdownItem,
                              selectedYear === year && styles.dropdownItemSelected
                            ]}
                            onPress={() => {
                              setSelectedYear(year);
                              // Reset month if it doesn't exist in new year
                              const yearTransactions = allTransactions.filter(t => new Date(t.date).getFullYear() === year);
                              const yearMonths = [...new Set(yearTransactions.map(t => new Date(t.date).getMonth() + 1))].sort((a, b) => b - a);
                              if (yearMonths.length > 0 && !yearMonths.includes(selectedMonth)) {
                                setSelectedMonth(yearMonths[0]);
                              }
                              setShowYearDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              selectedYear === year && styles.dropdownItemTextSelected
                            ]}>
                              {year}
                            </Text>
                            {selectedYear === year && (
                              <Text style={styles.dropdownItemCheck}>✓</Text>
                            )}
                          </TouchableOpacity>
                        )) : (
                          <View style={styles.dropdownItem}>
                            <Text style={styles.dropdownItemText}>No years available</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>

              {/* Month Filter */}
              <View style={[styles.filterItem, { marginRight: 0 }]}>
                <Text style={styles.filterItemLabel}>Month</Text>
                <TouchableOpacity
                  style={styles.yearDropdown}
                  onPress={() => setShowMonthDropdown(true)}
                >
                  <Text style={styles.yearDropdownText}>{monthNames[selectedMonth - 1]}</Text>
                  <Text style={styles.yearDropdownArrow}>▼</Text>
                </TouchableOpacity>
                
                {/* Month Dropdown Modal */}
                <Modal
                  visible={showMonthDropdown}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowMonthDropdown(false)}
                >
                  <TouchableOpacity
                    style={styles.dropdownModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMonthDropdown(false)}
                  >
                    <View style={styles.dropdownContainer} onStartShouldSetResponder={() => true}>
                      <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>Select Month</Text>
                        <TouchableOpacity onPress={() => setShowMonthDropdown(false)}>
                          <Text style={styles.dropdownClose}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.dropdownScroll}>
                        {availableMonths.map((month) => (
                            <TouchableOpacity
                              key={month}
                              style={[
                                styles.dropdownItem,
                                selectedMonth === month && styles.dropdownItemSelected
                              ]}
                              onPress={() => {
                                setSelectedMonth(month);
                                setShowMonthDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.dropdownItemText,
                                selectedMonth === month && styles.dropdownItemTextSelected
                              ]}>
                                {monthNames[month - 1]}
                              </Text>
                              {selectedMonth === month && (
                                <Text style={styles.dropdownItemCheck}>✓</Text>
                              )}
                            </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.incomeCard]}>
          <Text style={styles.summaryLabel} numberOfLines={1}>Total Income</Text>
          <Text style={styles.summaryAmount} numberOfLines={1}>+₹{summary.totalIncome.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.expenseCard]}>
          <Text style={styles.summaryLabel} numberOfLines={1}>Total Expense</Text>
          <Text style={styles.summaryAmount} numberOfLines={1}>-₹{summary.totalExpense.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.balanceCard]}>
          <Text style={styles.summaryLabel} numberOfLines={1}>Net Balance</Text>
          <Text style={[
            styles.summaryAmount,
            summary.netBalance >= 0 ? styles.positiveBalance : styles.negativeBalance
          ]} numberOfLines={1}>
            {summary.netBalance >= 0 ? '+' : ''}₹{summary.netBalance.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilterType('ALL')}
        >
          <Text style={[styles.filterTabText, filterType === 'ALL' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'INCOME' && styles.filterTabActive]}
          onPress={() => setFilterType('INCOME')}
        >
          <Text style={[styles.filterTabText, filterType === 'INCOME' && styles.filterTabTextActive]}>
            💰 Income
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'EXPENSE' && styles.filterTabActive]}
          onPress={() => setFilterType('EXPENSE')}
        >
          <Text style={[styles.filterTabText, filterType === 'EXPENSE' && styles.filterTabTextActive]}>
            💸 Expense
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <View style={styles.transactionsSection}>
        {isLoading && transactions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#20B2AA" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {allTransactions.length === 0 
                ? '📝 No transactions yet' 
                : `📝 No transactions found for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
            </Text>
            <Text style={styles.emptySubtext}>
              {allTransactions.length === 0 
                ? 'Tap the button below to add your first transaction'
                : 'Try selecting a different month or year'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#20B2AA']}
              />
            }
          />
        )}
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.floatingButtonText}>+ Add Transaction</Text>
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadTransactions();
          }}
        />
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => {
            setShowEditModal(false);
            setEditingTransaction(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingTransaction(null);
            loadTransactions();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteConfirm(false);
          setTransactionToDelete(null);
        }}
      >
        <TouchableOpacity
          style={styles.deleteModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDeleteConfirm(false);
            setTransactionToDelete(null);
          }}
        >
          <View style={styles.deleteModalContainer} onStartShouldSetResponder={() => true}>
            <Text style={styles.deleteModalTitle}>⚠️ Delete Transaction</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this transaction?
            </Text>
            <Text style={styles.deleteModalWarning}>
              This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setTransactionToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteButtonText}>Yes, Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Add Transaction Modal Component
function AddTransactionModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [category, setCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    if (!token) {
      showError('Authentication token missing');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${config.BASE_URL}/personal-transactions/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type,
          category: category.trim(),
          description: description.trim(),
          date: formatDateForAPI(selectedDate),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Transaction added successfully!');
        onSuccess();
      } else {
        showError(data.message || 'Failed to add transaction');
      }
    } catch (error) {
      console.error('Add transaction error:', error);
      showError('Failed to add transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset category when type changes
  React.useEffect(() => {
    setCategory('');
  }, [type]);

  // Handle keyboard dismiss on backdrop press
  const handleBackdropPress = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={handleBackdropPress}
        >
          <View style={styles.modalContainerCompact} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderCompact}>
              <Text style={styles.modalTitleCompact}>Add Transaction</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

          <ScrollView
            style={styles.modalContentCompact}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Amount Field */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Amount *</Text>
              <TextInput
                style={styles.inputCompact}
                placeholder="Enter amount"
                placeholderTextColor={placeholderColor}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Type Selection */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Type *</Text>
              <View style={styles.typeButtonsCompact}>
                <TouchableOpacity
                  style={[styles.typeButtonCompact, type === 'INCOME' && styles.typeButtonActive]}
                  onPress={() => setType('INCOME')}
                >
                  <Text style={[
                    styles.typeButtonTextCompact,
                    type === 'INCOME' && styles.typeButtonTextActive
                  ]}>
                    💰 Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButtonCompact, type === 'EXPENSE' && styles.typeButtonActive]}
                  onPress={() => setType('EXPENSE')}
                >
                  <Text style={[
                    styles.typeButtonTextCompact,
                    type === 'EXPENSE' && styles.typeButtonTextActive
                  ]}>
                    💸 Expense
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Field - Dropdown */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Category (Optional)</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowCategoryDropdown(true)}
              >
                <Text style={[styles.dropdownButtonText, !category && styles.dropdownButtonPlaceholder]}>
                  {category || 'Select category'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Description Field */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Description (Optional)</Text>
              <TextInput
                style={[styles.inputCompact, styles.textAreaCompact]}
                placeholder="Enter description"
                placeholderTextColor={placeholderColor}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
                autoCapitalize="sentences"
                autoCorrect={true}
              />
            </View>

            {/* Date Field */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerButtonText}>
                  {formatDateForDisplay(selectedDate)}
                </Text>
                <Text style={styles.datePickerIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButtonCompact, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonTextCompact}>Add Transaction</Text>
              )}
            </TouchableOpacity>
          </ScrollView>

          {/* Date Picker Modal */}
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.datePickerModalOverlay}>
              <View style={styles.datePickerModalContainer}>
                <Text style={styles.datePickerModalTitle}>Select Date</Text>
                
                <View style={styles.datePickerContainer}>
                  {/* Year Selector */}
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Year</Text>
                    <View style={styles.dateSelector}>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setFullYear(newDate.getFullYear() - 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.dateValue}>{selectedDate.getFullYear()}</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setFullYear(newDate.getFullYear() + 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Month Selector */}
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Month</Text>
                    <View style={styles.dateSelector}>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.dateValue}>
                        {selectedDate.toLocaleDateString('en-US', { month: 'long' })}
                      </Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Day Selector */}
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Day</Text>
                    <View style={styles.dateSelector}>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setDate(newDate.getDate() - 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.dateValue}>{selectedDate.getDate()}</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setDate(newDate.getDate() + 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.datePickerModalButtons}>
                  <TouchableOpacity
                    style={styles.datePickerModalCancelButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePickerModalConfirmButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerModalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Category Dropdown Modal */}
          <Modal
            visible={showCategoryDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowCategoryDropdown(false)}
          >
            <TouchableOpacity
              style={styles.categoryModalOverlay}
              activeOpacity={1}
              onPress={() => setShowCategoryDropdown(false)}
            >
              <View style={styles.categoryDropdownContainer} onStartShouldSetResponder={() => true}>
                <View style={styles.categoryDropdownHeader}>
                  <Text style={styles.categoryDropdownTitle}>Select Category</Text>
                  <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
                    <Text style={styles.categoryDropdownClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.categoryDropdownScroll}>
                  <TouchableOpacity
                    style={styles.categoryDropdownItem}
                    onPress={() => {
                      setCategory('');
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={styles.categoryDropdownItemText}>None</Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryDropdownItem,
                        category === cat && styles.categoryDropdownItemSelected
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.categoryDropdownItemText,
                        category === cat && styles.categoryDropdownItemTextSelected
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Edit Transaction Modal Component (similar structure)
function EditTransactionModal({
  transaction,
  onClose,
  onSuccess,
}: {
  transaction: PersonalTransaction;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(transaction.type);
  const [category, setCategory] = useState(transaction.category || '');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [description, setDescription] = useState(transaction.description || '');
  const [selectedDate, setSelectedDate] = useState(new Date(transaction.date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const categories = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Reset category when type changes
  React.useEffect(() => {
    if (type !== transaction.type) {
      setCategory('');
    }
  }, [type]);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    if (!token) {
      showError('Authentication token missing');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${config.BASE_URL}/personal-transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type,
          category: category.trim(),
          description: description.trim(),
          date: formatDateForAPI(selectedDate),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Transaction updated successfully!');
        onSuccess();
      } else {
        showError(data.message || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Update transaction error:', error);
      showError('Failed to update transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard dismiss on backdrop press
  const handleBackdropPress = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={handleBackdropPress}
        >
          <View style={styles.modalContainerCompact} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderCompact}>
              <Text style={styles.modalTitleCompact}>Edit Transaction</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContentCompact}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Amount *</Text>
              <TextInput
                style={styles.inputCompact}
                placeholder="Enter amount"
                placeholderTextColor={placeholderColor}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Type *</Text>
              <View style={styles.typeButtonsCompact}>
                <TouchableOpacity
                  style={[styles.typeButtonCompact, type === 'INCOME' && styles.typeButtonActive]}
                  onPress={() => setType('INCOME')}
                >
                  <Text style={[
                    styles.typeButtonTextCompact,
                    type === 'INCOME' && styles.typeButtonTextActive
                  ]}>
                    💰 Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButtonCompact, type === 'EXPENSE' && styles.typeButtonActive]}
                  onPress={() => setType('EXPENSE')}
                >
                  <Text style={[
                    styles.typeButtonTextCompact,
                    type === 'EXPENSE' && styles.typeButtonTextActive
                  ]}>
                    💸 Expense
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Category (Optional)</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowCategoryDropdown(true)}
              >
                <Text style={[styles.dropdownButtonText, !category && styles.dropdownButtonPlaceholder]}>
                  {category || 'Select category'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Description (Optional)</Text>
              <TextInput
                style={[styles.inputCompact, styles.textAreaCompact]}
                placeholder="Enter description"
                placeholderTextColor={placeholderColor}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Date</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerButtonText}>
                  {formatDateForDisplay(selectedDate)}
                </Text>
                <Text style={styles.datePickerIcon}>📅</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButtonCompact, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonTextCompact}>Update Transaction</Text>
              )}
            </TouchableOpacity>
          </ScrollView>

          {/* Date Picker Modal */}
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.datePickerModalOverlay}>
              <View style={styles.datePickerModalContainer}>
                <Text style={styles.datePickerModalTitle}>Select Date</Text>
                
                <View style={styles.datePickerContainer}>
                  {/* Year Selector */}
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Year</Text>
                    <View style={styles.dateSelector}>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setFullYear(newDate.getFullYear() - 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.dateValue}>{selectedDate.getFullYear()}</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setFullYear(newDate.getFullYear() + 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Month Selector */}
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Month</Text>
                    <View style={styles.dateSelector}>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.dateValue}>
                        {selectedDate.toLocaleDateString('en-US', { month: 'long' })}
                      </Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Day Selector */}
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Day</Text>
                    <View style={styles.dateSelector}>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setDate(newDate.getDate() - 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.dateValue}>{selectedDate.getDate()}</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setDate(newDate.getDate() + 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={styles.dateButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.datePickerModalButtons}>
                  <TouchableOpacity
                    style={styles.datePickerModalCancelButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePickerModalConfirmButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerModalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Category Dropdown Modal */}
          <Modal
            visible={showCategoryDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowCategoryDropdown(false)}
          >
            <TouchableOpacity
              style={styles.categoryModalOverlay}
              activeOpacity={1}
              onPress={() => setShowCategoryDropdown(false)}
            >
              <View style={styles.categoryDropdownContainer} onStartShouldSetResponder={() => true}>
                <View style={styles.categoryDropdownHeader}>
                  <Text style={styles.categoryDropdownTitle}>Select Category</Text>
                  <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
                    <Text style={styles.categoryDropdownClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.categoryDropdownScroll}>
                  <TouchableOpacity
                    style={styles.categoryDropdownItem}
                    onPress={() => {
                      setCategory('');
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={styles.categoryDropdownItemText}>None</Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryDropdownItem,
                        category === cat && styles.categoryDropdownItemSelected
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.categoryDropdownItemText,
                        category === cat && styles.categoryDropdownItemTextSelected
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#20B2AA',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingHorizontal: 15,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  incomeCard: {
    backgroundColor: '#d4edda',
  },
  expenseCard: {
    backgroundColor: '#f8d7da',
  },
  balanceCard: {
    backgroundColor: '#d1ecf1',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
    textAlign: 'center',
    height: 16,
    lineHeight: 16,
    includeFontPadding: false,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    height: 18,
    lineHeight: 18,
    includeFontPadding: false,
  },
  positiveBalance: {
    color: '#27ae60',
  },
  negativeBalance: {
    color: '#e74c3c',
  },
  // Year and Month Filter Styles
  yearMonthFilterContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterItem: {
    flex: 1,
    marginRight: 8,
  },
  filterItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  yearDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  yearDropdownText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  yearDropdownArrow: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  dropdownClose: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dropdownItemTextSelected: {
    color: '#20B2AA',
    fontWeight: '600',
  },
  dropdownItemCheck: {
    fontSize: 18,
    color: '#20B2AA',
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 10,
    gap: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterTabActive: {
    backgroundColor: '#20B2AA',
    borderColor: '#20B2AA',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  transactionsSection: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 80,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  incomeBadge: {
    backgroundColor: '#d4edda',
  },
  expenseBadge: {
    backgroundColor: '#f8d7da',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#27ae60',
  },
  expenseAmount: {
    color: '#e74c3c',
  },
  transactionCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  transactionDescription: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  transactionActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  editButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#20B2AA',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#20B2AA',
    borderColor: '#20B2AA',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#20B2AA',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Compact Modal Styles
  modalContainerCompact: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
    flexShrink: 0,
  },
  modalHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitleCompact: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalContentCompact: {
    padding: 15,
  },
  inputContainerCompact: {
    marginBottom: 15,
  },
  labelCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  inputCompact: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#2c3e50',
  },
  textAreaCompact: {
    height: 60,
    textAlignVertical: 'top',
  },
  typeButtonsCompact: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButtonCompact: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  typeButtonTextCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  submitButtonCompact: {
    backgroundColor: '#20B2AA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  submitButtonTextCompact: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  // Dropdown Styles
  dropdownButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#2c3e50',
  },
  dropdownButtonPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  // Category Dropdown Modal
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  categoryDropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryDropdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  categoryDropdownClose: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  categoryDropdownScroll: {
    maxHeight: 300,
  },
  categoryDropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryDropdownItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  categoryDropdownItemText: {
    fontSize: 15,
    color: '#2c3e50',
  },
  categoryDropdownItemTextSelected: {
    color: '#20B2AA',
    fontWeight: '600',
  },
  // Date Picker Styles
  datePickerButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: 15,
    color: '#2c3e50',
  },
  datePickerIcon: {
    fontSize: 18,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 350,
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  dateSection: {
    marginBottom: 15,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  dateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#20B2AA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    minWidth: 100,
    textAlign: 'center',
  },
  datePickerModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  datePickerModalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  datePickerModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  datePickerModalConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
  },
  datePickerModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Delete Confirmation Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 25,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 15,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 25,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  deleteModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  cancelButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    backgroundColor: '#e74c3c',
  },
  confirmDeleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});



