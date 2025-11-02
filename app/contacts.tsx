import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
} from 'react-native';
import config from '../config/config';

interface Contact {
  _id: string;
  id?: string; // For compatibility
  name: string;
  email?: string;
  phone: string;
  balance: number;
  createdAt: string;
}

export default function ContactsListScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const placeholderColor = isDark ? '#6b7280' : '#9ca3af';
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  // Refresh contacts whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchContacts(true);
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
    setEditContactId(c._id || c.id || '');
    setEditName(c.name);
    setEditEmail(c.email || '');
    setEditPhone(c.phone);
    setShowEdit(true);
  };

  const submitEdit = async () => {
    if (!editContactId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${config.BASE_URL}/contacts/${editContactId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone })
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.message || 'Failed to update contact');
      } else {
        setShowEdit(false);
        fetchContacts(true);
      }
    } catch (e) {
      showError('Failed to update contact');
    } finally {
      setSubmitting(false);
    }
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

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery) ||
        (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={styles.contactCard}>
      <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleContactPress(item)}>
      <View style={styles.contactAvatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phone}</Text>
          {item.email && (<Text style={styles.contactEmail}>{item.email}</Text>)}
      </View>
      <View style={styles.contactBalance}>
          <Text style={[styles.balanceAmount, { color: item.balance > 0 ? '#27ae60' : item.balance < 0 ? '#e74c3c' : '#7f8c8d' }]}>
          ₹{Math.abs(item.balance).toFixed(2)}
        </Text>
        <Text style={styles.balanceLabel}>
          {item.balance > 0 ? 'Friend owes' : item.balance < 0 ? 'You owe' : 'Settled'}
        </Text>
      </View>
    </TouchableOpacity>
      <View style={styles.rowActions}>
        <TouchableOpacity style={[styles.iconBtn, styles.iconEdit]} onPress={() => openEdit(item)}>
          <Text style={[styles.iconText, styles.iconEditText]}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn, styles.iconDelete]} onPress={() => setConfirmDeleteId(item._id || item.id || '')}>
          <Text style={[styles.iconText, styles.iconDeleteText]}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>
        {searchQuery.trim() ? '🔍' : '👥'}
      </Text>
      <Text style={styles.emptyTitle}>
        {searchQuery.trim() ? 'No Results Found' : 'No Contacts Yet'}
      </Text>
      <Text style={styles.emptyDescription}>
        {searchQuery.trim() 
          ? `No contacts found for "${searchQuery}"`
          : 'Start by adding your first contact to manage your Khaata'
        }
      </Text>
      {!searchQuery.trim() && (
        <TouchableOpacity style={styles.addFirstButton} onPress={handleAddContact}>
          <Text style={styles.addFirstButtonText}>Add First Contact</Text>
        </TouchableOpacity>
      )}
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
        <Text style={styles.headerTitle}>Contacts</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
              colors={['#20B2AA']}
            />
          }
        />
      )}

      {/* Edit Modal */}
      {showEdit && (
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>Edit Contact</Text>
            <View style={styles.inputContainer}><Text style={styles.label}>Name</Text><TextInput style={styles.input} value={editName} onChangeText={setEditName} /></View>
            <View style={styles.inputContainer}><Text style={styles.label}>Email</Text><TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" keyboardType="email-address" /></View>
            <View style={styles.inputContainer}><Text style={styles.label}>Phone</Text><TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" /></View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEdit(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, submitting && { opacity: 0.6 }]} onPress={submitEdit} disabled={submitting}><Text style={styles.saveText}>{submitting ? 'Saving…' : 'Save'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Delete Confirm */}
      {confirmDeleteId && (
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.modalTitle}>Delete contact?</Text>
            <Text style={styles.confirmText}>This will also delete related records.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmDeleteId(null)}><Text style={styles.cancelText}>No</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.deleteBtn, submitting && { opacity: 0.6 }]} onPress={confirmDelete} disabled={submitting}><Text style={styles.deleteText}>{submitting ? 'Deleting…' : 'Yes, delete'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
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
  listContainer: {
    padding: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rowActions: { flexDirection: 'column', gap: 6, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconEdit: { backgroundColor: '#e0f2fe' },
  iconEditText: { color: '#0369a1' },
  iconDelete: { backgroundColor: '#fee2e2' },
  iconDeleteText: { color: '#b91c1c' },
  iconText: { fontSize: 14 },
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
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: '#95a5a6',
  },
  contactBalance: {
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  balanceLabel: {
    fontSize: 10,
    color: '#7f8c8d',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  addFirstButton: {
    backgroundColor: '#20B2AA',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  addFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Search Bar Styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#7f8c8d',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  clearButton: {
    padding: 5,
  },
  clearIcon: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  inputContainer: { marginBottom: 14 },
  label: { fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: '#fff', color: '#1f2937' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editModal: { width: '90%', backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  confirmModal: { width: '85%', backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6' },
  cancelText: { color: '#374151', fontWeight: '700' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#20B2AA' },
  saveText: { color: '#fff', fontWeight: '800' },
  deleteBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#ef4444' },
  deleteText: { color: '#fff', fontWeight: '800' },
  confirmText: { color: '#6b7280', marginTop: 4 },
});
