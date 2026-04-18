import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type NotificationBadgeProps = {
  count: number;
  top?: number;
  right?: number;
  borderColor?: string;
};

export function NotificationBadge({
  count,
  top = -4,
  right = -4,
  borderColor = '#FFF',
}: NotificationBadgeProps) {
  if (!count || count < 1) return null;

  return (
    <View style={[styles.badge, { top, right, borderColor }]}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5252',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
  },
  text: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
