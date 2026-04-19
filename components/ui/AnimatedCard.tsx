import React, { useEffect } from 'react';
import { StyleSheet, ViewProps, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  withTiming,
} from 'react-native-reanimated';

interface AnimatedCardProps extends TouchableOpacityProps {
  index?: number;
  delay?: number;
}

/**
 * A card component that animates into view.
 * If onPress is provided, it behaves like a button with press-scaling.
 * If no onPress is provided, it acts as a passive container to avoid touch interception.
 */
const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  index = 0, 
  delay = 50, 
  style,
  onPress,
  onPressIn: propsOnPressIn,
  onPressOut: propsOnPressOut,
  ...props 
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(index * delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(index * delay, withSpring(0, { damping: 15, stiffness: 100 }));
  }, [index, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  const onPressIn = (e: any) => {
    scale.value = withSpring(0.98, { damping: 10, stiffness: 200 });
    if (propsOnPressIn) propsOnPressIn(e);
  };

  const onPressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    if (propsOnPressOut) propsOnPressOut(e);
  };

  if (!onPress) {
    return (
      <Animated.View style={[animatedStyle, style]} pointerEvents="box-none">
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[animatedStyle]}>
      <TouchableOpacity 
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={[style]}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default AnimatedCard;
