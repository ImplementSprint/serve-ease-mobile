import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { TOKENS } from '@/constants/tokens';
import { AppPressable } from '@/src/components/common/AppPressable';

export function SignUpSelectionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <AppPressable 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={TOKENS.colors.text.primary} />
        </AppPressable>
        <Text style={styles.headerTitle}>Sign Up</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Choose how you want to continue</Text>

        <View style={styles.selectionContainer}>
          <AppPressable 
            style={styles.selectionCard}
            onPress={() => router.push('/customer-signup' as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: TOKENS.colors.success.bg }]}>
              <Ionicons name="person-outline" size={28} color={TOKENS.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Customer</Text>
              <Text style={styles.cardDescription}>Find and book services</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TOKENS.colors.text.muted} />
          </AppPressable>

          <AppPressable 
            style={styles.selectionCard}
            onPress={() => router.push('/provider-signup' as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: TOKENS.colors.success.bg }]}>
              <Ionicons name="briefcase-outline" size={28} color={TOKENS.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Service Provider</Text>
              <Text style={styles.cardDescription}>Offer services and manage bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TOKENS.colors.text.muted} />
          </AppPressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.loginLink} onPress={() => router.replace('/')}>
              Log In
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TOKENS.colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: TOKENS.colors.text.secondary,
    marginBottom: 40,
  },
  selectionContainer: {
    gap: 20,
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.border,
    ...TOKENS.shadows.soft,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: TOKENS.colors.text.secondary,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: TOKENS.colors.text.secondary,
  },
  loginLink: {
    color: TOKENS.colors.primary,
    fontWeight: '700',
  },
});
