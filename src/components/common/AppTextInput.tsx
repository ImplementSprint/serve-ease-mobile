import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Pressable,
  Animated,
} from 'react-native';
import { TOKENS } from '@/constants/tokens';
import { Ionicons } from '@expo/vector-icons';
import { AppPressable } from '@/src/components/common/AppPressable';

interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  isPassword?: boolean;
}

/**
 * A standardized TextInput component with label, icons, and error handling.
 * Supports forwardRef for easy focusing from parents.
 */
export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  isPassword,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const internalRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Expose the internal ref to the parent
  useImperativeHandle(ref, () => internalRef.current!);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const focusInput = () => {
    internalRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {label && (
        <AppPressable onPress={focusInput} disableOpacity>
          <Text style={styles.label}>{label}</Text>
        </AppPressable>
      )}
      
      <Pressable
        onPress={focusInput}
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          error && styles.errorWrapper,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? TOKENS.colors.primary : TOKENS.colors.text.muted}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          ref={internalRef}
          style={[styles.input, style]}
          placeholderTextColor={TOKENS.colors.text.muted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword ? !showPassword : secureTextEntry}
          {...props}
        />
        
        {isPassword ? (
          <AppPressable onPress={togglePassword} style={styles.rightIcon} hitSlop={10}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={TOKENS.colors.text.muted}
            />
          </AppPressable>
        ) : rightIcon ? (
          <AppPressable onPress={onRightIconPress} style={styles.rightIcon} hitSlop={10}>
            <Ionicons
              name={rightIcon}
              size={20}
              color={TOKENS.colors.text.muted}
            />
          </AppPressable>
        ) : null}
      </Pressable>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

AppTextInput.displayName = 'AppTextInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: TOKENS.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
    marginBottom: TOKENS.spacing.sm,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.borderRadius.md,
    paddingHorizontal: TOKENS.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    height: 56,
  },
  focusedWrapper: {
    borderColor: TOKENS.colors.primary,
    backgroundColor: TOKENS.colors.white,
    ...TOKENS.shadows.soft,
  },
  errorWrapper: {
    borderColor: TOKENS.colors.danger.text,
    backgroundColor: TOKENS.colors.danger.bg,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TOKENS.colors.text.primary,
    fontWeight: '500',
    height: '100%',
    paddingBottom: 2, // Minor optical adjustment
  },
  leftIcon: {
    marginRight: TOKENS.spacing.sm,
  },
  rightIcon: {
    marginLeft: TOKENS.spacing.sm,
    padding: 4,
  },
  errorText: {
    color: TOKENS.colors.danger.text,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
});
