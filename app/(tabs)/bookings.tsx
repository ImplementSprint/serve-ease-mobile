import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getCustomerBookings } from '@/services/bookingService';
import { getCustomerBookingPresentation } from '@/lib/booking-status';     
import type { Payment } from '@/src/types/database.interfaces';
import {
  getCustomerChatSummaries,
  subscribeToChatSummaries,
  type ChatSummary,
} from '@/services/chatService';
import { getPaymentsByBookingIds } from '@/services/paymentService';       
import { resolveDisplayedBookingTotal } from '@/lib/booking-amount';       
import {
  findServiceForBooking,
  loadProviderServicesForFallback,
  type BookingServiceFallback,
} from '@/lib/booking-service-fallback';
import { getAvatarUrl } from '@/lib/avatar';

import { LinearGradient } from 'expo-linear-gradient';
import { TOKENS } from '@/constants/tokens';
import AnimatedCard from '@/components/ui/AnimatedCard';

type BookingTab = 'inProgress' | 'completed' | 'cancelled';

type CustomerBookingCard = {
  id: string;
  providerId?: string;
  service: string;
  providerName: string;
  providerRating: string;
  providerAvatar: string;
  price: string;
  date: string;
  time: string;
  status: string;
  address: string;
};

const formatScheduledDate = (value?: string | null) => {
  if (!value) return { date: 'N/A', time: 'N/A' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: 'N/A', time: 'N/A' };
  return {
    date: parsed.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    time: parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
};

const normalizeProviderText = (value: unknown) => String(value || '').trim();

const resolveProviderName = (booking: any) => {
  const provider = booking?.provider || {};
  return (
    normalizeProviderText(provider.full_name) ||
    normalizeProviderText(provider.business_name) ||
    normalizeProviderText(booking?.provider_name) ||
    'Service Provider'
  );
};

const resolveProviderRating = (booking: any) => {
  const provider = booking?.provider || {};
  const parsedRating = Number(provider.average_rating ?? booking?.provider_rating);
  if (Number.isFinite(parsedRating) && parsedRating > 0) {
    return parsedRating.toFixed(1);
  }
  return '0.0';
};

const resolveProviderAvatar = (
  booking: any,
  providerId: string,
  providerName: string,
) => {
  const normalizedProviderId = normalizeProviderText(providerId);
  if (normalizedProviderId) {
    return getAvatarUrl(normalizedProviderId);
  }

  const provider = booking?.provider || {};
  const providerAvatar =
    normalizeProviderText(provider.avatar_url) ||
    normalizeProviderText(booking?.provider_avatar);
  if (providerAvatar) return providerAvatar;

  return `https://i.pravatar.cc/100?u=${encodeURIComponent(providerName || 'provider')}`;
};

const buildBookingPayload = (booking: CustomerBookingCard) => ({
  id: booking.id,
  providerId: booking.providerId || '',
  service: booking.service,
  address: booking.address,
  date: booking.date,
  year: booking.date.split(', ').at(-1) || '',
  time: booking.time,
  status: booking.status,
  totalAmount:
    booking.price.replace('P', '').replace('\u20B1', '').replaceAll(',', '').trim() || '0.00',
  provider: {
    name: booking.providerName,
    rating: booking.providerRating,
    specialty: booking.service,
    avatar: booking.providerAvatar,
    isVerified: true,
  },
  providerName: booking.providerName,
});

function BookingCard({
  booking,
  chatSummary,
  index,
}: {
  booking: CustomerBookingCard;
  chatSummary?: ChatSummary | null;
  index: number;
}) {
  const router = useRouter();
  const presentation = getCustomerBookingPresentation(booking.status);
  const bookingPayload = buildBookingPayload(booking);
  const needsReply = Boolean((chatSummary?.unreadCount || 0) > 0);

  const getStatusColor = () => {
    switch (presentation.tone) {
      case 'success': return { bg: TOKENS.colors.success.bg, text: TOKENS.colors.success.text };
      case 'warning': return { bg: TOKENS.colors.warning.bg, text: TOKENS.colors.warning.text };
      case 'cancelled': return { bg: TOKENS.colors.danger.bg, text: TOKENS.colors.danger.text };
      case 'completed': return { bg: TOKENS.colors.info.bg, text: TOKENS.colors.info.text };
      default: return { bg: TOKENS.colors.info.bg, text: TOKENS.colors.info.text };
    }
  };

  const statusColor = getStatusColor();

  return (
    <AnimatedCard
      style={[styles.bookingCard, needsReply && styles.bookingCardAttention]}
      index={index}
      onPress={() =>
        router.push({
          pathname: presentation.actionLabel === 'Track Order' ? '/customer-track-order' : '/customer-booking-details',
          params: { id: booking.id, booking: JSON.stringify(bookingPayload) },
        } as any)
      }
    >
      {/* Header: Service + Status */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.serviceTitle} numberOfLines={1}>{booking.service}</Text>
          {needsReply && (
            <View style={styles.attentionChip}>
              <View style={styles.attentionDot} />
              <Text style={styles.attentionChipText}>Needs reply</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {presentation.label}
          </Text>
        </View>
      </View>

      {/* Provider row */}
      <View style={styles.providerRow}>
        <Image source={{ uri: booking.providerAvatar }} style={styles.providerAvatar} />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{booking.providerName}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFA000" />
            <Text style={styles.ratingText}>{booking.providerRating}</Text>
          </View>
        </View>
        <Text style={styles.priceText}>{booking.price}</Text>
      </View>

      {/* Date & Time */}
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeItem}>
          <Ionicons name="calendar-outline" size={16} color={TOKENS.colors.text.secondary} />
          <Text style={styles.dateTimeText}>{booking.date}</Text>
        </View>
        <View style={styles.dateTimeDivider} />
        <View style={styles.dateTimeItem}>
          <Ionicons name="time-outline" size={16} color={TOKENS.colors.text.secondary} />
          <Text style={styles.dateTimeText}>{booking.time}</Text>
        </View>
      </View>

      {/* Chat summary */}
      {chatSummary && (
        <View style={styles.contactRow}>
          <View style={styles.contactIconCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={TOKENS.colors.success.text} />
          </View>
          <View style={styles.contactRowText}>
            <Text style={styles.contactRowTitle}>Last contact {chatSummary.lastMessageTime}</Text>
            <Text style={styles.contactRowBody} numberOfLines={1}>
              {chatSummary.lastMessage}
            </Text>
          </View>
          {chatSummary.unreadCount > 0 && (
            <View style={styles.contactUnreadBadge}>
              <Text style={styles.contactUnreadBadgeText}>
                {chatSummary.unreadCount > 9 ? '9+' : chatSummary.unreadCount}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Footer actions */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.footerAction}
          onPress={() =>
            router.push({
              pathname: '/customer-chat',
              params: {
                id: booking.id,
                providerName: booking.providerName,
                serviceName: booking.service,
              },
            } as any)
          }
        >
          <Ionicons name="chatbubble-outline" size={18} color={TOKENS.colors.primary} />
          <Text style={[styles.footerActionText, { color: TOKENS.colors.primary }]}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerAction}
          onPress={() =>
            router.push({
              pathname: '/customer-booking-details',
              params: { id: booking.id, booking: JSON.stringify(bookingPayload) },
            } as any)
          }
        >
          <Ionicons name="document-text-outline" size={18} color={TOKENS.colors.text.secondary} />
          <Text style={[styles.footerActionText, { color: TOKENS.colors.text.secondary }]}>Details</Text>
        </TouchableOpacity>
      </View>
    </AnimatedCard>
  );
}


export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [liveBookings, setLiveBookings] = useState<any[]>([]);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [paymentByBookingId, setPaymentByBookingId] = useState<Record<string, Payment | null>>({});
  const [servicesByProviderId, setServicesByProviderId] = useState<Record<string, BookingServiceFallback[]>>({});
  const [activeTab, setActiveTab] = useState<BookingTab>('inProgress');

  const loadBookings = React.useCallback(async () => {
    if (!user?.id) {
      setLiveBookings([]);
      setChatSummaries([]);
      setPaymentByBookingId({});
      setServicesByProviderId({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getCustomerBookings(user.id);
      const unresolvedBookingIds = (data || [])
        .filter((row: any) => resolveDisplayedBookingTotal(row, null) <= 0)
        .map((row: any) => String(row?.id || '').trim())
        .filter(
          (id: string, index: number, rows: string[]) =>
            Boolean(id) && rows.indexOf(id) === index,
        );

      const [summaries, paymentMap] = await Promise.all([
        getCustomerChatSummaries(user.id),
        unresolvedBookingIds.length
          ? getPaymentsByBookingIds(unresolvedBookingIds)
          : Promise.resolve({} as Record<string, Payment | null>),
      ]);

      const unresolvedAfterPayment = (data || []).filter((row: any) => {
        const bookingId = String(row?.id || '').trim();
        return resolveDisplayedBookingTotal(row, paymentMap[bookingId] || null) <= 0;
      });
      const unresolvedProviderIds = unresolvedAfterPayment
        .map((row: any) => String(row?.provider_id || '').trim())
        .filter(
          (providerId: string, index: number, rows: string[]) =>
            Boolean(providerId) && rows.indexOf(providerId) === index,
        );
      const providerServicesEntries = await Promise.all(
        unresolvedProviderIds.map(async (providerId) => {
          const services = await loadProviderServicesForFallback(providerId);
          return [providerId, services] as const;
        }),
      );

      setLiveBookings(data || []);
      setChatSummaries(summaries || []);
      setPaymentByBookingId(paymentMap);
      setServicesByProviderId(Object.fromEntries(providerServicesEntries));
    } catch {
      setLiveBookings([]);
      setChatSummaries([]);
      setPaymentByBookingId({});
      setServicesByProviderId({});
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadChatSummaries = React.useCallback(async () => {
    if (!user?.id) {
      setChatSummaries([]);
      return;
    }

    try {
      const rows = await getCustomerChatSummaries(user.id);
      setChatSummaries(rows);
    } catch {
      setChatSummaries([]);
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      void loadBookings();
    }, [loadBookings])
  );

  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      void loadBookings();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [loadBookings, user?.id]);

  React.useEffect(() => {
    if (!user?.id) return;

    return subscribeToChatSummaries({
      role: 'customer',
      userId: user.id,
      onChange: () => {
        void loadChatSummaries();
      },
    });
  }, [loadChatSummaries, user?.id]);

  const mappedLiveBookings = useMemo<CustomerBookingCard[]>(() => {
    return liveBookings.map((item: any, idx: number) => {
      const bookingId = String(item?.id || idx + 1);
      const providerId = String(item?.provider_id || '').trim();
      const matchedService = findServiceForBooking(
        item,
        servicesByProviderId[providerId] || [],
      );
      const enrichedBooking = {
        ...item,
        service:
          item?.service ||
          (matchedService
            ? { title: matchedService.title, price: matchedService.price }
            : undefined),
        service_price: (item as any)?.service_price ?? matchedService?.price,
        hourly_rate: item?.hourly_rate ?? (matchedService?.hourly_rate ?? undefined),
        flat_rate: (item as any)?.flat_rate ?? (matchedService?.flat_rate ?? undefined),
      };
      const resolvedAmount = resolveDisplayedBookingTotal(
        enrichedBooking,
        paymentByBookingId[bookingId] || null,
      );
      const providerName = resolveProviderName(item);
      const providerRating = resolveProviderRating(item);
      const statusRaw = String(item?.status || 'Pending');
      const schedule = formatScheduledDate(item?.scheduled_at);
      const serviceTitle =
        item?.service?.title || item?.service_name || matchedService?.title || 'Service Booking';

      return {
        id: bookingId,
        providerId,
        service: serviceTitle,
        providerName,
        providerRating,
        providerAvatar: resolveProviderAvatar(item, providerId, providerName),
        price: `P${resolvedAmount.toFixed(2)}`,
        date: schedule.date,
        time: schedule.time,
        status: statusRaw,
        address: item?.service_address || '',
      };
    });
  }, [liveBookings, paymentByBookingId, servicesByProviderId]);

  const chatSummaryMap = useMemo(
    () => new Map(chatSummaries.map((summary) => [summary.bookingId, summary])),
    [chatSummaries]
  );

  const sortBookingsByAttention = React.useCallback(
    (rows: CustomerBookingCard[]) =>
      [...rows].sort((left, right) => {
        const leftUnread = chatSummaryMap.get(String(left.id))?.unreadCount || 0;
        const rightUnread = chatSummaryMap.get(String(right.id))?.unreadCount || 0;
        return rightUnread - leftUnread;
      }),
    [chatSummaryMap]
  );

  const bookingsByTab = useMemo(
    () => ({
      inProgress: sortBookingsByAttention(
        mappedLiveBookings.filter(
          (booking) => getCustomerBookingPresentation(booking.status).tab === 'inProgress'
        )
      ),
      completed: sortBookingsByAttention(
        mappedLiveBookings.filter(
          (booking) => getCustomerBookingPresentation(booking.status).tab === 'completed'
        )
      ),
      cancelled: sortBookingsByAttention(
        mappedLiveBookings.filter(
          (booking) => getCustomerBookingPresentation(booking.status).tab === 'cancelled'
        )
      ),
    }),
    [mappedLiveBookings, sortBookingsByAttention]
  );

  const tabConfig = useMemo(
    () =>
      [
        { key: 'inProgress', label: 'In Progress', count: bookingsByTab.inProgress.length },
        { key: 'completed', label: 'Completed', count: bookingsByTab.completed.length },
        { key: 'cancelled', label: 'Cancelled', count: bookingsByTab.cancelled.length },
      ] as const,
    [bookingsByTab]
  );

  const bookings = bookingsByTab[activeTab];

  const emptyConfig = {
    inProgress: { icon: 'hourglass-outline' as const, text: 'No bookings in progress', hint: 'Your active bookings will appear here' },
    completed: { icon: 'checkmark-circle-outline' as const, text: 'No completed bookings', hint: 'Finished services will show up here' },
    cancelled: { icon: 'close-circle-outline' as const, text: 'No cancelled bookings', hint: 'Cancelled bookings will appear here' },
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabConfig.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text numberOfLines={1} style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
              <View style={[styles.countBadge, isActive ? styles.activeCountBadge : styles.inactiveCountBadge]}>
                <Text style={[styles.countText, isActive ? styles.activeCountText : styles.inactiveCountText]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#00B761" />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name={emptyConfig[activeTab].icon} size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>{emptyConfig[activeTab].text}</Text>
            <Text style={styles.emptyHint}>{emptyConfig[activeTab].hint}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.bookingCount}>
              {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
            </Text>
            {bookings.map((booking, idx) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                chatSummary={chatSummaryMap.get(String(booking.id)) || null}
                index={idx}
              />
            ))}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: TOKENS.colors.white,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    letterSpacing: -0.5,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 6,
    gap: 6,
  },
  activeTab: {
    backgroundColor: TOKENS.colors.white,
    ...TOKENS.shadows.soft,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.text.secondary,
  },
  activeTabText: {
    color: TOKENS.colors.text.primary,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeCountBadge: {
    backgroundColor: TOKENS.colors.primary,
  },
  inactiveCountBadge: {
    backgroundColor: '#E2E8F0',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
  },
  activeCountText: {
    color: TOKENS.colors.white,
  },
  inactiveCountText: {
    color: TOKENS.colors.text.secondary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bookingCount: {
    fontSize: 13,
    fontWeight: '600',
    color: TOKENS.colors.text.muted,
    marginBottom: 14,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: TOKENS.colors.text.muted,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 14,
    color: TOKENS.colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Booking card
  bookingCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    ...TOKENS.shadows.soft,
  },
  bookingCardAttention: {
    borderWidth: 1.5,
    borderColor: TOKENS.colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    letterSpacing: -0.3,
  },
  attentionChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: TOKENS.colors.success.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  attentionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.success.text,
  },
  attentionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.colors.success.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: TOKENS.colors.border,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: TOKENS.colors.text.secondary,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: TOKENS.colors.primary,
    letterSpacing: -0.5,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
    color: TOKENS.colors.text.primary,
    fontWeight: '600',
  },
  dateTimeDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.success.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  contactIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contactRowText: {
    flex: 1,
  },
  contactRowTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
  },
  contactRowBody: {
    marginTop: 2,
    fontSize: 12,
    color: TOKENS.colors.text.secondary,
  },
  contactUnreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: TOKENS.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  contactUnreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: TOKENS.colors.white,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 14,
    paddingTop: 14,
    gap: 10,
  },
  footerAction: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    gap: 8,
  },
  footerActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
