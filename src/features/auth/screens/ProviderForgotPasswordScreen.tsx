import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { getPasswordResetRedirectUrl } from '@/lib/auth-reset';
import { getErrorMessage } from '@/lib/error-handling';
import { TOKENS } from '@/constants/tokens';
import { AppButton } from '@/src/components/common/AppButton';
import { AppTextInput } from '@/src/components/common/AppTextInput';
import { AppPressable } from '@/src/components/common/AppPressable';
import { requestPasswordReset } from '@/services/authService';

export function ProviderForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendResetLink = async () => {
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email, getPasswordResetRedirectUrl());
      setIsSuccess(true);
    } catch (error) {
      Alert.alert('Reset Failed', getErrorMessage(error, 'Could not send reset email.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <AppPressable 
            onPress={() => setIsSuccess(false)} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={TOKENS.colors.text.primary} />
          </AppPressable>
          <Text style={styles.headerTitle}>Check Email</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark" size={60} color={TOKENS.colors.white} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a password reset link to your email.
            </Text>

            <AppButton
              label="Back to Login"
              onPress={() => router.replace('/provider-login' as any)}
              size="lg"
              style={styles.primaryButton}
            />

            <AppPressable style={styles.textButton} onPress={() => void handleSendResetLink()}>
              <Text style={styles.textButtonLabel}>Resend email</Text>
            </AppPressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <AppPressable 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={TOKENS.colors.text.primary} />
        </AppPressable>
        <Text style={styles.headerTitle}>Forgot Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your email to receive a reset link.</Text>

          <View style={styles.form}>
            <AppTextInput
              label="Email Address"
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
            />

            <AppButton
              label={isSubmitting ? 'Sending...' : 'Send Reset Link'}
              onPress={() => void handleSendResetLink()}
              isLoading={isSubmitting}
              disabled={!email || isSubmitting}
              size="lg"
              style={styles.primaryButton}
            />

            <AppPressable 
              style={styles.textButton}
              onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}
            >
              <Text style={styles.textButtonLabel}>Back to Login</Text>
            </AppPressable>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 40,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: TOKENS.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    ...TOKENS.shadows.glow,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    marginBottom: 8,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: TOKENS.colors.text.secondary,
    marginBottom: 40,
    textAlign: 'left',
  },
  form: {
    width: '100%',
  },
  primaryButton: {
    marginBottom: 20,
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  textButtonLabel: {
    color: TOKENS.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
