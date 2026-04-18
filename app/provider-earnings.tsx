import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getProviderEarningsSummary,
  type ProviderPaymentHistoryItem,
} from '@/services/paymentService';
import { getErrorMessage } from '@/lib/error-handling';

const formatCurrency = (amount: number) => `P${amount.toFixed(2)}`;

const formatDate = (value?: string | null) => {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isPaidPaymentStatus = (statusRaw?: string | null) => {
  const status = String(statusRaw || '').trim().toLowerCase();
  return status === 'paid' || status === 'completed';
};

const getChartBuckets = (payments: ProviderPaymentHistoryItem[], period: 'Weekly' | 'Monthly') => {
  if (period === 'Weekly') {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const start = new Date();
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + diff);

    return labels.map((label, index) => {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + index);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 1);

      const value = payments.reduce((sum, payment) => {
        const paidAt = new Date(payment.paid_at || payment.created_at || '');
        if (Number.isNaN(paidAt.getTime())) return sum;
        if (paidAt >= bucketStart && paidAt < bucketEnd) {
          return sum + payment.net_earnings;
        }
        return sum;
      }, 0);

      return { label, value };
    });
  }

  const now = new Date();
  return Array.from({ length: 4 }, (_, reverseIndex) => {
    const index = 3 - reverseIndex;
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const label = monthDate.toLocaleDateString('en-US', { month: 'short' });

    const value = payments.reduce((sum, payment) => {
      const paidAt = new Date(payment.paid_at || payment.created_at || '');
      if (Number.isNaN(paidAt.getTime())) return sum;
      if (paidAt >= monthDate && paidAt < nextMonth) {
        return sum + payment.net_earnings;
      }
      return sum;
    }, 0);

    return { label, value };
  });
};

const HistoryItem = ({ item }: { item: ProviderPaymentHistoryItem }) => {
  const isPaid = isPaidPaymentStatus(item.status);
  const iconName =
    String(item.method).toLowerCase() === 'cash'
      ? 'cash-outline'
      : String(item.method).toLowerCase() === 'card'
        ? 'card-outline'
        : 'wallet-outline';

  return (
    <View style={styles.historyItem}>
      <View style={[styles.historyIconContainer, isPaid ? styles.historyIconPaid : styles.historyIconPending]}>
        <Ionicons name={iconName} size={20} color={isPaid ? '#00B761' : '#64748B'} />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyTitle}>{item.service_title}</Text>
        <Text style={styles.historySubtitle}>
          {formatDate(item.paid_at || item.created_at)} | {getPaymentMethodLabel(item.method)}
        </Text>
        <Text style={styles.historyMeta}>{item.customer_name}</Text>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyAmount}>{formatCurrency(item.net_earnings)}</Text>
        <View style={[styles.statusPill, isPaid ? styles.statusCompleted : styles.statusPending]}>
          <Text style={[styles.statusText, isPaid ? styles.textCompleted : styles.textPending]}>
            {getPaymentStatusLabel(item.status).toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
};

