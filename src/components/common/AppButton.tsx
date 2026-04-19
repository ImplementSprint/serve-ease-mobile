import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { TOKENS } from '@/constants/tokens';
import { AppPressable } from './AppPressable';
import { Ionicons } from '@expo/vector-icons';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  useHaptics?: boolean;
  uppercase?: boolean;
}

/**
 * A standardized Button component using AppPressable and ServEase Design Tokens.
 */
export const AppButton = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  useHaptics = true,
  uppercase = false,
}: AppButtonProps) => {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: TOKENS.colors.primarySoft, borderColor: 'transparent' };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: TOKENS.colors.border };
      case 'ghost':
        return { backgroundColor: 'transparent', borderColor: 'transparent' };
      case 'danger':
        return { backgroundColor: TOKENS.colors.danger.bg, borderColor: 'transparent' };
      case 'primary':
      default:
        return { backgroundColor: TOKENS.colors.primary, borderColor: 'transparent', ...TOKENS.shadows.glow };
    }
  };

  const getLabelColor = (): string => {
    if (disabled) return TOKENS.colors.text.muted;
    switch (variant) {
      case 'secondary':
        return TOKENS.colors.primary;
      case 'outline':
        return TOKENS.colors.text.secondary;
      case 'ghost':
        return TOKENS.colors.text.secondary;
      case 'danger':
        return TOKENS.colors.danger.text;
      case 'primary':
      default:
        return TOKENS.colors.white;
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 16, borderRadius: TOKENS.borderRadius.sm };
      case 'lg':
        return { paddingVertical: 18, paddingHorizontal: 32, borderRadius: TOKENS.borderRadius.xl };
      case 'md':
      default:
        return { paddingVertical: 14, paddingHorizontal: 24, borderRadius: TOKENS.borderRadius.md };
    }
  };

  const getLabelSize = (): number => {
    switch (size) {
      case 'sm': return 13;
      case 'lg': return 18;
      case 'md':
      default: return 15;
    }
  };

  return (
    <AppPressable
      onPress={onPress}
      disabled={disabled || isLoading}
      useHaptics={useHaptics}
      style={[
        styles.base,
        getVariantStyles(),
        getSizeStyles(),
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={getLabelColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={getLabelSize() + 2}
              color={getLabelColor()}
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.label,
              { color: getLabelColor(), fontSize: getLabelSize() },
              textStyle,
            ]}
          >
            {uppercase ? label.toUpperCase() : label}
          </Text>
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={getLabelSize() + 2}
              color={getLabelColor()}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </AppPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    textAlign: 'center',
  },
  disabled: {
    backgroundColor: TOKENS.colors.background,
    borderColor: TOKENS.colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});
