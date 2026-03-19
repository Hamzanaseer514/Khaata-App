import BottomNav from '@/components/BottomNav';
import config from '@/config/config';
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
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MEAL_TYPES = [
  { value: 'Breakfast' as const, label: 'Breakfast', icon: 'sunny-outline' as const, color: '#f59e0b' },
  { value: 'Lunch' as const, label: 'Lunch', icon: 'restaurant-outline' as const, color: '#10b981' },
  { value: 'Dinner' as const, label: 'Dinner', icon: 'moon-outline' as const, color: '#6366f1' },
];

interface MessRecord {
  id: string;
  date: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  price: number;
  personCount?: number;
  createdAt: string;
}

export default function MessScreen() {
  const { user, token } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';

  const [records, setRecords] = useState<MessRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MessRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner'>('Breakfast');
  const [price, setPrice] = useState('');
  const [personCount, setPersonCount] = useState('1');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Filter state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [showFilters, setShowFilters] = useState(false);
  const filterAnim = React.useRef(new Animated.Value(0)).current;
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (user && token) loadRecords();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  }, [user, token]);

  const loadRecords = async () => {
    if (!user?.id || !token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${config.BASE_URL}/mess/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        if (response.status === 404) { setRecords([]); return; }
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) setRecords(data.data.records || []);
      else { showError(data.message || 'Failed to load records'); setRecords([]); }
    } catch (error) {
      console.error('Error loading records:', error);
      showError('Failed to load records.');
      setRecords([]);
    } finally { setIsLoading(false); }
  };

  const handleAddRecord = async () => {
    if (!user?.id || !token) { showError('Please login again.'); return; }
    if (!price || parseFloat(price) <= 0) { showError('Enter a valid price'); return; }
    const pc = parseInt(personCount);
    if (isNaN(pc) || pc < 1) { showError('Enter valid person count'); return; }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${config.BASE_URL}/mess/add`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate.toISOString().split('T')[0], mealType, price: parseFloat(price), personCount: pc }),
      });
      const data = await response.json();
      if (!response.ok) { showError(data.message || `Error: ${response.status}`); return; }
      if (data.success) {
        showSuccess('Record added!');
        setPrice(''); setPersonCount('1'); setSelectedDate(new Date()); setMealType('Breakfast');
        setShowAddModal(false); loadRecords();
      } else showError(data.message || 'Failed');
    } catch (error) { console.error('Error:', error); showError('Failed to add record.'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeletePress = (recordId: string) => {
    setRecordToDelete(recordId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete || !user?.id || !token) { setShowDeleteConfirm(false); setRecordToDelete(null); return; }
    try {
      const response = await fetch(`${config.BASE_URL}/mess/delete/${recordToDelete}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      if (data.success) { showSuccess('Deleted!'); loadRecords(); }
      else showError(data.message || 'Failed');
    } catch (error) { console.error('Error:', error); showError('Failed to delete.'); }
    finally { setShowDeleteConfirm(false); setRecordToDelete(null); }
  };

  const handleEditPress = (record: MessRecord) => {
    setEditingRecord(record);
    setSelectedDate(new Date(record.date));
    setMealType(record.mealType);
    setPrice(String(record.price));
    setPersonCount(String(record.personCount || 1));
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editingRecord || !user?.id || !token) return;
    if (!price || parseFloat(price) <= 0) { showError('Enter a valid price'); return; }
    const pc = parseInt(personCount);
    if (isNaN(pc) || pc < 1) { showError('Enter valid person count'); return; }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${config.BASE_URL}/mess/update/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate.toISOString().split('T')[0], mealType, price: parseFloat(price), personCount: pc }),
      });
      const data = await response.json();
      if (!response.ok) { showError(data.message || `Error: ${response.status}`); return; }
      if (data.success) {
        showSuccess('Record updated!');
        setShowEditModal(false); setEditingRecord(null);
        setPrice(''); setPersonCount('1'); setSelectedDate(new Date()); setMealType('Breakfast');
        loadRecords();
      } else showError(data.message || 'Failed');
    } catch (error) { console.error('Error:', error); showError('Failed to update.'); }
    finally { setIsSubmitting(false); }
  };

  // Filter
  const filteredRecords = records.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
  });

  // Summary for current filter
  const totalSpent = filteredRecords.reduce((s, r) => s + r.price, 0);
  const mealCounts = { Breakfast: 0, Lunch: 0, Dinner: 0 };
  filteredRecords.forEach(r => { mealCounts[r.mealType]++; });

  // Years from data
  const currentYear = new Date().getFullYear();
  const transactionYears = [...new Set(records.map(r => new Date(r.date).getFullYear()))];
  const yearList = [...new Set([currentYear, ...transactionYears])].sort((a, b) => b - a);
  const allMonths = monthNames.map((name, idx) => ({ label: name, value: idx + 1 }));

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getMealInfo = (type: string) => MEAL_TYPES.find(m => m.value === type) || MEAL_TYPES[0];

  const renderRecord = ({ item }: { item: MessRecord }) => {
    const meal = getMealInfo(item.mealType);
    const persons = item.personCount || 1;
    return (
      <Animated.View style={[styles.recordCard, {
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
        opacity: fadeAnim, transform: [{ translateY: slideAnim }],
      }]}>
        {/* Meal icon */}
        <View style={[styles.mealIcon, { backgroundColor: `${meal.color}15` }]}>
          <Ionicons name={meal.icon} size={24} color={meal.color} />
        </View>
        {/* Info */}
        <View style={styles.recordInfo}>
          <Text style={[styles.recordMealType, { color: COLORS.text }]}>{item.mealType}</Text>
          <Text style={[styles.recordDate, { color: COLORS.textMuted }]}>
            {formatDate(item.date)}{persons > 1 ? ` · ${persons} persons` : ''}
          </Text>
        </View>
        {/* Price */}
        <Text style={[styles.recordPrice, { color: accent }]}>Rs {Math.round(item.price)}</Text>
        {/* Edit + Delete icons (like contacts) */}
        <View style={styles.compactActions}>
          <TouchableOpacity style={styles.smallIconBtn} onPress={() => handleEditPress(item)} activeOpacity={0.6}>
            <Ionicons name="pencil" size={14} color={isDarkMode ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallIconBtn} onPress={() => handleDeletePress(item.id)} activeOpacity={0.6}>
            <Ionicons name="trash-outline" size={14} color="#ef4444" opacity={0.6} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (isLoading && records.length === 0) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingScreenText, { color: COLORS.textMuted }]}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Mess Attendance</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => router.push('/mess-analytics')}
            activeOpacity={0.8}
          >
            <Ionicons name="bar-chart-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date bar + filter toggle */}
      <View style={styles.dateBar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dateBarTitle, { color: COLORS.text }]}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </Text>
          <Text style={[styles.dateBarSub, { color: COLORS.textMuted }]}>
            {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} · Rs {Math.round(totalSpent).toLocaleString()}
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

      {/* Collapsible filters */}
      <Animated.View style={{
        overflow: 'hidden',
        maxHeight: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }),
        opacity: filterAnim,
      }}>
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
      </Animated.View>

      {/* Year/Month Dropdown Modals */}
      <DropdownModal visible={showYearDropdown} onClose={() => setShowYearDropdown(false)} title="Select Year"
        items={yearList.map(y => ({ label: String(y), value: y }))} selected={selectedYear}
        onSelect={(v) => { setSelectedYear(v as number); setShowYearDropdown(false); }}
        isDarkMode={isDarkMode} COLORS={COLORS} accent={accent} />
      <DropdownModal visible={showMonthDropdown} onClose={() => setShowMonthDropdown(false)} title="Select Month"
        items={allMonths} selected={selectedMonth}
        onSelect={(v) => { setSelectedMonth(v as number); setShowMonthDropdown(false); }}
        isDarkMode={isDarkMode} COLORS={COLORS} accent={accent} />

      {/* Meal summary chips */}
      <View style={styles.mealChipRow}>
        {MEAL_TYPES.map(m => (
          <View key={m.value} style={[styles.mealChip, {
            backgroundColor: isDarkMode ? `${m.color}12` : `${m.color}0A`,
            borderColor: isDarkMode ? `${m.color}30` : `${m.color}20`,
          }]}>
            <Ionicons name={m.icon} size={14} color={m.color} />
            <Text style={[styles.mealChipText, { color: m.color }]}>{mealCounts[m.value]}</Text>
          </View>
        ))}
      </View>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.05)' : 'rgba(10, 126, 164, 0.05)' }]}>
            <Ionicons name="restaurant-outline" size={70} color={isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(10, 126, 164, 0.2)'} />
          </View>
          <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No Records</Text>
          <Text style={[styles.emptyDesc, { color: COLORS.textMuted }]}>
            {records.length === 0 ? 'Add your first meal record' : `No records for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderRecord}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: accent, shadowColor: isDarkMode ? accent : '#000' }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={isDarkMode ? '#0a0a0c' : '#ffffff'} />
      </TouchableOpacity>

      {/* Add Record Modal */}
      {showAddModal && (
        <AddRecordModal
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          mealType={mealType} setMealType={setMealType}
          price={price} setPrice={setPrice}
          personCount={personCount} setPersonCount={setPersonCount}
          showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
          isSubmitting={isSubmitting} onClose={() => setShowAddModal(false)} onSubmit={handleAddRecord}
          isDarkMode={isDarkMode} COLORS={COLORS} accent={accent}
          title="Add Record"
        />
      )}

      {/* Edit Record Modal */}
      {showEditModal && editingRecord && (
        <AddRecordModal
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          mealType={mealType} setMealType={setMealType}
          price={price} setPrice={setPrice}
          personCount={personCount} setPersonCount={setPersonCount}
          showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
          isSubmitting={isSubmitting}
          onClose={() => { setShowEditModal(false); setEditingRecord(null); setPrice(''); setPersonCount('1'); setSelectedDate(new Date()); setMealType('Breakfast'); }}
          onSubmit={handleEditSubmit}
          isDarkMode={isDarkMode} COLORS={COLORS} accent={accent}
          title="Edit Record"
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            <Ionicons name="warning-outline" size={40} color="#ef4444" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.confirmTitle, { color: COLORS.text }]}>Delete record?</Text>
            <Text style={[styles.confirmDesc, { color: COLORS.textMuted }]}>This action cannot be undone.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}
                onPress={() => { setShowDeleteConfirm(false); setRecordToDelete(null); }}
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

// Dropdown Modal (reusable)
function DropdownModal({ visible, onClose, title, items, selected, onSelect, isDarkMode, COLORS, accent }: any) {
  if (!visible) return null;
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.dropdownCard, { backgroundColor: cardBg, borderColor: isDarkMode ? 'rgba(34,211,238,0.15)' : '#e2e8f0' }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dropdownHead, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
            <Text style={[styles.dropdownTitle, { color: COLORS.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={COLORS.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {items.map((item: any) => (
              <TouchableOpacity key={String(item.value)}
                style={[styles.dropdownItem, selected === item.value && { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.08)' : '#f0f9ff' }]}
                onPress={() => onSelect(item.value)}
              >
                <Text style={[styles.dropdownItemText, { color: COLORS.text }, selected === item.value && { color: accent, fontWeight: '600' }]}>{item.label}</Text>
                {selected === item.value && <Ionicons name="checkmark" size={18} color={accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Add Record Modal
function AddRecordModal({ selectedDate, setSelectedDate, mealType, setMealType, price, setPrice, personCount, setPersonCount, showDatePicker, setShowDatePicker, isSubmitting, onClose, onSubmit, isDarkMode, COLORS, accent, title = 'Add Record' }: any) {
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const inputBg = isDarkMode ? COLORS.background : '#f8fafc';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.05)' : '#e2e8f0';

  const formatDateDisplay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent hardwareAccelerated>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        </TouchableOpacity>

        <View style={[styles.formSheet, { backgroundColor: cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.handleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)' }]} />

          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: COLORS.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
            <View style={styles.formBody}>
              {/* Big Price Input */}
              <View style={styles.bigAmountRow}>
                <Text style={[styles.bigCurrency, { color: COLORS.primary }]}>Rs</Text>
                <TextInput
                  style={[styles.bigAmountInput, { color: COLORS.text }]}
                  placeholder="0" placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric" value={price} onChangeText={setPrice}
                  selectionColor={COLORS.primary} autoFocus
                />
              </View>

              {/* Meal Type */}
              <View style={styles.mealToggleRow}>
                {MEAL_TYPES.map((m) => (
                  <TouchableOpacity key={m.value}
                    style={[styles.mealToggle, {
                      backgroundColor: mealType === m.value ? `${m.color}15` : 'transparent',
                      borderColor: mealType === m.value ? m.color : borderColor,
                    }]}
                    onPress={() => setMealType(m.value)}
                  >
                    <Ionicons name={m.icon} size={22} color={mealType === m.value ? m.color : COLORS.textMuted} />
                    <Text style={[styles.mealToggleText, { color: mealType === m.value ? m.color : COLORS.textMuted }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Person Count */}
              <View style={[styles.formFieldRow, { backgroundColor: inputBg }]}>
                <Ionicons name="people-outline" size={20} color={COLORS.textMuted} />
                <TextInput
                  style={[styles.formFieldInput, { color: COLORS.text }]}
                  placeholder="Persons (default 1)" placeholderTextColor={COLORS.textMuted}
                  value={personCount} onChangeText={setPersonCount} keyboardType="numeric"
                />
              </View>

              {/* Date */}
              <TouchableOpacity style={[styles.formFieldRow, { backgroundColor: inputBg }]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} />
                <Text style={[styles.formFieldText, { color: COLORS.text }]}>{formatDateDisplay(selectedDate)}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: COLORS.primary, shadowColor: COLORS.primary }, isSubmitting && { opacity: 0.6 }]}
                onPress={onSubmit} disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.saveButtonText}>{title === 'Edit Record' ? 'Update Record' : 'Save Record'}</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Calendar Picker */}
          {showDatePicker && (
            <CalendarPicker visible={showDatePicker} selectedDate={selectedDate}
              onSelect={(d: Date) => { setSelectedDate(d); setShowDatePicker(false); }}
              onClose={() => setShowDatePicker(false)}
              isDarkMode={isDarkMode} COLORS={COLORS} accent={accent} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Calendar Picker (same as personal-khaata)
function CalendarPicker({ visible, selectedDate, onSelect, onClose, isDarkMode, COLORS, accent }: any) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
  const today = new Date();

  React.useEffect(() => { if (visible) setViewDate(new Date(selectedDate)); }, [visible]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const prevDays = new Date(year, month, 0).getDate();

  const days: { day: number; current: boolean; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) { const d = prevDays - i; days.push({ day: d, current: false, date: new Date(year, month - 1, d) }); }
  for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, current: true, date: new Date(year, month, i) });
  const rem = 42 - days.length;
  for (let i = 1; i <= rem; i++) days.push({ day: i, current: false, date: new Date(year, month + 1, i) });

  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={calStyles.overlay}>
        <View style={[calStyles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={calStyles.calHeader}>
            <TouchableOpacity onPress={() => setViewDate(new Date(year, month - 1, 1))} style={calStyles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={accent} />
            </TouchableOpacity>
            <Text style={[calStyles.calHeaderText, { color: COLORS.text }]}>
              {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => setViewDate(new Date(year, month + 1, 1))} style={calStyles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={accent} />
            </TouchableOpacity>
          </View>
          <View style={calStyles.weekRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => (
              <View key={w} style={calStyles.weekCell}><Text style={[calStyles.weekLabel, { color: COLORS.textMuted }]}>{w}</Text></View>
            ))}
          </View>
          <View style={calStyles.grid}>
            {days.map((item, idx) => {
              const sel = same(item.date, selectedDate);
              const tod = same(item.date, today);
              return (
                <TouchableOpacity key={idx} style={calStyles.dayCell} onPress={() => onSelect(item.date)} activeOpacity={0.6}>
                  <View style={[calStyles.dayCircle, sel && { backgroundColor: accent }, tod && !sel && { borderWidth: 1.5, borderColor: accent }]}>
                    <Text style={[calStyles.dayText,
                      { color: item.current ? COLORS.text : (isDarkMode ? '#3b4252' : '#cbd5e1') },
                      sel && { color: isDarkMode ? '#0a0a0c' : '#fff', fontWeight: '700' },
                      tod && !sel && { color: accent, fontWeight: '700' },
                    ]}>{item.day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={calStyles.footer}>
            <TouchableOpacity style={[calStyles.todayBtn, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.1)' : 'rgba(10,126,164,0.08)', borderColor: isDarkMode ? 'rgba(34,211,238,0.2)' : 'rgba(10,126,164,0.15)' }]} onPress={() => onSelect(new Date())}>
              <Ionicons name="today-outline" size={16} color={accent} />
              <Text style={[calStyles.todayBtnText, { color: accent }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[calStyles.cancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]} onPress={onClose}>
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
  todayBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  todayBtnText: { fontSize: 14, fontWeight: '600' },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingScreenText: { marginTop: 16, fontSize: 16, fontWeight: '500' },

  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  dateBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  dateBarTitle: { fontSize: 18, fontWeight: '700' },
  dateBarSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  filterIconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  dropdownRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, gap: 10 },
  dropdownBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  dropdownBtnText: { flex: 1, fontSize: 15, fontWeight: '600' },

  mealChipRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  mealChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  mealChipText: { fontSize: 15, fontWeight: '800' },

  listContent: { paddingHorizontal: 20, paddingBottom: 160 },

  recordCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, height: 80,
    paddingHorizontal: 14, marginBottom: 8, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  mealIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  recordInfo: { flex: 1 },
  recordMealType: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  recordDate: { fontSize: 13 },
  recordPrice: { fontSize: 16, fontWeight: '800', marginRight: 6 },
  compactActions: { flexDirection: 'column', justifyContent: 'center', gap: 8, marginLeft: 4, width: 24, alignItems: 'center' },
  smallIconBtn: { padding: 2 },

  emptyState: { flex: 1, alignItems: 'center', paddingHorizontal: 40, paddingTop: 50 },
  emptyIconWrap: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  fab: {
    position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },

  // Dropdown
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownCard: { borderRadius: 16, width: '80%', maxHeight: '60%', borderWidth: 1, overflow: 'hidden' },
  dropdownHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  dropdownTitle: { fontSize: 17, fontWeight: '700' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  dropdownItemText: { fontSize: 15 },

  // Form Sheet
  formSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '95%', paddingBottom: Platform.OS === 'ios' ? 30 : 10 },
  handleBar: { width: 40, height: 5, borderRadius: 2.5, alignSelf: 'center', marginTop: 12 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 15 },
  formTitle: { fontSize: 22, fontWeight: '900' },
  formBody: { paddingHorizontal: 24, paddingTop: 10 },
  bigAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 30 },
  bigCurrency: { fontSize: 24, fontWeight: '800', marginRight: 10 },
  bigAmountInput: { fontSize: 56, fontWeight: '900', minWidth: 100, textAlign: 'center' },
  mealToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  mealToggle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1, gap: 4 },
  mealToggleText: { fontSize: 13, fontWeight: '700' },
  formFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 12 },
  formFieldText: { flex: 1, fontSize: 15, fontWeight: '600' },
  formFieldInput: { flex: 1, fontSize: 15, fontWeight: '600' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 18, marginTop: 12,
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Delete confirm
  confirmOverlay: {
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
});
