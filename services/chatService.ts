import { api } from '../lib/apiClient';
import { getErrorMessage } from '../lib/error-handling';
import { getInitials } from '../lib/communication';
import { getAvatarUrl } from '../lib/avatar';

type ChatRole = 'customer' | 'provider';
type ChatSubscription = () => void;
export type ChatDeliveryStatus = 'sent' | 'delivered' | 'failed';
type ReadState = {
  customerLastReadAt?: string;
  providerLastReadAt?: string;
};

export type ChatSummary = {
  id: string;
  bookingId: string;
  otherPartyId?: string;
  otherPartyName: string;
  otherPartyPhone: string;
  serviceName: string;
  avatar: string;
  initials: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
};

export type ChatMessage = {
  id: string;
  text: string;
  createdAt: string;
  timeLabel: string;
  sender: ChatRole;
  deliveryStatus: ChatDeliveryStatus;
};

export type ChatThread = {
  id: string;
  bookingId: string;
  otherPartyId?: string;
  otherPartyName: string;
  otherPartyPhone: string;
  serviceName: string;
  avatar: string;
  initials: string;
  online: boolean;
  messages: ChatMessage[];
};

const memoryMessages = new Map<string, ChatMessage[]>();
const memoryReadState = new Map<string, ReadState>();

const buildAvatar = (seed: string) => `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
const buildConversationId = (bookingId: string) => `booking:${bookingId}`;
const resolveChatAvatar = (otherPartyId?: string | null, seed?: string) => {
  const normalizedOtherPartyId = String(otherPartyId || '').trim();
  if (normalizedOtherPartyId) {
    return getAvatarUrl(normalizedOtherPartyId);
  }

  return buildAvatar(String(seed || 'contact'));
};

const formatTimeLabel = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Now';
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatSummaryTime = (value?: string) => {
  if (!value) return 'Now';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Now';
  return parsed.toLocaleDateString() === new Date().toLocaleDateString()
    ? parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const normalizeDeliveryStatus = (value: unknown): ChatDeliveryStatus => {
  const status = String(value || '').toLowerCase();
  if (status === 'sent' || status === 'failed') return status;
  return 'delivered';
};

const getReadState = (bookingId: string): ReadState => memoryReadState.get(bookingId) || {};

const setReadState = (bookingId: string, role: ChatRole, timestamp: string) => {
  const current = getReadState(bookingId);
  memoryReadState.set(bookingId, {
    ...current,
    ...(role === 'customer'
      ? { customerLastReadAt: timestamp }
      : { providerLastReadAt: timestamp }),
  });
};

const getMemoryMessages = (bookingId: string) => memoryMessages.get(bookingId) || [];
const setMemoryMessages = (bookingId: string, messages: ChatMessage[]) => {
  memoryMessages.set(bookingId, messages);
};
const replaceMemoryMessage = (bookingId: string, messageId: string, nextMessage: ChatMessage) => {
  setMemoryMessages(
    bookingId,
    getMemoryMessages(bookingId).map((message) =>
      message.id === messageId ? nextMessage : message
    )
  );
};

export const getCustomerChatSummaries = async (_customerId: string): Promise<ChatSummary[]> => {
  try {
    const data = await api.get<any[]>('/chat/conversations?role=customer');
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row: any) => ({
      id: String(row.id || buildConversationId(row.bookingId || '')),
      bookingId: String(row.bookingId || ''),
      otherPartyId: String(row.otherPartyId || ''),
      otherPartyName: String(row.otherPartyName || 'Service Provider'),
      otherPartyPhone: String(row.otherPartyPhone || ''),
      serviceName: String(row.serviceName || 'Service Booking'),
      avatar: resolveChatAvatar(
        String(row.otherPartyId || ''),
        `${row.bookingId}-${row.otherPartyName || 'contact'}`
      ),
      initials: getInitials(row.otherPartyName || 'SP'),
      lastMessage: String(row.lastMessage || 'Open chat to continue the conversation.'),
      lastMessageTime: formatSummaryTime(row.lastMessageTime),
      unreadCount: Number(row.unreadCount || 0),
      online: true,
    }));
  } catch {
    return [];
  }
};

export const getProviderChatSummaries = async (_providerId: string): Promise<ChatSummary[]> => {
  try {
    const data = await api.get<any[]>('/chat/conversations?role=provider');
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row: any) => ({
      id: String(row.id || buildConversationId(row.bookingId || '')),
      bookingId: String(row.bookingId || ''),
      otherPartyId: String(row.otherPartyId || ''),
      otherPartyName: String(row.otherPartyName || 'Customer'),
      otherPartyPhone: String(row.otherPartyPhone || ''),
      serviceName: String(row.serviceName || 'Service Booking'),
      avatar: resolveChatAvatar(
        String(row.otherPartyId || ''),
        `${row.bookingId}-${row.otherPartyName || 'contact'}`
      ),
      initials: getInitials(row.otherPartyName || 'CU'),
      lastMessage: String(row.lastMessage || 'Open chat to continue the conversation.'),
      lastMessageTime: formatSummaryTime(row.lastMessageTime),
      unreadCount: Number(row.unreadCount || 0),
      online: true,
    }));
  } catch {
    return [];
  }
};

export const getChatThread = async (input: {
  bookingId: string;
  role: ChatRole;
  otherPartyName?: string;
  otherPartyPhone?: string;
  serviceName?: string;
}): Promise<ChatThread> => {
  const bookingId = String(input.bookingId || '').trim();
  if (!bookingId) {
    throw new Error('Booking id is required for chat.');
  }

  const otherPartyName = input.otherPartyName || 'Service Contact';
  const serviceName = input.serviceName || 'Service Booking';

  try {
    const data = await api.get<any>('/chat/conversations/' + bookingId + '/messages');

    const apiMessages: ChatMessage[] = (data?.messages || []).map((m: any, index: number) => {
      const createdAt = String(m.createdAt || new Date().toISOString());
      return {
        id: String(m.id || `${createdAt}-${index}`),
        text: String(m.text || ''),
        createdAt,
        timeLabel: formatTimeLabel(createdAt),
        sender: String(m.sender || '') === 'provider' ? ('provider' as const) : ('customer' as const),
        deliveryStatus: normalizeDeliveryStatus(m.deliveryStatus),
      };
    });

    return {
      id: data?.id || buildConversationId(bookingId),
      bookingId,
      otherPartyId: String(data?.otherPartyId || ''),
      otherPartyName: data?.otherPartyName || otherPartyName,
      otherPartyPhone: data?.otherPartyPhone || input.otherPartyPhone || '',
      serviceName: data?.serviceName || serviceName,
      avatar: resolveChatAvatar(
        String(data?.otherPartyId || ''),
        `${bookingId}-${data?.otherPartyName || otherPartyName}`
      ),
      initials: getInitials(data?.otherPartyName || otherPartyName),
      online: true,
      messages: apiMessages,
    };
  } catch {
    const fallbackMessages = getMemoryMessages(bookingId);
    return {
      id: buildConversationId(bookingId),
      bookingId,
      otherPartyId: '',
      otherPartyName,
      otherPartyPhone: input.otherPartyPhone || '',
      serviceName,
      avatar: buildAvatar(`${bookingId}-${otherPartyName}`),
      initials: getInitials(otherPartyName),
      online: true,
      messages: fallbackMessages,
    };
  }
};

export const sendChatMessage = async (input: {
  bookingId: string;
  senderId: string;
  senderRole: ChatRole;
  text: string;
}): Promise<ChatMessage> => {
  const bookingId = String(input.bookingId || '').trim();
  const text = String(input.text || '').trim();

  if (!bookingId) throw new Error('Booking id is required.');
  if (!text) throw new Error('Message text cannot be empty.');

  const createdAt = new Date().toISOString();
  const nextMessage: ChatMessage = {
    id: `local-${createdAt}`,
    text,
    createdAt,
    timeLabel: formatTimeLabel(createdAt),
    sender: input.senderRole,
    deliveryStatus: 'sent',
  };

  const existing = getMemoryMessages(bookingId);
  setMemoryMessages(bookingId, [...existing, nextMessage]);
  setReadState(bookingId, input.senderRole, createdAt);

  try {
    const data = await api.post<any>('/chat/conversations/' + bookingId + '/messages', { text });

    const finalMessage: ChatMessage = {
      id: data?.id ? String(data.id) : nextMessage.id,
      text,
      createdAt: data?.created_at || createdAt,
      timeLabel: formatTimeLabel(data?.created_at || createdAt),
      sender: input.senderRole,
      deliveryStatus: 'delivered',
    };

    replaceMemoryMessage(bookingId, nextMessage.id, finalMessage);
    return finalMessage;
  } catch (error) {
    const failedMessage: ChatMessage = {
      ...nextMessage,
      deliveryStatus: 'failed',
    };
    replaceMemoryMessage(bookingId, nextMessage.id, failedMessage);
    console.warn(getErrorMessage(error, 'Failed to send message.'));
    return failedMessage;
  }
};

export const retryChatMessage = async (input: {
  bookingId: string;
  senderId: string;
  senderRole: ChatRole;
  messageId: string;
}): Promise<ChatMessage> => {
  const bookingId = String(input.bookingId || '').trim();
  const messageId = String(input.messageId || '').trim();

  if (!bookingId) throw new Error('Booking id is required.');
  if (!messageId) throw new Error('Message id is required.');

  const existingMessage = getMemoryMessages(bookingId).find((message) => message.id === messageId);
  if (!existingMessage) throw new Error('Message could not be found.');
  if (existingMessage.sender !== input.senderRole) {
    throw new Error('Only your own messages can be retried.');
  }

  const pendingMessage: ChatMessage = {
    ...existingMessage,
    deliveryStatus: 'sent',
  };
  replaceMemoryMessage(bookingId, messageId, pendingMessage);

  try {
    const data = await api.post<any>('/chat/conversations/' + bookingId + '/messages', {
      text: existingMessage.text,
    });

    const finalMessage: ChatMessage = {
      ...existingMessage,
      id: data?.id ? String(data.id) : existingMessage.id,
      deliveryStatus: 'delivered',
    };
    replaceMemoryMessage(bookingId, messageId, finalMessage);
    return finalMessage;
  } catch (error) {
    const failedMessage: ChatMessage = {
      ...existingMessage,
      deliveryStatus: 'failed',
    };
    replaceMemoryMessage(bookingId, messageId, failedMessage);
    console.warn(getErrorMessage(error, 'Failed to retry message. Keeping local copy.'));
    return failedMessage;
  }
};

export const markChatThreadRead = async (input: {
  bookingId: string;
  role: ChatRole;
}) => {
  const bookingId = String(input.bookingId || '').trim();
  if (!bookingId) return;

  const readAt = new Date().toISOString();
  setReadState(bookingId, input.role, readAt);

  try {
    await api.patch('/chat/conversations/' + bookingId + '/read', {});
  } catch (error) {
    console.warn(getErrorMessage(error, 'Unable to update chat read status.'));
  }
};

export const subscribeToChatThread = (input: {
  bookingId: string;
  onChange: () => void;
}): ChatSubscription => {
  const bookingId = String(input.bookingId || '').trim();
  if (!bookingId) return () => {};

  const interval = setInterval(input.onChange, 5000);
  return () => clearInterval(interval);
};

export const subscribeToChatSummaries = (input: {
  role: ChatRole;
  userId: string;
  onChange: () => void;
}): ChatSubscription => {
  const userId = String(input.userId || '').trim();
  if (!userId) return () => {};

  const interval = setInterval(input.onChange, 10000);
  return () => clearInterval(interval);
};
