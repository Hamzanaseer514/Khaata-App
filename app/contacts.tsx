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
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  StatusBar,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import config from '../config/config';
import BottomNav from '@/components/BottomNav';
import { useTheme } from '@/contexts/DarkModeContext';
import { Colors } from '@/constants/theme';

interface Contact {
  _id: string;
  id?: string; // For compatibility
  name: string;
  email?: string;
  phone: string;
  balance: number;
  profilePicture?: string | null;
  createdAt: string;
  updatedAt: string;
  lastTransactionDate?: string;
}

export default function ContactsListScreen() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme(); // Use isDarkMode from useTheme
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const placeholderColor = isDarkMode ? '#6b7280' : '#9ca3af';
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'give' | 'get'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const filterAnim = React.useRef(new Animated.Value(0)).current;

  const formatLastEntry = (contact: Contact) => {
    const dateString = contact.lastTransactionDate || contact.updatedAt || contact.createdAt;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Recently';
    }
  };

  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const accentColor = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fetchContacts();
  }, []);

  // Refresh contacts whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchContacts(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }, [])
  );

  const fetchContacts = async (isRefresh = false) => {
    try {
      // Only show loading spinner on initial load, not on refresh
      if (!isRefresh) {
        setLoading(true);
      }
      
      const response = await fetch(`${config.BASE_URL}/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Contacts API response:', data);

      if (data.success) {
        console.log('Contacts data:', data.data);
        console.log('First contact:', data.data[0]);
        setContacts(data.data);
        setFilteredContacts(data.data);
      } else {
        showError(data.message || 'Failed to fetch contacts');
      }
    } catch (error) {
      console.error('Fetch contacts error:', error);
      showError('Failed to fetch contacts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchContacts(true);
  };

  const handleAddContact = () => {
    router.push('/contacts/add');
  };

  const handleContactPress = (contact: Contact) => {
    const contactId = contact._id || contact.id;
    console.log('Contact pressed:', contact);
    console.log('Contact _id:', contact._id);
    console.log('Contact id:', contact.id);
    console.log('Using contactId:', contactId);
    console.log('Navigating to:', `/contact-detail?contactId=${contactId}`);
    router.push(`/contact-detail?contactId=${contactId}`);
  };

  const openEdit = (c: Contact) => {
    const id = c._id || c.id || '';
    router.push(`/contacts/add?contactId=${id}&editMode=true`);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${config.BASE_URL}/contacts/${confirmDeleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.message || 'Failed to delete contact');
      } else {
        setConfirmDeleteId(null);
        fetchContacts(true);
      }
    } catch (e) {
      showError('Failed to delete contact');
    } finally {
      setSubmitting(false);
    }
  };

  // Search and Filter functionality
  useEffect(() => {
    let filtered = contacts;

    // Apply Filter Chips
    if (activeFilter === 'give') {
      filtered = filtered.filter(c => c.balance < 0);
    } else if (activeFilter === 'get') {
      filtered = filtered.filter(c => c.balance > 0);
    }

    // Apply Search Query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery) ||
        (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredContacts(filtered);
  }, [searchQuery, contacts, activeFilter]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    Animated.spring(filterAnim, {
      toValue,
      tension: 50,
      friction: 8,
      useNativeDriver: false, // Height/Opacity combo
    }).start();
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <Animated.View style={[
      styles.contactCard,
      dynamicStyles.contactCard,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      <TouchableOpacity 
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} 
        onPress={() => handleContactPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.contactAvatar, dynamicStyles.avatarCircle, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(10, 126, 164, 0.05)' }]}>
            {item.profilePicture ? (
              <Image 
                source={{ uri: item.profilePicture }} 
                style={styles.avatarImage} 
                contentFit="cover"
              />
            ) : (
              <Text style={[styles.avatarText, { color: isDarkMode ? '#22d3ee' : '#0a7ea4' }]}>
                {item.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            )}
        </View>
        <View style={styles.contactInfo}>
          <Text 
            style={[styles.contactName, { color: themeColors.text }]} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          <Text style={[styles.contactSubtext, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
            Last entry: {formatLastEntry(item)}
          </Text>
        </View>
        <View style={styles.contactBalance}>
            <Text style={[styles.balanceAmount, { color: item.balance > 0 ? '#22c55e' : item.balance < 0 ? '#ef4444' : (isDarkMode ? '#64748b' : '#94a3b8') }]}>
            Rs {Math.round(Math.abs(item.balance)).toLocaleString()}
          </Text>
          <Text style={[styles.balanceLabel, { color: item.balance > 0 ? '#22c55e' : item.balance < 0 ? '#ef4444' : (isDarkMode ? '#475569' : '#94a3b8') }]}>
            {item.balance > 0 ? "YOU'LL GET" : item.balance < 0 ? "YOU'LL GIVE" : 'SETTLED'}
          </Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.compactActions}>
        <TouchableOpacity 
          style={styles.smallIconBtn} 
          onPress={() => openEdit(item)}
          activeOpacity={0.6}
        >
          <Ionicons name="pencil" size={14} color={isDarkMode ? '#64748b' : '#94a3b8'} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.smallIconBtn} 
          onPress={() => setConfirmDeleteId(item._id || item.id || '')}
          activeOpacity={0.6}
        >
          <Ionicons name="trash-outline" size={14} color="#ef4444" opacity={0.6} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderFilterChips = () => (
    <Animated.View style={[
      styles.filterContainer,
      {
        opacity: filterAnim,
        maxHeight: filterAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 60],
        }),
        marginBottom: filterAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 16],
        }),
        transform: [{
          translateY: filterAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-10, 0],
          })
        }]
      }
    ]}>
      <TouchableOpacity 
        style={[
          styles.filterChip, 
          activeFilter === 'all' && { backgroundColor: accentColor },
          { borderColor: activeFilter === 'all' ? accentColor : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), borderWidth: 1 }
        ]}
        onPress={() => setActiveFilter('all')}
      >
        <Text style={[
          styles.filterText, 
          { color: activeFilter === 'all' ? '#fff' : (isDarkMode ? '#94a3b8' : '#475569') }
        ]}>
          All Contacts
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.filterChip, 
          activeFilter === 'give' && { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)' },
          { borderColor: activeFilter === 'give' ? '#ef4444' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), borderWidth: 1 }
        ]}
        onPress={() => setActiveFilter('give')}
      >
        <Text style={[
          styles.filterText, 
          { color: activeFilter === 'give' ? '#ef4444' : (isDarkMode ? '#94a3b8' : '#475569') }
        ]}>
          You'll Give
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.filterChip, 
          activeFilter === 'get' && { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)' },
          { borderColor: activeFilter === 'get' ? '#22c55e' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), borderWidth: 1 }
        ]}
        onPress={() => setActiveFilter('get')}
      >
        <Text style={[
          styles.filterText, 
          { color: activeFilter === 'get' ? '#22c55e' : (isDarkMode ? '#94a3b8' : '#475569') }
        ]}>
          You'll Get
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.05)' : 'rgba(10, 126, 164, 0.05)' }]}>
        <Ionicons 
          name={searchQuery.trim() ? "search-outline" : "people-outline"} 
          size={80} 
          color={isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(10, 126, 164, 0.2)'} 
        />
      </View>
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {searchQuery.trim() ? 'No Results Found' : 'No Contacts Yet'}
      </Text>
      <Text style={[styles.emptyDescription, { color: isDarkMode ? '#64748b' : '#94a3b8' }]}>
        {searchQuery.trim() 
          ? `We couldn't find any contacts matching "${searchQuery}"`
          : 'Start by adding your first contact to manage your shared balances beautifully.'
        }
      </Text>
      {!searchQuery.trim() && (
        <TouchableOpacity 
          style={[styles.addFirstButton, { backgroundColor: accentColor }]} 
          onPress={handleAddContact}
          activeOpacity={0.8}
        >
          <Text style={styles.addFirstButtonText}>Add First Contact</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    headerBackground: {
      backgroundColor: isDarkMode ? '#1c1e1f' : accentColor,
      paddingTop: 60,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: isDarkMode ? 1 : 0,
      borderColor: 'rgba(34, 211, 238, 0.2)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    headerTitle: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '700',
    },
    searchBar: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9', // Updated to match reference light blue-grey
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
    },
    searchInput: {
      color: themeColors.text,
      backgroundColor: 'transparent', // Ensure no internal background
    },
    contactCard: {
      backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
      borderWidth: 1,
    },
    avatarCircle: {
      backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.1)' : accentColor,
    }
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={[styles.loadingText, { color: isDarkMode ? '#94a3b8' : '#7f8c8d' }]}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Premium Header */}
      <View style={dynamicStyles.headerBackground}>
        <TouchableOpacity 
          onPress={() => router.back()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        
        <Text style={dynamicStyles.headerTitle}>My Contacts</Text>
        
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleAddContact}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar Refined */}
      <View style={[styles.searchContainer, { backgroundColor: 'transparent' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.searchBar, dynamicStyles.searchBar, { flex: 1, paddingVertical: 8 }]}>
            <Ionicons name="search-outline" size={18} color={placeholderColor} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.searchInput, dynamicStyles.searchInput, { fontSize: 15 }]}
              placeholder="Search by name or number..."
              placeholderTextColor={placeholderColor}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={placeholderColor} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="mic-outline" size={20} color={placeholderColor} />
            )}
          </View>
          
          <TouchableOpacity 
            style={[
              styles.filterToggleBtn, 
              { 
                backgroundColor: showFilters ? accentColor : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                borderColor: showFilters ? accentColor : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
              }
            ]} 
            onPress={toggleFilters}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showFilters ? "options" : "options-outline"} 
              size={20} 
              color={showFilters ? "#ffffff" : placeholderColor} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      {renderFilterChips()}

      {filteredContacts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item._id || item.id || 'unknown'}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accentColor}
                colors={[accentColor]}
              />
            }
        />
      )}

      {/* Delete Confirm */}
      {confirmDeleteId && (
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Delete contact?</Text>
            <Text style={[styles.confirmText, { color: isDarkMode ? '#94a3b8' : '#7f8c8d' }]}>This will also delete all related transaction records. This action cannot be undone.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]} onPress={() => setConfirmDeleteId(null)}>
                <Text style={[styles.cancelText, { color: themeColors.text }]}>No, Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteBtn, submitting && { opacity: 0.6 }]} onPress={confirmDelete} disabled={submitting}>
                <Text style={styles.deleteText}>{submitting ? 'Deleting…' : 'Yes, Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 80, // Same uniform height for all cards
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  contactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
    borderColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  contactInfo: {
    flex: 1,
    paddingLeft: 2,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 1,
  },
  contactSubtext: {
    fontSize: 13,
    fontWeight: '400',
  },
  contactBalance: {
    alignItems: 'flex-end',
    minWidth: 90,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  compactActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 6,
    width: 24,
    alignItems: 'center',
  },
  smallIconBtn: {
    padding: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  addFirstButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 0, // Remove elevation to avoid "double bg" look
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    padding: 5,
  },
  modalOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmModal: { 
    width: '85%', 
    borderRadius: 24, 
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    marginBottom: 12,
  },
  confirmText: { 
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 12,
  },
  cancelBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 12,
  },
  cancelText: { 
    fontWeight: '700', 
    fontSize: 15,
  },
  deleteBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 12, 
    backgroundColor: '#ef4444',
  },
  deleteText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 15,
  },
});
