import BottomNav from '@/components/BottomNav';
import config from '@/config/config';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/DarkModeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { goBack } from '@/utils/navigation';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MEAL_COLORS: Record<string, string> = { Breakfast: '#f59e0b', Lunch: '#10b981', Dinner: '#6366f1' };
const MEAL_ICONS: Record<string, string> = { Breakfast: 'sunny-outline', Lunch: 'restaurant-outline', Dinner: 'moon-outline' };

interface MonthlySummary { totalAmount: number; totalMeals: number; month: number; year: number; monthName: string; }
interface MealBreakdown { count: number; total: number; }
interface Analytics {
  mealBreakdown: { Breakfast: MealBreakdown; Lunch: MealBreakdown; Dinner: MealBreakdown };
  avgMealsPerDay: number; avgSpentPerDay: number; daysInMonth: number; activeDays: number; totalMeals: number;
}

export default function MessAnalyticsScreen() {
  const { user, token } = useAuth();
  const { isDarkMode } = useTheme();
  const { currency: cur } = useCurrency();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? COLORS.surface : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const [months, setMonths] = useState<{ year: number; month: number; monthName: string; totalAmount: number; totalMeals: number }[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Filter state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const filterAnim = React.useRef(new Animated.Value(0)).current;

  // Quick range
  const [activeRange, setActiveRange] = useState<string>('thismonth');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    if (user && token) {
      loadMonths();
      // Auto-load current month on open
      loadSpecificMonth(new Date().getFullYear(), new Date().getMonth() + 1);
    }
  }, [user, token]);

  const loadMonths = async () => {
    if (!user?.id || !token) return;
    try {
      const res = await fetch(`${config.BASE_URL}/mess/months/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        const loaded = data.data.months || [];
        setMonths(loaded);
      }
    } catch (e) { console.log('Failed to load months', e); }
    finally { setInitialLoading(false); }
  };

  const loadDateRange = async (start: Date, end: Date) => {
    if (!user?.id || !token) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${config.BASE_URL}/mess/dateRange/${user.id}?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } },
      );
      if (!res.ok) {
        setMonthlySummary({ totalAmount: 0, totalMeals: 0, month: start.getMonth() + 1, year: start.getFullYear(), monthName: monthNames[start.getMonth()] });
        setAnalytics(null); return;
      }
      const data = await res.json();
      if (data.success) {
        const s = data.data.summary || {};
        setMonthlySummary({
          totalAmount: s.totalAmount || 0,
          totalMeals: s.totalMeals || 0,
          month: start.getMonth() + 1,
          year: start.getFullYear(),
          monthName: monthNames[start.getMonth()],
        });
        setAnalytics(data.data.analytics || null);
      } else { setMonthlySummary(null); setAnalytics(null); }
    } catch (e) { console.log('Error:', e); setMonthlySummary(null); setAnalytics(null); }
    finally { setIsLoading(false); }
  };

  const loadSpecificMonth = async (year: number, month: number) => {
    if (!user?.id || !token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${config.BASE_URL}/mess/monthly/${user.id}?year=${year}&month=${month}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { setMonthlySummary(data.data.summary); setAnalytics(data.data.analytics); }
      else { setMonthlySummary(null); setAnalytics(null); }
    } catch (e) { console.log('Failed', e); }
    finally { setIsLoading(false); }
  };

  const handleRangeSelect = (range: string) => {
    const today = new Date();
    let s = new Date(), e = new Date();
    switch (range) {
      case 'today': s = new Date(today); e = new Date(today); break;
      case 'yesterday': s = new Date(today); s.setDate(s.getDate() - 1); e = new Date(s); break;
      case 'last7': s = new Date(today); s.setDate(s.getDate() - 6); e = new Date(today); break;
      case 'last30': s = new Date(today); s.setDate(s.getDate() - 29); e = new Date(today); break;
      case 'thismonth': s = new Date(today.getFullYear(), today.getMonth(), 1); e = new Date(today.getFullYear(), today.getMonth() + 1, 0); break;
      case 'lastmonth': s = new Date(today.getFullYear(), today.getMonth() - 1, 1); e = new Date(today.getFullYear(), today.getMonth(), 0); break;
    }
    setStartDate(s); setEndDate(e); setActiveRange(range);
    loadDateRange(s, e);
  };

  const handleMonthTap = (year: number, month: number) => {
    setSelectedYear(year); setSelectedMonth(month);
    setActiveRange('custom');
    loadSpecificMonth(year, month);
  };

  const handleFilterApply = () => {
    setActiveRange('custom');
    loadSpecificMonth(selectedYear, selectedMonth);
  };

  const formatPrice = (p: number) => `${cur.symbol} ${Math.round(isFinite(p) ? p : 0).toLocaleString()}`;

  // Year list and filtered months
  const currentYear = new Date().getFullYear();
  const transactionYears = [...new Set(months.map(m => m.year))];
  const yearList = [...new Set([currentYear, ...transactionYears])].sort((a, b) => b - a);
  const allMonthItems = monthNames.map((name, idx) => ({ label: name, value: idx + 1 }));

  // Months with data for selected year
  const monthsWithData = new Set(months.filter(m => m.year === selectedYear).map(m => m.month));

  const QUICK_RANGES = [
    { key: 'today', label: 'Today', icon: 'today-outline' as const },
    { key: 'yesterday', label: 'Yesterday', icon: 'time-outline' as const },
    { key: 'last7', label: '7 Days', icon: 'calendar-outline' as const },
    { key: 'last30', label: '30 Days', icon: 'calendar' as const },
    { key: 'thismonth', label: 'This Month', icon: 'ribbon-outline' as const },
    { key: 'lastmonth', label: 'Last Month', icon: 'arrow-back-circle-outline' as const },
  ];

  if (initialLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingScreenText, { color: COLORS.textMuted }]}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: isDarkMode ? '#1c1e1f' : accent,
        borderBottomWidth: isDarkMode ? 1 : 0, borderColor: 'rgba(34, 211, 238, 0.2)',
      }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mess Analytics</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Date bar + filter toggle */}
      <View style={styles.dateBar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dateBarTitle, { color: COLORS.text }]}>
            {activeRange === 'today' ? 'Today' : activeRange === 'yesterday' ? 'Yesterday' : activeRange === 'last7' ? 'Last 7 Days' : activeRange === 'last30' ? 'Last 30 Days' : monthlySummary ? `${monthlySummary.monthName} ${monthlySummary.year}` : `${monthNames[selectedMonth - 1]} ${selectedYear}`}
          </Text>
          <Text style={[styles.dateBarSub, { color: COLORS.textMuted }]}>
            {monthlySummary ? `${monthlySummary.totalMeals} meals · ${formatPrice(monthlySummary.totalAmount)}` : 'Select a period to view'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterIconBtn, {
            backgroundColor: showFilters ? accent : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
            borderColor: showFilters ? accent : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
          }]}
          onPress={() => {
            const toValue = showFilters ? 0 : 1;
            setShowFilters(!showFilters);
            Animated.spring(filterAnim, { toValue, tension: 50, friction: 8, useNativeDriver: false }).start();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name={showFilters ? 'options' : 'options-outline'} size={20} color={showFilters ? '#ffffff' : COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Collapsible Filter Panel */}
      <Animated.View style={{
        overflow: 'hidden',
        maxHeight: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }),
        opacity: filterAnim,
      }}>
        <View style={styles.filterPanel}>
          <View style={styles.dropdownRow}>
            <TouchableOpacity
              style={[styles.dropdownBtn, {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              }]}
              onPress={() => setShowYearDropdown(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={accent} />
              <Text style={[styles.dropdownBtnText, { color: COLORS.text }]}>{selectedYear}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropdownBtn, { flex: 1.4 }, {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              }]}
              onPress={() => setShowMonthDropdown(true)}
            >
              <Ionicons name="time-outline" size={16} color={accent} />
              <Text style={[styles.dropdownBtnText, { color: COLORS.text }]}>{monthNames[selectedMonth - 1]}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: accent }]}
            onPress={handleFilterApply}
          >
            <Text style={[styles.applyBtnText, { color: isDarkMode ? '#0a0a0c' : '#fff' }]}>Apply Filter</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Year/Month Dropdown Modals */}
      <DropdownModal visible={showYearDropdown} onClose={() => setShowYearDropdown(false)} title="Select Year"
        items={yearList.map(y => ({ label: String(y), value: y }))} selected={selectedYear}
        onSelect={(v: number) => { setSelectedYear(v); setShowYearDropdown(false); }}
        isDarkMode={isDarkMode} COLORS={COLORS} accent={accent} />
      <DropdownModal visible={showMonthDropdown} onClose={() => setShowMonthDropdown(false)} title="Select Month"
        items={allMonthItems} selected={selectedMonth}
        onSelect={(v: number) => { setSelectedMonth(v); setShowMonthDropdown(false); }}
        isDarkMode={isDarkMode} COLORS={COLORS} accent={accent} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Quick Range Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>
          {QUICK_RANGES.map(r => {
            const active = activeRange === r.key;
            return (
              <TouchableOpacity key={r.key}
                style={[styles.rangeChip, {
                  backgroundColor: active ? accent : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                  borderColor: active ? accent : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                }]}
                onPress={() => handleRangeSelect(r.key)}
              >
                <Ionicons name={r.icon} size={14} color={active ? (isDarkMode ? '#0a0a0c' : '#fff') : COLORS.textMuted} />
                <Text style={[styles.rangeChipText, {
                  color: active ? (isDarkMode ? '#0a0a0c' : '#fff') : (isDarkMode ? '#94a3b8' : '#475569'),
                }]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Months with data grid */}
        {months.filter(m => m.year === selectedYear).length > 0 && (
          <View style={styles.monthsSection}>
            <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>MONTHS WITH DATA · {selectedYear}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsScroll}>
              {months.filter(m => m.year === selectedYear).map(m => {
                const isActive = monthlySummary?.month === m.month && monthlySummary?.year === m.year && activeRange === 'custom';
                return (
                  <TouchableOpacity key={`${m.year}-${m.month}`}
                    style={[styles.monthPill, {
                      backgroundColor: isActive ? accent : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                      borderColor: isActive ? accent : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                    }]}
                    onPress={() => handleMonthTap(m.year, m.month)}
                  >
                    <Text style={[styles.monthPillTitle, { color: isActive ? (isDarkMode ? '#0a0a0c' : '#fff') : COLORS.text }]}>{m.monthName.substring(0, 3)}</Text>
                    <Text style={[styles.monthPillAmount, { color: isActive ? (isDarkMode ? '#0a0a0c' : '#fff') : accent }]}>{cur.symbol} {Math.round(m.totalAmount).toLocaleString()}</Text>
                    <Text style={[styles.monthPillMeals, { color: isActive ? (isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)') : COLORS.textMuted }]}>{m.totalMeals} meals</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingBox}><ActivityIndicator size="large" color={accent} /></View>
        )}

        {/* Analytics Content */}
        {!isLoading && monthlySummary && (
          <>
            {/* Big Summary Cards */}
            <View style={styles.bigStatsRow}>
              <View style={[styles.bigStatCard, {
                backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.06)' : '#f0f9ff',
                borderColor: isDarkMode ? 'rgba(34, 211, 238, 0.15)' : '#bae6fd',
              }]}>
                <Ionicons name="restaurant" size={24} color={accent} />
                <Text style={[styles.bigStatValue, { color: COLORS.text }]}>{monthlySummary.totalMeals}</Text>
                <Text style={[styles.bigStatLabel, { color: COLORS.textMuted }]}>Total Meals</Text>
              </View>
              <View style={[styles.bigStatCard, {
                backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.06)' : '#f0fdf4',
                borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.15)' : '#bbf7d0',
              }]}>
                <Ionicons name="wallet" size={24} color={isDarkMode ? '#34d399' : '#10b981'} />
                <Text style={[styles.bigStatValue, { color: COLORS.text }]}>{formatPrice(monthlySummary.totalAmount)}</Text>
                <Text style={[styles.bigStatLabel, { color: COLORS.textMuted }]}>Total Spent</Text>
              </View>
            </View>

            {analytics && (
              <>
                {/* Active Days + Averages Row */}
                <View style={styles.smallStatsRow}>
                  <View style={[styles.smallStatCard, { backgroundColor: cardBg, borderColor }]}>
                    <Ionicons name="calendar" size={18} color={accent} />
                    <Text style={[styles.smallStatValue, { color: COLORS.text }]}>{analytics.activeDays}</Text>
                    <Text style={[styles.smallStatLabel, { color: COLORS.textMuted }]}>Active Days</Text>
                  </View>
                  <View style={[styles.smallStatCard, { backgroundColor: cardBg, borderColor }]}>
                    <Ionicons name="trending-up" size={18} color={isDarkMode ? '#f59e0b' : '#d97706'} />
                    <Text style={[styles.smallStatValue, { color: COLORS.text }]}>{analytics.avgMealsPerDay}</Text>
                    <Text style={[styles.smallStatLabel, { color: COLORS.textMuted }]}>Meals/Day</Text>
                  </View>
                  <View style={[styles.smallStatCard, { backgroundColor: cardBg, borderColor }]}>
                    <Ionicons name="cash-outline" size={18} color={isDarkMode ? '#34d399' : '#10b981'} />
                    <Text style={[styles.smallStatValue, { color: COLORS.text }]}>{cur.symbol} {Math.round(analytics.avgSpentPerDay)}</Text>
                    <Text style={[styles.smallStatLabel, { color: COLORS.textMuted }]}>Spent/Day</Text>
                  </View>
                </View>

                {/* Meal Breakdown */}
                <View style={[styles.breakdownCard, { backgroundColor: cardBg, borderColor }]}>
                  <Text style={[styles.cardTitle, { color: COLORS.text }]}>Meal Breakdown</Text>
                  {Object.entries(analytics.mealBreakdown).map(([type, data]) => {
                    const total = monthlySummary?.totalMeals || 1;
                    const pct = Math.round((data.count / total) * 100);
                    const color = MEAL_COLORS[type] || accent;
                    return (
                      <View key={type} style={styles.breakdownRow}>
                        <View style={styles.breakdownLeft}>
                          <View style={[styles.breakdownIcon, { backgroundColor: `${color}15` }]}>
                            <Ionicons name={MEAL_ICONS[type] as any} size={18} color={color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={styles.breakdownTopRow}>
                              <Text style={[styles.breakdownType, { color: COLORS.text }]}>{type}</Text>
                              <Text style={[styles.breakdownPct, { color }]}>{pct}%</Text>
                            </View>
                            <Text style={[styles.breakdownSub, { color: COLORS.textMuted }]}>
                              {data.count} meals · {formatPrice(data.total)}
                            </Text>
                            {/* Progress bar */}
                            <View style={[styles.progressBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Cost per meal type */}
                <View style={[styles.costCard, { backgroundColor: cardBg, borderColor }]}>
                  <Text style={[styles.cardTitle, { color: COLORS.text }]}>Average Cost per Meal</Text>
                  <View style={styles.costRow}>
                    {Object.entries(analytics.mealBreakdown).map(([type, data]) => {
                      const avg = data.count > 0 ? data.total / data.count : 0;
                      const color = MEAL_COLORS[type] || accent;
                      return (
                        <View key={type} style={[styles.costBox, {
                          backgroundColor: isDarkMode ? `${color}08` : `${color}08`,
                          borderColor: isDarkMode ? `${color}20` : `${color}15`,
                        }]}>
                          <Ionicons name={MEAL_ICONS[type] as any} size={20} color={color} />
                          <Text style={[styles.costValue, { color }]}>{cur.symbol} {Math.round(avg)}</Text>
                          <Text style={[styles.costLabel, { color: COLORS.textMuted }]}>{type}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </>
        )}

        {/* Empty state */}
        {!isLoading && !monthlySummary && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? 'rgba(34, 211, 238, 0.05)' : 'rgba(10, 126, 164, 0.05)' }]}>
              <Ionicons name="analytics-outline" size={60} color={isDarkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(10, 126, 164, 0.2)'} />
            </View>
            <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No Data Yet</Text>
            <Text style={[styles.emptyDesc, { color: COLORS.textMuted }]}>Add mess records to see analytics</Text>
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

// Dropdown Modal
function DropdownModal({ visible, onClose, title, items, selected, onSelect, isDarkMode, COLORS, accent }: any) {
  if (!visible) return null;
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.ddOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.ddCard, { backgroundColor: cardBg, borderColor: isDarkMode ? 'rgba(34,211,238,0.15)' : '#e2e8f0' }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.ddHead, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
            <Text style={[styles.ddTitle, { color: COLORS.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={COLORS.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {items.map((item: any) => (
              <TouchableOpacity key={String(item.value)}
                style={[styles.ddItem, selected === item.value && { backgroundColor: isDarkMode ? 'rgba(34,211,238,0.08)' : '#f0f9ff' }]}
                onPress={() => onSelect(item.value)}
              >
                <Text style={[styles.ddItemText, { color: COLORS.text }, selected === item.value && { color: accent, fontWeight: '600' }]}>{item.label}</Text>
                {selected === item.value && <Ionicons name="checkmark" size={18} color={accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingScreenText: { marginTop: 16, fontSize: 16, fontWeight: '500' },

  header: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5,
  },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

  dateBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  dateBarTitle: { fontSize: 18, fontWeight: '700' },
  dateBarSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  filterIconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  filterPanel: { paddingHorizontal: 20, paddingBottom: 8 },
  dropdownRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dropdownBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  dropdownBtnText: { flex: 1, fontSize: 15, fontWeight: '600' },
  applyBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  applyBtnText: { fontSize: 14, fontWeight: '700' },

  rangeRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  rangeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  rangeChipText: { fontSize: 13, fontWeight: '600' },

  monthsSection: { paddingHorizontal: 20, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  monthsScroll: { gap: 8 },
  monthPill: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', minWidth: 90 },
  monthPillTitle: { fontSize: 14, fontWeight: '700' },
  monthPillAmount: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  monthPillMeals: { fontSize: 10, marginTop: 2 },

  loadingBox: { alignItems: 'center', paddingVertical: 30 },

  bigStatsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 8, marginBottom: 8 },
  bigStatCard: { flex: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 16, borderWidth: 1, gap: 6 },
  bigStatValue: { fontSize: 20, fontWeight: '900' },
  bigStatLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  smallStatsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 10 },
  smallStatCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  smallStatValue: { fontSize: 14, fontWeight: '800' },
  smallStatLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  breakdownCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  breakdownRow: { marginBottom: 16 },
  breakdownLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  breakdownIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  breakdownTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownType: { fontSize: 14, fontWeight: '700' },
  breakdownPct: { fontSize: 14, fontWeight: '800' },
  breakdownSub: { fontSize: 12, marginTop: 2, marginBottom: 6 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  costCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 10 },
  costRow: { flexDirection: 'row', gap: 8 },
  costBox: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  costValue: { fontSize: 15, fontWeight: '800' },
  costLabel: { fontSize: 10, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 50 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptyDesc: { fontSize: 14, textAlign: 'center' },

  // Dropdown modal
  ddOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  ddCard: { borderRadius: 16, width: '80%', maxHeight: '60%', borderWidth: 1, overflow: 'hidden' },
  ddHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  ddTitle: { fontSize: 17, fontWeight: '700' },
  ddItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  ddItemText: { fontSize: 15 },
});
