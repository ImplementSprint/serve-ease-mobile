import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChatSummaryCard } from '@/components/ui/chat-summary-card';
import { useAuth } from '@/hooks/useAuth';
import {
  getCustomerChatSummaries,
  subscribeToChatSummaries,
  type ChatSummary,
} from '@/services/chatService';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ChatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = React.useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await getCustomerChatSummaries(user.id);
      setItems(rows);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  React.useEffect(() => {
    if (!user?.id) return;

    return subscribeToChatSummaries({
      role: 'customer',
      userId: user.id,
      onChange: () => {
        void load();
      },
    });
  }, [load, user?.id]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [item.otherPartyName, item.serviceName, item.lastMessage].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [items, searchQuery]);

  const renderItem = (item: ChatSummary) => (
    <ChatSummaryCard
      item={item}
      variant="customer"
      actionLabel="Booking"
      onActionPress={() =>
        router.push({
          pathname: '/customer-booking-details',
          params: { id: item.bookingId },
        } as any)
      }
      onPress={() =>
        router.push({
          pathname: '/customer-chat',
          params: {
            id: item.bookingId,
            providerName: item.otherPartyName,
            serviceName: item.serviceName,
            phone: item.otherPartyPhone,
          },
        } as any)
      }
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder="Search conversations..."
            style={styles.searchInput}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 30 }} /> : null}

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && filteredItems.length === 0 ? (
          <Text style={styles.emptyText}>No conversations yet.</Text>
        ) : (
          filteredItems.map((item) => <React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>)
        )}
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
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  searchContainer: {
    paddingHorizontal: 25,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginTop: 30,
  },
});
