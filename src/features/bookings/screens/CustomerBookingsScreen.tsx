import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getCustomerBookings } from '@/services/bookingService';
import { getCustomerBookingPresentation } from '@/lib/booking-status';
import {
  getCustomerChatSummaries,
  subscribeToChatSummaries,
  type ChatSummary,
} from '@/services/chatService';
import { getAvatarUrl } from '@/lib/avatar';

import { Booking, EnrichedBooking } from '@/src/types/database.interfaces';

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

const resolveProviderName = (booking: EnrichedBooking) => {
  return (
    normalizeProviderText(booking?.provider?.full_name) ||
    normalizeProviderText(booking?.provider?.business_name) ||
    normalizeProviderText(booking?.provider_name) ||
    'Service Provider'
  );
};

const resolveProviderRating = (booking: EnrichedBooking) => {
  const parsedRating = Number(
    booking?.provider?.average_rating ?? booking?.provider_rating,
  );
  if (Number.isFinite(parsedRating) && parsedRating > 0) {
    return parsedRating.toFixed(1);
  }
  return '0.0';
};

const resolveProviderAvatar = (
  booking: EnrichedBooking,
  providerId: string,
  providerName: string,
) => {
  const normalizedProviderId = normalizeProviderText(providerId);
  if (normalizedProviderId) {
    return getAvatarUrl(normalizedProviderId);
  }

  const providerAvatar =
    normalizeProviderText(booking?.provider?.avatar_url) ||
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
    booking.price.replace('P', '').replace('₱', '').replaceAll(',', '').trim() || '0.00',
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

  const getStatusColors = () => {
    switch(presentation.tone) {
      case 'success': return [TOKENS.colors.success.bg, TOKENS.colors.white];
      case 'warning': return [TOKENS.colors.warning.bg, TOKENS.colors.white];
      case 'cancelled': return [TOKENS.colors.danger.bg, TOKENS.colors.white];
      case 'completed': return [TOKENS.colors.info.bg, TOKENS.colors.white];
      default: return [TOKENS.colors.info.bg, TOKENS.colors.white];
    }
  };

  const getStatusTextColor = () => {
    switch(presentation.tone) {
      case 'success': return TOKENS.colors.success.text;
      case 'warning': return TOKENS.colors.warning.text;
      case 'cancelled': return TOKENS.colors.danger.text;
      case 'completed': return TOKENS.colors.info.text;
      default: return TOKENS.colors.info.text;
    }
  };

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
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.serviceTitle}>{booking.service}</Text>
          {needsReply && (
            <View style={styles.attentionChip}>
              <View style={styles.attentionDot} />
              <Text style={styles.attentionChipText}>Needs reply</Text>
            </View>
          )}
        </View>
        <LinearGradient
          colors={getStatusColors() as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusBadge}
        >
          <Text style={[styles.statusText, { color: getStatusTextColor() }]}>
            {presentation.label}
          </Text>
        </LinearGradient>
      </View>

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

      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeItem}>
          <Ionicons name="calendar-outline" size={18} color={TOKENS.colors.text.secondary} style={{ marginRight: 6 }} />
          <Text style={styles.dateTimeText}>{booking.date}</Text>
        </View>
        <View style={styles.dateTimeDivider} />
        <View style={styles.dateTimeItem}>
          <Ionicons name="time-outline" size={18} color={TOKENS.colors.text.secondary} style={{ marginRight: 6 }} />
          <Text style={styles.dateTimeText}>{booking.time}</Text>
        </View>
      </View>

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

      <View style={styles.cardFooter}>
        <Pressable
          style={({ pressed }) => [styles.footerAction, pressed && { backgroundColor: '#F1F5F9' }]}
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
          <Text style={styles.footerActionText}>Chat</Text>
        </Pressable>
        
        <View style={styles.footerDivider} />

        <Pressable
          style={({ pressed }) => [styles.footerAction, pressed && { backgroundColor: '#F1F5F9' }]}
          onPress={() =>
            router.push({
              pathname: '/customer-booking-details',
              params: { id: booking.id, booking: JSON.stringify(bookingPayload) },
            } as any)
          }
        >
          <Ionicons name="document-text-outline" size={18} color={TOKENS.colors.text.secondary} />
          <Text style={[styles.footerActionText, { color: TOKENS.colors.text.secondary }]}>Details</Text>
        </Pressable>
      </View>
    </AnimatedCard>
  );
}


