import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import config from '@/config/config';
import { goBack } from '@/utils/navigation';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, FlatList, Linking, Platform, StatusBar,
  StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_MAX_HEIGHT = SCREEN_HEIGHT * 0.55;

interface AdminAlert {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminAlertsScreen() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const panelBg = isDarkMode ? COLORS.surface : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const slideAnim = useRef(new Animated.Value(PANEL_MAX_HEIGHT + 50)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const closePanel = () => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: PANEL_MAX_HEIGHT + 50, tension: 55, friction: 10, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      goBack();
    });
  };

  const fetchAlerts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${config.BASE_URL}/notifications/alerts`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { setAlerts(data.data.alerts || []); setUnreadCount(data.data.unreadCount || 0); }
    } catch (e) {}
    finally { setLoading(false); }
  };

  const markAllRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      await fetch(`${config.BASE_URL}/notifications/alerts/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true }))); setUnreadCount(0);
    } catch (e) {}
  };

  const markOneRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`${config.BASE_URL}/notifications/alerts/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a)); setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  useFocusEffect(useCallback(() => { fetchAlerts(); }, []));

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const extractUrl = (text: string): string | null => {
    const match = text.match(/(https?:\/\/[^\s]+)/);
    return match ? match[1] : null;
  };

  const getMessageWithoutUrl = (text: string): string => {
    return text.replace(/(https?:\/\/[^\s]+)/g, '').trim();
  };

  const renderAlert = ({ item }: { item: AdminAlert }) => {
    const url = extractUrl(item.message);
    const cleanMsg = getMessageWithoutUrl(item.message);

    return (
      <TouchableOpacity
        style={[styles.card, {
          backgroundColor: item.isRead
            ? (isDarkMode ? 'rgba(255,255,255,0.02)' : '#fafafa')
            : (isDarkMode ? 'rgba(34,211,238,0.04)' : '#f0f9ff'),
          borderColor: item.isRead
            ? (isDarkMode ? 'rgba(255,255,255,0.04)' : '#f1f5f9')
            : (isDarkMode ? 'rgba(34,211,238,0.1)' : '#bae6fd'),
        }]}
        onPress={() => { if (!item.isRead) markOneRead(item._id); }}
        activeOpacity={item.isRead ? 1 : 0.7}
      >
        <View style={styles.cardRow}>
          {!item.isRead && <View style={[styles.cardDot, { backgroundColor: accent }]} />}
          <View style={{ flex: 1 }}>
            <View style={styles.cardTop}>
              <Text style={[styles.cardTitle, { color: COLORS.text, fontWeight: item.isRead ? '500' : '700' }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.cardTime, { color: COLORS.textMuted }]}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={[styles.cardMsg, { color: item.isRead ? COLORS.textMuted : COLORS.text }]} numberOfLines={3}>{cleanMsg}</Text>
            {url && (
              <TouchableOpacity
                style={[styles.linkBtn, { backgroundColor: `${accent}12` }]}
                onPress={() => Linking.openURL(url)}
                activeOpacity={0.7}
              >
                <Ionicons name="link-outline" size={14} color={accent} />
                <Text style={[styles.linkText, { color: accent }]} numberOfLines={1}>{url}</Text>
                <Ionicons name="open-outline" size={12} color={accent} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={closePanel}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet Panel */}
      <Animated.View style={[styles.panel, { backgroundColor: panelBg, borderColor, maxHeight: PANEL_MAX_HEIGHT, transform: [{ translateY: slideAnim }] }]}>

        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#d1d5db' }]} />
        </View>

        {/* Header */}
        <View style={[styles.panelHeader, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
          <Ionicons name="megaphone" size={20} color={accent} />
          <Text style={[styles.panelTitle, { color: COLORS.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: `${accent}20` }]}>
              <Text style={[styles.unreadBadgeText, { color: accent }]}>{unreadCount}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={{ marginRight: 12 }}>
              <Text style={[styles.markAllText, { color: accent }]}>Read all</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={closePanel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator size="small" color={accent} /></View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={36} color={isDarkMode ? 'rgba(34,211,238,0.2)' : 'rgba(10,126,164,0.2)'} />
            <Text style={[styles.emptyTitle, { color: COLORS.text }]}>All caught up!</Text>
            <Text style={[styles.emptyDesc, { color: COLORS.textMuted }]}>No announcements</Text>
          </View>
        ) : (
          <FlatList
            data={alerts}
            renderItem={renderAlert}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },

  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },

  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },

  panelHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, gap: 8,
  },
  panelTitle: { fontSize: 17, fontWeight: '800' },
  unreadBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  unreadBadgeText: { fontSize: 12, fontWeight: '800' },
  markAllText: { fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },

  card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, marginRight: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  cardTitle: { fontSize: 13, flex: 1, marginRight: 8 },
  cardTime: { fontSize: 10 },
  cardMsg: { fontSize: 12, lineHeight: 17 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  linkText: { fontSize: 11, fontWeight: '600', flex: 1 },

  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyState: { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyDesc: { fontSize: 12 },
});
