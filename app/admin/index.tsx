import config from '@/config/config';
import { useAuth } from '@/contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type AdminStats = {
  totals: {
    users: number;
    contacts: number;
    transactions: number;
    groupTransactions: number;
    messRecords: number;
  };
  latestUsers: { name: string; email: string; role?: string; createdAt?: string }[];
};

type AdminUserLite = { id: string; name: string; email: string; role?: string; createdAt?: string };

type AdminUserDetail = {
  user: { _id: string; name: string; email: string; role?: string; createdAt?: string };
  summary: {
    contacts: number;
    transactions: number;
    groupTransactions: number;
    messRecords: number;
    personalTransactions?: number;
    notifications?: number;
  };
  contacts: { name: string; email?: string; phone?: string; balance?: number; createdAt?: string }[];
  transactions: { payer: string; note?: string; createdAt?: string; contactId?: any }[];
  groupTransactions: { description?: string; contactIds?: any[]; createdAt?: string }[];
  messRecords: { date: string; mealType: string; createdAt?: string }[];
};

export default function AdminPortalScreen() {
  const { user, token, logout } = useAuth();
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
  const [broadcastForm, setBroadcastForm] = React.useState({
    version: '',
    updateUrl: '',
    message: '',
    subject: 'Khaata App Update',
  });
  const [broadcastStatus, setBroadcastStatus] = React.useState<{
    loading: boolean;
    success?: string | null;
    error?: string | null;
    sent?: number;
    failed?: number;
    total?: number;
  }>({ loading: false });

  const totals = stats?.totals || {
    users: 0,
    contacts: 0,
    transactions: 0,
    groupTransactions: 0,
    messRecords: 0,
  };

  const avgContactsPerUser = totals.users ? totals.contacts / totals.users : 0;
  const avgTxPerUser = totals.users ? totals.transactions / Math.max(totals.users, 1) : 0;
  const groupShare = totals.transactions ? (totals.groupTransactions / totals.transactions) * 100 : 0;
  const messPerUser = totals.users ? totals.messRecords / Math.max(totals.users, 1) : 0;

  const loadStats = React.useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${config.BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.success) {
        setStats(json.data);
      } else {
        setError(json?.message || 'Failed to load admin stats');
      }
    } catch (err) {
      console.error('Admin portal fetch error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const loadUsers = React.useCallback(async (page = 1, append = false) => {
    if (!token) return;
    if (usersRequest.current) {
      usersRequest.current.abort();
    }
    const controller = new AbortController();
    usersRequest.current = controller;
    if (append) setUsersAppending(true); else setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(usersLimit),
        page: String(page),
        search: search.trim(),
      });
      const res = await fetch(`${config.BASE_URL}/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const json = await res.json();
      if (json?.success) {
        const mapped = (json.data?.users || []).map((u: any) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
        }));
        setUsers(prev => append ? [...prev, ...mapped] : mapped);
        const pagination = json.data?.pagination || {};
        setUsersPage(pagination.page || page);
        setUsersPages(pagination.pages || 1);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // ignore
      } else {
        console.error('Admin users fetch error:', err);
      }
    } finally {
      setUsersLoading(false);
      setUsersAppending(false);
      if (usersRequest.current === controller) {
        usersRequest.current = null;
      }
    }
  }, [token, search, usersLimit]);

  const loadUserDetail = React.useCallback(async (userId: string) => {
    if (!token) return;
    setUserDetailLoading(true);
    setSelectedUserId(userId);
    try {
      const res = await fetch(`${config.BASE_URL}/admin/users/${userId}/detail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json?.success) {
        setUserDetail(json.data);
      } else {
        setUserDetail(null);
      }
    } catch (err) {
      console.error('Admin user detail fetch error:', err);
      setUserDetail(null);
    } finally {
      setUserDetailLoading(false);
    }
  }, [token]);

  const sendUpdateEmails = React.useCallback(async () => {
    if (!token) return;
    setBroadcastStatus({ loading: true });

    if (!broadcastForm.version.trim() || !broadcastForm.message.trim() || !broadcastForm.updateUrl.trim()) {
      setBroadcastStatus({
        loading: false,
        error: 'Version, message, and update URL are required.',
      });
      return;
    }

    try {
      const res = await fetch(`${config.BASE_URL}/admin/app-update/broadcast`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: broadcastForm.version.trim(),
          updateUrl: broadcastForm.updateUrl.trim(),
          message: broadcastForm.message,
          subject: broadcastForm.subject || 'Khaata App Update',
        }),
      });
      const json = await res.json();
      if (json?.success) {
        setBroadcastStatus({
          loading: false,
          success: json?.message || 'Update email sent',
          sent: json?.data?.sent,
          failed: json?.data?.failed,
          total: json?.data?.total,
        });
      } else {
        setBroadcastStatus({
          loading: false,
          error: json?.message || 'Unable to send update email',
        });
      }
    } catch (err) {
      console.error('Broadcast update error:', err);
      setBroadcastStatus({
        loading: false,
        error: 'Network error. Please try again.',
      });
    }
  }, [token, broadcastForm]);

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
      loadUsers(1, false);
    }, [loadStats, loadUsers])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadUsers(1, false)]);
    setRefreshing(false);
  }, [loadStats, loadUsers]);

  // debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      loadUsers(1, false);
    }, 200); // faster debounce
    return () => clearTimeout(t);
  }, [searchInput, loadUsers]);

  const limitOptions = [5, 10, 25, 50, 100];
  const handleLimitSelect = (val: number) => {
    setShowLimitMenu(false);
    setUsersLimit(val);
    setUsersPage(1);
    setUsersPages(1);
    loadUsers(1, false);
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#20B2AA" />
        <Text style={styles.muted}>Checking account...</Text>
      </View>
    );
  }

  if (user.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Admin access only</Text>
        <Text style={styles.muted}>You need an admin account to view this area.</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.pillButton, styles.secondaryButton]} onPress={() => router.replace('/dashboard')}>
            <Text style={styles.secondaryText}>Back to app</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pillButton, styles.dangerButton]} onPress={logout}>
            <Text style={styles.dangerText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#20B2AA" />}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Admin</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Live</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Control Center</Text>
        <Text style={styles.heroSubtitle}>{user.email}</Text>
        <Text style={styles.heroMuted}>Monitor usage, guide users, keep Khaata healthy.</Text>
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.primaryButton} onPress={onRefresh}>
            <Text style={styles.primaryButtonText}>{isLoading ? 'Refreshing...' : 'Refresh data'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton} onPress={() => router.replace('/dashboard')}>
            <Text style={styles.outlineButtonText}>Open app</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroChips}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Users</Text>
            <Text style={styles.chipValue}>{totals.users}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Transactions</Text>
            <Text style={styles.chipValue}>{totals.transactions}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Group</Text>
            <Text style={styles.chipValue}>{totals.groupTransactions}</Text>
          </View>
        </View>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load data</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>App update email</Text>
            <Text style={styles.sectionHint}>Send update instructions to all users</Text>
          </View>
          {broadcastStatus.loading && <ActivityIndicator size="small" color="#20B2AA" />}
        </View>
        {broadcastStatus.error ? <Text style={styles.inlineError}>{broadcastStatus.error}</Text> : null}
        {broadcastStatus.success ? <Text style={styles.successText}>{broadcastStatus.success}</Text> : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Version *</Text>
          <TextInput
            style={styles.fieldInput}
            value={broadcastForm.version}
            onChangeText={(v) => setBroadcastForm((prev) => ({ ...prev, version: v }))}
            placeholder="e.g. 1.0.1"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Update URL *</Text>
          <TextInput
            style={styles.fieldInput}
            value={broadcastForm.updateUrl}
            onChangeText={(v) => setBroadcastForm((prev) => ({ ...prev, updateUrl: v }))}
            placeholder="Store link"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email subject</Text>
          <TextInput
            style={styles.fieldInput}
            value={broadcastForm.subject}
            onChangeText={(v) => setBroadcastForm((prev) => ({ ...prev, subject: v }))}
            placeholder="Subject line"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Message *</Text>
          <TextInput
            style={[styles.fieldInput, styles.multilineInput]}
            value={broadcastForm.message}
            onChangeText={(v) => setBroadcastForm((prev) => ({ ...prev, message: v }))}
            placeholder="What's new, why to update, any instructions"
            multiline
          />
        </View>

        {broadcastStatus.total !== undefined ? (
          <Text style={styles.mutedSmall}>
            Sent {broadcastStatus.sent || 0} / {broadcastStatus.total} users · Failed {broadcastStatus.failed || 0}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, broadcastStatus.loading && styles.saveButtonDisabled]}
          onPress={sendUpdateEmails}
          disabled={broadcastStatus.loading}
        >
          <Text style={styles.saveButtonText}>
            {broadcastStatus.loading ? 'Sending...' : 'Send update email to all users'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Snapshot</Text>
          <Text style={styles.sectionHint}>Key numbers at a glance</Text>
        </View>
        <View style={styles.grid}>
          {[
            { label: 'Total Users', value: totals.users, accent: '#0ea5e9' },
            { label: 'Contacts', value: totals.contacts, accent: '#8b5cf6' },
            { label: 'Transactions', value: totals.transactions, accent: '#10b981' },
            { label: 'Group Khaata', value: totals.groupTransactions, accent: '#f59e0b' },
            { label: 'Mess Records', value: totals.messRecords, accent: '#f43f5e' },
            { label: 'Avg Contacts / User', value: avgContactsPerUser.toFixed(1), accent: '#14b8a6' },
          ].map((item) => (
            <View key={item.label} style={styles.metricCard}>
              <View style={[styles.metricBadge, { backgroundColor: `${item.accent}1A` }]}>
                <View style={[styles.metricDot, { backgroundColor: item.accent }]} />
              </View>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Engagement insights</Text>
          <Text style={styles.sectionHint}>Activity at a glance</Text>
        </View>
        <View style={styles.insightColumn}>
          <View style={styles.insightCardWide}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: '#10b98120' }]}><Text style={styles.insightIconText}>↔️</Text></View>
              <View>
                <Text style={styles.insightLabel}>Transactions per user</Text>
                <Text style={styles.insightValueBig}>{avgTxPerUser.toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${Math.min(100, (avgTxPerUser / 20) * 100)}%`, backgroundColor: '#10b981' }]} />
            </View>
            <Text style={styles.insightSub}>Higher means deeper engagement.</Text>
          </View>

          <View style={styles.insightCardWide}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: '#f59e0b20' }]}><Text style={styles.insightIconText}>👥</Text></View>
              <View>
                <Text style={styles.insightLabel}>Group share</Text>
                <Text style={styles.insightValueBig}>{groupShare.toFixed(0)}%</Text>
              </View>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${Math.min(100, groupShare)}%`, backgroundColor: '#f59e0b' }]} />
            </View>
            <Text style={styles.insightSub}>Portion of transactions done in groups.</Text>
          </View>

          <View style={styles.insightCardWide}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: '#f43f5e20' }]}><Text style={styles.insightIconText}>🍽️</Text></View>
              <View>
                <Text style={styles.insightLabel}>Mess records per user</Text>
                <Text style={styles.insightValueBig}>{messPerUser.toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${Math.min(100, (messPerUser / 10) * 100)}%`, backgroundColor: '#f43f5e' }]} />
            </View>
            <Text style={styles.insightSub}>How often users log cafeteria activity.</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>User directory</Text>
            <Text style={styles.sectionHint}>Tap to inspect full history</Text>
          </View>
          <View style={styles.filterRow}>
            <View style={styles.limitContainer}>
              <TouchableOpacity style={styles.limitBadge} onPress={() => setShowLimitMenu(!showLimitMenu)}>
                <Text style={styles.limitBadgeText}>{usersLimit} ▾</Text>
              </TouchableOpacity>
              {showLimitMenu && (
                <View style={styles.limitMenu}>
                  {limitOptions.map((opt) => (
                    <TouchableOpacity key={opt} style={styles.limitOption} onPress={() => handleLimitSelect(opt)}>
                      <Text style={[styles.limitOptionText, usersLimit === opt && styles.limitOptionTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.indicatorSlot}>
              {usersLoading && <ActivityIndicator size="small" color="#20B2AA" />}
            </View>
          </View>
        </View>
        <View style={styles.searchRow}>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by name or email"
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
          <TouchableOpacity style={styles.searchButton} onPress={() => loadUsers(1, false)}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
        {users.length === 0 && !usersLoading ? (
          <Text style={styles.muted}>No users found.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colNameWidth]}>Name</Text>
                <Text style={[styles.tableHeaderCell, styles.colEmailWidth]}>Email</Text>
                <Text style={[styles.tableHeaderCell, styles.tableHeaderCellCenter, styles.colRoleWidth]}>Role</Text>
                <Text style={[styles.tableHeaderCell, styles.tableHeaderCellCenter, styles.colJoinedWidth]}>Joined</Text>
                <Text style={[styles.tableHeaderCell, styles.tableHeaderCellCenter, styles.colActionWidth]}>Action</Text>
              </View>
              {users.map((u) => {
                const accent = u.role === 'admin' ? '#0ea5e9' : '#20B2AA';
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.tableRow}
                    onPress={() => loadUserDetail(u.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.tableCellView, styles.colNameWidth]}>
                      <Text style={[styles.tableCellTextBold, styles.cellWrap]}>{u.name || 'Unnamed user'}</Text>
                    </View>
                    <View style={[styles.tableCellView, styles.colEmailWidth]}>
                      <Text style={[styles.tableCellText, styles.cellWrap]}>{u.email}</Text>
                    </View>
                    <View style={[styles.tableCellView, styles.colRoleWidth, { alignItems: 'center' }]}>
                      <View style={[styles.rolePill, u.role === 'admin' ? styles.roleAdmin : styles.roleUser]}>
                        <Text style={[styles.roleText, u.role === 'admin' ? styles.roleTextAdmin : styles.roleTextUser]}>
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tableCellView, styles.colJoinedWidth, { alignItems: 'center' }]}>
                      <Text style={styles.tableCellText}>{u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '—'}</Text>
                    </View>
                    <View style={[styles.tableCellView, styles.colActionWidth, { alignItems: 'center' }]}>
                      <Text style={styles.userChevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
        {usersPages > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageButton, usersPage === 1 && styles.pageButtonDisabled]}
              disabled={usersPage === 1 || usersLoading || usersAppending}
              onPress={() => loadUsers(usersPage - 1, false)}
            >
              <Text style={styles.pageButtonText}>Prev</Text>
            </TouchableOpacity>
            <View style={styles.pageNumbers}>
              {Array.from({ length: Math.min(usersPages, 7) }).map((_, i) => {
                // compute window around current page
                const windowSize = 7;
                const half = Math.floor(windowSize / 2);
                let start = Math.max(1, usersPage - half);
                let end = Math.min(usersPages, start + windowSize - 1);
                start = Math.max(1, end - windowSize + 1);
                const page = start + i;
                if (page > end) return null;
                const active = page === usersPage;
                return (
                  <TouchableOpacity
                    key={page}
                    style={[styles.pageNumber, active && styles.pageNumberActive]}
                    disabled={active || usersLoading || usersAppending}
                    onPress={() => loadUsers(page, false)}
                  >
                    <Text style={[styles.pageNumberText, active && styles.pageNumberTextActive]}>{page}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.pageButton, usersPage === usersPages && styles.pageButtonDisabled]}
              disabled={usersPage === usersPages || usersLoading || usersAppending}
              onPress={() => loadUsers(usersPage + 1, false)}
            >
              <Text style={styles.pageButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <Text style={styles.sectionHint}>Keep operations smooth</Text>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={onRefresh}>
            <Text style={styles.quickEmoji}>🔄</Text>
            <Text style={styles.quickTitle}>Sync data</Text>
            <Text style={styles.quickText}>Refresh admin stats now.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.replace('/dashboard')}>
            <Text style={styles.quickEmoji}>📱</Text>
            <Text style={styles.quickTitle}>Switch to app</Text>
            <Text style={styles.quickText}>Open the main dashboard.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={logout}>
            <Text style={styles.quickEmoji}>🚪</Text>
            <Text style={styles.quickTitle}>Sign out</Text>
            <Text style={styles.quickText}>Securely end this session.</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>

    <Modal visible={!!selectedUserId} animationType="slide" transparent onRequestClose={() => setSelectedUserId(null)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User details</Text>
            <TouchableOpacity onPress={() => { setSelectedUserId(null); setUserDetail(null); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {userDetailLoading && (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#20B2AA" />
              <Text style={styles.muted}>Loading...</Text>
            </View>
          )}
          {!userDetailLoading && userDetail && (
            <ScrollView style={{ maxHeight: '85%' }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHero}>
                <View>
                  <Text style={styles.modalUserName}>{userDetail.user.name}</Text>
                  <Text style={styles.modalUserEmail}>{userDetail.user.email}</Text>
                </View>
                <View style={[styles.rolePill, userDetail.user.role === 'admin' ? styles.roleAdmin : styles.roleUser]}>
                  <Text style={[styles.roleText, userDetail.user.role === 'admin' ? styles.roleTextAdmin : styles.roleTextUser]}>
                    {userDetail.user.role === 'admin' ? 'Admin' : 'User'}
                  </Text>
                </View>
              </View>

              <View style={styles.modalGrid}>
                {Object.entries(userDetail.summary).map(([label, value]) => (
                  <View key={label} style={styles.metricCard}>
                    <View style={[styles.metricBadge, { backgroundColor: '#e0f2fe' }]}>
                      <View style={[styles.metricDot, { backgroundColor: '#0ea5e9' }]} />
                    </View>
                    <Text style={styles.metricValue}>{value as number}</Text>
                    <Text style={styles.metricLabel}>{label}</Text>
                  </View>
                ))}
              </View>

              {renderContacts(userDetail.contacts)}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Activity pulse</Text>
                <View style={styles.activityCard}>
                  <Text style={styles.activityHint}>Is this user active?</Text>
                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Transactions</Text>
                    <Text style={styles.activityValue}>{userDetail.summary.transactions}</Text>
                  </View>
                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Group</Text>
                    <Text style={styles.activityValue}>{userDetail.summary.groupTransactions}</Text>
                  </View>
                  <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>Mess</Text>
                    <Text style={styles.activityValue}>{userDetail.summary.messRecords}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[
                      styles.barFill,
                      { width: `${Math.min(100, (userDetail.summary.transactions + userDetail.summary.groupTransactions + userDetail.summary.messRecords) * 5)}%`, backgroundColor: '#20B2AA' }
                    ]} />
                  </View>
                  <Text style={styles.activityFooter}>Higher bar = more recent activity</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
    </>
  );
}

const renderContacts = (items: any[]) => {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.modalSection}>
      <Text style={styles.sectionTitle}>Contacts</Text>
      <View style={styles.contactList}>
        {items.map((c, idx) => (
          <View key={idx} style={styles.contactListItem}>
            <View style={styles.contactAvatar}>
              <Text style={styles.contactAvatarText}>{c.name?.charAt(0)?.toUpperCase() || 'C'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{c.name}</Text>
              {c.email ? <Text style={styles.contactMeta}>{c.email}</Text> : null}
              {c.phone ? <Text style={styles.contactMeta}>{c.phone}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  muted: {
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  pillButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: '#e2f3f1',
  },
  secondaryText: {
    color: '#0f766e',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#fee2e2',
  },
  dangerText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  hero: {
    backgroundColor: '#20B2AA',
    paddingHorizontal: 24,
    paddingVertical: 34,
    paddingTop: 46,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
    shadowColor: '#0f766e',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: 'white',
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 28,
    color: 'white',
    fontWeight: '800',
    marginTop: 12,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  heroMuted: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 12,
    fontSize: 15,
  },
  heroActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  chipValue: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  outlineButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionHint: {
    color: '#6b7280',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    width: '47.8%',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    color: '#475569',
    marginTop: 4,
    fontWeight: '600',
  },
  insightColumn: {
    gap: 12,
  },
  insightCardWide: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#f8fafc',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  insightIconText: {
    fontSize: 16,
  },
  insightValueBig: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  insightLabel: {
    color: '#475569',
    fontWeight: '700',
    marginBottom: 6,
  },
  insightSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  barBg: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontWeight: '800',
    color: '#1d4ed8',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  userEmail: {
    color: '#6b7280',
    fontSize: 13,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleAdmin: {
    backgroundColor: '#ecfeff',
    borderColor: '#0ea5e9',
  },
  roleUser: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  roleText: {
    fontWeight: '700',
    fontSize: 12,
  },
  roleTextAdmin: {
    color: '#0369a1',
  },
  roleTextUser: {
    color: '#374151',
  },
  link: {
    color: '#20B2AA',
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: '31%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  quickEmoji: {
    fontSize: 20,
  },
  quickTitle: {
    fontWeight: '700',
    marginTop: 6,
    color: '#111827',
  },
  quickText: {
    color: '#6b7280',
    marginTop: 4,
    fontSize: 12,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
  },
  errorTitle: {
    color: '#b91c1c',
    fontWeight: '700',
    marginBottom: 4,
  },
  errorText: {
    color: '#b91c1c',
  },
  inlineError: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  successText: {
    color: '#16a34a',
    fontWeight: '700',
    marginBottom: 6,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    color: '#0f172a',
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#20B2AA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
  mutedSmall: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 6,
  },
  userCard: {
    width: '100%',
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatarLg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarTextLg: {
    fontWeight: '800',
    color: '#1d4ed8',
    fontSize: 16,
  },
  userCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  userChevron: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '700',
  },
  userListGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
    zIndex: 20,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    backgroundColor: '#f9fafb',
  },
  searchButton: {
    backgroundColor: '#20B2AA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  limitBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  limitBadgeText: {
    color: 'white',
    fontWeight: '800',
  },
  limitContainer: {
    position: 'relative',
  },
  limitMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
    elevation: 8,
  },
  limitOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 80,
  },
  limitOptionText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  limitOptionTextActive: {
    color: '#20B2AA',
  },
  indicatorSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableScroll: {
    marginTop: 8,
  },
  table: {
    minWidth: 700,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    fontWeight: '800',
    color: '#0f172a',
    fontSize: 13,
    paddingRight: 6,
  },
  tableHeaderCellCenter: {
    textAlign: 'center',
  },
  colNameWidth: { width: 180 },
  colEmailWidth: { width: 220 },
  colRoleWidth: { width: 90 },
  colJoinedWidth: { width: 110 },
  colActionWidth: { width: 60 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableCellView: {
    justifyContent: 'center',
    minHeight: 24,
  },
  tableCellText: {
    color: '#0f172a',
    fontSize: 12,
  },
  tableCellTextBold: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  cellWrap: {
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  loadMore: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  loadMoreText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  pageNumber: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  pageNumberActive: {
    backgroundColor: '#20B2AA',
    borderColor: '#20B2AA',
  },
  pageNumberText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
  userMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 18,
    color: '#475569',
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalUserName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalUserEmail: {
    color: '#475569',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  modalSection: {
    marginBottom: 14,
  },
  contactList: {
    gap: 10,
  },
  contactListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactAvatarText: {
    fontWeight: '800',
    color: '#0ea5e9',
  },
  contactName: {
    fontWeight: '700',
    color: '#0f172a',
  },
  contactMeta: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  activityCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  activityHint: {
    color: '#475569',
    marginBottom: 8,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  activityLabel: {
    color: '#0f172a',
    fontWeight: '600',
  },
  activityValue: {
    color: '#0f172a',
    fontWeight: '700',
  },
  activityFooter: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 6,
  },
});

