import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '../context/AuthContext';

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] ?? 'index';
    const isPublicRoute = new Set([
      'index',
      'login',
      'signup',
      'provider-join',
      'customer-login',
      'provider-login',
      'customer-signup',
      'provider-signup',
      'customer-onboarding-address',
      'reset-password',
      'customer-forgot-password',
      'provider-forgot-password',
      'terms',
      'privacy',
    ]).has(firstSegment);

    const roleRaw =
      user?.user_metadata?.role ??
      user?.app_metadata?.role ??
      user?.user_metadata?.user_type ??
      user?.app_metadata?.user_type ??
      user?.role ??
      '';
    const role = String(roleRaw).toLowerCase();
    const isProvider = role.includes('provider');

    if (!user && !isPublicRoute) {
      router.replace('/login');
      return;
    }

    const allowAuthedPublicRoute =
      firstSegment === 'customer-onboarding-address' || firstSegment === 'reset-password';

    if (user && isPublicRoute && !allowAuthedPublicRoute) {
      router.replace(isProvider ? '/(provider-tabs)' : '/(tabs)');
      return;
    }

    if (user && firstSegment === '(provider-tabs)' && !isProvider) {
      router.replace('/(tabs)');
      return;
    }

    if (user && firstSegment === '(tabs)' && isProvider) {
      router.replace('/(provider-tabs)');
    }
  }, [isLoading, router, segments, user]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(provider-tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
