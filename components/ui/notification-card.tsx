import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppNotification } from '@/services/notificationService';

type NotificationCardProps = {
  item: AppNotification;
  onPress: () => void;
  actionLabel?: string;
  onActionPress?: () => void;
};

const getContextLabel = (item: AppNotification) => {
  const screen = item.data.target?.screen || '';
  const bookingStatus = String(item.data.context?.bookingStatus || '').toLowerCase();
  const recipientRole = item.data.context?.recipientRole;

  if (screen.includes('track-order')) return 'Track booking';
  if (screen.includes('service-in-progress')) return 'Active service';
  if (screen.includes('start-service')) return 'Ready to start';
  if (screen.includes('booking-details') && recipientRole === 'provider') return 'Provider action';
  if (screen.includes('booking-details')) return 'Booking update';
  if (bookingStatus.includes('complete')) return 'Completed service';
  if (bookingStatus.includes('cancel')) return 'Cancelled booking';
  if (bookingStatus.includes('progress') || bookingStatus.includes('arrived')) return 'Active service';
  if (bookingStatus.includes('confirm') || bookingStatus.includes('accept')) return 'Booking confirmed';
  return 'Message alert';
};

const getVisualConfig = (item: AppNotification) => {
  switch (item.type) {
    case 'booking_requested':
      return {
        icon: 'calendar-outline' as const,
        iconColor: '#0EA5E9',
        iconBackground: '#E0F2FE',
        unreadBorder: '#BAE6FD',
      };
    case 'booking_confirmed':
      return {
        icon: 'checkmark-circle-outline' as const,
        iconColor: '#16A34A',
        iconBackground: '#DCFCE7',
        unreadBorder: '#BBF7D0',
      };
    case 'booking_in_progress':
      return {
        icon: 'construct-outline' as const,
        iconColor: '#2563EB',
        iconBackground: '#DBEAFE',
        unreadBorder: '#BFDBFE',
      };
    case 'booking_completed':
      return {
        icon: 'flag-outline' as const,
        iconColor: '#7C3AED',
        iconBackground: '#EDE9FE',
        unreadBorder: '#DDD6FE',
      };
    case 'booking_cancelled':
      return {
        icon: 'close-circle-outline' as const,
        iconColor: '#DC2626',
        iconBackground: '#FEE2E2',
        unreadBorder: '#FECACA',
      };
    default:
      return {
        icon: 'chatbubble-ellipses-outline' as const,
        iconColor: '#00B761',
        iconBackground: '#E8FBF2',
        unreadBorder: '#B7F0CF',
      };
  }
};

export function NotificationCard({
  item,
  onPress,
  actionLabel,
  onActionPress,
}: NotificationCardProps) {
  const contextLabel = getContextLabel(item);
  const visual = getVisualConfig(item);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        !item.is_read && styles.unreadCard,
        !item.is_read && { borderColor: visual.unreadBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: visual.iconBackground }]}>
        <Ionicons name={visual.icon} size={20} color={visual.iconColor} />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.time}>{item.timeLabel}</Text>
        </View>
        <View style={styles.contextRow}>
          <View style={[styles.contextPill, !item.is_read && styles.contextPillUnread]}>
            <Text style={[styles.contextPillText, !item.is_read && styles.contextPillTextUnread]}>
              {contextLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.text}>{item.body}</Text>
        {!item.is_read ? (
          <View style={styles.footer}>
            <Text style={styles.openHint}>Tap to open</Text>
            {actionLabel && onActionPress ? (
              <TouchableOpacity style={styles.actionChip} onPress={onActionPress} activeOpacity={0.8}>
                <Text style={styles.actionChipText}>{actionLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
  },
  unreadCard: {
    borderColor: '#B7F0CF',
    backgroundColor: '#F7FFFA',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8FBF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  time: {
    fontSize: 12,
    color: '#8E8E93',
  },
  text: {
    fontSize: 13,
    color: '#5E6B78',
    marginTop: 6,
    lineHeight: 19,
  },
  contextRow: {
    marginTop: 8,
  },
  contextPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
  },
  contextPillUnread: {
    backgroundColor: '#E8FBF2',
  },
  contextPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#667085',
  },
  contextPillTextUnread: {
    color: '#00B761',
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  openHint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B761',
    flex: 1,
  },
  actionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E8FBF2',
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B761',
  },
});
