import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { TOKENS } from '@/constants/tokens';
import { AppButton } from '@/src/components/common/AppButton';
import { AppPressable } from '@/src/components/common/AppPressable';

const { width } = Dimensions.get('window');

export function WelcomeScreen() {
  const router = useRouter();
  const [isAgreed, setIsAgreed] = useState(false);

  const handleAction = (route: string) => {
    if (!isAgreed) {
      Alert.alert(
        "Agreement Required",
        "Please read and agree to the Terms & Conditions and Privacy Policy to proceed.",
        [{ text: "OK" }]
      );
      return;
    }
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Decorative Background Assets */}
      <Image
        source={require('@/assets/images/pliers.png')}
        style={[styles.toolImage, styles.pliers]}
        resizeMode="contain"
      />
      <Image
        source={require('@/assets/images/paintbrush.png')}
        style={[styles.toolImage, styles.paintbrush]}
        resizeMode="contain"
      />
      
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>
          Finding and connecting with trusted local professionals around you.
        </Text>

        <View style={styles.buttonContainer}>
          <AppButton 
            label="Sign up to ServEase"
            onPress={() => handleAction('/signup')}
            disabled={!isAgreed}
            variant={isAgreed ? "primary" : "outline"}
            size="lg"
            style={[
              styles.btn,
              isAgreed ? styles.btnActive : styles.btnInactive
            ]}
            textStyle={isAgreed ? styles.btnTextActive : styles.btnTextInactive}
          />

          <AppButton 
            label="Log In"
            onPress={() => handleAction('/login')}
            variant="outline"
            size="lg"
            disabled={!isAgreed}
            style={[styles.btn, styles.loginBtn, !isAgreed && styles.loginBtnDisabled]}
          />
        </View>

        <View style={styles.termsContainer}>
          <AppPressable 
            testID="checkbox"
            style={[styles.checkbox, isAgreed && styles.checkboxActive]} 
            onPress={() => setIsAgreed(!isAgreed)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isAgreed && <Ionicons name="checkmark" size={14} color={TOKENS.colors.primary} />}
          </AppPressable>
          <Text style={styles.termsText}>
            I have read and agree to the{' '}
            <Text 
              style={styles.link} 
              onPress={() => router.push('/terms')}
            >
              Terms & Conditions
            </Text> and{' '}
            <Text 
              style={styles.link}
              onPress={() => router.push('/privacy')}
            >
              Privacy Policy
            </Text>.
          </Text>
        </View>
      </View>

      {/* Bottom Decorative Assets */}
      <Image
        source={require('@/assets/images/broom.png')}
        style={[styles.toolImage, styles.broom]}
        resizeMode="contain"
      />
      <Image
        source={require('@/assets/images/plumbing_tools.png')}
        style={[styles.toolImage, styles.plumbing]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.primary, // Vibrant Green
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    width: '85%',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: width * 0.7,
    height: 100,
    marginBottom: 15,
  },
  tagline: {
    color: TOKENS.colors.white,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '400',
    marginBottom: 40,
    lineHeight: 24,
    opacity: 0.9,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
    marginBottom: 35,
  },
  btn: {
    width: '100%',
    borderRadius: 30,
    minHeight: 56,
  },
  btnActive: {
    backgroundColor: TOKENS.colors.white,
    borderColor: TOKENS.colors.white,
  },
  btnInactive: {
    borderColor: '#8EE0AD',
    backgroundColor: 'transparent',
  },
  btnTextActive: {
    color: TOKENS.colors.primary,
    fontWeight: '700',
  },
  btnTextInactive: {
    color: '#AEE6C1',
  },
  loginBtn: {
    borderColor: TOKENS.colors.white,
    backgroundColor: 'transparent',
  },
  loginBtnDisabled: {
    borderColor: '#8EE0AD',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: TOKENS.colors.white,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  checkboxActive: {
    backgroundColor: TOKENS.colors.white,
  },
  termsText: {
    color: TOKENS.colors.white,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
    opacity: 0.9,
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  toolImage: {
    position: 'absolute',
    opacity: 0.9,
  },
  pliers: {
    top: -18,
    left: -78,
    width: 205,
    height: 205,
    transform: [{ rotate: '180deg' }],
  },
  paintbrush: {
    top: -26,
    right: -62,
    width: 228,
    height: 228,
    transform: [{ rotate: '-8deg' }],
  },
  broom: {
    bottom: -60,
    left: -85,
    width: 248,
    height: 248,
    transform: [{ rotate: '180deg' }],
  },
  plumbing: {
    bottom: -40,
    right: -80,
    width: 250,
    height: 200,
    transform: [{ rotate: '-3deg' }],
  },
});
