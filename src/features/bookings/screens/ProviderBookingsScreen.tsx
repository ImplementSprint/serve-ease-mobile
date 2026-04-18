import React, { useEffect, useMemo, useState, memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getProviderBookings,
  getProviderBookingActionState,
  normalizeProviderBookingStatus,
  ProviderBookingView,
  updateBookingStatus,
} from '@/services/providerBookingService';
import {
  getProviderChatSummaries,
  subscribeToChatSummaries,
  type ChatSummary,
} from '@/services/chatService';
import { getProviderPaymentHistory, type ProviderPaymentHistoryItem } from '@/services/paymentService';
import {
  getMyProviderServices,
  type ProviderServiceRecord,
} from '@/services/providerCatalogService';

const TABS = ['Upcoming', 'In Progress', 'Completed', 'Cancelled'] as const;
type Tab = typeof TABS[number];

function statusToTab(statusRaw: string): Tab {
  const status = normalizeProviderBookingStatus(statusRaw);
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In Progress';
  return 'Upcoming';
}

function formatSchedule(ts?: string) {
  if (!ts) return { date: 'N/A', time: 'N/A' };
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return { date: 'N/A', time: 'N/A' };
  return {
    date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

const toAmountNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toComparableString = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const findPaymentForBooking = (
  booking: ProviderBookingView,
  payments: ProviderPaymentHistoryItem[],
): ProviderPaymentHistoryItem | null => {
  const bookingId = toComparableString(booking.id);
  const bookingReference = toComparableString(booking.booking_reference);
  return (
    payments.find((payment) => {
      const paymentBookingId = toComparableString((payment as any).booking_id);
      const paymentReference = toComparableString(payment.booking_reference);
      if (bookingId && paymentBookingId && bookingId === paymentBookingId) return true;
      return Boolean(
        bookingReference && paymentReference && bookingReference === paymentReference,
      );
    }) || null
  );
};

const findServiceForBooking = (
  booking: ProviderBookingView,
  services: ProviderServiceRecord[],
): ProviderServiceRecord | null => {
  const bookingServiceId = toComparableString((booking as any).service_id);
  const bookingServiceTitle = toComparableString(booking.service_title);
  return (
    services.find((service) => {
      const serviceId = toComparableString(service.id);
      const serviceTitle = toComparableString(service.title);
      if (bookingServiceId && serviceId && bookingServiceId === serviceId) return true;
      return Boolean(
        bookingServiceTitle && serviceTitle && bookingServiceTitle === serviceTitle,
      );
    }) || null
  );
};

const resolveBookingAmount = (
  booking: ProviderBookingView,
  payment: ProviderPaymentHistoryItem | null,
  service: ProviderServiceRecord | null,
) => {
  const paymentAmount = toAmountNumber((payment as any)?.amount);
  const paymentNet = toAmountNumber((payment as any)?.net_earnings);
  const paymentPlatformFee = toAmountNumber((payment as any)?.platform_fee);
  const paymentDerivedAmount =
    paymentAmount ??
    (paymentNet !== null
      ? paymentNet + (paymentPlatformFee ?? paymentNet * (1 / 9))
      : null);

  const primaryCandidates = [
    paymentDerivedAmount,
    toAmountNumber((booking as any).total_amount),
    toAmountNumber((booking as any).totalAmount),
  ];
  const positivePrimary = primaryCandidates.find(
    (value): value is number => value !== null && value > 0,
  );
  if (positivePrimary !== undefined) return positivePrimary;

  const hourlyRate =
    toAmountNumber((booking as any).hourly_rate) ??
    toAmountNumber(service?.hourly_rate);
  const rawHoursRequired = toAmountNumber((booking as any).hours_required);
  const hoursRequired = rawHoursRequired !== null && rawHoursRequired > 0 ? rawHoursRequired : 1;
  const hourlyComputed =
    hourlyRate !== null && hourlyRate > 0 ? hourlyRate * hoursRequired : null;
  const flatRate =
    toAmountNumber((booking as any).flat_rate) ??
    toAmountNumber(service?.flat_rate);
  const servicePrice = toAmountNumber(
    (booking as any).service_price ?? service?.price,
  );
  const fallbackPositive = [hourlyComputed, flatRate, servicePrice].find(
    (value): value is number => value !== null && value > 0,
  );
  if (fallbackPositive !== undefined) return fallbackPositive;

  const nullablePrimary = primaryCandidates.find(
    (value): value is number => value !== null,
  );
  return nullablePrimary ?? 0;
};

function getPrimaryAction(status: string) {
  const actionState = getProviderBookingActionState(status);

  if (actionState.canConfirm) {
    return {
      label: 'Confirm',
      onPress: 'confirm' as const,
    };
  }

  if (actionState.canResumeService) {
    return {
      label: 'Continue Service',
      onPress: 'continue' as const,
    };
  }

  if (actionState.canStartService) {
    return {
      label: 'Start Service',
      onPress: 'start' as const,
    };
  }

  if (actionState.canNavigate) {
    return {
      label: 'Open Navigation',
      onPress: 'navigate' as const,
    };
  }

  if (actionState.normalizedStatus === 'completed') {
    return {
      label: 'View Receipt',
      onPress: 'receipt' as const,
    };
  }

  return null;
}

const BookingCard = memo(({ 
  item, 
  chatSummary, 
  onChatPress, 
  onDetailsPress, 
  onPrimaryAction, 
  isBusy 
}: { 
  item: ProviderBookingView; 
  chatSummary?: ChatSummary; 
  onChatPress: (item: ProviderBookingView) => void;
  onDetailsPress: (id: string) => void;
  onPrimaryAction: (item: ProviderBookingView) => void;
  isBusy: boolean;
}) => {
  const sc = formatSchedule(item.scheduled_at);
  const needsReply = Boolean((chatSummary?.unreadCount || 0) > 0);
  const primaryAction = getPrimaryAction(item.status);

  return (
    <View style={[styles.card, needsReply && styles.cardAttention]}>
      <Text style={styles.bookingRef}>{item.booking_reference}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{item.service_title}</Text>
        {needsReply ? (
          <View style={styles.attentionChip}>
            <Text style={styles.attentionChipText}>Needs reply</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.sub}>{item.customer_name}</Text>
      <Text style={styles.sub}>{sc.date} at {sc.time}</Text>
      <Text style={styles.sub}>{item.service_address}</Text>
      <Text style={styles.amount}>P{Number(item.total_amount || 0).toFixed(2)}</Text>

      {chatSummary ? (
        <Pressable
          style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.85 }]}
          onPress={() => onChatPress(item)}
        >
          <View style={styles.contactTextWrap}>
            <Text style={styles.contactTitle}>
              Last contact {chatSummary.lastMessageTime}
            </Text>
            <Text style={styles.contactBody} numberOfLines={1}>
              {chatSummary.lastMessage}
            </Text>
          </View>
          {chatSummary.unreadCount > 0 ? (
            <View style={styles.contactUnreadBadge}>
              <Text style={styles.contactUnreadBadgeText}>
                {chatSummary.unreadCount > 9 ? '9+' : chatSummary.unreadCount}
              </Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 8 }} />
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && { backgroundColor: '#F3F5F8' }]}
          onPress={() => onDetailsPress(item.id)}
        >
          <Text style={styles.secondaryText}>View Details</Text>
        </Pressable>

        {primaryAction ? (
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn, 
              pressed && { backgroundColor: '#00A054' },
              isBusy && { opacity: 0.6 }
            ]}
            onPress={() => onPrimaryAction(item)}
            disabled={isBusy}
          >
            <Text style={styles.primaryText}>
              {isBusy ? 'Please wait...' : primaryAction?.label || 'View Details'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

BookingCard.displayName = 'BookingCard';

export function ProviderBookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ProviderBookingView[]>([]);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setChatSummaries([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const [rows, summaries, payments, services] = await Promise.all([
        getProviderBookings(user.id),
        getProviderChatSummaries(user.id),
        getProviderPaymentHistory(user.id).catch(
          () => [] as ProviderPaymentHistoryItem[],
        ),
        getMyProviderServices().catch(() => [] as ProviderServiceRecord[]),
      ]);
      const normalizedRows = (rows || []).map((row) => {
        const payment = findPaymentForBooking(row, payments);
        const service = findServiceForBooking(row, services);
        return {
          ...row,
          total_amount: resolveBookingAmount(row, payment, service),
        };
      });
      setItems(normalizedRows);
      setChatSummaries(summaries);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load bookings.'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadChatSummaries = useCallback(async () => {
    if (!user?.id) {
      setChatSummaries([]);
      return;
    }

    try {
      const rows = await getProviderChatSummaries(user.id);
      setChatSummaries(rows);
    } catch {
      setChatSummaries([]);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      void load();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [load, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    return subscribeToChatSummaries({
      role: 'provider',
      userId: user.id,
      onChange: () => {
        void loadChatSummaries();
      },
    });
  }, [loadChatSummaries, user?.id]);

  const chatSummaryMap = useMemo(
    () => new Map(chatSummaries.map((summary) => [summary.bookingId, summary])),
    [chatSummaries]
  );

  const filtered = useMemo(() => {
    return [...items]
      .filter((b) => {
        if (statusToTab(b.status) !== activeTab) return false;
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          b.booking_reference.toLowerCase().includes(q) ||
          b.customer_name.toLowerCase().includes(q) ||
          b.service_title.toLowerCase().includes(q)
        );
      })
      .sort((left, right) => {
        const leftUnread = chatSummaryMap.get(String(left.id))?.unreadCount || 0;
        const rightUnread = chatSummaryMap.get(String(right.id))?.unreadCount || 0;

        if (rightUnread !== leftUnread) {
          return rightUnread - leftUnread;
        }

        return 0;
      });
  }, [items, activeTab, chatSummaryMap, searchQuery]);

  const counts = useMemo(() => {
    return TABS.reduce((acc, tab) => {
      acc[tab] = items.filter((b) => statusToTab(b.status) === tab).length;
      return acc;
    }, {} as Record<Tab, number>);
  }, [items]);

  const onConfirm = useCallback(async (id: string) => {
    if (!user?.id) return;
    setBusyId(id);
    try {
      await updateBookingStatus(id, user.id, 'confirmed');
      await load();
      router.replace({ pathname: '/provider-navigation', params: { id } } as any);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to confirm booking.');
      setError(message);
      Alert.alert('Confirm Failed', message);
    } finally {
      setBusyId('');
    }
  }, [load, router, user?.id]);

  const onPrimaryAction = useCallback((item: ProviderBookingView) => {
    const primaryAction = getPrimaryAction(item.status);
    if (!primaryAction) return;

    if (primaryAction.onPress === 'confirm') {
      void onConfirm(item.id);
      return;
    }

    if (primaryAction.onPress === 'navigate') {
      router.replace({ pathname: '/provider-navigation', params: { id: item.id } } as any);
      return;
    }

    if (primaryAction.onPress === 'start') {
      router.replace({ pathname: '/provider-start-service', params: { id: item.id } } as any);
      return;
    }

    if (primaryAction.onPress === 'continue') {
      router.replace({ pathname: '/provider-service-in-progress', params: { id: item.id } } as any);
      return;
    }

    router.replace({ pathname: '/provider-receipt', params: { id: item.id } } as any);
  }, [onConfirm, router]);

  const onChatPress = useCallback((item: ProviderBookingView) => {
    router.push({
      pathname: '/provider-chat',
      params: {
        id: item.id,
        name: item.customer_name,
        serviceName: item.service_title,
      },
    } as any);
  }, [router]);

  const onDetailsPress = useCallback((id: string) => {
    router.push({ pathname: '/provider-booking-details', params: { id } } as any);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: ProviderBookingView }) => (
    <BookingCard 
      item={item} 
      chatSummary={chatSummaryMap.get(String(item.id))}
      onChatPress={onChatPress}
      onDetailsPress={onDetailsPress}
      onPrimaryAction={onPrimaryAction}
      isBusy={busyId === item.id}
    />
  ), [chatSummaryMap, onChatPress, onDetailsPress, onPrimaryAction, busyId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} 
          style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: '#E2E8F0' }]}
        >
          <Ionicons name="arrow-back" size={20} color="#0D1B2A" />
        </Pressable>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <Pressable 
            key={tab} 
            onPress={() => setActiveTab(tab)} 
            style={({ pressed }) => [
              styles.tabBtn, 
              activeTab === tab && styles.activeTabBtn,
              pressed && { opacity: 0.8 }
            ]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab} ({counts[tab] || 0})</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#888" />
        <TextInput style={styles.searchInput} placeholder="Search bookings..." value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {isLoading ? <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 24 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.listContent}>
          {!isLoading && filtered.length === 0 ? (
            <Text style={styles.empty}>No bookings found.</Text>
          ) : (
            filtered.map((item) => <React.Fragment key={item.id}>{renderItem({ item })}</React.Fragment>)
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F5F8', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0D1B2A' },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10, backgroundColor: '#fff' },
  tabBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EEF1F5' },
  activeTabBtn: { backgroundColor: '#00B761' },
  tabText: { fontSize: 12, color: '#445' },
  activeTabText: { color: '#fff' },
  searchWrap: { margin: 10, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 42, alignItems: 'center', flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1 },
  listContent: { padding: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10 },
  cardAttention: { borderWidth: 1, borderColor: '#BDE4CD', backgroundColor: '#FCFFFD' },
  bookingRef: { fontSize: 12, color: '#778' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  attentionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E8FBF2',
  },
  attentionChipText: { fontSize: 11, fontWeight: '700', color: '#00B761' },
  sub: { fontSize: 12, color: '#556', marginTop: 2 },
  amount: { marginTop: 8, fontSize: 14, fontWeight: '800', color: '#00B761' },
  contactRow: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCEFE5',
    backgroundColor: '#F8FFF9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  contactTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  contactBody: {
    marginTop: 2,
    fontSize: 12,
    color: '#556',
  },
  contactUnreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00B761',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  contactUnreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  actions: { marginTop: 10, flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, borderRadius: 8, backgroundColor: '#00B761', height: 38, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#D8DEE6', height: 38, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: '#223', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#889', marginTop: 20 },
  error: { color: '#C62828', paddingHorizontal: 12, paddingBottom: 8 },
});
