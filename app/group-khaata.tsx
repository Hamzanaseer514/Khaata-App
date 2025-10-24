import { useAuth } from '@/contexts/AuthContext';
import { showError } from '@/utils/toast';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import config from '../config/config';

interface GroupTransaction {
  id: string;
  payerId: string;
  payerName: string;
  contactIds: string[];
  contactNames: string[];
  totalAmount: number;
  perPersonShare: number;
  description: string;
  createdAt: string;
  splitMode?: 'equal' | 'manual';
  individualAmounts?: {[contactId: string]: number};
  userAmount?: number;
}

export default function GroupKhaataScreen() {
  const { token } = useAuth();
  const [groupTransactions, setGroupTransactions] = useState<GroupTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroupTransactions = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/group-transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setGroupTransactions(data.data);
      } else {
        showError(data.message || 'Failed to fetch group transactions');
      }
    } catch (error) {
      console.error('Error fetching group transactions:', error);
      showError('Failed to fetch group transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGroupTransactions();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchGroupTransactions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroupTransactions();
  };

  const handleCreateGroupTransaction = () => {
    router.push('/group-khaata/create');
  };

  const handleTransactionPress = (transaction: GroupTransaction) => {
    router.push({
      pathname: '/group-khaata/detail',
      params: { transactionId: transaction.id }
    });
  };

  const renderTransactionItem = ({ item }: { item: GroupTransaction }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => handleTransactionPress(item)}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
        </View>
        <View style={styles.transactionAmountContainer}>
          <Text style={styles.transactionAmount}>₹{item.totalAmount}</Text>
          <Text style={styles.perPersonText}>
            {item.splitMode === 'manual' ? 'Custom amounts' : `₹${item.perPersonShare} each`}
          </Text>
        </View>
      </View>
      <View style={styles.transactionDetails}>
        <View style={styles.payerInfo}>
          <Text style={styles.payerLabel}>Paid by:</Text>
          <Text style={styles.payerName}>{item.payerName}</Text>
        </View>
        <View style={styles.membersInfo}>
          <Text style={styles.membersLabel}>Members:</Text>
          <Text style={styles.membersText}>
            {item.contactNames.join(', ')}
          </Text>
        </View>
      </View>
      <View style={styles.transactionFooter}>
        <Text style={styles.viewDetailsText}>Tap to view details →</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>👨‍👩‍👧‍👦</Text>
      <Text style={styles.emptyStateTitle}>No Group Transactions</Text>
      <Text style={styles.emptyStateSubtitle}>
        Create your first group transaction to get started
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateGroupTransaction}
      >
        <Text style={styles.createButtonText}>Create Group Transaction</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
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
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Khaata</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateGroupTransaction}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {groupTransactions.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={groupTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
    fontSize: 16,
    color: '#7f8c8d',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 16,
  },
  transactionDescription: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#9b59b6',
    marginBottom: 2,
  },
  perPersonText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  transactionDetails: {
    marginBottom: 16,
  },
  payerInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  payerLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    marginRight: 8,
  },
  payerName: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  membersInfo: {
    flexDirection: 'row',
  },
  membersLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    marginRight: 8,
  },
  membersText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  transactionFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#9b59b6',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  createButton: {
    backgroundColor: '#9b59b6',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
