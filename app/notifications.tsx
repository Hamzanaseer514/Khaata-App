import { useAuth } from '@/contexts/AuthContext';
import { showError } from '@/utils/toast';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import config from '../config/config';

interface Notification {
  id: string;
  transactionId: string;
  contactName: string;
  contactEmail: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt: string | null;
  createdAt: string;
  transactionDetails: {
    amount: number;
    payer: string;
    note: string;
    createdAt: string;
  } | null;
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const fetchNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${config.BASE_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
      } else {
        showError(data.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showError('Failed to fetch notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return '#27ae60';
      case 'pending':
        return '#f39c12';
      case 'failed':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '📧';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationInfo}>
          <Text style={styles.contactName}>{item.contactName}</Text>
          <Text style={styles.contactEmail}>{item.contactEmail}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{item.message}</Text>
      </View>

      {item.transactionDetails && (
        <View style={styles.transactionDetails}>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Amount:</Text>
            <Text style={styles.transactionValue}>₹{item.transactionDetails.amount}</Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Type:</Text>
            <Text style={styles.transactionValue}>
              {item.transactionDetails.payer === 'USER' ? 'Debit' : 'Credit'}
            </Text>
          </View>
          {item.transactionDetails.note && (
            <View style={styles.transactionRow}>
              <Text style={styles.transactionLabel}>Note:</Text>
              <Text style={styles.transactionValue}>{item.transactionDetails.note}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.notificationFooter}>
        <Text style={styles.timestampText}>
          {item.sentAt ? `Sent: ${formatDate(item.sentAt)}` : `Created: ${formatDate(item.createdAt)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📧</Text>
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateSubtitle}>
        You'll receive email notifications when transactions are created
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.headerBackButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{notifications.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#27ae60' }]}>
              {notifications.filter(n => n.status === 'sent').length}
            </Text>
            <Text style={styles.statLabel}>Sent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#f39c12' }]}>
              {notifications.filter(n => n.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#e74c3c' }]}>
              {notifications.filter(n => n.status === 'failed').length}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#20B2AA']}
              tintColor="#20B2AA"
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#20B2AA',
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
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
  },
  notificationCard: {
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
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  transactionDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  transactionLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  transactionValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  notificationFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  timestampText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
  },
});
