import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SettingsRow } from '@/components/ui/settings-row';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { useAuth } from '@/hooks/useAuth';

// --- Backend Services ---
import {
  formatVerificationLevelLabel,
  formatVerificationStatusLabel,
  getProviderVerificationDraft,
} from '@/services/providerVerificationService';
import {
  loadProviderNotificationPreferences,
  saveProviderNotificationPreferences,
} from '@/lib/notification-preferences';

const CategoryHeader = ({ title }: { title: string }) => (
  <View style={styles.categoryHeader}>
    <Text style={styles.categoryTitle}>{title}</Text>
  </View>
);

export default function ProviderSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const unreadNotifications = useUnreadNotifications();
  
  // Real Data States
  const [verificationSummary, setVerificationSummary] = useState('Loading...');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // --- 1. Load All Real Data from Backend ---
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function fetchData() {
        if (!user?.id) return;
        try {
          const [draft, prefs] = await Promise.all([
            getProviderVerificationDraft(user.id),
            loadProviderNotificationPreferences(user.id)
          ]);

          if (!mounted) return;

          // Dynamic Verification Label
          setVerificationSummary(
            `${formatVerificationStatusLabel(draft.status)} • ${formatVerificationLevelLabel(draft.verificationLevel)}`
          );

          // Dynamic Notification Toggles
          setPushEnabled(prefs.newBooking ?? true); 
          setSmsEnabled(prefs.dailySummary ?? false); 
          setEmailEnabled(prefs.platformUpdates ?? true);
          setDarkMode(prefs.darkMode ?? false); // Assuming darkMode is stored in prefs
          
        } catch (error) {
          if (mounted) {
            setVerificationSummary('Not started');
          }
        }
      }

      void fetchData();
      return () => { mounted = false; };
    }, [user?.id])
  );

  // --- 2. Dynamic Update Logic (Real-time Saving) ---
  const handleToggleChange = async (key: 'push' | 'sms' | 'email' | 'dark', value: boolean) => {
    if (!user?.id) return;

    // Optimistic UI update (makes the switch feel fast)
    if (key === 'push') setPushEnabled(value);
    if (key === 'sms') setSmsEnabled(value);
    if (key === 'email') setEmailEnabled(value);
    if (key === 'dark') setDarkMode(value);

    try {
      const currentPrefs = await loadProviderNotificationPreferences(user.id);
      
      const updatedPrefs = {
        ...currentPrefs,
        ...(key === 'push' && { newBooking: value, bookingConfirmation: value }),
        ...(key === 'sms' && { dailySummary: value }),
        ...(key === 'email' && { platformUpdates: value }),
        ...(key === 'dark' && { darkMode: value }),
      };

      await saveProviderNotificationPreferences(user.id, updatedPrefs);
    } catch (err) {
      Alert.alert('Update Failed', 'Your preference could not be saved to the cloud.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => router.replace('/login' as any) }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account', 
      'This action is permanent. All your data will be wiped.',
      [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => {} }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Account Section */}
        <CategoryHeader title="ACCOUNT" />
        <View style={styles.section}>
          <SettingsRow 
            icon="person-outline" 
            label="Edit Profile" 
            variant="setting"
            onPress={() => router.push('/provider-edit-profile' as any)}
          />
          <SettingsRow
            icon="cash-outline"
            label="Services & Pricing"
            variant="setting"
            onPress={() => router.push('/pricing' as any)}
          />
          <SettingsRow 
            icon="location-outline" 
            label="Manage Addresses" 
            variant="setting"
            onPress={() => router.push('/manage-addresses' as any)}
          />
          <SettingsRow 
            icon="time-outline" 
            label="Availability" 
            variant="setting"
            onPress={() => router.push('/provider-availability' as any)}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Profile & Verification"
            sublabel={verificationSummary}
            variant="setting"
            onPress={() => router.push('/provider-verification' as any)}
          />
        </View>

        {/* Notifications Section */}
        <CategoryHeader title="NOTIFICATIONS" />
        <View style={styles.section}>
          <SettingsRow 
            icon="notifications-outline" 
            label="Booking Alerts (Push)" 
            variant="setting"
            mode="toggle"
            value={pushEnabled} 
            onValueChange={(val) => handleToggleChange('push', val)} 
          />
          <SettingsRow 
            icon="phone-portrait-outline" 
            label="Daily Summaries (SMS)" 
            variant="setting"
            mode="toggle"
            value={smsEnabled} 
            onValueChange={(val) => handleToggleChange('sms', val)} 
          />
          <SettingsRow 
            icon="mail-outline" 
            label="Email Updates" 
            variant="setting"
            mode="toggle"
            value={emailEnabled} 
            onValueChange={(val) => handleToggleChange('email', val)} 
          />
          <SettingsRow 
            icon="notifications" 
            label="Notification Inbox" 
            sublabel="Messages and reminders"
            badgeCount={unreadNotifications}
            variant="setting"
            onPress={() => router.push('/notifications' as any)}
          />
          <SettingsRow 
            icon="options-outline" 
            label="Advanced Preferences" 
            variant="setting"
            onPress={() => router.push('/provider-notification-preferences' as any)}
          />
        </View>

        {/* Legal & Support */}
        <CategoryHeader title="LEGAL & SUPPORT" />
        <View style={styles.section}>
          <SettingsRow 
            icon="document-text-outline" 
            label="Terms and Conditions" 
            variant="setting"
            onPress={() => router.push('/terms' as any)} 
          />
          <SettingsRow 
            icon="lock-closed-outline" 
            label="Privacy Policy" 
            variant="setting"
            onPress={() => router.push('/privacy' as any)} 
          />
          <SettingsRow 
            icon="help-circle-outline" 
            label="Help Center" 
            variant="setting"
            onPress={() => router.push('/provider-help' as any)}
          />
        </View>

        {/* App Preferences */}
        <CategoryHeader title="APP PREFERENCES" />
        <View style={styles.section}>
          <SettingsRow 
            icon="moon-outline" 
            label="Dark Mode" 
            variant="setting"
            mode="toggle"
            value={darkMode} 
            onValueChange={(val) => handleToggleChange('dark', val)} 
          />
        </View>

        {/* Account Actions */}
        <CategoryHeader title="ACCOUNT ACTIONS" />
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF4D4D" style={styles.logoutIcon} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { padding: 8, marginRight: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  scrollContainer: { flex: 1, backgroundColor: '#FFF' },
  categoryHeader: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8, backgroundColor: '#FFF' },
  categoryTitle: { fontSize: 12, fontWeight: '600', color: '#8E8E93', letterSpacing: 1 },
  section: { paddingHorizontal: 20, backgroundColor: '#FFF' },
  actionSection: { paddingHorizontal: 24, paddingTop: 16, alignItems: 'center' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE5E5', width: '100%', paddingVertical: 14, borderRadius: 12, marginBottom: 20 },
  logoutIcon: { marginRight: 8 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#FF4D4D' },
  deleteButton: { paddingVertical: 8 },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#FF4D4D', textDecorationLine: 'underline' },
  footerSpacer: { height: 40 },
});
