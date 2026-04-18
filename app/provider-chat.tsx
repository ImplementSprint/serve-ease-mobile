import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { openPhoneCall } from '@/lib/communication';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getProviderBookingActionState,
  type ProviderBookingActionState,
  getProviderBookingById,
} from '@/services/providerBookingService';
import {
  getChatThread,
  markChatThreadRead,
  retryChatMessage,
  sendChatMessage,
  subscribeToChatThread,
  type ChatDeliveryStatus,
  type ChatMessage,
  type ChatThread,
} from '@/services/chatService';

const formatDeliveryStatus = (status: ChatDeliveryStatus) => {
  if (status === 'failed') return 'Failed';
  if (status === 'sent') return 'Sent';
  return 'Delivered';
};

const statusToneStyles: Record<
  ProviderBookingActionState['normalizedStatus'],
  { container: object; text: object }
> = {
  pending: {
    container: { backgroundColor: '#FEF3C7' },
    text: { color: '#B45309' },
  },
  confirmed: {
    container: { backgroundColor: '#DCFCE7' },
    text: { color: '#15803D' },
  },
  in_progress: {
    container: { backgroundColor: '#DBEAFE' },
    text: { color: '#1D4ED8' },
  },
  completed: {
    container: { backgroundColor: '#EDE9FE' },
    text: { color: '#6D28D9' },
  },
  cancelled: {
    container: { backgroundColor: '#FEE2E2' },
    text: { color: '#B91C1C' },
  },
};

const ChatBubble = ({
  text,
  time,
  sender,
  deliveryStatus,
  onRetry,
}: {
  text: string;
  time: string;
  sender: 'customer' | 'provider';
  deliveryStatus: ChatDeliveryStatus;
  onRetry?: () => void;
}) => (
  <View style={[styles.bubbleContainer, sender === 'provider' ? styles.providerBubbleContainer : styles.customerBubbleContainer]}>
    <TouchableOpacity
      activeOpacity={sender === 'provider' && deliveryStatus === 'failed' ? 0.75 : 1}
      disabled={!(sender === 'provider' && deliveryStatus === 'failed')}
      onPress={onRetry}
      style={[styles.bubble, sender === 'provider' ? styles.providerBubble : styles.customerBubble]}
    >
      <Text style={[styles.bubbleText, sender === 'provider' ? styles.providerBubbleText : styles.customerBubbleText]}>
        {text}
      </Text>
      <Text style={[styles.bubbleTime, sender === 'provider' ? styles.providerBubbleTime : styles.customerBubbleTime]}>
        {time}
      </Text>
      {sender === 'provider' ? (
        <>
          <Text
            style={[
              styles.bubbleStatus,
              deliveryStatus === 'failed' ? styles.failedStatus : styles.providerBubbleStatus,
            ]}
          >
            {formatDeliveryStatus(deliveryStatus)}
          </Text>
          {deliveryStatus === 'failed' ? (
            <Text style={styles.retryHint}>Tap to retry</Text>
          ) : null}
        </>
      ) : null}
    </TouchableOpacity>
  </View>
);

