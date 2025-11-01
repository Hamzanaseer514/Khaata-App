import config from '@/config/config';
import { useAuth } from '@/contexts/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
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
  const [records, setRecords] = useState<MessRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner'>('Breakfast');
  const [price, setPrice] = useState('');
  const [personCount, setPersonCount] = useState('1');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Year and Month filter state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  



  const mealTypes = [
    { value: 'Breakfast', label: 'Breakfast', emoji: '🌅' },
    { value: 'Lunch', label: 'Lunch', emoji: '☀️' },
    { value: 'Dinner', label: 'Dinner', emoji: '🌙' },
  ];


  useEffect(() => {
    if (user && token) {
      loadRecords();
    }
  }, [user, token]);

  const loadRecords = async () => {
    if (!user?.id || !token) {
      console.log('Missing user or token:', { userId: user?.id, token: token ? 'Present' : 'Missing' });
      return;
    }
    
    console.log('Loading records for user:', user.id);
    console.log('API URL:', `${config.BASE_URL}/mess/user/${user.id}`);
    
    setIsLoading(true);
    try {
      const response = await fetch(`${config.BASE_URL}/mess/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Records response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('No records found (404)');
          setRecords([]);
          return;
        }
        const errorText = await response.text();
        console.log('Records error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Records success response:', data);
      
      if (data.success) {
        const loadedRecords = data.data.records || [];
        setRecords(loadedRecords);
        // Set selected year and month to the latest date in the data, or current date
        if (loadedRecords.length > 0) {
          const latestRecord = loadedRecords[0]; // Records are already sorted by date descending
          const latestDate = new Date(latestRecord.date);
          setSelectedYear(latestDate.getFullYear());
          setSelectedMonth(latestDate.getMonth() + 1);
        }
      } else {
        showError(data.message || 'Failed to load records');
        setRecords([]);
      }
    } catch (error) {
      console.error('Error loading records:', error);
      if (error instanceof SyntaxError) {
        showError('Unable to connect to server. Please check if the backend is running.', 'Connection Error');
      } else {
        showError('Failed to load records. Please try again.');
      }
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };


  const handleAddRecord = async () => {
    if (!user?.id || !token) {
      showError('Authentication required. Please login again.');
      return;
    }
    
    if (!selectedDate || !mealType || !price) {
      showError('Please fill in all fields');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      showError('Please enter a valid price');
      return;
    }

    const personCountNum = parseInt(personCount);
    if (isNaN(personCountNum) || personCountNum < 1) {
      showError('Please enter a valid person count (minimum 1)');
      return;
    }

    console.log('Adding record with:', {
      userId: user.id,
      token: token ? 'Present' : 'Missing',
      date: selectedDate.toISOString().split('T')[0],
      mealType,
      price: priceNum,
      personCount: personCountNum,
      url: `${config.BASE_URL}/mess/add`
    });

    setIsSubmitting(true);
    try {
      const response = await fetch(`${config.BASE_URL}/mess/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate.toISOString().split('T')[0],
          mealType,
          price: priceNum,
          personCount: personCountNum,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Clone response to read as text if JSON parsing fails
      const responseClone = response.clone();
      let responseData;
      
      try {
        responseData = await response.json();
        console.log('Response data:', responseData);
      } catch (jsonError) {
        // If response is not JSON, read as text from clone
        try {
          const errorText = await responseClone.text();
          console.log('Non-JSON error response:', errorText);
          showError(`Server error: ${response.status}`);
        } catch (textError) {
          showError(`Server error: ${response.status}`);
        }
        return;
      }

      if (!response.ok) {
        // Backend returns proper error messages in JSON format
        const errorMessage = responseData.message || `Server error: ${response.status}`;
        console.log('Error message:', errorMessage);
        showError(errorMessage);
        return;
      }
      
      if (responseData.success) {
        showSuccess('Record added successfully!');
        setPrice('');
        setPersonCount('1');
        setSelectedDate(new Date());
        setMealType('Breakfast');
        setShowAddModal(false);
        loadRecords();
      } else {
        showError(responseData.message || 'Failed to add record');
      }
    } catch (error) {
      console.error('Error adding record:', error);
      if (error instanceof SyntaxError) {
        showError('Unable to connect to server. Please check if the backend is running.', 'Connection Error');
      } else {
        // Try to parse error response if it's a JSON parse error
        if (error instanceof Error && error.message.includes('JSON')) {
          showError('Failed to add record. This record may already exist.');
        } else {
          showError(error instanceof Error ? error.message : 'Failed to add record. Please try again.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `₹${price.toFixed(2)}`;
  };


  const renderRecord = ({ item }: { item: MessRecord }) => {
    const mealEmoji = mealTypes.find(m => m.value === item.mealType)?.emoji || '🍽️';
    const personCountValue = item.personCount || 1;
    
    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteRecord(item.id)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.recordDetails}>
          <View>
            <Text style={styles.recordMeal}>
              {mealEmoji} {item.mealType}
            </Text>
            {personCountValue > 1 && (
              <Text style={styles.recordPersonCount}>
                👥 {personCountValue} Persons
              </Text>
            )}
          </View>
          <Text style={styles.recordPrice}>{formatPrice(item.price)}</Text>
        </View>
      </View>
    );
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!user?.id || !token) return;

    try {
      const response = await fetch(`${config.BASE_URL}/mess/delete/${recordId}`, {
        method: 'DELETE',
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
        showSuccess('Record deleted successfully!');
        loadRecords();
      } else {
        showError(data.message || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      showError('Failed to delete record. Please try again.');
    }
  };

  const renderMealTypeSelector = () => (
    <View style={styles.mealTypeContainer}>
      <Text style={styles.label}>Meal Type</Text>
      <View style={styles.mealTypeButtons}>
        {mealTypes.map((meal) => (
          <TouchableOpacity
            key={meal.value}
            style={[
              styles.mealTypeButton,
              mealType === meal.value && styles.mealTypeButtonSelected,
            ]}
            onPress={() => setMealType(meal.value as 'Breakfast' | 'Lunch' | 'Dinner')}
          >
            <Text style={[
              styles.mealTypeEmoji,
              mealType === meal.value && styles.mealTypeEmojiSelected,
            ]}>
              {meal.emoji}
            </Text>
            <Text style={[
              styles.mealTypeText,
              mealType === meal.value && styles.mealTypeTextSelected,
            ]}>
              {meal.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );


  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>🍽️ Mess Attendance</Text>
            <Text style={styles.headerSubtitle}>Track your daily meals</Text>
          </View>
        </View>

        {/* Records List */}
        <View style={styles.recordsSection}>
          {/* <Text style={styles.recordsTitle}>Recent Records</Text> */}
          
          {/* Year and Month Filter Dropdown */}
          {records.length > 0 && (() => {
            // Get unique years from records data
            const uniqueYears = [...new Set(records.map(r => new Date(r.date).getFullYear()))].sort((a, b) => b - a);
            
            // Get unique months for selected year
            const recordsForYear = records.filter(r => new Date(r.date).getFullYear() === selectedYear);
            const uniqueMonths = [...new Set(recordsForYear.map(r => new Date(r.date).getMonth() + 1))].sort((a, b) => b - a);
            
            // Filter records by selected year and month
            const filteredRecords = records.filter(r => {
              const recordDate = new Date(r.date);
              return recordDate.getFullYear() === selectedYear && recordDate.getMonth() + 1 === selectedMonth;
            });
            
            return (
              <>
                <View style={styles.filterContainer}>
                  {/* <Text style={styles.yearFilterLabel}>Filter:</Text> */}
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
                          style={styles.modalOverlay}
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
                              {uniqueYears.map((year) => (
                                <TouchableOpacity
                                  key={year}
                                  style={[
                                    styles.dropdownItem,
                                    selectedYear === year && styles.dropdownItemSelected
                                  ]}
                                  onPress={() => {
                                    setSelectedYear(year);
                                    // Reset month if it doesn't exist in new year
                                    const yearRecords = records.filter(r => new Date(r.date).getFullYear() === year);
                                    const yearMonths = [...new Set(yearRecords.map(r => new Date(r.date).getMonth() + 1))].sort((a, b) => b - a);
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
                              ))}
                            </ScrollView>
                          </View>
                        </TouchableOpacity>
                      </Modal>
                    </View>

                    {/* Month Filter */}
                    {uniqueMonths.length > 0 && (
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
                            style={styles.modalOverlay}
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
                                {uniqueMonths.map((month) => (
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
                    )}
                  </View>
                </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#20B2AA" />
              <Text style={styles.loadingText}>Loading records...</Text>
            </View>
                ) : filteredRecords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
                    <Text style={styles.emptyText}>No records found for {monthNames[selectedMonth - 1]} {selectedYear}</Text>
              <Text style={styles.emptySubtext}>Add your first meal record above</Text>
            </View>
          ) : (
            <FlatList
                    data={filteredRecords}
              renderItem={renderRecord}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          )}
              </>
            );
          })()}
          
          {records.length === 0 && !isLoading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>No records found</Text>
              <Text style={styles.emptySubtext}>Add your first meal record above</Text>
            </View>
          )}
          
          {isLoading && records.length === 0 && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#20B2AA" />
              <Text style={styles.loadingText}>Loading records...</Text>
            </View>
          )}
        </View>

        {/* Custom Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Date</Text>
              
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

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingAddButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.floatingAddButtonText}>+ Add Record</Text>
      </TouchableOpacity>

      {/* Add Record Modal */}
      {showAddModal && (
        <AddRecordModal
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          mealType={mealType}
          setMealType={setMealType}
          price={price}
          setPrice={setPrice}
          personCount={personCount}
          setPersonCount={setPersonCount}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
          isSubmitting={isSubmitting}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddRecord}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// Add Record Modal Component
function AddRecordModal({
  selectedDate,
  setSelectedDate,
  mealType,
  setMealType,
  price,
  setPrice,
  personCount,
  setPersonCount,
  showDatePicker,
  setShowDatePicker,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  setMealType: (type: 'Breakfast' | 'Lunch' | 'Dinner') => void;
  price: string;
  setPrice: (price: string) => void;
  personCount: string;
  setPersonCount: (count: string) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const mealTypes = [
    { value: 'Breakfast' as const, label: 'Breakfast', emoji: '🌅' },
    { value: 'Lunch' as const, label: 'Lunch', emoji: '☀️' },
    { value: 'Dinner' as const, label: 'Dinner', emoji: '🌙' },
  ];

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlayCompact}
      >
        <View style={styles.modalContainerCompact}>
          <View style={styles.modalHeaderCompact}>
            <Text style={styles.modalTitleCompact}>Add Record</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContentCompact}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Date Input */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>📅 Date</Text>
              <TouchableOpacity
                style={styles.dateInputCompact}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateInputTextCompact}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.dateInputIconCompact}>📅</Text>
              </TouchableOpacity>
            </View>

            {/* Meal Type Selector */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Meal Type *</Text>
              <View style={styles.mealTypeButtonsCompact}>
                {mealTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.mealTypeButtonCompact,
                      mealType === type.value && styles.mealTypeButtonActiveCompact
                    ]}
                    onPress={() => setMealType(type.value)}
                  >
                    <Text style={[
                      styles.mealTypeButtonTextCompact,
                      mealType === type.value && styles.mealTypeButtonTextActiveCompact
                    ]}>
                      {type.emoji} {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Input */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>💰 Price (per person) *</Text>
              <TextInput
                style={styles.inputCompact}
                value={price}
                onChangeText={setPrice}
                placeholder="Enter meal price per person"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            {/* Person Count Input */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>👥 Person</Text>
              <TextInput
                style={styles.inputCompact}
                value={personCount}
                onChangeText={setPersonCount}
                placeholder="Enter number of persons (default: 1)"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButtonCompact, isSubmitting && styles.submitButtonDisabled]}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonTextCompact}>Add Record</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#20B2AA',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backButton: {
    marginBottom: 15,
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
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 10,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
  },
  dateInputIcon: {
    fontSize: 18,
  },
  mealTypeContainer: {
    marginBottom: 20,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealTypeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mealTypeButtonSelected: {
    backgroundColor: '#20B2AA',
    borderColor: '#20B2AA',
  },
  mealTypeEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  mealTypeEmojiSelected: {
    // Emoji color doesn't change, but we can add a subtle effect
  },
  mealTypeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  mealTypeTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#20B2AA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#20B2AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  recordsSection: {
    margin: 20,
    marginTop: 0,
  },
  recordsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  recordPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#20B2AA',
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordMeal: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  recordPersonCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    flexGrow: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  dateSection: {
    marginBottom: 15,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    backgroundColor: '#20B2AA',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  dateButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    minWidth: 100,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 10,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#20B2AA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginLeft: 10,
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Year and Month Filter Styles
  filterContainer: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  yearFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
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
    marginTop: 8,
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
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  // Floating Add Button
  floatingAddButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#20B2AA',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#20B2AA',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  floatingAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Compact Modal Styles
  modalOverlayCompact: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainerCompact: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitleCompact: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContentCompact: {
    padding: 18,
  },
  inputContainerCompact: {
    marginBottom: 18,
  },
  labelCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  inputCompact: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  dateInputCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  dateInputTextCompact: {
    fontSize: 16,
    color: '#2c3e50',
  },
  dateInputIconCompact: {
    fontSize: 18,
  },
  mealTypeButtonsCompact: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeButtonCompact: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  mealTypeButtonActiveCompact: {
    borderColor: '#20B2AA',
    backgroundColor: '#f0fdfa',
  },
  mealTypeButtonTextCompact: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  mealTypeButtonTextActiveCompact: {
    color: '#20B2AA',
  },
  submitButtonCompact: {
    backgroundColor: '#20B2AA',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  submitButtonTextCompact: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
