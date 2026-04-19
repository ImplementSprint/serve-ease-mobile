import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { getCustomerBookingPresentation } from '@/lib/booking-status';
import { getBookingById } from '@/services/bookingService';
import {
  getProviderBookingActionState,
  getProviderBookingById,
} from '@/services/providerBookingService';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type AppNotification,
} from '@/services/notificationService';
import { NotificationCard } from '@/components/ui/notification-card';

const FILTER_OPTIONS = ['all', 'chat', 'bookings', 'unread'] as const;
type NotificationFilter = (typeof FILTER_OPTIONS)[number];
type NotificationSection = {
  title: string;
  data: AppNotification[];
};

const resolveUserRole = (user: any) => {
  const roleRaw =
    user?.user_metadata?.role ??
    user?.app_metadata?.role ??
    user?.user_metadata?.user_type ??
    user?.app_metadata?.user_type ??
    '';

  return String(roleRaw).toLowerCase().includes('provider') ? 'provider' : 'customer';
};

const pushNotificationTarget = (router: ReturnType<typeof useRouter>, target?: { screen?: string; params?: Record<string, string> }) => {
  if (!target?.screen) return false;

  router.push({
    pathname: target.screen as any,
    params: target.params || {},
  } as any);

  return true;
};

const getSectionTitle = (createdAt: string) => {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return 'Older';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfItemDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfItemDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 0) return 'Today';
  if (diffDays <= 7) return 'Earlier this week';
  return 'Older';
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = React.useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const rows = await getNotifications(user.id);
      setItems(rows);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load notifications.'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      void load();
    }, [load])
  );

  React.useEffect(() => {
    if (!user?.id) return;

    return subscribeToNotifications({
      userId: user.id,
      onChange: () => {
        void load();
      },
    });
  }, [load, user?.id]);

  const unreadCount = useMemo(
    () => items.filter((notification) => !notification.is_read).length,
    [items]
  );
  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'chat':
        return items.filter((item) => item.type === 'chat_message');
      case 'bookings':
        return items.filter((item) => item.type !== 'chat_message');
      case 'unread':
        return items.filter((item) => !item.is_read);
      default:
        return items;
    }
  }, [activeFilter, items]);
  const sections = useMemo<NotificationSection[]>(() => {
    const grouped = new Map<string, AppNotification[]>();

    filteredItems.forEach((item) => {
      const title = getSectionTitle(item.created_at);
      const existing = grouped.get(title) || [];
      existing.push(item);
      grouped.set(title, existing);
    });

    return ['Today', 'Earlier this week', 'Older']
      .map((title) => ({
        title,
        data: grouped.get(title) || [],
      }))
      .filter((section) => section.data.length > 0);
  }, [filteredItems]);
  const filteredUnreadCount = useMemo(
    () => filteredItems.filter((item) => !item.is_read).length,
    [filteredItems]
  );

  const markNotificationsReadLocally = React.useCallback((notificationIds: string[]) => {
    if (!notificationIds.length) return;

    const idSet = new Set(notificationIds);
    setItems((prev) =>
      prev.map((notification) =>
        idSet.has(notification.id) ? { ...notification, is_read: true } : notification
      )
    );
  }, []);

  const markNotificationBatchRead = React.useCallback(
    async (notificationIds: string[]) => {
      if (!user?.id || !notificationIds.length) return;

      await Promise.all(notificationIds.map((id) => markNotificationRead(user.id, id)));
      markNotificationsReadLocally(notificationIds);
    },
    [markNotificationsReadLocally, user?.id]
  );

  const handleOpenNotification = async (item: AppNotification) => {
    if (!user?.id) return;

    await markNotificationRead(user.id, item.id);
    setItems((prev) =>
      prev.map((notification) =>
        notification.id === item.id ? { ...notification, is_read: true } : notification
      )
    );

    if (item.type === 'chat_message') {
      const role = resolveUserRole(user);
      const bookingId = String(item.data.bookingId || item.booking_id || '').trim();

      if (!bookingId) return;

      if (pushNotificationTarget(router, item.data.target)) {
        return;
      }

      try {
        if (role === 'provider') {
          const booking = await getProviderBookingById(bookingId);
          const bookingState = getProviderBookingActionState(booking?.status);

          if (bookingState.canResumeService) {
            router.push({
              pathname: '/provider-service-in-progress',
              params: { id: bookingId },
            } as any);
            return;
          }

          if (bookingState.canStartService) {
            router.push({
              pathname: '/provider-start-service',
              params: { id: bookingId },
            } as any);
            return;
          }

          router.push({
            pathname: '/provider-booking-details',
            params: { id: bookingId },
          } as any);
          return;
        }

        const booking = await getBookingById(bookingId);
        const bookingState = getCustomerBookingPresentation(booking?.status);

        if (bookingState.canTrack) {
          router.push({
            pathname: '/customer-track-order',
            params: { id: bookingId },
          } as any);
          return;
        }

        router.push({
          pathname: '/customer-booking-details',
          params: { id: bookingId },
        } as any);
      } catch {
        if (pushNotificationTarget(router, item.data.fallbackTarget)) {
          return;
        }

        if (role === 'provider') {
          router.push({
            pathname: '/provider-chat',
            params: {
              id: bookingId,
              name: item.data.senderName || 'Customer',
              phone: item.data.senderPhone || '',
              serviceName: item.data.serviceName || 'Service Booking',
              initials: String(item.data.senderName || 'CU')
                .split(/\s+/)
                .map((part: string) => part[0] || '')
                .join('')
                .slice(0, 2)
                .toUpperCase(),
            },
          } as any);
          return;
        }

        router.push({
          pathname: '/customer-chat',
          params: {
            id: bookingId,
            providerName: item.data.senderName || 'Service Provider',
            phone: item.data.senderPhone || '',
            serviceName: item.data.serviceName || 'Service Booking',
          },
        } as any);
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  const handleMarkFilterRead = async () => {
    const unreadIds = filteredItems.filter((item) => !item.is_read).map((item) => item.id);
    await markNotificationBatchRead(unreadIds);
  };

  const handleMarkSectionRead = async (section: NotificationSection) => {
    const unreadIds = section.data.filter((item) => !item.is_read).map((item) => item.id);
    await markNotificationBatchRead(unreadIds);
  };

  const handleMarkRead = async (item: AppNotification) => {
    if (!user?.id || item.is_read) return;

    await markNotificationRead(user.id, item.id);
    setItems((prev) =>
      prev.map((notification) =>
        notification.id === item.id ? { ...notification, is_read: true } : notification
      )
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerMeta}>{unreadCount} unread</Text>
        </View>
        <TouchableOpacity
          style={[styles.markAllButton, unreadCount === 0 && styles.markAllButtonDisabled]}
          onPress={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <Text style={styles.markAllText}>Mark all</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 30 }} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((filter) => {
          const isActive = activeFilter === filter;
          const label =
            filter === 'all'
              ? 'All'
              : filter === 'chat'
                ? 'Chat'
                : filter === 'bookings'
                  ? 'Bookings'
                  : 'Unread';

          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredUnreadCount > 0 ? (
        <View style={styles.batchRow}>
          <Text style={styles.batchMeta}>
            {filteredUnreadCount} unread in this view
          </Text>
          <TouchableOpacity style={styles.batchChip} onPress={() => void handleMarkFilterRead()}>
            <Text style={styles.batchChipText}>Mark filter read</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: any) => (
          <NotificationCard
            item={item}
            onPress={() => handleOpenNotification(item)}
            actionLabel={item.is_read ? undefined : 'Mark read'}
            onActionPress={() => void handleMarkRead(item)}
          />
        )}
        renderSectionHeader={({ section }) => {
          const sectionUnreadCount = section.data.filter((item) => !item.is_read).length;

          return (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              {sectionUnreadCount > 0 ? (
                <TouchableOpacity
                  style={styles.sectionActionChip}
                  onPress={() => void handleMarkSectionRead(section)}
                >
                  <Text style={styles.sectionActionChipText}>Mark section read</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={28} color="#9AA4AF" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                {activeFilter === 'chat'
                  ? 'Chat alerts will show up here.'
                  : activeFilter === 'bookings'
                    ? 'Booking updates will show up here.'
                    : activeFilter === 'unread'
                      ? 'You are all caught up.'
                      : 'New booking messages will show up here.'}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  headerMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E8FBF2',
  },
  markAllButtonDisabled: {
    opacity: 0.45,
  },
  markAllText: {
    color: '#00B761',
    fontWeight: '700',
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  errorText: {
    color: '#B91C1C',
    textAlign: 'center',
    marginTop: 12,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF0F3',
  },
  filterChipActive: {
    backgroundColor: '#00B761',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  batchMeta: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  batchChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E8FBF2',
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B761',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 10,
  },
  sectionActionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF0F3',
  },
  sectionActionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#667085',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: '#7B8794',
  },
});
