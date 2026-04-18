import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChatSummaryCard } from '@/components/ui/chat-summary-card';
import { useAuth } from '@/hooks/useAuth';
import {
  getProviderChatSummaries,
  subscribeToChatSummaries,
  type ChatSummary,
} from '@/services/chatService';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
      const rows = await getProviderChatSummaries(user.id);
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
      role: 'provider',
      userId: user.id,
      onChange: () => {
        void load();
      },
    });
  }, [load, user?.id]);

  const list = useMemo(() => items, [items]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        {isLoading ? <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 30 }} /> : null}

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.listContainer}>
            {list.map((item) => (
              <ChatSummaryCard
                key={item.id}
                item={item}
                variant="provider"
                actionLabel="Booking"
                onActionPress={() =>
                  router.push({
                    pathname: '/provider-booking-details',
                    params: { id: item.bookingId },
                  } as any)
                }
                onPress={() =>
                  router.push({
                    pathname: '/provider-chat',
                    params: {
                      id: item.bookingId,
                      name: item.otherPartyName,
                      initials: item.initials,
                      phone: item.otherPartyPhone,
                      serviceName: item.serviceName,
                    },
                  } as any)
                }
              />
            ))}

            {!isLoading && !list.length ? (
              <Text style={styles.emptyText}>No conversations yet.</Text>
            ) : null}
          </View>
          <View style={styles.footerSpacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0D1B2A',
  },
  scrollContainer: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  footerSpacer: {
    height: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginTop: 30,
  },
});
