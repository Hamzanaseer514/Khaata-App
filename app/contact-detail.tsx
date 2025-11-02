import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showError, showSuccess } from '@/utils/toast';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
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
import config from '../config/config';

interface Contact {
  _id: string;
  id?: string; // For compatibility
  name: string;
  phone: string;
  email?: string;
  balance: number;
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
  const [contact, setContact] = useState<Contact | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Edit/Delete are handled on the list screen only

  // Handle contactId parameter (can be string or array)
  const actualContactId = Array.isArray(contactId) ? contactId[0] : contactId;

  useEffect(() => {
    console.log('ContactDetailScreen - contactId:', contactId);
    console.log('ContactDetailScreen - actualContactId:', actualContactId);
    console.log('ContactDetailScreen - typeof contactId:', typeof contactId);
    
    if (actualContactId && actualContactId !== 'undefined' && actualContactId !== 'null') {
      fetchContactDetails();
      fetchTransactions();
    } else {
      console.error('Invalid contactId:', actualContactId);
      showError('Invalid contact ID');
      router.back();
    }
  }, [actualContactId]);

  const fetchContactDetails = async () => {
    try {
      console.log('Fetching contact details for ID:', actualContactId);
      const response = await fetch(`${config.BASE_URL}/contacts/${actualContactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Contact details response:', data);

      if (data.success) {
        setContact(data.data);
      } else {
        showError(data.message || 'Failed to fetch contact details');
        router.back();
      }
    } catch (error) {
      console.error('Fetch contact error:', error);
      showError('Failed to fetch contact details');
      router.back();
    }
  };

  const fetchTransactions = async () => {
    try {
      console.log('Fetching transactions for contact ID:', actualContactId);
      const response = await fetch(`${config.BASE_URL}/transactions?contact_id=${actualContactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Transactions response:', data);

      if (data.success) {
        setTransactions(data.data);
      } else {
        showError(data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Fetch transactions error:', error);
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

  const handleAddTransaction = () => {
    setShowAddTransaction(true);
  };

  const handleTransactionAdded = () => {
    setShowAddTransaction(false);
    fetchContactDetails(); // Refresh contact balance
    fetchTransactions(); // Refresh transaction list
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

      if (!response.ok) {
        throw new Error('Failed to export transactions');
      }

      const blob = await response.blob();
      const fileName = `${contact.name.replace(/\s+/g, '_')}_transactions.${format}`;
      
      // Create file URI
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
       // Convert blob to base64 and write to file
       const reader = new FileReader();
       reader.onload = async () => {
         try {
           const result = reader.result as string;
           if (!result) {
             throw new Error('Failed to read file data');
           }
           
           const base64 = result.split(',')[1];
           if (!base64) {
             throw new Error('Failed to extract base64 data');
           }
           
           await FileSystem.writeAsStringAsync(fileUri, base64, {
             encoding: FileSystem.EncodingType.Base64,
           });
           
           // Share the file
           if (await Sharing.isAvailableAsync()) {
             await Sharing.shareAsync(fileUri);
             showSuccess('File exported and shared successfully!');
           } else {
             showSuccess(`File saved to: ${fileUri}`);
           }
         } catch (fileError) {
           console.error('File processing error:', fileError);
           showError('Failed to process the exported file');
         }
       };
       
       reader.onerror = () => {
         console.error('FileReader error:', reader.error);
         showError('Failed to read the exported file');
       };
       
       reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionInfo}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionType}>
            {item.payer === 'USER' ? '💸 You Paid' : '💰 Friend Paid'}
          </Text>
          <Text style={[
            styles.transactionAmount,
            { color: item.payer === 'USER' ? '#27ae60' : '#e74c3c' }
          ]}>
            {item.payer === 'USER' ? '+' : '-'}₹{item.amount.toFixed(2)}
          </Text>
        </View>
        {item.note && (
          <Text style={styles.transactionNote}>{item.note}</Text>
        )}
        <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptyDescription}>
        No transaction history found for {contact?.name}.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <Text style={styles.loadingText}>Loading contact details...</Text>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Contact not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Details</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]} 
            onPress={() => handleExportTransactions('pdf')}
            disabled={exporting}
          >
            <Text style={styles.exportButtonText}>
              {exporting ? '...' : '📄'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAddTransaction}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contact Info Card */}
      <View style={styles.contactCard}>
        <View style={styles.contactAvatar}>
          <Text style={styles.avatarText}>
            {contact.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
          {contact.email && (
            <Text style={styles.contactEmail}>{contact.email}</Text>
          )}
        </View>
        <View style={styles.balanceInfo}>
          <Text style={[
            styles.balanceAmount,
            { color: contact.balance > 0 ? '#27ae60' : contact.balance < 0 ? '#e74c3c' : '#7f8c8d' }
          ]}>
            ₹{Math.abs(contact.balance).toFixed(2)}
          </Text>
          <Text style={styles.balanceLabel}>
            {contact.balance > 0 ? 'Friend owes you' : contact.balance < 0 ? 'You owe friend' : 'All settled'}
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        
        {transactions.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id || 'unknown'}
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

      {/* Floating Add Transaction Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={handleAddTransaction}>
        <Text style={styles.floatingButtonText}>+ Add Transaction</Text>
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      {showAddTransaction && contact && (
        <AddTransactionModal
          contactId={(contact._id || contact.id) as string}
          contactName={contact.name}
          onClose={() => setShowAddTransaction(false)}
          onSuccess={handleTransactionAdded}
        />
      )}

    </View>
  );
}

// Add Transaction Modal Component
function AddTransactionModal({ 
  contactId, 
  contactName, 
  onClose, 
  onSuccess 
}: {
  contactId: string;
  contactName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState<'USER' | 'FRIEND'>('USER');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Submitting transaction:', { contactId, amount, payer, note });
      const response = await fetch(`${config.BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId,
          amount: parseFloat(amount),
          payer,
          note,
        }),
      });

      const data = await response.json();
      console.log('Transaction response:', data);

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

              <Text style={styles.contactNameTextCompact}>For: {contactName}</Text>

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

            {/* Transaction Type */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Transaction Type *</Text>
              <View style={styles.typeButtonsCompact}>
                <TouchableOpacity
                  style={[
                    styles.typeButtonCompact,
                    payer === 'USER' && styles.typeButtonActive
                  ]}
                  onPress={() => setPayer('USER')}
                >
                  <Text style={[
                    styles.typeButtonTextCompact,
                    payer === 'USER' && styles.typeButtonTextActive
                  ]}>
                    💸 You Paid
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButtonCompact,
                    payer === 'FRIEND' && styles.typeButtonActive
                  ]}
                  onPress={() => setPayer('FRIEND')}
                >
                  <Text style={[
                    styles.typeButtonTextCompact,
                    payer === 'FRIEND' && styles.typeButtonTextActive
                  ]}>
                    💰 Friend Paid
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Note Field */}
            <View style={styles.inputContainerCompact}>
              <Text style={styles.labelCompact}>Note (Optional)</Text>
              <TextInput
                style={[styles.inputCompact, styles.textAreaCompact]}
                placeholder="Enter transaction note"
                placeholderTextColor={placeholderColor}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={2}
                autoCapitalize="sentences"
                autoCorrect={true}
              />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#20B2AA',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#20B2AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#95a5a6',
  },
  balanceInfo: {
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  transactionsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  listContainer: {
    paddingBottom: 100, // Space for floating button
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionNote: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 70,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  floatingButton: {
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
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  formScrollView: {
    maxHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    fontSize: 24,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  contactNameText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e8f4fd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
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
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e8f4fd',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#20B2AA',
    backgroundColor: '#f0fdfa',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 4,
  },
  typeButtonTextActive: {
    color: '#20B2AA',
  },
  typeButtonSubtext: {
    fontSize: 12,
    color: '#95a5a6',
  },
  typeButtonSubtextActive: {
    color: '#20B2AA',
  },
  submitButton: {
    backgroundColor: '#20B2AA',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#20B2AA',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  contactNameTextCompact: {
    fontSize: 15,
    color: '#7f8c8d',
    marginBottom: 15,
    paddingHorizontal: 18,
    textAlign: 'center',
    marginTop:10
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
  textAreaCompact: {
    height: 70,
    textAlignVertical: 'top',
  },
  typeButtonsCompact: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButtonCompact: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  typeButtonTextCompact: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  submitButtonCompact: {
    backgroundColor: '#20B2AA',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonTextCompact: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

