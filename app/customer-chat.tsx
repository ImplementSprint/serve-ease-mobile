import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { openPhoneCall } from '@/lib/communication';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getCustomerBookingPresentation,
  type CustomerBookingPresentation,
} from '@/lib/booking-status';
import { getBookingById } from '@/services/bookingService';
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
  CustomerBookingPresentation['tone'],
  { container: object; text: object }
> = {
  warning: {
    container: { backgroundColor: '#FEF3C7' },
    text: { color: '#B45309' },
  },
  success: {
    container: { backgroundColor: '#DCFCE7' },
    text: { color: '#15803D' },
  },
  completed: {
    container: { backgroundColor: '#DBEAFE' },
    text: { color: '#1D4ED8' },
  },
  cancelled: {
    container: { backgroundColor: '#FEE2E2' },
    text: { color: '#B91C1C' },
  },
};

const ChatScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { id, providerName, serviceName, phone } = useLocalSearchParams<{
    id?: string;
    providerName?: string;
    serviceName?: string;
    phone?: string;
  }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const lastMarkedIncomingId = useRef('');
  const [inputText, setInputText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bookingPresentation, setBookingPresentation] = useState<CustomerBookingPresentation | null>(
    null
  );
  const [bookingRecord, setBookingRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

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
          role: 'customer',
          otherPartyName: String(providerName || 'Service Provider'),
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
    [id, phone, providerName, serviceName]
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

    const loadBookingStatus = async () => {
      try {
        const booking = await getBookingById(String(id));
        if (!active) return;
        setBookingRecord(booking);
        setBookingPresentation(getCustomerBookingPresentation(booking?.status));
      } catch {
        if (!active) return;
        setBookingRecord(null);
        setBookingPresentation(getCustomerBookingPresentation(undefined));
      }
    };

    void loadBookingStatus();

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
      .find((message) => message.sender === 'provider');

    if (!lastIncomingMessage || lastMarkedIncomingId.current === lastIncomingMessage.id) {
      return;
    }

    lastMarkedIncomingId.current = lastIncomingMessage.id;
    void markChatThreadRead({
      bookingId: String(id),
      role: 'customer',
    });
  }, [id, messages]);

  const handleSend = async () => {
    if (!user?.id || !id || inputText.trim().length === 0) return;

    setIsSending(true);
    try {
      const nextMessage = await sendChatMessage({
        bookingId: String(id),
        senderId: user.id,
        senderRole: 'customer',
        text: inputText,
      });

      setMessages((prev) => [...prev, nextMessage]);
      setInputText('');
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
        senderRole: 'customer',
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

  const isSendReady = inputText.trim().length > 0 && !isSending;
  const conversation = thread || {
    otherPartyName: String(providerName || 'Service Provider'),
    serviceName: String(serviceName || 'Service Booking'),
    avatar: 'https://i.pravatar.cc/150?u=fallback-provider',
    online: true,
    otherPartyPhone: String(phone || ''),
  };
  const bookingStatus = bookingPresentation || getCustomerBookingPresentation(undefined);
  const bookingTone = statusToneStyles[bookingStatus.tone];
  const canTrackBooking = bookingStatus.canTrack && Boolean(id);
  const canLeaveReview = bookingStatus.normalizedStatus === 'completed' && Boolean(id);
  const headerStatusText =
    bookingStatus.normalizedStatus === 'in_progress'
      ? 'Service active'
      : bookingStatus.normalizedStatus === 'confirmed'
        ? 'Booking confirmed'
        : bookingStatus.normalizedStatus === 'completed'
          ? 'Service completed'
          : bookingStatus.normalizedStatus === 'cancelled'
            ? 'Booking cancelled'
            : 'Awaiting provider';

  const handleViewProfile = () => {
    setMenuVisible(false);
    const resolvedProviderId = String(bookingRecord?.provider_id || '').trim();
    if (!resolvedProviderId) return;

    router.push({
      pathname: '/provider-profile',
      params: {
        providerId: resolvedProviderId,
        providerName: conversation.otherPartyName,
        serviceName: conversation.serviceName,
      },
    });
  };

  const handleReportProfile = () => {
    setMenuVisible(false);
    router.push({
      pathname: '/customer-report-profile',
      params: {
        providerName: conversation.otherPartyName,
        providerId: String(bookingRecord?.provider_id || ''),
        bookingId: String(id || ''),
      },
    });
  };

  const handleViewBooking = () => {
    if (!id) return;

    router.push({
      pathname: '/customer-booking-details',
      params: { id: String(id) },
    } as any);
  };

  const handleBookingShortcut = () => {
    if (!id) return;

    if (canLeaveReview) {
      const reviewPayload = {
        id: bookingRecord?.booking_reference || bookingRecord?.id || String(id),
        rawId: bookingRecord?.id || String(id),
        providerId: bookingRecord?.provider_id || '',
        service: conversation.serviceName,
        status: bookingRecord?.status || bookingStatus.label,
        provider: {
          id: bookingRecord?.provider_id || '',
          name: conversation.otherPartyName,
          phone: conversation.otherPartyPhone,
          specialty: conversation.serviceName,
          avatar: conversation.avatar,
        },
      };

      router.push({
        pathname: '/customer-review',
        params: { booking: JSON.stringify(reviewPayload) },
      } as any);
      return;
    }

    if (canTrackBooking) {
      router.push({
        pathname: '/customer-track-order',
        params: {
          id: String(id),
          booking: JSON.stringify({
            id: bookingRecord?.booking_reference || bookingRecord?.id || String(id),
            rawId: bookingRecord?.id || String(id),
            service: conversation.serviceName,
            status: bookingRecord?.status || bookingStatus.label,
            address: bookingRecord?.service_address || '',
            provider: {
              name: conversation.otherPartyName,
              phone: conversation.otherPartyPhone,
              specialty: conversation.serviceName,
              avatar: conversation.avatar,
            },
          }),
        },
      } as any);
    }
  };

  const bookingShortcutLabel = canLeaveReview
    ? 'Leave review'
    : canTrackBooking
      ? 'Track booking'
      : '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1B1E" />
        </TouchableOpacity>

        <View style={styles.providerInfo}>
          <View>
            <Image source={{ uri: conversation.avatar }} style={styles.avatar} />
            {conversation.online && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{conversation.otherPartyName}</Text>
            <View style={styles.headerMetaRow}>
              <Text style={styles.category} numberOfLines={1}>
                {conversation.serviceName}
              </Text>
              <View style={[styles.headerStatusPill, bookingTone.container]}>
                <Text style={[styles.headerStatusPillText, bookingTone.text]}>{headerStatusText}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => openPhoneCall(conversation.otherPartyPhone, conversation.otherPartyName)}
          >
            <Ionicons name="call-outline" size={24} color="#00C853" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={22} color="#1A1B1E" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.bookingStrip}>
          <View style={styles.bookingStripText}>
            <Text style={styles.bookingStripLabel}>Linked Booking</Text>
            <Text style={styles.bookingStripTitle} numberOfLines={1}>
              {conversation.serviceName}
            </Text>
            <View style={[styles.bookingStatusPill, bookingTone.container]}>
              <Text style={[styles.bookingStatusText, bookingTone.text]}>
                {bookingStatus.label}
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
          style={styles.chatArea}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#00C853" style={{ marginTop: 30 }} />
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {!isLoading && !error && messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={26} color="#00C853" />
              <Text style={styles.emptyStateTitle}>No messages yet</Text>
              <Text style={styles.emptyStateText}>
                Start the conversation with {conversation.otherPartyName} about this booking.
              </Text>
            </View>
          ) : null}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageContainer,
                msg.sender === 'customer' ? styles.customerMessageContainer : styles.providerMessageContainer,
              ]}
            >
              <TouchableOpacity
                activeOpacity={msg.sender === 'customer' && msg.deliveryStatus === 'failed' ? 0.75 : 1}
                disabled={!(msg.sender === 'customer' && msg.deliveryStatus === 'failed')}
                onPress={() => handleRetry(msg)}
                style={[
                  styles.messageBubble,
                  msg.sender === 'customer' ? styles.customerBubble : styles.providerBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.sender === 'customer' ? styles.customerText : styles.providerText,
                  ]}
                >
                  {msg.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    msg.sender === 'customer' ? styles.customerTime : styles.providerTime,
                  ]}
                >
                  {msg.timeLabel}
                </Text>
                {msg.sender === 'customer' ? (
                  <>
                    <Text
                      style={[
                        styles.messageStatus,
                        msg.deliveryStatus === 'failed' ? styles.failedStatus : styles.customerStatus,
                      ]}
                    >
                      {formatDeliveryStatus(msg.deliveryStatus)}
                    </Text>
                    {msg.deliveryStatus === 'failed' ? (
                      <Text style={styles.retryHint}>Tap to retry</Text>
                    ) : null}
                  </>
                ) : null}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputArea}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, !isSendReady && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!isSendReady}
          >
            <Ionicons name="paper-plane" size={20} color={isSendReady ? '#FFF' : '#BABABA'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity style={styles.menuItem} onPress={handleViewProfile}>
              <Ionicons name="person-outline" size={18} color="#0D1B2A" />
              <Text style={styles.menuItemText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleReportProfile}>
              <Ionicons name="flag-outline" size={18} color="#FF5252" />
              <Text style={[styles.menuItemText, styles.reportText]}>Report Profile</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00C853',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1B1E',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  category: {
    fontSize: 12,
    color: '#999',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconButton: {
    padding: 5,
  },
  keyboardView: {
    flex: 1,
  },
  bookingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    backgroundColor: '#00C853',
  },
  bookingStripButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B761',
  },
  bookingStripPrimaryButtonText: {
    color: '#FFF',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  messageList: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 15,
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
  messageContainer: {
    maxWidth: '80%',
  },
  providerMessageContainer: {
    alignSelf: 'flex-start',
  },
  customerMessageContainer: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  providerBubble: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 4,
  },
  customerBubble: {
    backgroundColor: '#00C853',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  providerText: {
    color: '#1A1B1E',
  },
  customerText: {
    color: '#FFF',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  providerTime: {
    color: '#BBB',
  },
  customerTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageStatus: {
    fontSize: 10,
    marginTop: 2,
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  customerStatus: {
    color: 'rgba(255, 255, 255, 0.78)',
  },
  failedStatus: {
    color: '#FECACA',
  },
  retryHint: {
    fontSize: 10,
    marginTop: 2,
    alignSelf: 'flex-end',
    color: '#FEE2E2',
    fontWeight: '700',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  input: {
    fontSize: 15,
    color: '#333',
    maxHeight: 80,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F8F9FA',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 84,
    paddingRight: 18,
  },
  menuSheet: {
    width: 180,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    marginLeft: 10,
  },
  reportText: {
    color: '#FF5252',
  },
});
