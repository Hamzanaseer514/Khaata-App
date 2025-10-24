import { useAuth } from '@/contexts/AuthContext';
import { showError } from '@/utils/toast';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import config from '../../config/config';

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

export default function GroupTransactionDetailScreen() {
  const { transactionId } = useLocalSearchParams();
  const { token } = useAuth();
  const [transaction, setTransaction] = useState<GroupTransaction | null>(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails();
    }
  }, [transactionId]);

  const fetchTransactionDetails = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/group-transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        const foundTransaction = data.data.find((t: GroupTransaction) => t.id === transactionId);
        if (foundTransaction) {
          setTransaction(foundTransaction);
        } else {
          showError('Transaction not found');
          router.back();
        }
      } else {
        showError(data.message || 'Failed to fetch transaction details');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      showError('Failed to fetch transaction details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9b59b6" />
        <Text style={styles.loadingText}>Loading transaction details...</Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Transaction not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.headerBackButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        {/* Transaction Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.transactionTitle}>{transaction.description}</Text>
            <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
          </View>
          
          <View style={styles.amountSection}>
            <View style={styles.totalAmountContainer}>
              <Text style={styles.totalAmountLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹{transaction.totalAmount}</Text>
            </View>
            
            <View style={styles.perPersonContainer}>
              <Text style={styles.perPersonLabel}>
                {transaction.splitMode === 'manual' ? 'Split Type' : 'Per Person Share'}
              </Text>
              <Text style={styles.perPersonAmount}>
                {transaction.splitMode === 'manual' ? 'Custom' : `₹${transaction.perPersonShare}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Payer Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Payment Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Paid by:</Text>
            <View style={styles.payerContainer}>
              <Text style={styles.payerName}>{transaction.payerName}</Text>
              <View style={styles.payerBadge}>
                <Text style={styles.payerBadgeText}>PAYER</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Members Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Group Members</Text>
          <View style={styles.membersList}>
            {transaction.contactNames.map((name, index) => {
              const contactId = transaction.contactIds[index];
              const individualAmount = transaction.splitMode === 'manual' && transaction.individualAmounts 
                ? transaction.individualAmounts[contactId] 
                : transaction.perPersonShare;
              
              return (
                <View key={index} style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{name}</Text>
                    <Text style={styles.memberShare}>Owes ₹{individualAmount}</Text>
                  </View>
                  <View style={styles.memberStatus}>
                    <Text style={styles.memberStatusText}>Pending</Text>
                  </View>
                </View>
              );
            })}
            
            {/* Show user's amount if manual mode */}
            {transaction.splitMode === 'manual' && transaction.userAmount && (
              <View style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>Y</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>You</Text>
                  <Text style={styles.memberShare}>Your share: ₹{transaction.userAmount}</Text>
                </View>
                <View style={styles.memberStatus}>
                  <Text style={styles.memberStatusText}>Paid</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Transaction Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Members (incl. You):</Text>
            <Text style={styles.summaryValue}>{transaction.contactNames.length + 1}</Text>
          </View>
          {transaction.splitMode === 'manual' ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Your Share:</Text>
                <Text style={styles.summaryValue}>₹{transaction.userAmount || 0}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Contacts Total:</Text>
                <Text style={styles.summaryValue}>
                  ₹{transaction.individualAmounts ? 
                    Object.values(transaction.individualAmounts).reduce((sum, amount) => sum + amount, 0) : 
                    0}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Per Person Share:</Text>
              <Text style={styles.summaryValue}>₹{transaction.perPersonShare}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={styles.summaryValue}>₹{transaction.totalAmount}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Amount Paid:</Text>
            <Text style={styles.summaryTotalValue}>₹{transaction.totalAmount}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    marginBottom: 20,
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
  headerBackButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerPlaceholder: {
    width: 60,
  },
  content: {
    padding: 20,
  },
  overviewCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  overviewHeader: {
    marginBottom: 20,
  },
  transactionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalAmountContainer: {
    flex: 1,
    marginRight: 16,
  },
  totalAmountLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#9b59b6',
  },
  perPersonContainer: {
    alignItems: 'flex-end',
  },
  perPersonLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    marginBottom: 4,
  },
  perPersonAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#27ae60',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  payerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payerName: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    marginRight: 8,
  },
  payerBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  payerBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '700',
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9b59b6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  memberShare: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  memberStatus: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberStatusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '700',
  },
  summaryTotalValue: {
    fontSize: 18,
    color: '#9b59b6',
    fontWeight: '800',
  },
  backButton: {
    backgroundColor: '#9b59b6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
