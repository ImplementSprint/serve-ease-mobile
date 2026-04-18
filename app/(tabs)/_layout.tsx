import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

type TabBarIconProps = {
  color: string;
};

export default function TabLayout() {
  const unreadMessages = useUnreadMessages('customer');
  const unreadNotifications = useUnreadNotifications();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00C853',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <Ionicons size={24} name="calendar-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <View>
              <IconSymbol size={24} name="ellipsis" color={color} />
              <NotificationBadge count={unreadNotifications} top={-5} right={-12} borderColor="#FFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <View>
              <IconSymbol size={24} name="bubble.left.fill" color={color} />
              <NotificationBadge count={unreadMessages} top={-5} right={-12} borderColor="#FFF" />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
