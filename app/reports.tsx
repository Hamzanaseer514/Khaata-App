import { useAuth } from '@/contexts/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import config from '../config/config';

interface Contact {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  email?: string;
  balance: number;
}

export default function ReportsScreen() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.data || []);
      } else {
        showError('Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Fetch contacts error:', error);
      showError('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleExportContact = async (contactId: string, contactName: string, format: 'pdf' | 'csv') => {
    setExporting(contactId);
    try {
      const response = await fetch(
        `${config.BASE_URL}/reports/contact/${contactId}?format=${format}`,
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
      const fileName = `${contactName.replace(/\s+/g, '_')}_transactions.${format}`;
      
      // Create file URI
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      console.log('Export details:', {
        fileName,
        fileUri,
        blobSize: blob.size,
        blobType: blob.type
      });
      
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
      setExporting(null);
    }
  };

  const handleExportAllTransactions = async (format: 'pdf' | 'csv') => {
    setExporting('all');
    try {
      const response = await fetch(
        `${config.BASE_URL}/reports/user?format=${format}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export all transactions');
      }

      const blob = await response.blob();
      const fileName = `all_transactions.${format}`;
      
      // Create file URI
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      console.log('Export all details:', {
        fileName,
        fileUri,
        blobSize: blob.size,
        blobType: blob.type
      });
      
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
      showError('Failed to export all transactions');
    } finally {
      setExporting(null);
    }
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <View style={styles.contactAvatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactDetails}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactPhone}>{item.phone}</Text>
          <Text style={[
            styles.balanceText,
            { color: item.balance >= 0 ? '#27ae60' : '#e74c3c' }
          ]}>
            Balance: ₹{Math.abs(item.balance)} {item.balance >= 0 ? '(You owe)' : '(They owe)'}
          </Text>
        </View>
      </View>
      
      <View style={styles.exportButtons}>
        <TouchableOpacity
          style={[styles.exportButton, styles.pdfButton]}
          onPress={() => handleExportContact(item._id || item.id || '', item.name, 'pdf')}
          disabled={exporting === (item._id || item.id)}
        >
          <Text style={styles.exportButtonText}>
            {exporting === (item._id || item.id) ? '...' : '📄 PDF'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.exportButton, styles.csvButton]}
          onPress={() => handleExportContact(item._id || item.id || '', item.name, 'csv')}
          disabled={exporting === (item._id || item.id)}
        >
          <Text style={styles.exportButtonText}>
            {exporting === (item._id || item.id) ? '...' : '📊 CSV'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
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
        <Text style={styles.headerTitle}>Reports & Export</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Export All Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Export All Transactions</Text>
        <Text style={styles.sectionDescription}>
          Generate a comprehensive report of all your transactions
        </Text>
        
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportButton, styles.pdfButton]}
            onPress={() => handleExportAllTransactions('pdf')}
            disabled={exporting === 'all'}
          >
            <Text style={styles.exportButtonText}>
              {exporting === 'all' ? '...' : '📄 Export PDF'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.exportButton, styles.csvButton]}
            onPress={() => handleExportAllTransactions('csv')}
            disabled={exporting === 'all'}
          >
            <Text style={styles.exportButtonText}>
              {exporting === 'all' ? '...' : '📊 Export CSV'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Individual Contacts Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Export by Contact</Text>
        <Text style={styles.sectionDescription}>
          Generate reports for specific contacts
        </Text>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No contacts found</Text>
          <Text style={styles.emptySubtext}>
            Add some contacts to generate reports
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id || item.id || ''}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    paddingVertical: 15,
    backgroundColor: '#20B2AA',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  sectionCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  pdfButton: {
    backgroundColor: '#e74c3c',
  },
  csvButton: {
    backgroundColor: '#27ae60',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contactCard: {
    backgroundColor: 'white',
    marginVertical: 5,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#20B2AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
});