export default function ProviderChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id, name, initials, phone, serviceName } = useLocalSearchParams<{
    id?: string;
    name?: string;
    initials?: string;
    phone?: string;
    serviceName?: string;
  }>();
  const [messageText, setMessageText] = useState('');
  const lastMarkedIncomingId = useRef('');
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bookingState, setBookingState] = useState<ProviderBookingActionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const loadThread = React.useCallback(
    async (silent = false) => {
      if (!id) {
        setError('Booking conversation is missing.');
        setIsLoading(false);
        return;
      }

      if (!silent) setIsLoading(true);
      setError('');

      try {
        const data = await getChatThread({
          bookingId: String(id),
          role: 'provider',
          otherPartyName: String(name || 'Customer'),
          otherPartyPhone: String(phone || ''),
          serviceName: String(serviceName || 'Service Booking'),
        });

        setThread(data);
        setMessages(data.messages);
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load chat.'));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [id, name, phone, serviceName]
  );

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (!id) return;

    return subscribeToChatThread({
      bookingId: String(id),
      onChange: () => {
        void loadThread(true);
      },
    });
  }, [id, loadThread]);

  useEffect(() => {
    if (!id) return;

    let active = true;

    const loadBookingState = async () => {
      try {
        const booking = await getProviderBookingById(String(id));
        if (!active) return;
        setBookingState(getProviderBookingActionState(booking?.status));
      } catch {
        if (!active) return;
        setBookingState(getProviderBookingActionState(undefined));
      }
    };

    void loadBookingState();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [messages.length]);

  useEffect(() => {
    if (!id || !messages.length) return;

    const lastIncomingMessage = [...messages]
      .reverse()
      .find((message) => message.sender === 'customer');

    if (!lastIncomingMessage || lastMarkedIncomingId.current === lastIncomingMessage.id) {
      return;
    }

    lastMarkedIncomingId.current = lastIncomingMessage.id;
    void markChatThreadRead({
      bookingId: String(id),
      role: 'provider',
    });
  }, [id, messages]);

  const handleSend = async () => {
    if (!user?.id || !id || !messageText.trim()) return;

    setIsSending(true);
    try {
      const nextMessage = await sendChatMessage({
        bookingId: String(id),
        senderId: user.id,
        senderRole: 'provider',
        text: messageText,
      });
      setMessages((prev) => [...prev, nextMessage]);
      setMessageText('');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send message.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (message: ChatMessage) => {
    if (!user?.id || !id || message.deliveryStatus !== 'failed') return;

    try {
      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === message.id ? { ...entry, deliveryStatus: 'sent' } : entry
        )
      );

      const nextMessage = await retryChatMessage({
        bookingId: String(id),
        senderId: user.id,
        senderRole: 'provider',
        messageId: message.id,
      });

      setMessages((prev) =>
        prev.map((entry) => (entry.id === message.id ? nextMessage : entry))
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to retry message.'));
      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === message.id ? { ...entry, deliveryStatus: 'failed' } : entry
        )
      );
    }
  };

  const displayThread = thread || {
    otherPartyName: String(name || 'Customer'),
    initials: String(initials || 'CU'),
    otherPartyPhone: String(phone || ''),
    avatar: '',
    online: true,
  };
  const resolvedBookingState = bookingState || getProviderBookingActionState(undefined);
  const bookingTone = statusToneStyles[resolvedBookingState.normalizedStatus];
  const bookingShortcutLabel =
    resolvedBookingState.canStartService
      ? 'Start service'
      : resolvedBookingState.canResumeService
        ? 'Continue service'
        : resolvedBookingState.canConfirm
          ? 'Open booking'
          : '';
  const headerStatusText =
    resolvedBookingState.normalizedStatus === 'in_progress'
      ? 'Service active'
      : resolvedBookingState.normalizedStatus === 'confirmed'
        ? 'Ready to start'
        : resolvedBookingState.normalizedStatus === 'completed'
          ? 'Service completed'
          : resolvedBookingState.normalizedStatus === 'cancelled'
            ? 'Booking cancelled'
            : 'Awaiting confirmation';

  const handleViewBooking = () => {
    if (!id) return;

    router.push({
      pathname: '/provider-booking-details',
      params: { id: String(id) },
    } as any);
  };

  const handleBookingShortcut = () => {
    if (!id) return;

    if (resolvedBookingState.canStartService) {
      router.push({
        pathname: '/provider-start-service',
        params: { id: String(id) },
      } as any);
      return;
    }

    if (resolvedBookingState.canResumeService) {
      router.push({
        pathname: '/provider-service-in-progress',
        params: { id: String(id) },
      } as any);
      return;
    }

    handleViewBooking();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
          </TouchableOpacity>
          {displayThread.avatar ? (
            <Image source={{ uri: displayThread.avatar }} style={styles.headerAvatarImage} />
          ) : (
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{displayThread.initials}</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{displayThread.otherPartyName}</Text>
            <View style={styles.headerMetaRow}>
              <Text style={styles.headerStatus} numberOfLines={1}>
                {thread?.serviceName || serviceName || 'Service Booking'}
              </Text>
              <View style={[styles.headerStatusPill, bookingTone.container]}>
                <Text style={[styles.headerStatusPillText, bookingTone.text]}>{headerStatusText}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton} onPress={() => openPhoneCall(displayThread.otherPartyPhone, displayThread.otherPartyName)}>
            <Ionicons name="call-outline" size={24} color="#00B761" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={0}
        >
          <View style={styles.bookingStrip}>
            <View style={styles.bookingStripText}>
              <Text style={styles.bookingStripLabel}>Linked Booking</Text>
              <Text style={styles.bookingStripTitle} numberOfLines={1}>
                {thread?.serviceName || serviceName || 'Service Booking'}
              </Text>
              <View style={[styles.bookingStatusPill, bookingTone.container]}>
                <Text style={[styles.bookingStatusText, bookingTone.text]}>
                  {resolvedBookingState.label}
                </Text>
              </View>
            </View>
            <View style={styles.bookingStripActions}>
              {bookingShortcutLabel ? (
                <TouchableOpacity
                  style={[styles.bookingStripButton, styles.bookingStripPrimaryButton]}
                  onPress={handleBookingShortcut}
                >
                  <Text style={[styles.bookingStripButtonText, styles.bookingStripPrimaryButtonText]}>
                    {bookingShortcutLabel}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.bookingStripButton} onPress={handleViewBooking}>
                <Text style={styles.bookingStripButtonText}>View booking</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={true}
          >
            {isLoading ? <ActivityIndicator size="small" color="#00B761" style={{ marginTop: 30 }} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!isLoading && !error && messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color="#00B761" />
                <Text style={styles.emptyStateTitle}>No messages yet</Text>
                <Text style={styles.emptyStateText}>
                  Start the conversation with {displayThread.otherPartyName} about this booking.
                </Text>
              </View>
            ) : null}
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                text={msg.text}
                time={msg.timeLabel}
                sender={msg.sender}
                deliveryStatus={msg.deliveryStatus}
                onRetry={() => handleRetry(msg)}
              />
            ))}
          </ScrollView>

          <View style={styles.inputArea}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="attach" size={24} color="#777" />
            </TouchableOpacity>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#AAA"
                value={messageText}
                onChangeText={setMessageText}
                multiline
              />
            </View>
            <TouchableOpacity style={styles.sendButton} activeOpacity={0.8} onPress={handleSend} disabled={!messageText.trim() || isSending}>
              <Ionicons name="send" size={20} color={messageText.trim() && !isSending ? '#00B761' : '#A3A3A3'} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8FBF2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#E8FBF2',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00B761',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  headerStatus: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    flexShrink: 1,
  },
  headerStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  headerStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  moreButton: {
    padding: 8,
  },
  bookingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FFF9',
    borderBottomWidth: 1,
    borderBottomColor: '#E5F7EA',
  },
  bookingStripText: {
    flex: 1,
    marginRight: 12,
  },
  bookingStripLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bookingStripTitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  bookingStatusPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bookingStripActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  bookingStripButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E8FBF2',
  },
  bookingStripPrimaryButton: {
    backgroundColor: '#00B761',
  },
  bookingStripButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B761',
  },
  bookingStripPrimaryButtonText: {
    color: '#FFF',
  },
  chatScroll: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  chatContent: {
    padding: 20,
    paddingBottom: 30,
  },
  errorText: {
    color: '#B91C1C',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyState: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5F7EA',
  },
  emptyStateTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: '#6B7280',
  },
  bubbleContainer: {
    marginBottom: 16,
    width: '100%',
    flexDirection: 'row',
  },
  customerBubbleContainer: {
    justifyContent: 'flex-start',
  },
  providerBubbleContainer: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  customerBubble: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 4,
  },
  providerBubble: {
    backgroundColor: '#00B761',
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  customerBubbleText: {
    color: '#0D1B2A',
  },
  providerBubbleText: {
    color: '#FFF',
  },
  bubbleTime: {
    fontSize: 10,
    textAlign: 'right',
  },
  customerBubbleTime: {
    color: '#AAA',
  },
  providerBubbleTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bubbleStatus: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'right',
    fontWeight: '600',
  },
  providerBubbleStatus: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  failedStatus: {
    color: '#FECACA',
  },
  retryHint: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'right',
    color: '#FEE2E2',
    fontWeight: '700',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  attachButton: {
    padding: 8,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F2F3F5',
    borderRadius: 24,
    marginHorizontal: 8,
    paddingHorizontal: 16,
    maxHeight: 100,
  },
  input: {
    fontSize: 15,
    color: '#0D1B2A',
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
