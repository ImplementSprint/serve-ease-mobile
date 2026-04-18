import { api } from '../lib/apiClient';
import {
  type NotificationRole,
} from '../lib/notification-preferences';
import { Notification as BackendNotification } from '../src/types/database.interfaces';

type NotificationSubscription = () => void;
export type AppNotificationType =
  | 'chat_message'
  | 'broadcast'
  | 'booking_requested'
  | 'booking_confirmed'
  | 'booking_in_progress'
  | 'booking_completed'
  | 'booking_cancelled';

export type NotificationTarget = {
  screen: string;
  params: Record<string, string>;
};

export type NotificationContext = {
  bookingStatus: string;
  recipientRole: NotificationRole;
  senderName: string;
  serviceName: string;
};

export type AppNotificationData = {
  bookingId: string;
  senderName: string;
  serviceName: string;
  senderPhone: string;
  recipientRole: NotificationRole;
  target?: NotificationTarget;
  fallbackTarget?: NotificationTarget;
  context?: NotificationContext;
};

export interface AppNotification extends BackendNotification {
  type: AppNotificationType;
  timeLabel: string;
  data: AppNotificationData;
}

const memoryNotifications = new Map<string, AppNotification[]>();

const formatTimeLabel = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Now';

  return parsed.toLocaleDateString() === new Date().toLocaleDateString()
    ? parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getMemoryNotifications = (userId: string) => memoryNotifications.get(userId) || [];

const setMemoryNotifications = (userId: string, notifications: AppNotification[]) => {
  memoryNotifications.set(userId, notifications);
};

const mapNotificationRow = (row: any): AppNotification => {
  const createdAt = String(row?.created_at || new Date().toISOString());
  const rawData = typeof row?.data === 'object' && row?.data ? row.data : {};
  const rawType = String(row?.type || 'chat_message');
  const type: AppNotificationType =
    rawType === 'broadcast' ||
    rawType === 'booking_requested' ||
    rawType === 'booking_confirmed' ||
    rawType === 'booking_in_progress' ||
    rawType === 'booking_completed' ||
    rawType === 'booking_cancelled'
      ? rawType
      : 'chat_message';

  const bodyText = String(row?.body ?? row?.message ?? '');

  return {
    id: String(row?.id || row?.notification_id || `notification-${createdAt}`),
    user_id: String(row?.user_id || ''),
    actor_id: String(row?.actor_id || ''),
    booking_id: String(row?.booking_id || ''),
    type,
    title: String(row?.title || 'Notification'),
    body: bodyText,
    is_read: Boolean(row?.is_read),
    created_at: createdAt,
    timeLabel: formatTimeLabel(createdAt),
    data: {
      bookingId: String(rawData.bookingId || row?.booking_id || ''),
      senderName: String(rawData.senderName || ''),
      serviceName: String(rawData.serviceName || ''),
      senderPhone: String(rawData.senderPhone || ''),
      recipientRole: String(rawData.recipientRole || 'customer') === 'provider' ? 'provider' : 'customer',
      target: rawData.target,
      fallbackTarget: rawData.fallbackTarget,
      context: rawData.context,
    },
  };
};

export const getNotifications = async (userId: string): Promise<AppNotification[]> => {
  if (!userId) return [];

  try {
    const data = await api.get<{ notifications: any[] }>('/notifications');
    const rows = Array.isArray(data?.notifications) ? data.notifications : [];
    const mapped = rows.map(mapNotificationRow);
    setMemoryNotifications(userId, mapped);
    return mapped;
  } catch {
    // Fall back to local notifications.
  }

  return getMemoryNotifications(userId).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  if (!userId || !notificationId) return;

  // Optimistic local update
  setMemoryNotifications(
    userId,
    getMemoryNotifications(userId).map((notification) =>
      notification.id === notificationId ? { ...notification, is_read: true } : notification
    )
  );

  try {
    await api.patch('/notifications/' + notificationId + '/read', {});
  } catch {
    // Keep local read state even if remote update fails.
  }
};

export const markAllNotificationsRead = async (userId: string) => {
  if (!userId) return;

  // Optimistic local update
  setMemoryNotifications(
    userId,
    getMemoryNotifications(userId).map((notification) => ({ ...notification, is_read: true }))
  );

  try {
    await api.patch('/notifications/read-all', {});
  } catch {
    // Keep local read state even if remote update fails.
  }
};

export const getUnreadNotificationCount = async (userId: string) => {
  if (!userId) return 0;

  try {
    const data = await api.get<{ count: number }>('/notifications/unread-count');
    return data?.count ?? 0;
  } catch {
    const notifications = getMemoryNotifications(userId);
    return notifications.filter((n) => !n.is_read).length;
  }
};

export const createChatNotification = async (_input: {
  recipientUserId: string;
  recipientRole: NotificationRole;
  actorId: string;
  bookingId: string;
  senderName: string;
  serviceName: string;
  senderPhone?: string;
  target?: NotificationTarget;
  fallbackTarget?: NotificationTarget;
  context?: NotificationContext;
}): Promise<null> => {
  // Backend now handles notification creation — this is a no-op stub.
  return null;
};

export const createBookingStatusNotification = async (_input: {
  recipientUserId: string;
  recipientRole: NotificationRole;
  actorId: string;
  bookingId: string;
  type:
    | 'booking_requested'
    | 'booking_confirmed'
    | 'booking_in_progress'
    | 'booking_completed'
    | 'booking_cancelled';
  title: string;
  body: string;
  senderName: string;
  serviceName: string;
  senderPhone?: string;
  bookingStatus: string;
  target?: NotificationTarget;
  fallbackTarget?: NotificationTarget;
}): Promise<null> => {
  // Backend now handles notification creation — this is a no-op stub.
  return null;
};

export const subscribeToNotifications = (input: {
  userId: string;
  onChange: () => void;
}): NotificationSubscription => {
  const userId = String(input.userId || '').trim();
  if (!userId) return () => {};

  const interval = setInterval(input.onChange, 10000);
  return () => clearInterval(interval);
};
