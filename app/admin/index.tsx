import config from '@/config/config';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { router, useFocusEffect } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator, Modal, RefreshControl, ScrollView, StatusBar,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AdminStats = {
  totals: { users: number; contacts: number; transactions: number; groupTransactions: number; messRecords: number };
  latestUsers: { name: string; email: string; role?: string; createdAt?: string }[];
};
type AdminUserLite = { id: string; name: string; email: string; role?: string; createdAt?: string };
type AdminUserDetail = {
  user: { _id: string; name: string; email: string; role?: string; createdAt?: string };
  summary: { contacts: number; transactions: number; groupTransactions: number; messRecords: number; personalTransactions?: number; notifications?: number };
  contacts: { name: string; email?: string; phone?: string; balance?: number }[];
  transactions: { payer: string; note?: string; createdAt?: string }[];
  groupTransactions: { description?: string; contactIds?: any[]; createdAt?: string }[];
  messRecords: { date: string; mealType: string; createdAt?: string }[];
};

export default function AdminPortalScreen() {
  const { user, token, logout } = useAuth();
  const { isDarkMode, setThemeMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const inputBg = isDarkMode ? COLORS.background : '#f8fafc';

  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<AdminUserLite[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [usersAppending, setUsersAppending] = React.useState(false);
  const [usersPage, setUsersPage] = React.useState(1);
  const [usersPages, setUsersPages] = React.useState(1);
  const [usersLimit, setUsersLimit] = React.useState(5);
  const [showLimitMenu, setShowLimitMenu] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const usersRequest = React.useRef<AbortController | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [userDetail, setUserDetail] = React.useState<AdminUserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = React.useState(false);
  const [broadcastForm, setBroadcastForm] = React.useState({ version: '', updateUrl: '', message: '', subject: 'Khaata App Update' });
  const [broadcastStatus, setBroadcastStatus] = React.useState<{ loading: boolean; success?: string | null; error?: string | null; sent?: number; failed?: number; total?: number }>({ loading: false });

  const totals = stats?.totals || { users: 0, contacts: 0, transactions: 0, groupTransactions: 0, messRecords: 0 };
  const avgTxPerUser = totals.users ? totals.transactions / Math.max(totals.users, 1) : 0;
  const groupShare = totals.transactions ? (totals.groupTransactions / totals.transactions) * 100 : 0;
  const messPerUser = totals.users ? totals.messRecords / Math.max(totals.users, 1) : 0;

  // --- API calls (same logic) ---
  const loadStats = React.useCallback(async () => {
    if (!token) return;
    setIsLoading(true); setError(null);
    try {
      const res = await fetch(`${config.BASE_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json?.success) setStats(json.data); else setError(json?.message || 'Failed');
    } catch (err) { setError('Network error'); }
    finally { setIsLoading(false); }
  }, [token]);

  const loadUsers = React.useCallback(async (page = 1, append = false) => {
    if (!token) return;
    if (usersRequest.current) usersRequest.current.abort();
    const controller = new AbortController();
    usersRequest.current = controller;
    if (append) setUsersAppending(true); else setUsersLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(usersLimit), page: String(page), search: search.trim() });
      const res = await fetch(`${config.BASE_URL}/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      const json = await res.json();
      if (json?.success) {
        const mapped = (json.data?.users || []).map((u: any) => ({ id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }));
        setUsers(prev => append ? [...prev, ...mapped] : mapped);
        const p = json.data?.pagination || {};
        setUsersPage(p.page || page); setUsersPages(p.pages || 1);
      }
    } catch (err: any) { if (err?.name !== 'AbortError') console.error(err); }
    finally { setUsersLoading(false); setUsersAppending(false); if (usersRequest.current === controller) usersRequest.current = null; }
  }, [token, search, usersLimit]);

  const loadUserDetail = React.useCallback(async (userId: string) => {
    if (!token) return;
    setUserDetailLoading(true); setSelectedUserId(userId);
    try {
      const res = await fetch(`${config.BASE_URL}/admin/users/${userId}/detail`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setUserDetail(json?.success ? json.data : null);
    } catch (err) { setUserDetail(null); }
    finally { setUserDetailLoading(false); }
  }, [token]);

  const sendUpdateEmails = React.useCallback(async () => {
    if (!token) return;
    setBroadcastStatus({ loading: true });
    if (!broadcastForm.version.trim() || !broadcastForm.message.trim() || !broadcastForm.updateUrl.trim()) {
      setBroadcastStatus({ loading: false, error: 'All fields required.' }); return;
    }
    try {
      const res = await fetch(`${config.BASE_URL}/admin/app-update/broadcast`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: broadcastForm.version.trim(), updateUrl: broadcastForm.updateUrl.trim(), message: broadcastForm.message, subject: broadcastForm.subject || 'Khaata App Update' }),
      });
      const json = await res.json();
      if (json?.success) setBroadcastStatus({ loading: false, success: json?.message, sent: json?.data?.sent, failed: json?.data?.failed, total: json?.data?.total });
      else setBroadcastStatus({ loading: false, error: json?.message || 'Failed' });
    } catch (err) { setBroadcastStatus({ loading: false, error: 'Network error' }); }
  }, [token, broadcastForm]);

  useFocusEffect(React.useCallback(() => { loadStats(); loadUsers(1, false); }, [loadStats, loadUsers]));
  const onRefresh = React.useCallback(async () => { setRefreshing(true); await Promise.all([loadStats(), loadUsers(1, false)]); setRefreshing(false); }, [loadStats, loadUsers]);

  React.useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); loadUsers(1, false); }, 200);
    return () => clearTimeout(t);
  }, [searchInput, loadUsers]);

  const limitOptions = [5, 10, 25, 50, 100];

  if (!user) return <View style={[s.center, { backgroundColor: COLORS.background }]}><ActivityIndicator size="large" color={accent} /></View>;

  if (user.role !== 'admin') return (
    <View style={[s.center, { backgroundColor: COLORS.background }]}>
      <Ionicons name="shield-outline" size={50} color={COLORS.textMuted} />
      <Text style={[s.centerTitle, { color: COLORS.text }]}>Admin access only</Text>
      <View style={s.centerRow}>
        <TouchableOpacity style={[s.centerBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]} onPress={() => router.replace('/dashboard')}>
          <Text style={[s.centerBtnText, { color: COLORS.text }]}>Back to app</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.centerBtn, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2' }]} onPress={logout}>
          <Text style={{ color: '#ef4444', fontWeight: '700' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const STATS = [
    { label: 'Users', value: totals.users, icon: 'people' as const, color: '#0ea5e9' },
    { label: 'Contacts', value: totals.contacts, icon: 'person-add' as const, color: '#8b5cf6' },
    { label: 'Transactions', value: totals.transactions, icon: 'swap-horizontal' as const, color: '#10b981' },
    { label: 'Group', value: totals.groupTransactions, icon: 'git-network' as const, color: '#f59e0b' },
    { label: 'Mess', value: totals.messRecords, icon: 'restaurant' as const, color: '#f43f5e' },
  ];

  const INSIGHTS = [
    { label: 'Tx/User', value: avgTxPerUser.toFixed(1), pct: Math.min(100, (avgTxPerUser / 20) * 100), color: '#10b981', icon: 'trending-up' as const },
    { label: 'Group %', value: `${groupShare.toFixed(0)}%`, pct: Math.min(100, groupShare), color: '#f59e0b', icon: 'people-circle' as const },
    { label: 'Mess/User', value: messPerUser.toFixed(1), pct: Math.min(100, (messPerUser / 10) * 100), color: '#f43f5e', icon: 'restaurant' as const },
  ];

  return (
    <View style={[s.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Hero Header */}
      <View style={[s.hero, { backgroundColor: isDarkMode ? '#1c1e1f' : accent, borderBottomWidth: isDarkMode ? 1 : 0, borderColor: 'rgba(34,211,238,0.2)' }]}>
        <View style={s.heroTop}>
          <View style={s.heroBadge}><Text style={s.heroBadgeText}>Admin</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={s.heroIcon} onPress={() => setThemeMode(isDarkMode ? 'light' : 'dark')}>
              <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.statusPill}><View style={s.statusDot} /><Text style={s.statusText}>Live</Text></View>
          </View>
        </View>
        <Text style={s.heroTitle}>Control Center</Text>
        <Text style={s.heroSub}>{user.email}</Text>
        <View style={s.heroActions}>
          <TouchableOpacity style={s.heroBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={s.heroBtnText}>{isLoading ? 'Refreshing...' : 'Refresh'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.heroOutline} onPress={() => router.replace('/dashboard')}>
            <Ionicons name="phone-portrait-outline" size={16} color="#fff" />
            <Text style={s.heroOutlineText}>Open App</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.heroOutline} onPress={logout}>
            <Ionicons name="log-out-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} />} contentContainerStyle={{ paddingBottom: 40 }}>

        {error && (
          <View style={[s.errorCard, { borderColor: '#fecaca' }]}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={{ color: '#ef4444', flex: 1, marginLeft: 8 }}>{error}</Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          {STATS.map(st => (
            <View key={st.label} style={[s.statCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={[s.statIcon, { backgroundColor: `${st.color}15` }]}>
                <Ionicons name={st.icon} size={20} color={st.color} />
              </View>
              <Text style={[s.statValue, { color: COLORS.text }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: COLORS.textMuted }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Insights */}
        <Text style={[s.sectionLabel, { color: COLORS.textMuted }]}>ENGAGEMENT</Text>
        {INSIGHTS.map(ins => (
          <View key={ins.label} style={[s.insightCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={[s.insightIcon, { backgroundColor: `${ins.color}15` }]}>
              <Ionicons name={ins.icon} size={18} color={ins.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.insightLabel, { color: COLORS.textMuted }]}>{ins.label}</Text>
              <View style={[s.bar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                <View style={[s.barFill, { width: `${ins.pct}%`, backgroundColor: ins.color }]} />
              </View>
            </View>
            <Text style={[s.insightValue, { color: ins.color }]}>{ins.value}</Text>
          </View>
        ))}

        {/* Broadcast */}
        <Text style={[s.sectionLabel, { color: COLORS.textMuted }]}>APP UPDATE EMAIL</Text>
        <View style={[s.card, { backgroundColor: cardBg, borderColor }]}>
          {broadcastStatus.error && <Text style={{ color: '#ef4444', marginBottom: 8 }}>{broadcastStatus.error}</Text>}
          {broadcastStatus.success && <Text style={{ color: '#10b981', fontWeight: '700', marginBottom: 8 }}>{broadcastStatus.success}</Text>}
          {[
            { key: 'version', label: 'Version *', placeholder: 'e.g. 1.0.1' },
            { key: 'updateUrl', label: 'Update URL *', placeholder: 'Store link' },
            { key: 'subject', label: 'Subject', placeholder: 'Email subject' },
          ].map(f => (
            <View key={f.key} style={{ marginBottom: 12 }}>
              <Text style={[s.fieldLabel, { color: COLORS.textMuted }]}>{f.label}</Text>
              <TextInput style={[s.fieldInput, { backgroundColor: inputBg, borderColor, color: COLORS.text }]}
                value={(broadcastForm as any)[f.key]} onChangeText={(v) => setBroadcastForm(p => ({ ...p, [f.key]: v }))}
                placeholder={f.placeholder} placeholderTextColor={COLORS.textMuted} />
            </View>
          ))}
          <Text style={[s.fieldLabel, { color: COLORS.textMuted }]}>Message *</Text>
          <TextInput style={[s.fieldInput, { backgroundColor: inputBg, borderColor, color: COLORS.text, minHeight: 80, textAlignVertical: 'top' }]}
            value={broadcastForm.message} onChangeText={(v) => setBroadcastForm(p => ({ ...p, message: v }))}
            placeholder="What's new" placeholderTextColor={COLORS.textMuted} multiline />
          {broadcastStatus.total !== undefined && <Text style={[s.mutedSm, { color: COLORS.textMuted }]}>Sent {broadcastStatus.sent || 0}/{broadcastStatus.total} · Failed {broadcastStatus.failed || 0}</Text>}
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: accent }, broadcastStatus.loading && { opacity: 0.6 }]} onPress={sendUpdateEmails} disabled={broadcastStatus.loading}>
            <Text style={[s.saveBtnText, { color: isDarkMode ? '#0a0a0c' : '#fff' }]}>{broadcastStatus.loading ? 'Sending...' : 'Send to all users'}</Text>
          </TouchableOpacity>
        </View>

        {/* Users Directory */}
        <Text style={[s.sectionLabel, { color: COLORS.textMuted }]}>USER DIRECTORY</Text>
        <View style={[s.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={s.searchRow}>
            <View style={[s.searchWrap, { backgroundColor: inputBg, borderColor }]}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} />
              <TextInput style={[s.searchInput, { color: COLORS.text }]} value={searchInput} onChangeText={setSearchInput}
                placeholder="Search name or email" placeholderTextColor={COLORS.textMuted} />
            </View>
            <TouchableOpacity style={[s.limitBadge, { backgroundColor: accent }]} onPress={() => setShowLimitMenu(!showLimitMenu)}>
              <Text style={{ color: isDarkMode ? '#0a0a0c' : '#fff', fontWeight: '800' }}>{usersLimit} ▾</Text>
            </TouchableOpacity>
            {showLimitMenu && (
              <View style={[s.limitMenu, { backgroundColor: cardBg, borderColor }]}>
                {limitOptions.map(opt => (
                  <TouchableOpacity key={opt} style={s.limitOpt} onPress={() => { setShowLimitMenu(false); setUsersLimit(opt); setUsersPage(1); loadUsers(1, false); }}>
                    <Text style={{ color: usersLimit === opt ? accent : COLORS.text, fontWeight: '700' }}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {usersLoading && <ActivityIndicator size="small" color={accent} />}
          </View>

          {users.length === 0 && !usersLoading ? (
            <Text style={{ color: COLORS.textMuted, textAlign: 'center', paddingVertical: 20 }}>No users found.</Text>
          ) : (
            users.map(u => (
              <TouchableOpacity key={u.id} style={[s.userRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]} onPress={() => loadUserDetail(u.id)} activeOpacity={0.7}>
                <View style={[s.userAvatar, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.1)' : 'rgba(10,126,164,0.06)' }]}>
                  <Text style={{ color: accent, fontWeight: '800', fontSize: 14 }}>{u.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.userName, { color: COLORS.text }]}>{u.name || 'Unnamed'}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{u.email}</Text>
                </View>
                <View style={[s.rolePill, u.role === 'admin' ? { backgroundColor: `${accent}15`, borderColor: accent } : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderColor }]}>
                  <Text style={{ color: u.role === 'admin' ? accent : COLORS.textMuted, fontSize: 10, fontWeight: '700' }}>{u.role === 'admin' ? 'ADMIN' : 'USER'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#475569' : '#cbd5e1'} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))
          )}

          {usersPages > 1 && (
            <View style={s.pageRow}>
              <TouchableOpacity style={[s.pageBtn, { borderColor }, usersPage === 1 && { opacity: 0.4 }]} disabled={usersPage === 1} onPress={() => loadUsers(usersPage - 1, false)}>
                <Ionicons name="chevron-back" size={16} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600' }}>Page {usersPage} of {usersPages}</Text>
              <TouchableOpacity style={[s.pageBtn, { borderColor }, usersPage === usersPages && { opacity: 0.4 }]} disabled={usersPage === usersPages} onPress={() => loadUsers(usersPage + 1, false)}>
                <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* User Detail Modal */}
      <Modal visible={!!selectedUserId} animationType="slide" transparent onRequestClose={() => setSelectedUserId(null)}>
        <View style={[s.modalOverlay]}>
          <View style={[s.modalContent, { backgroundColor: cardBg }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: COLORS.text }]}>User Details</Text>
              <TouchableOpacity onPress={() => { setSelectedUserId(null); setUserDetail(null); }}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {userDetailLoading && <View style={{ alignItems: 'center', paddingVertical: 30 }}><ActivityIndicator size="large" color={accent} /></View>}
            {!userDetailLoading && userDetail && (
              <ScrollView style={{ maxHeight: '85%' }} showsVerticalScrollIndicator={false}>
                <View style={s.modalHero}>
                  <View>
                    <Text style={[s.modalName, { color: COLORS.text }]}>{userDetail.user.name}</Text>
                    <Text style={{ color: COLORS.textMuted }}>{userDetail.user.email}</Text>
                  </View>
                  <View style={[s.rolePill, userDetail.user.role === 'admin' ? { backgroundColor: `${accent}15`, borderColor: accent } : { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderColor }]}>
                    <Text style={{ color: userDetail.user.role === 'admin' ? accent : COLORS.textMuted, fontSize: 10, fontWeight: '700' }}>{userDetail.user.role === 'admin' ? 'ADMIN' : 'USER'}</Text>
                  </View>
                </View>

                <View style={s.modalStatsGrid}>
                  {Object.entries(userDetail.summary).map(([label, value]) => (
                    <View key={label} style={[s.modalStatCard, { backgroundColor: inputBg, borderColor }]}>
                      <Text style={[s.modalStatValue, { color: accent }]}>{value as number}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }}>{label}</Text>
                    </View>
                  ))}
                </View>

                {userDetail.contacts.length > 0 && (
                  <>
                    <Text style={[s.modalSectionTitle, { color: COLORS.text }]}>Contacts</Text>
                    {userDetail.contacts.map((c, i) => (
                      <View key={i} style={[s.modalListItem, { backgroundColor: inputBg, borderColor }]}>
                        <View style={[s.userAvatar, { width: 32, height: 32, borderRadius: 10, backgroundColor: isDarkMode ? 'rgba(34,211,238,0.1)' : 'rgba(10,126,164,0.06)' }]}>
                          <Text style={{ color: accent, fontWeight: '800', fontSize: 12 }}>{c.name?.charAt(0)?.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 13 }}>{c.name}</Text>
                          {c.phone && <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{c.phone}</Text>}
                        </View>
                      </View>
                    ))}
                  </>
                )}

                <Text style={[s.modalSectionTitle, { color: COLORS.text }]}>Activity</Text>
                <View style={[s.activityCard, { backgroundColor: inputBg, borderColor }]}>
                  {[['Transactions', userDetail.summary.transactions], ['Group', userDetail.summary.groupTransactions], ['Mess', userDetail.summary.messRecords]].map(([l, v]) => (
                    <View key={l as string} style={s.activityRow}>
                      <Text style={{ color: COLORS.text, fontWeight: '600', fontSize: 13 }}>{l}</Text>
                      <Text style={{ color: accent, fontWeight: '800', fontSize: 13 }}>{v}</Text>
                    </View>
                  ))}
                  <View style={[s.bar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9', marginTop: 8 }]}>
                    <View style={[s.barFill, { width: `${Math.min(100, ((userDetail.summary.transactions + userDetail.summary.groupTransactions + userDetail.summary.messRecords) * 5))}%`, backgroundColor: accent }]} />
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  centerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  centerBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  centerBtnText: { fontWeight: '600' },

  // Hero
  hero: { paddingHorizontal: 20, paddingVertical: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  heroBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  heroIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 6 },
  statusText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  heroTitle: { fontSize: 26, color: '#fff', fontWeight: '900', marginTop: 14 },
  heroSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontSize: 14 },
  heroActions: { flexDirection: 'row', marginTop: 16, gap: 10 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  heroBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  heroOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  heroOutlineText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Error
  errorCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(239,68,68,0.06)' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  statCard: { width: '31%', borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },

  // Insight
  insightCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8, gap: 12 },
  insightIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  insightLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  insightValue: { fontSize: 18, fontWeight: '900', minWidth: 50, textAlign: 'right' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  // Card
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16 },

  // Fields
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  mutedSm: { fontSize: 12, marginTop: 6, marginBottom: 4 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { fontWeight: '800', fontSize: 15 },

  // Users
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, position: 'relative', zIndex: 20 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  limitBadge: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  limitMenu: { position: 'absolute', top: 48, right: 40, borderRadius: 10, borderWidth: 1, zIndex: 30, elevation: 10 },
  limitOpt: { paddingHorizontal: 14, paddingVertical: 10, minWidth: 60 },

  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  userAvatar: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userName: { fontSize: 14, fontWeight: '700' },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },

  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 },
  pageBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 18, padding: 18, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalName: { fontSize: 20, fontWeight: '900' },
  modalStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  modalStatCard: { width: '30%', borderRadius: 10, borderWidth: 1, padding: 10, alignItems: 'center' },
  modalStatValue: { fontSize: 18, fontWeight: '900' },
  modalSectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  modalListItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  activityCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
});
