import React from 'react';
import { useAuth } from './useAuth';
import {
  getCustomerChatSummaries,
  getProviderChatSummaries,
  subscribeToChatSummaries,
} from '@/services/chatService';

type ChatBadgeRole = 'customer' | 'provider';

export const useUnreadMessages = (role: ChatBadgeRole) => {
  const { user } = useAuth();
  const [count, setCount] = React.useState(0);

  const load = React.useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    const rows =
      role === 'customer'
        ? await getCustomerChatSummaries(user.id)
        : await getProviderChatSummaries(user.id);

    setCount(rows.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0));
  }, [role, user?.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!user?.id) return;

    return subscribeToChatSummaries({
      role,
      userId: user.id,
      onChange: () => {
        void load();
      },
    });
  }, [load, role, user?.id]);

  return count;
};
