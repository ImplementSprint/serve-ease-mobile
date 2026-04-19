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
import { loginCustomer } from '@/lib/customer-session';
import { getErrorMessage } from '@/lib/error-handling';
import { TOKENS } from '@/constants/tokens';
import { AppButton } from '@/src/components/common/AppButton';
import { AppTextInput } from '@/src/components/common/AppTextInput';
import { AppPressable } from '@/src/components/common/AppPressable';

export function CustomerLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isLoginReady = email.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    if (!isLoginReady) return;
    setIsSubmitting(true);
    try {
      await loginCustomer(email, password);
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      Alert.alert('Login Failed', getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Text style={styles.headerTitle}>Login</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>Login to continue to ServEase</Text>

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

            <AppTextInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon="lock-closed-outline"
            />

            <AppPressable 
              style={styles.forgotPassword}
              onPress={() => router.push('/customer-forgot-password' as any)}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </AppPressable>

            <AppButton
              label="Login"
              onPress={handleLogin}
              isLoading={isSubmitting}
              disabled={!isLoginReady || isSubmitting}
              size="lg"
              style={styles.loginButton}
            />
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtons}>
            <AppButton
              label="Continue with Google"
              variant="outline"
              onPress={() => {}}
              leftIcon="logo-google"
              style={styles.socialButton}
            />
            <AppButton
              label="Continue with Phone"
              variant="outline"
              onPress={() => {}}
              leftIcon="call-outline"
              style={styles.socialButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don&apos;t have an account?{' '}
              <Text style={styles.signUpLink} onPress={() => router.push('/signup')}>
                Sign Up
              </Text>
            </Text>
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
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: TOKENS.colors.text.secondary,
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
    padding: 4,
  },
  forgotPasswordText: {
    color: TOKENS.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  loginButton: {
    width: '100%',
    marginBottom: 30,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: TOKENS.colors.border,
  },
  dividerText: {
    paddingHorizontal: 15,
    color: TOKENS.colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  socialButtons: {
    gap: 12,
    marginBottom: 40,
  },
  socialButton: {
    borderColor: TOKENS.colors.border,
    backgroundColor: TOKENS.colors.white,
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
  signUpLink: {
    color: TOKENS.colors.primary,
    fontWeight: '700',
  },
});
