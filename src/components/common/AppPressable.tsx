import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface AppPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  activeOpacity?: number;
  useHaptics?: boolean;
  disableOpacity?: boolean;
}

/**
 * A standardized Pressable component for ServEase.
 * Follows React Native best practices by using Pressable instead of TouchableOpacity.
 * Provides consistent interaction feedback and optional haptic support.
 */
export const AppPressable = ({
  children,
  style,
  activeOpacity = 0.7,
  useHaptics = false,
  disableOpacity = false,
  onPress,
  ...props
}: AppPressableProps) => {
  const handlePress = (event: any) => {
    if (useHaptics && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={(state) => {
        const baseStyle = typeof style === 'function' ? style(state) : style;
        return [
          baseStyle,
          state.pressed && !disableOpacity && { opacity: activeOpacity },
        ];
      }}
      {...props}
    >
      {children}
    </Pressable>
  );
};
