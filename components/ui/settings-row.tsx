import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBadge } from './notification-badge';

type SettingsRowProps = {
  icon: any;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  isDestructive?: boolean;
  badgeCount?: number;
  variant?: 'menu' | 'setting';
  mode?: 'nav' | 'toggle';
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  backgroundColor?: string;
  borderBottomColor?: string;
  iconBackgroundColor?: string;
  destructiveIconBackgroundColor?: string;
  iconColor?: string;
  destructiveColor?: string;
  badgeBorderColor?: string;
  iconSize?: number;
};

export function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  isDestructive = false,
  badgeCount = 0,
  variant = 'menu',
  mode = 'nav',
  value = false,
  onValueChange,
  backgroundColor = '#FFF',
  borderBottomColor = '#F8F9FA',
  iconBackgroundColor = '#E8FBF2',
  destructiveIconBackgroundColor = '#FFEAEA',
  iconColor = '#00C853',
  destructiveColor = '#FF5252',
  badgeBorderColor = '#FFF',
  iconSize = 22,
}: SettingsRowProps) {
  const isToggle = mode === 'toggle';
  const isMenuVariant = variant === 'menu';

  return (
    <TouchableOpacity
      style={[
        styles.row,
        isMenuVariant ? styles.menuRow : styles.settingRow,
        { backgroundColor, borderBottomColor },
      ]}
      onPress={onPress}
      disabled={isToggle}
      activeOpacity={0.7}
    >
      <View
        style={[
          isMenuVariant ? styles.menuIconContainer : styles.settingIconContainer,
          {
            backgroundColor: isDestructive
              ? destructiveIconBackgroundColor
              : iconBackgroundColor,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={iconSize}
          color={isDestructive ? destructiveColor : iconColor}
        />
      </View>

      <View style={styles.labelContainer}>
        <Text style={[styles.label, isDestructive && { color: destructiveColor }]}>
          {label}
        </Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>

      {isToggle ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#E0E0E0', true: '#00B761' }}
          thumbColor="#FFF"
          ios_backgroundColor="#E0E0E0"
        />
      ) : !isDestructive ? (
        <View style={styles.trailing}>
          <View style={styles.badgeAnchor}>
            <NotificationBadge
              count={badgeCount}
              top={0}
              right={0}
              borderColor={badgeBorderColor}
            />
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CCC" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  sublabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 44,
    justifyContent: 'flex-end',
  },
  badgeAnchor: {
    width: 20,
    height: 18,
    position: 'relative',
  },
});
