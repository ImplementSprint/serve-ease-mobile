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
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { TOKENS } from '@/constants/tokens';
import { AppButton } from '@/src/components/common/AppButton';
import { AppTextInput } from '@/src/components/common/AppTextInput';
import { AppPressable } from '@/src/components/common/AppPressable';
import { getAuthSnapshot } from '@/lib/auth-session';
import { resetPassword } from '@/services/authService';

export function ResetPasswordScreen() {
  const router = useRouter();
  const { isLoading, passwordResetPending } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReady =
    password.trim().length >= 8 &&
    confirmPassword.trim().length >= 8 &&
    password === confirmPassword;

  const onSubmit = async () => {
    if (!isReady) {
      Alert.alert('Invalid Password', 'Please enter matching passwords with at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(password, getAuthSnapshot().passwordResetContext);
      Alert.alert('Password Updated', 'Your password has been reset. Please log in with your new password.', [
        {
          text: 'Go to Login',
          onPress: () => router.replace('/login' as any),
        },
      ]);
    } catch (error) {
      Alert.alert('Reset Failed', getErrorMessage(error, 'Could not update your password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <AppPressable onPress={() => router.replace('/login' as any)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={TOKENS.colors.text.primary} />
        </AppPressable>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.subtitle}>
            {isLoading
              ? 'Checking your recovery session...'
              : passwordResetPending
                ? 'Enter your new password below.'
                : 'Open the reset link from your email on this device to continue.'}
          </Text>

          {!isLoading && !passwordResetPending ? (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={24} color={TOKENS.colors.text.secondary} style={{ marginBottom: 12 }} />
              <Text style={styles.infoText}>
                The password reset link needs to open this app first so we can verify your recovery session.
              </Text>
            </View>
          ) : null}

          {!isLoading && passwordResetPending ? (
            <View style={styles.form}>
              <AppTextInput
                label="New Password"
                placeholder="Enter new password"
                value={password}
                onChangeText={setPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />

              <AppTextInput
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword
                leftIcon="lock-closed-outline"
                error={confirmPassword && password !== confirmPassword ? "Passwords do not match" : ""}
              />

              <AppButton
                label="Update Password"
                onPress={onSubmit}
                isLoading={isSubmitting}
                disabled={!isReady || isSubmitting}
                size="lg"
                style={styles.primaryButton}
              />
            </View>
          ) : null}
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
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: TOKENS.colors.text.secondary,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.borderRadius.md,
    padding: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  infoText: {
    color: TOKENS.colors.text.secondary,
    lineHeight: 22,
    fontSize: 14,
  },
  form: {
    width: '100%',
    marginTop: 10,
  },
  primaryButton: {
    marginTop: 20,
  },
});
