import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { logoutCustomer } from '@/lib/customer-session';
import { SettingsRow } from '@/components/ui/settings-row';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

export default function MoreScreen() {
  const router = useRouter();
  const unreadNotifications = useUnreadNotifications();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <SettingsRow icon="person-outline" label="Edit Profile" onPress={() => router.push('/customer-edit-profile' as any)} />
          <SettingsRow icon="location-outline" label="Manage Addresses" onPress={() => router.push('/manage-addresses' as any)} />
          <SettingsRow
            icon="notifications"
            label="Notifications"
            sublabel="Messages, updates, and reminders"
            badgeCount={unreadNotifications}
            onPress={() => router.push('/notifications' as any)}
          />
          <SettingsRow icon="notifications-outline" label="Notification Preferences" onPress={() => router.push('/notification-preferences' as any)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <SettingsRow icon="help-circle-outline" label="Help Center" onPress={() => router.push('/help-center' as any)} />
          <SettingsRow icon="chatbubble-outline" label="Report an Issue" onPress={() => router.push('/provider-report-issue' as any)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARTNERSHIP</Text>
          <SettingsRow 
            icon="briefcase-outline" 
            label="Join the ServEase Team" 
            sublabel="Be your own boss and earn more"
            onPress={() => router.push('/provider-join' as any)} 
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEGAL</Text>
          <SettingsRow icon="document-text-outline" label="Terms & Conditions" onPress={() => router.push('/terms' as any)} />
          <SettingsRow icon="lock-closed-outline" label="Privacy Policy" onPress={() => router.push('/privacy' as any)} />
        </View>

        <View style={styles.section}>
          <SettingsRow 
            icon="log-out-outline" 
            label="Log Out" 
            onPress={() => {
              logoutCustomer();
              router.replace('/login' as any);
            }}
            isDestructive
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  versionText: {
    fontSize: 12,
    color: '#CCC',
  },
});