export function CustomerBookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [liveBookings, setLiveBookings] = useState<EnrichedBooking[]>([]);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [activeTab, setActiveTab] = useState<BookingTab>('inProgress');

  const loadBookings = React.useCallback(async () => {
    if (!user?.id) {
      setLiveBookings([]);
      setChatSummaries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [data, summaries] = await Promise.all([
        getCustomerBookings(user.id),
        getCustomerChatSummaries(user.id),
      ]);
      setLiveBookings(data || []);
      setChatSummaries(summaries || []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setLiveBookings([]);
      setChatSummaries([]);
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

  useEffect(() => {
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
    return liveBookings.map((item: EnrichedBooking, idx: number) => {
      const providerId = String(item?.provider_id || '').trim();
      const providerName = resolveProviderName(item);
      const providerRating = resolveProviderRating(item);
      const statusRaw = String(item?.status || 'Pending');
      const schedule = formatScheduledDate(item?.scheduled_at);

      return {
        id: String(item.id || idx + 1),
        providerId,
        service: item?.service?.title || item?.service_name || 'Service Booking',
        providerName,
        providerRating,
        providerAvatar: resolveProviderAvatar(item, providerId, providerName),
        price: `P${Number(item?.service?.price || item?.total_amount || 0).toFixed(2)}`,
        date: schedule.date,
        time: schedule.time,
        status: statusRaw,
        address: item?.service_address || '',
      };
    });
  }, [liveBookings]);

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
        { key: 'inProgress', label: 'In Progress', icon: 'location-outline', count: bookingsByTab.inProgress.length },
        { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline', count: bookingsByTab.completed.length },
        { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline', count: bookingsByTab.cancelled.length },
      ] as const,
    [bookingsByTab]
  );

  const bookings = bookingsByTab[activeTab];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} 
          style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: '#E2E8F0' }]}
        >
          <Ionicons name="arrow-back" size={22} color="#0D1B2A" />
        </Pressable>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.tabContainer}>
        {tabConfig.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [
                styles.tab, 
                isActive && styles.activeTab,
                pressed && !isActive && { opacity: 0.8 }
              ]}
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
            </Pressable>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 30 }} />
        ) : (
          <>
            <Text style={styles.bookingCount}>{bookings.length} bookings</Text>
            {bookings.map((booking, idx) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                chatSummary={chatSummaryMap.get(String(booking.id)) || null}
                index={idx}
              />
            ))}
            {!bookings.length ? (
              <Text style={styles.emptyText}>No bookings found for this tab.</Text>
            ) : null}
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
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: TOKENS.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: TOKENS.colors.text.primary,
    letterSpacing: -0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 6,
    marginBottom: 15,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
  },
  activeTab: {
    backgroundColor: TOKENS.colors.white,
    ...TOKENS.shadows.soft,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.colors.text.secondary,
  },
  activeTabText: {
    color: TOKENS.colors.text.primary,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  activeCountBadge: {
    backgroundColor: TOKENS.colors.primary,
  },
  inactiveCountBadge: {
    backgroundColor: '#E2E8F0',
  },
  countText: {
    fontSize: 10,
    fontWeight: '900',
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
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.text.muted,
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bookingCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    ...TOKENS.shadows.medium,
  },
  bookingCardAttention: {
    borderWidth: 1.5,
    borderColor: TOKENS.colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: TOKENS.colors.text.primary,
    letterSpacing: -0.3,
  },
  attentionChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: TOKENS.colors.success.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attentionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.success.text,
  },
  attentionChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: TOKENS.colors.success.text,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  providerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    backgroundColor: TOKENS.colors.border,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 17,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  ratingText: {
    fontSize: 13,
    color: TOKENS.colors.text.secondary,
    fontWeight: '700',
    marginLeft: 5,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '900',
    color: TOKENS.colors.primary,
    letterSpacing: -0.5,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: TOKENS.colors.text.primary,
    fontWeight: '700',
  },
  dateTimeDivider: {
    width: 1.5,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.success.bg,
    borderRadius: 20,
    padding: 14,
    marginBottom: 4,
  },
  contactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...TOKENS.shadows.soft,
  },
  contactRowText: {
    flex: 1,
  },
  contactRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  contactRowBody: {
    marginTop: 3,
    fontSize: 13,
    color: TOKENS.colors.text.secondary,
  },
  contactUnreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: TOKENS.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    ...TOKENS.shadows.glow,
  },
  contactUnreadBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: TOKENS.colors.white,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderTopColor: '#F1F5F9',
    marginTop: 16,
    paddingTop: 20,
    gap: 12,
  },
  footerAction: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  footerActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  footerDivider: {
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: TOKENS.colors.text.muted,
    marginTop: 40,
    fontSize: 16,
    fontWeight: '600',
  },
});
