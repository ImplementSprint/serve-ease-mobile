import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

type TabBarIconProps = {
  color: string;
  focused: boolean;
};

export default function ProviderTabsLayout() {
  const unreadMessages = useUnreadMessages('provider');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00B761',
        tabBarInactiveTintColor: '#777',
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }: TabBarIconProps) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: 'Metrics',
          tabBarIcon: ({ color, focused }: TabBarIconProps) => (
            <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, focused }: TabBarIconProps) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }: TabBarIconProps) => (
            <View>
              <Ionicons
                name={focused ? 'chatbubble' : 'chatbubble-outline'}
                size={22}
                color={color}
              />
              <NotificationBadge
                count={unreadMessages}
                top={-5}
                right={-12}
                borderColor="#FFF"
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }: TabBarIconProps) => (
            // Replaced "settings-outline" and "More" with the correct 3-dot icons
            <Ionicons 
              name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"} 
              size={24} 
              color={color} 
            />
          ),  
        }}
      />
      {/* Hide secondary routes from bottom bar but keep them accessible via router if needed */}
      <Tabs.Screen
        name="pricing"
        options={{
          href: null,
          title: 'Pricing',
        }}
      />
      <Tabs.Screen
        name="ratings"
        options={{
          href: null,
          title: 'Ratings',
        }}
      />
    </Tabs>
  );
}