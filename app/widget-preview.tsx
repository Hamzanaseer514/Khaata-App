import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { goBack } from '@/utils/navigation';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from '../config/config';

export default function WidgetPreviewScreen() {
  const { token } = useAuth();
  const { isDarkMode } = useTheme();
  const { currency: cur } = useCurrency();
  const { t } = useTranslation();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';

  const [recv, setRecv] = useState(0);
  const [pay, setPay] = useState(0);
  const [contactCount, setContactCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${config.BASE_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        let r = 0, p = 0;
        data.data.forEach((c: any) => {
          const bal = Number(c.balance || 0);
          if (bal > 0) r += bal;
          else if (bal < 0) p += Math.abs(bal);
        });
        setRecv(r);
        setPay(p);
        setContactCount(data.data.length);
      }
    } catch {}
  };

  const net = recv - pay;
  const netColor = net > 0 ? '#22c55e' : net < 0 ? '#ef4444' : '#94a3b8';

  const formatAmt = (v: number) => {
    if (v >= 100000) return (v / 100000).toFixed(1) + 'L';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return Math.round(v).toString();
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
        <Text style={styles.headerTitle}>Home Screen Widget</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Widget Preview Label */}
        <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>WIDGET PREVIEW</Text>
        <Text style={[styles.sectionDesc, { color: COLORS.textMuted }]}>
          This is how the widget will look on your home screen
        </Text>

        {/* === WIDGET PREVIEW (React Native mirror of the actual widget) === */}
        <View style={styles.widgetContainer}>
          <View style={styles.widget}>
            {/* Header row */}
            <View style={styles.widgetHeader}>
              <Text style={styles.widgetBrand}>KhaataWise</Text>
              <Text style={styles.widgetContacts}>{contactCount} contacts</Text>
            </View>

            {/* Net Balance - Center */}
            <View style={styles.widgetCenter}>
              <Text style={styles.widgetNetLabel}>NET BALANCE</Text>
              <Text style={[styles.widgetNetAmount, { color: netColor }]}>
                {cur.symbol} {formatAmt(net)}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.widgetFooter}>
              <View>
                <Text style={styles.widgetFooterLabel}>RECEIVABLE</Text>
                <Text style={[styles.widgetFooterValue, { color: '#22c55e' }]}>
                  {cur.symbol} {formatAmt(recv)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.widgetFooterLabel}>PAYABLE</Text>
                <Text style={[styles.widgetFooterValue, { color: '#ef4444' }]}>
                  {cur.symbol} {formatAmt(pay)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* How to add */}
        <Text style={[styles.sectionLabel, { color: COLORS.textMuted, marginTop: 32 }]}>HOW TO ADD WIDGET</Text>

        <View style={styles.stepsContainer}>
          {[
            { step: '1', icon: 'phone-portrait-outline' as const, title: 'Long press home screen', desc: 'Press and hold on empty area of your Android home screen' },
            { step: '2', icon: 'apps-outline' as const, title: 'Tap "Widgets"', desc: 'Select "Widgets" from the popup menu' },
            { step: '3', icon: 'search-outline' as const, title: 'Find "Khaata Balance"', desc: 'Search or scroll to find "KhaataWise" in the widget list' },
            { step: '4', icon: 'move-outline' as const, title: 'Drag to home screen', desc: 'Long press the widget and drag it to your desired position' },
          ].map((item, idx) => (
            <View key={idx} style={[styles.stepCard, {
              backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
            }]}>
              <View style={[styles.stepNumber, { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.15)' : 'rgba(10,126,164,0.1)' }]}>
                <Text style={[styles.stepNumberText, { color: accent }]}>{item.step}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name={item.icon} size={16} color={accent} />
                  <Text style={[styles.stepTitle, { color: COLORS.text }]}>{item.title}</Text>
                </View>
                <Text style={[styles.stepDesc, { color: COLORS.textMuted }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Info note */}
        <View style={[styles.infoBox, {
          backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)',
          borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
        }]}>
          <Ionicons name="information-circle" size={20} color="#f59e0b" />
          <Text style={[styles.infoText, { color: COLORS.textMuted }]}>
            Widget updates every 30 minutes automatically. Open the app to refresh data instantly. Tap the widget to open KhaataWise.
          </Text>
        </View>

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
  scrollContent: { padding: 20, paddingBottom: 40 },

  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  sectionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 20 },

  // Widget Preview
  widgetContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  widget: {
    width: 320,
    height: 170,
    backgroundColor: '#0a0a0c',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    // shadow to make it look like it's floating
    shadowColor: '#25d1f4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 209, 244, 0.1)',
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetBrand: {
    fontSize: 15,
    fontWeight: '800',
    color: '#25d1f4',
    letterSpacing: 0.5,
  },
  widgetContacts: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  widgetCenter: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  widgetNetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  widgetNetAmount: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  widgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  widgetFooterLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  widgetFooterValue: {
    fontSize: 17,
    fontWeight: '900',
  },

  // Steps
  stepsContainer: { gap: 10 },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  stepNumber: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  stepNumberText: { fontSize: 16, fontWeight: '900' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700' },
  stepDesc: { fontSize: 12, lineHeight: 16 },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 20,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
