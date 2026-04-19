import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatSummary } from '@/services/chatService';

type ChatSummaryCardProps = {
  item: ChatSummary;
  onPress: () => void;
  variant?: 'customer' | 'provider';
  actionLabel?: string;
  onActionPress?: () => void;
};

const getDisplayServiceLabel = (serviceName?: string | null) => {
  const normalized = String(serviceName || '').trim();
  if (!normalized) return 'Service Booking';

  const looksLikeOpaqueId =
    normalized.length > 20 &&
    /^[a-f0-9-]+$/i.test(normalized);

  return looksLikeOpaqueId ? 'Service Booking' : normalized;
};

export function ChatSummaryCard({
  item,
  onPress,
  variant = 'customer',
  actionLabel,
  onActionPress,
}: ChatSummaryCardProps) {
  const isCustomer = variant === 'customer';

  return (
    <TouchableOpacity
      style={[styles.card, isCustomer ? styles.customerCard : styles.providerCard]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.avatarContainer}>
        {isCustomer ? (
          <>
            <Image source={{ uri: item.avatar }} style={styles.customerAvatar} />
            {item.online ? <View style={styles.onlineDot} /> : null}
          </>
        ) : (
          <>
            <Image source={{ uri: item.avatar }} style={styles.providerAvatarImage} />
            {item.online ? <View style={styles.onlineDot} /> : null}
          </>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, isCustomer ? styles.customerName : styles.providerName]}>
            {item.otherPartyName}
          </Text>
          <Text style={[styles.time, isCustomer ? styles.customerTime : styles.providerTime]}>
            {item.lastMessageTime}
          </Text>
        </View>

        <View style={styles.messageRow}>
          <Text
            style={[
              styles.preview,
              isCustomer ? styles.customerPreview : styles.providerPreview,
              item.unreadCount > 0 && styles.unreadPreview,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 ? (
            <View style={isCustomer ? styles.customerUnreadBadge : styles.providerUnreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.serviceLabel}>{getDisplayServiceLabel(item.serviceName)}</Text>
        {actionLabel && onActionPress ? (
          <TouchableOpacity style={styles.actionChip} onPress={onActionPress} activeOpacity={0.8}>
            <Text style={styles.actionChipText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isCustomer ? (
        <Ionicons name="chevron-forward" size={18} color="#CCC" style={styles.chevron} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerCard: {
    paddingHorizontal: 25,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  providerCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  providerAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00C853',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontWeight: '700',
  },
  customerName: {
    fontSize: 17,
    color: '#1A1B1E',
  },
  providerName: {
    fontSize: 16,
    color: '#0D1B2A',
  },
  time: {
    fontSize: 12,
  },
  customerTime: {
    color: '#999',
  },
  providerTime: {
    color: '#AAA',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    flex: 1,
  },
  customerPreview: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  providerPreview: {
    fontSize: 14,
    color: '#555',
    marginRight: 8,
  },
  unreadPreview: {
    color: '#1A1B1E',
    fontWeight: '600',
  },
  customerUnreadBadge: {
    backgroundColor: '#00C853',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  providerUnreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00B761',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  serviceLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#8E8E93',
  },
  actionChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
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
  chevron: {
    marginLeft: 5,
  },
});
