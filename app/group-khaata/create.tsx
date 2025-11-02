import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import config from '../../config/config';

interface Contact {
  _id: string;
  id?: string; // For compatibility
  name: string;
  phone: string;
  email?: string;
}

export default function CreateGroupTransactionScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'manual'>('equal');
  const [manualAmounts, setManualAmounts] = useState<{[contactId: string]: string}>({});
  const [userAmount, setUserAmount] = useState<string>('');
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';



  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        console.log('=== FRONTEND: Fetched contacts ===');
        console.log('Contacts data:', data.data);
        data.data.forEach((contact: Contact, index: number) => {
          console.log(`Contact ${index}:`, {
            _id: contact._id,
            id: contact.id,
            name: contact.name,
            phone: contact.phone
          });
        });
        setContacts(data.data);
      } else {
        showError(data.message || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      showError('Failed to fetch contacts');
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const updateManualAmount = (contactId: string, amount: string) => {
    setManualAmounts(prev => ({
      ...prev,
      [contactId]: amount
    }));
  };

  const getTotalManualAmount = () => {
    const contactTotal = Object.values(manualAmounts).reduce((sum, amount) => {
      return sum + (parseFloat(amount) || 0);
    }, 0);
    const userTotal = parseFloat(userAmount) || 0;
    return contactTotal + userTotal;
  };

  const isManualAmountValid = () => {
    const totalManual = getTotalManualAmount();
    const totalAmountNum = parseFloat(totalAmount) || 0;
    return Math.abs(totalManual - totalAmountNum) < 0.01; // Allow small rounding differences
  };


  const calculatePerPersonShare = () => {
    const amount = parseFloat(totalAmount);
    const memberCount = selectedContacts.length + 1; // include You
    if (amount > 0 && memberCount > 0) {
      return (amount / memberCount).toFixed(2);
    }
    return '0.00';
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedContacts.length < 1) {
      showError('Please select at least 1 contact for group transaction');
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      showError('Please enter a valid total amount');
      return;
    }

    if (!description.trim()) {
      showError('Please enter a description');
      return;
    }

    // Additional validation for manual mode
    if (splitMode === 'manual' && !isManualAmountValid()) {
      showError(`Manual amounts total (₹${getTotalManualAmount().toFixed(2)}) must equal the total amount (₹${totalAmount})`);
      return;
    }

    setLoading(true);

    try {
      console.log('=== SUBMIT GROUP TRANSACTION ===');
      console.log('Selected Contacts:', selectedContacts);
      console.log('Total Amount:', parseFloat(totalAmount));
      console.log('Description:', description.trim());
      console.log('Split Mode:', splitMode);
      console.log('Manual Amounts:', manualAmounts);

      const requestBody: any = {
        payerId: 'USER', // You are paying
        contactIds: selectedContacts,
        totalAmount: parseFloat(totalAmount),
        description: description.trim(),
        splitMode: splitMode,
      };

      // Add individual amounts if manual mode
      if (splitMode === 'manual') {
        requestBody.individualAmounts = {};
        selectedContacts.forEach(contactId => {
          requestBody.individualAmounts[contactId] = parseFloat(manualAmounts[contactId] || '0');
        });
        requestBody.userAmount = parseFloat(userAmount) || 0;
      }

      const response = await fetch(`${config.BASE_URL}/group-transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(`Group transaction created successfully! Per person: ₹${data.data.perPersonShare}`);
        router.back();
      } else {
        showError(data.message || 'Failed to create group transaction');
      }
    } catch (error) {
      console.error('Error creating group transaction:', error);
      showError('Failed to create group transaction');
    } finally {
      setLoading(false);
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const contactId = item._id || item.id || '';
    const isSelected = selectedContacts.includes(contactId);

    return (
      <View style={[
        styles.contactCard,
        isSelected && styles.selectedContactCard,
      ]}>
        <TouchableOpacity
          style={styles.contactInfo}
          onPress={() => toggleContactSelection(contactId)}
        >
          <Text style={[styles.contactName, isSelected && styles.selectedText]}>
            {item.name}
          </Text>
          <Text style={[styles.contactPhone, isSelected && styles.selectedText]}>
            {item.phone}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.contactActions}>
          {isSelected && (
            <>
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedIndicatorText}>✓</Text>
              </View>
              
              {/* Manual Amount Input */}
              {splitMode === 'manual' && (
                <View style={styles.manualAmountContainer}>
                  <Text style={styles.manualAmountLabel}>Amount (₹)</Text>
                  <TextInput
                    style={styles.manualAmountInput}
                    value={manualAmounts[contactId] || ''}
                    onChangeText={(amount) => updateManualAmount(contactId, amount)}
                    placeholder="0.00"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group Transaction</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Transaction Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={totalAmount}
              onChangeText={setTotalAmount}
              placeholder="Enter total amount"
              placeholderTextColor={placeholderColor}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description"
              placeholderTextColor={placeholderColor}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Split Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Split?</Text>
          
          <View style={styles.splitModeContainer}>
            <TouchableOpacity
              style={[
                styles.splitModeButton,
                splitMode === 'equal' && styles.splitModeButtonSelected,
              ]}
              onPress={() => setSplitMode('equal')}
            >
              <Text style={[
                styles.splitModeText,
                splitMode === 'equal' && styles.splitModeTextSelected,
              ]}>
                ⚖️ Equal Divide
              </Text>
              <Text style={[
                styles.splitModeSubtext,
                splitMode === 'equal' && styles.splitModeSubtextSelected,
              ]}>
                Split equally among all
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.splitModeButton,
                splitMode === 'manual' && styles.splitModeButtonSelected,
              ]}
              onPress={() => setSplitMode('manual')}
            >
              <Text style={[
                styles.splitModeText,
                splitMode === 'manual' && styles.splitModeTextSelected,
              ]}>
                ✏️ Manual Entry
              </Text>
              <Text style={[
                styles.splitModeSubtext,
                splitMode === 'manual' && styles.splitModeSubtextSelected,
              ]}>
                Enter custom amounts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Amount Input (Manual Mode Only) */}
        {splitMode === 'manual' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Amount</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Share (₹)</Text>
              <TextInput
                style={styles.input}
                value={userAmount}
                onChangeText={setUserAmount}
                placeholder="Enter your amount"
                placeholderTextColor={placeholderColor}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Contact Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Select Contacts ({selectedContacts.length} selected)
          </Text>
          
          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No contacts available</Text>
              <TouchableOpacity
                style={styles.addContactButton}
                onPress={() => router.push('/contacts/add')}
              >
                <Text style={styles.addContactButtonText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item._id || item.id || ''}
              renderItem={renderContactItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Summary */}
        {selectedContacts.length > 0 && totalAmount && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Amount:</Text>
                <Text style={styles.summaryValue}>₹{totalAmount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Members (incl. You):</Text>
                <Text style={styles.summaryValue}>{selectedContacts.length + 1}</Text>
              </View>
              
              {splitMode === 'equal' ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Per Person Share:</Text>
                  <Text style={styles.summaryValue}>₹{calculatePerPersonShare()}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Your Amount:</Text>
                    <Text style={styles.summaryValue}>₹{parseFloat(userAmount || '0').toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Contacts Total:</Text>
                    <Text style={styles.summaryValue}>₹{Object.values(manualAmounts).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Manual Total:</Text>
                    <Text style={[
                      styles.summaryValue,
                      !isManualAmountValid() && styles.errorText
                    ]}>
                      ₹{getTotalManualAmount().toFixed(2)}
                    </Text>
                  </View>
                  {!isManualAmountValid() && (
                    <Text style={styles.errorMessage}>
                      Manual amounts must equal total amount
                    </Text>
                  )}
                </>
              )}
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payer:</Text>
                <Text style={styles.summaryValue}>You</Text>
              </View>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (selectedContacts.length < 1 || !totalAmount || !description.trim() || 
             (splitMode === 'manual' && !isManualAmountValid())) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={loading || selectedContacts.length < 1 || !totalAmount || !description.trim() || 
                   (splitMode === 'manual' && !isManualAmountValid())}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Group Transaction'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#9b59b6',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 60,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  selectedContactCard: {
    borderColor: '#9b59b6',
    backgroundColor: '#f8f5ff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  selectedText: {
    color: '#9b59b6',
  },
  contactActions: {
    marginLeft: 10,
  },
  selectedIndicator: {
    backgroundColor: '#27ae60',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  addContactButton: {
    backgroundColor: '#9b59b6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  addContactButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  submitButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Split Mode Styles
  splitModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  splitModeButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e8ed',
  },
  splitModeButtonSelected: {
    borderColor: '#9b59b6',
    backgroundColor: '#f8f5ff',
  },
  splitModeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  splitModeTextSelected: {
    color: '#9b59b6',
  },
  splitModeSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  splitModeSubtextSelected: {
    color: '#9b59b6',
  },
  // Manual Amount Styles
  manualAmountContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  manualAmountLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  manualAmountInput: {
    backgroundColor: 'white',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    width: 80,
    textAlign: 'center',
  },
  // Error Styles
  errorText: {
    color: '#e74c3c',
  },
  errorMessage: {
    fontSize: 12,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 5,
  },
});
