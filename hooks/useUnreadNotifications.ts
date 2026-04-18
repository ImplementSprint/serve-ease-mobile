import React from 'react';
import { useAuth } from './useAuth';
import {
  getUnreadNotificationCount,
  subscribeToNotifications,
} from '@/services/notificationService';

export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const [count, setCount] = React.useState(0);

  const load = React.useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    const nextCount = await getUnreadNotificationCount(user.id);
    setCount(nextCount);
  }, [user?.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!user?.id) return;

    return subscribeToNotifications({
      userId: user.id,
      onChange: () => {
        void load();
      },
    });
  }, [load, user?.id]);

  return count;
};
