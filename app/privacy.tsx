import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} /> {/* Spacer to center the title */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        <Text style={styles.lastUpdated}>Last updated: March 2026</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          ServEase (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our app.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We collect the following information during registration and use:
        </Text>
        <View style={styles.listContainer}>
          {[
            'Full name, email address, contact number',
            'Address and location data (city, province)',
            'Government-issued ID (for service workers only)',
            'Booking history and transaction records',
            'Device information and usage data',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:
        </Text>
        <View style={styles.listContainer}>
          {[
            'Create and manage your account',
            'Match customers with nearby service workers',
            'Process bookings and calculate transportation fees',
            'Send notifications about bookings and account updates',
            'Improve the ServEase platform and user experience',
            'Comply with legal obligations',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>4. Location Data</Text>
        <Text style={styles.paragraph}>
          ServEase collects location information to:
        </Text>
        <View style={styles.listContainer}>
          {[
            'Show customers nearby available service workers',
            'Calculate distance and transportation fees',
            'Define service worker coverage areas',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.paragraph}>
          Location data is only collected with your permission and is not sold to third parties.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal data. We may share information with:
        </Text>
        <View style={styles.listContainer}>
          {[
            'Service workers (only name and contact details relevant to a confirmed booking)',
            'Payment processors for transaction handling',
            'Legal authorities when required by Philippine law',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>6. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and security measures to protect your personal information from unauthorized access, disclosure, or misuse.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.paragraph}>
          Your data is retained for as long as your account is active. You may request account deletion by contacting support@servease.ph. Some data may be retained for legal compliance purposes.
        </Text>

        <Text style={styles.sectionTitle}>8. Your Rights</Text>
        <Text style={styles.paragraph}>
          Under the Philippine Data Privacy Act of 2012 (RA 10173), you have the right to:
        </Text>
        <View style={styles.listContainer}>
          {[
            'Access your personal data',
            'Correct inaccurate information',
            'Request deletion of your data',
            'Withdraw consent at any time',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>9. Cookies & Analytics</Text>
        <Text style={styles.paragraph}>
          ServEase may use analytics tools to monitor app performance and usage patterns. No personally identifiable information is shared through analytics.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notification.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          For privacy concerns or data requests, contact our Data Privacy Officer at: privacy@servease.ph
        </Text>
        
        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#777',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 10,
  },
  listContainer: {
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 10,
  },
  bullet: {
    fontSize: 15,
    color: '#444',
    marginRight: 10,
    width: 10,
  },
  itemText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    flex: 1,
  },
  footerSpacer: {
    height: 40,
  },
});

