import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
 TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { registerCustomerAccount } from '@/lib/customer-session';
import { getErrorMessage } from '@/lib/error-handling';
import { TOKENS } from '@/constants/tokens';
import { AppButton } from '@/src/components/common/AppButton';
import { AppTextInput } from '@/src/components/common/AppTextInput';
import { AppPressable } from '@/src/components/common/AppPressable';

const CheckItem = ({ label, met }: { label: string; met: boolean }) => (
  <View style={styles.criteriaItem}>
    <View style={[styles.checkCircle, met && styles.checkCircleMet]}>
      {met && <Ionicons name="checkmark" size={12} color="#FFF" />}
    </View>
    <Text style={[styles.criteriaText, met && styles.criteriaTextMet]}>{label}</Text>
  </View>
);

export function CustomerSignupScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    referralCode: '',
    password: '',
    confirmPassword: '',
  });

  const emailRef = React.useRef<TextInput>(null);
  const phoneRef = React.useRef<TextInput>(null);
  const referralRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const confirmRef = React.useRef<TextInput>(null);

  const isValidPhoneNumber = /^9\d{9}$/.test(formData.phone);

  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  useEffect(() => {
    const { password } = formData;
    setPasswordCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    });
  }, [formData.password]);

  const isSignupReady =
    formData.fullName.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    isValidPhoneNumber &&
    Object.values(passwordCriteria).every(Boolean) &&
    formData.password === formData.confirmPassword;


  const handleSignup = async () => {
    if (!isSignupReady) return;
    setIsSubmitting(true);
    try {
      await registerCustomerAccount({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        referralCode: formData.referralCode,
        password: formData.password,
      });

      router.replace('/customer-onboarding-address' as any);
    } catch (err: any) {
      Alert.alert('Signup Failed', getErrorMessage(err, 'Unable to create your account right now.'));
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Customer Registration</Text>
          <Text style={styles.headerSubtitle}>Create Account</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarActive} />
        <View style={styles.progressBarInactive} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Fill in your details to get started</Text>

        <View style={styles.form}>
          <AppTextInput
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChangeText={(text: string) => setFormData({...formData, fullName: text})}
            leftIcon="person-outline"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <AppTextInput
            ref={emailRef}
            label="Email Address"
            placeholder="Enter your email address"
            value={formData.email}
            onChangeText={(text: string) => setFormData({...formData, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />

          <AppTextInput
            ref={phoneRef}
            label="Contact Number"
            placeholder="9XX XXX XXXX"
            value={formData.phone}
            onChangeText={(text: string) => setFormData({...formData, phone: text.replace(/\D/g, '').slice(0, 10)})}
            keyboardType="phone-pad"
            leftIcon="call-outline"
            maxLength={10}
            returnKeyType="next"
            onSubmitEditing={() => referralRef.current?.focus()}
          />

          <AppTextInput
            ref={referralRef}
            label="Referral Code (Optional)"
            placeholder="Enter referral code"
            value={formData.referralCode}
            onChangeText={(text: string) => setFormData({...formData, referralCode: text})}
            autoCapitalize="characters"
            leftIcon="gift-outline"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <AppTextInput
            ref={passwordRef}
            label="Password"
            placeholder="Create a password"
            value={formData.password}
            onChangeText={(text: string) => setFormData({...formData, password: text})}
            isPassword
            leftIcon="lock-closed-outline"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />

          <View style={styles.criteriaContainer}>
            <Text style={styles.criteriaHeader}>Password must contain:</Text>
            <CheckItem label="At least 8 characters" met={passwordCriteria.length} />
            <CheckItem label="One uppercase letter (A-Z)" met={passwordCriteria.uppercase} />
            <CheckItem label="One lowercase letter (a-z)" met={passwordCriteria.lowercase} />
            <CheckItem label="One number (0-9)" met={passwordCriteria.number} />
          </View>

          <AppTextInput
            ref={confirmRef}
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(text: string) => setFormData({...formData, confirmPassword: text})}
            isPassword
            leftIcon="lock-closed-outline"
            error={formData.confirmPassword && formData.password !== formData.confirmPassword ? "Passwords do not match" : ""}
            returnKeyType="done"
            onSubmitEditing={handleSignup}
          />

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
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label="Continue"
          onPress={handleSignup}
          isLoading={isSubmitting}
          disabled={!isSignupReady || isSubmitting}
          size="lg"
        />
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
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TOKENS.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TOKENS.colors.text.secondary,
    marginTop: 2,
  },
  progressBarContainer: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
    backgroundColor: TOKENS.colors.background,
  },
  progressBarActive: {
    flex: 1,
    backgroundColor: TOKENS.colors.primary,
  },
  progressBarInactive: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
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
  inputGroup: {
    marginBottom: TOKENS.spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
    marginBottom: TOKENS.spacing.sm,
    marginLeft: 4,
  },
  required: {
    color: TOKENS.colors.danger.text,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.borderRadius.md,
    alignItems: 'center',
    height: 56,
    paddingHorizontal: TOKENS.spacing.md,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 15,
    color: TOKENS.colors.text.secondary,
    marginRight: 10,
    fontWeight: '600',
  },
  verticalDivider: {
    width: 1.5,
    height: 24,
    backgroundColor: TOKENS.colors.border,
    marginRight: 12,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 15,
    color: TOKENS.colors.text.primary,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: TOKENS.colors.text.muted,
    marginTop: 6,
    marginLeft: 4,
  },
  criteriaContainer: {
    marginBottom: 25,
    paddingLeft: 4,
  },
  criteriaHeader: {
    fontSize: 13,
    color: TOKENS.colors.text.secondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: TOKENS.colors.border,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleMet: {
    backgroundColor: TOKENS.colors.primary,
    borderColor: TOKENS.colors.primary,
  },
  criteriaText: {
    fontSize: 14,
    color: TOKENS.colors.text.secondary,
  },
  criteriaTextMet: {
    color: TOKENS.colors.text.primary,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
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
  },
  socialButton: {
    borderColor: TOKENS.colors.border,
    backgroundColor: TOKENS.colors.white,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 25,
    paddingVertical: 20,
    backgroundColor: TOKENS.colors.white,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.border,
  },
});
