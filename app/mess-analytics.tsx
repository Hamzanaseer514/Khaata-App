import config from '@/config/config';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface MessRecord {
  id: string;
  date: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  price: number;
  createdAt: string;
}

interface MonthlySummary {
  totalAmount: number;
  totalMeals: number;
  month: number;
  year: number;
  monthName: string;
}

interface MealBreakdown {
  count: number;
  total: number;
}

interface Analytics {
  mealBreakdown: {
    Breakfast: MealBreakdown;
    Lunch: MealBreakdown;
    Dinner: MealBreakdown;
  };
  avgMealsPerDay: number;
  avgSpentPerDay: number;
  daysInMonth: number;
  activeDays: number;
  totalMeals: number;
}

export default function MessAnalyticsScreen() {
  const { user, token } = useAuth();
  const [months, setMonths] = useState<{ year: number; month: number; monthName: string; label: string; totalAmount: number; totalMeals: number }[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Date range state
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [selectedRangeType, setSelectedRangeType] = useState('thismonth');

  const dateRangeOptions = [
    { value: 'today', label: 'Today', emoji: '📅' },
    { value: 'yesterday', label: 'Yesterday', emoji: '📆' },
    { value: 'last7days', label: 'Last 7 Days', emoji: '📊' },
    { value: 'last30days', label: 'Last 30 Days', emoji: '📈' },
    { value: 'thismonth', label: 'This Month', emoji: '🗓️' },
    { value: 'lastmonth', label: 'Last Month', emoji: '📋' },
    { value: 'custom', label: 'Custom Range', emoji: '⚙️' },
  ];

  useEffect(() => {
    if (user && token) {
      loadMonths();
    }
  }, [user, token]);

  const loadMonths = async () => {
    if (!user?.id || !token) return;
    try {
      const res = await fetch(`${config.BASE_URL}/mess/months/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMonths(data.data.months || []);
    } catch (e) {
      console.log('Failed to load months', e);
    }
  };

  const loadSpecificMonth = async (year: number, month: number) => {
    if (!user?.id || !token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${config.BASE_URL}/mess/monthly/${user.id}?year=${year}&month=${month}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMonthlySummary(data.data.summary);
        setAnalytics(data.data.analytics);
        // set range UI to that month
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        setStartDate(start);
        setEndDate(end);
        setSelectedRangeType('custom');
      }
    } catch (e) {
      console.log('Failed to load month', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDateRangeSummary = async () => {
    if (!user?.id || !token) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${config.BASE_URL}/mess/dateRange/${user.id}?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setMonthlySummary({
            totalAmount: 0,
            totalMeals: 0,
            month: startDate.getMonth() + 1,
            year: startDate.getFullYear(),
            monthName: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
          });
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMonthlySummary(data.data.summary);
        setAnalytics(data.data.analytics);
      } else {
        setMonthlySummary({
          totalAmount: 0,
          totalMeals: 0,
          month: startDate.getMonth() + 1,
          year: startDate.getFullYear(),
          monthName: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        });
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Error loading date range summary:', error);
      setMonthlySummary({
        totalAmount: 0,
        totalMeals: 0,
        month: startDate.getMonth() + 1,
        year: startDate.getFullYear(),
        monthName: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
      });
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (rangeType: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (rangeType) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      case 'last7days':
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        end = new Date(today);
        break;
      case 'last30days':
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        end = new Date(today);
        break;
      case 'thismonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastmonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'custom':
        setShowDateRangePicker(true);
        return;
    }

    setStartDate(start);
    setEndDate(end);
    setSelectedRangeType(rangeType);
    setTimeout(() => loadDateRangeSummary(), 100);
  };

  const formatPrice = (price: number) => {
    const value = isFinite(price as any) ? price : 0;
    return `₹${value.toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    const value = isFinite(num as any) ? num : 0;
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'Breakfast': return '#FFA726';
      case 'Lunch': return '#66BB6A';
      case 'Dinner': return '#42A5F5';
      default: return '#20B2AA';
    }
  };

  const mealTypes = [
    { value: 'Breakfast', label: 'Breakfast', emoji: '🌅' },
    { value: 'Lunch', label: 'Lunch', emoji: '☀️' },
    { value: 'Dinner', label: 'Dinner', emoji: '🌙' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📊 Mess Analytics</Text>
          <Text style={styles.headerSubtitle}>Detailed insights & reports</Text>
        </View>
      </View>

      {/* Months with data - tap to open analytics for that month */}
      {months.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { textAlign: 'center', marginBottom: 10 }]}>📆 Months with data</Text>
          <View style={styles.monthsGrid}>
            {months.map((m) => (
              <TouchableOpacity key={`${m.year}-${m.month}`} style={styles.monthPill} onPress={() => loadSpecificMonth(m.year, m.month)}>
                <Text style={styles.monthPillLabel}>{m.label}</Text>
                <Text style={styles.monthPillSub}>₹{m.totalAmount.toFixed(0)} • {m.totalMeals}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Selected Month Summary */}
      {monthlySummary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>📅 {monthlySummary.monthName} {monthlySummary.year}</Text>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{monthlySummary.totalMeals}</Text>
              <Text style={styles.statLabel}>Total Meals</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatPrice(monthlySummary.totalAmount)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          </View>
        </View>
      )}

      {/* Analytics */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : analytics ? (
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>📊 Detailed Analytics</Text>
          
          {/* Monthly Summary */}
          <View style={styles.monthlySummarySection}>
            <Text style={styles.sectionTitle}>📅 Period Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatNumber(monthlySummary?.totalMeals ?? 0)}</Text>
                <Text style={styles.summaryLabel}>Total Meals</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatPrice(monthlySummary?.totalAmount || 0)}</Text>
                <Text style={styles.summaryLabel}>Total Spent</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatNumber(analytics.activeDays)}</Text>
                <Text style={styles.summaryLabel}>Active Days</Text>
              </View>
            </View>
          </View>
          
          {/* Meal Type Breakdown */}
          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>🍽️ Meal Breakdown</Text>
            {Object.entries(analytics.mealBreakdown).map(([mealType, data]) => {
              const mealEmoji = mealTypes.find(m => m.value === mealType)?.emoji || '🍽️';
              const denominator = monthlySummary?.totalMeals ?? 0;
              const percentage = denominator > 0 ? Math.round((data.count / denominator) * 100) : 0;
              
              return (
                <View key={mealType} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownEmoji}>{mealEmoji}</Text>
                    <Text style={styles.breakdownMealType}>{mealType}</Text>
                    <Text style={styles.breakdownPercentage}>{percentage}%</Text>
                  </View>
                  <View style={styles.breakdownStats}>
                    <Text style={styles.breakdownCount}>{formatNumber(data.count)} meals</Text>
                    <Text style={styles.breakdownTotal}>{formatPrice(data.total)}</Text>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View 
                      style={[
                        styles.breakdownBarFill, 
                        { width: `${percentage}%`, backgroundColor: getMealTypeColor(mealType) }
                      ]} 
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Daily Averages */}
          <View style={styles.averagesContainer}>
            <Text style={styles.averagesTitle}>📈 Daily Averages</Text>
            <View style={styles.averagesGrid}>
              <View style={styles.averageItem}>
                <Text style={styles.averageValue}>{analytics.avgMealsPerDay}</Text>
                <Text style={styles.averageLabel}>Meals/Day</Text>
              </View>
              <View style={styles.averageItem}>
                <Text style={styles.averageValue}>₹{analytics.avgSpentPerDay.toFixed(2)}</Text>
                <Text style={styles.averageLabel}>Spent/Day</Text>
              </View>
              <View style={styles.averageItem}>
                <Text style={styles.averageValue}>{analytics.activeDays}</Text>
                <Text style={styles.averageLabel}>Active Days</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>No analytics data available</Text>
          <Text style={styles.emptySubtext}>Select a date range to view analytics</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#20B2AA',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backButton: {
    marginBottom: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  dateRangeDropdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  dateRangeOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
    width: '30%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateRangeOptionSelected: {
    backgroundColor: '#20B2AA',
    borderColor: '#20B2AA',
  },
  dateRangeOptionEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  dateRangeOptionEmojiSelected: {
    // Emoji stays same color
  },
  dateRangeOptionText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  dateRangeOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  dateRangeText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  analyticsCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  monthlySummarySection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  breakdownContainer: {
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
  },
  breakdownItem: {
    marginBottom: 15,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  breakdownEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  breakdownMealType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  breakdownPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#20B2AA',
  },
  breakdownStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownCount: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  breakdownTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  breakdownBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  averagesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  averagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  averagesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  averageItem: {
    alignItems: 'center',
    flex: 1,
  },
  averageValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 5,
  },
  averageLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  monthPill: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  monthPillLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  monthPillSub: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
});
