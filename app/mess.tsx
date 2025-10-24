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
  const [showDatePicker, setShowDatePicker] = useState(false);
  



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
        setRecords(data.data.records || []);
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

    console.log('Adding record with:', {
      userId: user.id,
      token: token ? 'Present' : 'Missing',
      date: selectedDate.toISOString().split('T')[0],
      mealType,
      price: priceNum,
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
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Success response:', data);
      
      if (data.success) {
        showSuccess('Record added successfully!');
        setPrice('');
        loadRecords();
      } else {
        showError(data.message || 'Failed to add record');
      }
    } catch (error) {
      console.error('Error adding record:', error);
      if (error instanceof SyntaxError) {
        showError('Unable to connect to server. Please check if the backend is running.', 'Connection Error');
      } else {
        showError(error instanceof Error ? error.message : 'Failed to add record. Please try again.');
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
          <Text style={styles.recordMeal}>
            {mealEmoji} {item.mealType}
          </Text>
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

        {/* Add Record Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add New Record</Text>
          
          {/* Date Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>📅 Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateInputText}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.dateInputIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          {/* Meal Type Selector */}
          {renderMealTypeSelector()}

          {/* Price Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>💰 Price</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Enter meal price"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[styles.addButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleAddRecord}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.addButtonText}>Add Record</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Records List */}
        <View style={styles.recordsSection}>
          <Text style={styles.recordsTitle}>Recent Records</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#20B2AA" />
              <Text style={styles.loadingText}>Loading records...</Text>
            </View>
          ) : records.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>No records found</Text>
              <Text style={styles.emptySubtext}>Add your first meal record above</Text>
            </View>
          ) : (
            <FlatList
              data={records}
              renderItem={renderRecord}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
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
    </KeyboardAvoidingView>
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
});
