import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  StatusBar, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

// --- Backend Hooks & Services ---
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getChatThread,
  markChatThreadRead,
  sendChatMessage,
  subscribeToChatThread,
  type ChatMessage,
} from '@/services/chatService';

// --- UI Components ---
const MessageBubble = ({ text, time, sender }: { text: string, time: string, sender: string }) => (
  <View style={[
    styles.messageContainer, 
    sender === 'provider' ? styles.providerContainer : styles.customerContainer
  ]}>
    <View style={[
      styles.bubble, 
      sender === 'provider' ? styles.providerBubble : styles.customerBubble
    ]}>
      <Text style={[
        styles.messageText, 
        sender === 'provider' ? styles.providerText : styles.customerText
      ]}>{text}</Text>
      <Text style={[
        styles.timestamp, 
        sender === 'provider' ? styles.providerTimestamp : styles.customerTimestamp
      ]}>{time}</Text>
    </View>
  </View>
);

// --- Main Screen ---
export default function ProviderMessagingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Dynamically grab the booking details passed from the previous screen
  const { id, customerName, serviceTitle } = useLocalSearchParams<{
    id?: string;
    customerName?: string;
    serviceTitle?: string;
  }>();

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const lastMarkedIncomingId = useRef('');

  // --- 1. Load the Chat History ---
  const loadMessages = React.useCallback(async (silent = false) => {
    if (!id) {
      setError('Booking ID is missing.');
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    
    try {
      const thread = await getChatThread({
        bookingId: String(id),
        role: 'provider',
        otherPartyName: String(customerName || 'Customer'),
        otherPartyPhone: '',
        serviceName: String(serviceTitle || 'Service Booking'),
      });
      setMessages(thread.messages);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load messages.'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [id, customerName, serviceTitle]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  // --- 2. Live WebSockets (Listen for new messages) ---
  useEffect(() => {
    if (!id) return;
    return subscribeToChatThread({
      bookingId: String(id),
      onChange: () => {
        void loadMessages(true); // Silently reload when a new message arrives
      },
    });
  }, [id, loadMessages]);

  // --- 3. Mark messages as read automatically ---
  useEffect(() => {
    if (!id || !messages.length) return;
    const lastIncomingMessage = [...messages].reverse().find((m) => m.sender === 'customer');
    if (!lastIncomingMessage || lastMarkedIncomingId.current === lastIncomingMessage.id) return;
    
    lastMarkedIncomingId.current = lastIncomingMessage.id;
    void markChatThreadRead({ bookingId: String(id), role: 'provider' });
  }, [id, messages]);

  // --- 4. Send a New Message ---
  const handleSend = async () => {
    if (!user?.id || !id || !inputText.trim()) return;

    setIsSending(true);
    try {
      const nextMessage = await sendChatMessage({
        bookingId: String(id),
        senderId: user.id,
        senderRole: 'provider',
        text: inputText.trim(),
      });
      
      setMessages((prev) => [...prev, nextMessage]);
      setInputText(''); // Clear the input box
      
      // Scroll to bottom immediately after sending
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send message.'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Dynamic Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{customerName || 'Customer Chat'}</Text>
          <Text style={styles.headerSubtitle}>{serviceTitle || `Booking #${id?.slice(0, 6)}`}</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatArea} 
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {isLoading ? <ActivityIndicator size="small" color="#00B761" style={{ marginTop: 20 }} /> : null}
          {error ? <Text style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>{error}</Text> : null}
          
          {!isLoading && messages.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#AAA', marginTop: 40 }}>
              No messages yet. Send a message to start the conversation!
            </Text>
          ) : null}

          {/* Dynamic Message Mapping */}
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id} 
              text={msg.text} 
              time={msg.timeLabel || ''} 
              sender={msg.sender} 
            />
          ))}
        </ScrollView>

        {/* Live Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#AAA"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
          </View>
          <TouchableOpacity 
            style={[styles.sendButton, { opacity: !inputText.trim() || isSending ? 0.5 : 1 }]} 
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="paper-plane" size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- EXACT STYLES - ZERO CHANGES ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  chatContent: {
    padding: 20,
    paddingBottom: 30,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  customerContainer: {
    alignSelf: 'flex-start',
  },
  providerContainer: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  customerBubble: {
    backgroundColor: '#F2F3F5',
    borderTopLeftRadius: 4,
  },
  providerBubble: {
    backgroundColor: '#00B761',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  customerText: {
    color: '#0D1B2A',
  },
  providerText: {
    color: '#FFF',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: '500',
  },
  customerTimestamp: {
    color: '#AAA',
  },
  providerTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F2F3F5',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    color: '#0D1B2A',
    paddingTop: Platform.OS === 'ios' ? 4 : 0,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#99E6C3', // Lighter green for send button as in mockup
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00B761',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});