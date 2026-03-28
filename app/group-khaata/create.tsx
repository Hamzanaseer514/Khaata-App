import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { showError, showSuccess } from '@/utils/toast';
import { router } from 'expo-router';
import { goBack } from '@/utils/navigation';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import config from '../../config/config';

interface Contact {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  email?: string;
  profilePicture?: string | null;
}

export default function CreateGroupTransactionScreen() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const { currency: cur } = useCurrency();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const inputBg = isDarkMode ? COLORS.background : '#f8fafc';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#e2e8f0';

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [splitMode, setSplitMode] = useState<'equal' | 'manual'>('equal');
  const [manualAmounts, setManualAmounts] = useState<{ [contactId: string]: string }>({});
  const [userAmount, setUserAmount] = useState('');

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}/contacts`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) setContacts(data.data);
      else showError(data.message || 'Failed to fetch contacts');
    } catch (error) {
      console.error('Error fetching contacts:', error);
      showError('Failed to fetch contacts');
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const updateManualAmount = (id: string, amount: string) => {
    setManualAmounts(prev => ({ ...prev, [id]: amount }));
  };

  const getTotalManualAmount = () => {
    const contactTotal = Object.values(manualAmounts).reduce((s, a) => s + (parseFloat(a) || 0), 0);
    return contactTotal + (parseFloat(userAmount) || 0);
  };

  const isManualValid = () => Math.abs(getTotalManualAmount() - (parseFloat(totalAmount) || 0)) < 0.01;

  const perPersonShare = () => {
    const amt = parseFloat(totalAmount);
    const count = selectedContacts.length + 1;
    return amt > 0 && count > 0 ? (amt / count).toFixed(2) : '0.00';
  };

  const canSubmit = selectedContacts.length >= 1 && totalAmount && parseFloat(totalAmount) > 0 && description.trim() && (splitMode === 'equal' || isManualValid());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const body: any = {
        payerId: 'USER', contactIds: selectedContacts,
        totalAmount: parseFloat(totalAmount), description: description.trim(), splitMode,
      };
      if (splitMode === 'manual') {
        body.individualAmounts = {};
        selectedContacts.forEach(id => { body.individualAmounts[id] = parseFloat(manualAmounts[id] || '0'); });
        body.userAmount = parseFloat(userAmount) || 0;
      }
      const response = await fetch(`${config.BASE_URL}/group-transactions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(`Group transaction created! Per person: ${cur.symbol} ${data.data.perPersonShare}`);
        goBack();
      } else showError(data.message || 'Failed to create');
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to create group transaction');
    } finally { setLoading(false); }
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const id = item._id || item.id || '';
    const selected = selectedContacts.includes(id);
    return (
      <TouchableOpacity
        style={[styles.contactCard, {
          backgroundColor: selected
            ? (isDarkMode ? 'rgba(34, 211, 238, 0.08)' : 'rgba(10, 126, 164, 0.06)')
            : (isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff'),
          borderColor: selected ? accent : borderColor,
        }]}
        onPress={() => toggleContact(id)}
        activeOpacity={0.7}
      >
        <View style={[styles.contactAvatar, {
          backgroundColor: selected
            ? (isDarkMode ? 'rgba(34, 211, 238, 0.15)' : 'rgba(10, 126, 164, 0.1)')
            : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
          overflow: 'hidden',
        }]}>
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
          ) : (
            <Image source={require('../../assets/images/avatar_male_2.png')} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
          )}
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: selected ? accent : COLORS.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.contactPhone, { color: COLORS.textMuted }]}>{item.phone}</Text>
        </View>
        {selected && (
          <View style={[styles.checkCircle, { backgroundColor: accent }]}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        )}
        {!selected && (
          <View style={[styles.uncheckCircle, { borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#d1d5db' }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: isDarkMode ? '#1c1e1f' : accent,
        borderBottomWidth: isDarkMode ? 1 : 0,
        borderColor: 'rgba(34, 211, 238, 0.2)',
      }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group Transaction</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Amount */}
        <View style={[styles.amountCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>TOTAL AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencyBig, { color: accent }]}>{cur.symbol}</Text>
            <TextInput
              style={[styles.amountInputBig, { color: COLORS.text }]}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              value={totalAmount}
              onChangeText={setTotalAmount}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Description */}
        <View style={[styles.fieldRow, { backgroundColor: cardBg, borderColor }]}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={[styles.fieldInput, { color: COLORS.text }]}
            placeholder="What's this for?"
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Split Mode */}
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>How to Split?</Text>
        <View style={styles.splitRow}>
          <TouchableOpacity
            style={[styles.splitBtn, {
              backgroundColor: splitMode === 'equal' ? (isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(10, 126, 164, 0.08)') : (isDarkMode ? 'transparent' : '#f8fafc'),
              borderColor: splitMode === 'equal' ? accent : borderColor,
            }]}
            onPress={() => setSplitMode('equal')}
          >
            <Ionicons name="git-compare-outline" size={22} color={splitMode === 'equal' ? accent : COLORS.textMuted} />
            <Text style={[styles.splitBtnTitle, { color: splitMode === 'equal' ? accent : COLORS.text }]}>Equal</Text>
            <Text style={[styles.splitBtnSub, { color: COLORS.textMuted }]}>Split equally</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.splitBtn, {
              backgroundColor: splitMode === 'manual' ? (isDarkMode ? 'rgba(34, 211, 238, 0.1)' : 'rgba(10, 126, 164, 0.08)') : (isDarkMode ? 'transparent' : '#f8fafc'),
              borderColor: splitMode === 'manual' ? accent : borderColor,
            }]}
            onPress={() => setSplitMode('manual')}
          >
            <Ionicons name="create-outline" size={22} color={splitMode === 'manual' ? accent : COLORS.textMuted} />
            <Text style={[styles.splitBtnTitle, { color: splitMode === 'manual' ? accent : COLORS.text }]}>Manual</Text>
            <Text style={[styles.splitBtnSub, { color: COLORS.textMuted }]}>Custom amounts</Text>
          </TouchableOpacity>
        </View>

        {/* Your Amount (manual) */}
        {splitMode === 'manual' && (
          <View style={[styles.fieldRow, { backgroundColor: cardBg, borderColor }]}>
            <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
            <TextInput
              style={[styles.fieldInput, { color: COLORS.text }]}
              placeholder={`Your share (${cur.symbol})`}
              placeholderTextColor={COLORS.textMuted}
              value={userAmount}
              onChangeText={setUserAmount}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Contacts */}
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
          Select Contacts ({selectedContacts.length})
        </Text>

        {contacts.length === 0 ? (
          <View style={styles.noContacts}>
            <Text style={[styles.noContactsText, { color: COLORS.textMuted }]}>No contacts available</Text>
            <TouchableOpacity style={[styles.addContactBtn, { backgroundColor: accent }]} onPress={() => router.push('/contacts/add')}>
              <Text style={styles.addContactBtnText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        ) : (
          contacts.map((item) => {
            const id = item._id || item.id || '';
            const selected = selectedContacts.includes(id);
            return (
              <View key={id}>
                {renderContact({ item })}
                {selected && splitMode === 'manual' && (
                  <View style={[styles.manualAmountRow, { borderColor }]}>
                    <Text style={[styles.manualLabel, { color: COLORS.textMuted }]}>Amount:</Text>
                    <TextInput
                      style={[styles.manualInput, { backgroundColor: inputBg, borderColor, color: COLORS.text }]}
                      value={manualAmounts[id] || ''}
                      onChangeText={(v) => updateManualAmount(id, v)}
                      placeholder="0"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Summary */}
        {selectedContacts.length > 0 && totalAmount ? (
          <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.summaryTitle, { color: COLORS.text }]}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Total Amount</Text>
              <Text style={[styles.summaryValue, { color: COLORS.text }]}>{cur.symbol} {totalAmount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Members (incl. You)</Text>
              <Text style={[styles.summaryValue, { color: COLORS.text }]}>{selectedContacts.length + 1}</Text>
            </View>
            {splitMode === 'equal' ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Per Person</Text>
                <Text style={[styles.summaryValue, { color: accent }]}>{cur.symbol} {perPersonShare()}</Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Manual Total</Text>
                  <Text style={[styles.summaryValue, { color: isManualValid() ? COLORS.text : '#ef4444' }]}>
                    {cur.symbol} {getTotalManualAmount().toFixed(2)}
                  </Text>
                </View>
                {!isManualValid() && (
                  <Text style={styles.errorMsg}>Amounts must equal total</Text>
                )}
              </>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.textMuted }]}>Payer</Text>
              <Text style={[styles.summaryValue, { color: COLORS.text }]}>You</Text>
            </View>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: accent }, !canSubmit && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.submitBtnText}>Create Group Transaction</Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  body: { padding: 20 },

  amountCard: {
    borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 14,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencyBig: { fontSize: 24, fontWeight: '800', marginRight: 8 },
  amountInputBig: { fontSize: 48, fontWeight: '900', minWidth: 80, textAlign: 'center' },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14,
  },
  fieldInput: { flex: 1, fontSize: 15, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 8 },

  splitRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  splitBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, gap: 4,
  },
  splitBtnTitle: { fontSize: 14, fontWeight: '700' },
  splitBtnSub: { fontSize: 11, fontWeight: '500' },

  contactCard: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  contactAvatarText: { fontSize: 16, fontWeight: '800' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '700', marginBottom: 1 },
  contactPhone: { fontSize: 12 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  uncheckCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },

  manualAmountRow: {
    flexDirection: 'row', alignItems: 'center', paddingLeft: 66, paddingRight: 14,
    marginTop: -4, marginBottom: 8,
  },
  manualLabel: { fontSize: 12, fontWeight: '600', marginRight: 8 },
  manualInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, width: 90, textAlign: 'center' },

  noContacts: { alignItems: 'center', paddingVertical: 30 },
  noContactsText: { fontSize: 15, marginBottom: 12 },
  addContactBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  addContactBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginTop: 16, marginBottom: 8 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  errorMsg: { fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: -4, marginBottom: 8 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 18, marginTop: 16,
    shadowColor: '#0a7ea4', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
