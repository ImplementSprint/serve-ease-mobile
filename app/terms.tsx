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

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} /> {/* Spacer to center the title */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        <Text style={styles.lastUpdated}>Last updated: March 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By downloading, accessing, or using ServEase, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the app.
        </Text>

        <Text style={styles.sectionTitle}>2. About ServEase</Text>
        <Text style={styles.paragraph}>
          ServEase is a Philippine-based service marketplace that connects customers with independent service workers across the following categories:
        </Text>
        <View style={styles.listContainer}>
          {[
            'Home Maintenance and Repair',
            'Beauty, Wellness & Personal Care',
            'Education & Professional Services',
            'Domestic & Cleaning Services',
            'Pet Services',
            'Events & Entertainment',
            'Automotive & Tech Support',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <View style={styles.listContainer}>
          {[
            'You must provide accurate and complete information during registration.',
            'You are responsible for maintaining the confidentiality of your account credentials.',
            'You must be at least 18 years old to use ServEase.',
            'ServEase reserves the right to suspend or terminate accounts that violate these terms.',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>4. Service Workers</Text>
        <View style={styles.listContainer}>
          {[
            'Service workers are independent contractors, not employees of ServEase.',
            'ServEase does not guarantee the quality, safety, or legality of services offered.',
            'Workers must complete identity verification before being approved on the platform.',
            'ServEase reserves the right to remove any worker who violates platform policies.',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>5. Bookings & Payments</Text>
        <View style={styles.listContainer}>
          {[
            'Customers agree to pay the agreed service fee upon booking confirmation.',
            "Additional transportation fees may apply if the service location is beyond the worker's set service radius.",
            'Cancellations must be made within the allowed cancellation window as stated at the time of booking.',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>6. Transportation Fee Policy</Text>
        <Text style={styles.paragraph}>
          If a customer&apos;s location is beyond the service worker&apos;s maximum service radius, an additional transportation fee will be calculated and added to the total booking cost. This fee will be clearly shown before booking confirmation.
        </Text>

        <Text style={styles.sectionTitle}>7. Prohibited Activities</Text>
        <Text style={styles.paragraph}>Users must not:</Text>
        <View style={styles.listContainer}>
          {[
            'Use ServEase for any illegal or unauthorized purpose',
            'Harass, abuse, or harm other users or service workers',
            'Post false, misleading, or fraudulent information',
            'Attempt to bypass or manipulate the platform\'s systems',
          ].map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          ServEase is not liable for any damages, losses, or disputes arising from services booked through the platform. Users engage with service workers at their own discretion.
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

