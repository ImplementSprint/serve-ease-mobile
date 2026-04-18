import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatSummary } from '@/services/chatService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

interface BookingItem {
  id: string;
  providerId: string;
  serviceId: string;
  service: string;
  provider: string;
  price: string;
  phone: string;
  address: string;
  date: string;
}

interface BookingCarouselProps {
  bookings: BookingItem[];
  chatSummaryMap: Map<string, ChatSummary>;
  onPress: (item: BookingItem) => void;
}

const BookingCarouselCard = memo(({ 
  item, 
  chatSummary, 
  onPress 
}: { 
  item: BookingItem; 
  chatSummary?: ChatSummary; 
  onPress: (item: BookingItem) => void 
}) => {
  const needsReply = Boolean((chatSummary?.unreadCount || 0) > 0);
  
  return (
    <TouchableOpacity
      style={[styles.card, needsReply && styles.cardAttention]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar-outline" size={20} color="#00B761" />
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Completed</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.serviceTitle} numberOfLines={1}>{item.service}</Text>
          <Text style={styles.providerName} numberOfLines={1}>{item.provider}</Text>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>Total paid</Text>
            <Text style={styles.priceValue}>{item.price}</Text>
          </View>
          <View style={styles.bookAgainBtn}>
            <Text style={styles.bookAgainText}>Book Again</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </View>
      </View>
      
      {needsReply && (
        <View style={styles.attentionFloat}>
          <View style={styles.attentionDot} />
          <Text style={styles.attentionText}>Unread Message</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

BookingCarouselCard.displayName = 'BookingCarouselCard';

export const BookingCarousel = ({ bookings, chatSummaryMap, onPress }: BookingCarouselProps) => {
  if (bookings.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList<BookingItem>
        data={bookings}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item: BookingItem) => item.id}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: { item: BookingItem }) => (
          <BookingCarouselCard
            item={item}
            chatSummary={chatSummaryMap.get(item.id)}
            onPress={onPress}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardAttention: {
    borderColor: '#BDE4CD',
    backgroundColor: '#F7FFF9',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8FBF2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  infoSection: {
    marginBottom: 20,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  providerName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00B761',
  },
  bookAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C853',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  bookAgainText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  attentionFloat: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  attentionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  attentionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