const BarChart = ({ data }: { data: { label: string; value: number }[] }) => {
  const max = Math.max(...data.map((item) => item.value), 0);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barsRow}>
        {data.map((item) => (
          <View key={item.label} style={styles.barColumn}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${max > 0 ? Math.max((item.value / max) * 100, item.value > 0 ? 12 : 0) : 0}%` },
                  item.value === max && max > 0 ? styles.barHighlight : styles.barRegular,
                ]}
              />
            </View>
            <Text style={styles.dayText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function ProviderEarningsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const unreadNotifications = useUnreadNotifications();
  const [performanceTab, setPerformanceTab] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [history, setHistory] = useState<ProviderPaymentHistoryItem[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(0);
  const [averagePerService, setAveragePerService] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;

      async function load() {
        if (!user?.id) {
          setHistory([]);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError('');
        try {
          const summary = await getProviderEarningsSummary(user.id);
          if (!mounted) return;
          setHistory(summary.payments);
          setTotalRevenue(summary.totalNetEarnings);
          setPendingRevenue(summary.pendingRevenue);
          setCashOnHand(summary.cashOnHand);
          setAveragePerService(summary.averagePerService);
          setPaidCount(summary.paidCount);
        } catch (loadError) {
          if (mounted) {
            setError(getErrorMessage(loadError, 'Failed to load earnings.'));
            setHistory([]);
          }
        } finally {
          if (mounted) setIsLoading(false);
        }
      }

      void load();
      return () => {
        mounted = false;
      };
    }, [user?.id])
  );

  const chartData = useMemo(
    () => getChartBuckets(history.filter((item) => isPaidPaymentStatus(item.status)), performanceTab),
    [history, performanceTab]
  );

  const recentHistory = history.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>The Ledger</Text>
        <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/notifications' as any)}>
          <Ionicons name="notifications-outline" size={24} color="#0D1B2A" />
          <NotificationBadge count={unreadNotifications} top={-4} right={-4} borderColor="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.revenueSection}>
          <Text style={styles.revenueLabel}>NET EARNINGS</Text>
          <View style={styles.revenueRow}>
            <Text style={styles.revenueAmount}>{formatCurrency(totalRevenue)}</Text>
            <View style={styles.growthPill}>
              <Text style={styles.growthText}>{paidCount} paid</Text>
            </View>
          </View>
          <Text style={styles.revenueHint}>Based on completed payments after platform fees.</Text>
        </View>

        {isLoading ? <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 16 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>Earnings Performance</Text>
            <View style={styles.performanceTabs}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.tabButton, performanceTab === 'Weekly' && styles.tabButtonActive]}
                onPress={() => setPerformanceTab('Weekly')}
              >
                <Text style={[styles.tabText, performanceTab === 'Weekly' && styles.tabTextActive]}>Weekly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.tabButton, performanceTab === 'Monthly' && styles.tabButtonActive]}
                onPress={() => setPerformanceTab('Monthly')}
              >
                <Text style={[styles.tabText, performanceTab === 'Monthly' && styles.tabTextActive]}>Monthly</Text>
              </TouchableOpacity>
            </View>
          </View>
          <BarChart data={chartData} />
        </View>

        <View style={styles.infoCardsRow}>
          <View style={[styles.infoCard, { backgroundColor: '#E8FBF2' }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name="trending-up-outline" size={24} color="#00B761" />
            </View>
            <Text style={styles.infoLabel}>AVERAGE / PAID SERVICE</Text>
            <Text style={styles.infoValue}>{formatCurrency(averagePerService)}</Text>
          </View>
        </View>

        <View style={styles.infoCardsRow}>
          <View style={[styles.infoCard, { backgroundColor: '#F0FFF7', marginBottom: 12 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name="wallet-outline" size={24} color="#00B761" />
            </View>
            <Text style={styles.infoLabel}>CASH ON HAND</Text>
            <Text style={styles.infoValue}>{formatCurrency(cashOnHand)}</Text>
          </View>
        </View>

        <View style={styles.infoCardsRow}>
          <View style={[styles.infoCard, { backgroundColor: '#FFF7E8', marginBottom: 24 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name="time-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.infoLabel}>PENDING TO COLLECT</Text>
            <Text style={styles.infoValue}>{formatCurrency(pendingRevenue)}</Text>
          </View>
        </View>

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historySectionTitle}>Recent Payment Activity</Text>
            <TouchableOpacity onPress={() => router.push('/provider-history' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {!isLoading && recentHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No payment activity yet.</Text>
            </View>
          ) : null}

          {recentHistory.map((item) => (
            <HistoryItem key={item.id} item={item} />
          ))}
        </View>
        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D1B2A',
    fontFamily: 'Outfit-Bold',
  },
  notificationButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  revenueSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 24,
  },
  revenueLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 8,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  revenueAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#0D1B2A',
    fontFamily: 'Outfit-Bold',
  },
  growthPill: {
    backgroundColor: '#E8FBF2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 16,
  },
  growthText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B761',
  },
  revenueHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  performanceCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0D1B2A',
    fontFamily: 'Outfit-Bold',
    marginRight: 16,
    flexShrink: 1,
  },
  performanceTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F7',
    borderRadius: 100,
    padding: 4,
    flexShrink: 0,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  tabButtonActive: {
    backgroundColor: '#00B761',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#FFF',
  },
  chartContainer: {
    height: 180,
    justifyContent: 'flex-end',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 140,
    width: 28,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  barFill: {
    width: '100%',
    borderRadius: 14,
  },
  barRegular: {
    backgroundColor: '#CFEFDC',
  },
  barHighlight: {
    backgroundColor: '#00B761',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  infoCardsRow: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    borderRadius: 32,
    padding: 24,
    justifyContent: 'center',
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0D1B2A',
    fontFamily: 'Outfit-Bold',
  },
  historySection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historySectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0D1B2A',
    fontFamily: 'Outfit-Bold',
    flex: 1,
    paddingRight: 12,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00B761',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
  },
  historyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIconPaid: {
    backgroundColor: '#E8FBF2',
  },
  historyIconPending: {
    backgroundColor: '#F3F4F6',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
    marginBottom: 4,
  },
  historySubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  historyMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  historyRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D1B2A',
    marginBottom: 4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#E8FBF2',
  },
  statusPending: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textCompleted: {
    color: '#00B761',
  },
  textPending: {
    color: '#6B7280',
  },
  emptyCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    padding: 18,
  },
  emptyText: {
    color: '#64748B',
  },
  error: {
    color: '#C62828',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  footerSpacer: {
    height: 40,
  },
});
