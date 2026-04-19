import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import {
  loadProviderNotificationPreferences,
  saveProviderNotificationPreferences,
} from '@/lib/notification-preferences';

const PreferenceItem = ({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (val: boolean) => void }) => (
  <View style={styles.preferenceItem}>
    <Text style={styles.preferenceLabel}>{label}</Text>
    <Switch 
      value={value} 
      onValueChange={onValueChange}
      trackColor={{ false: '#E0E0E0', true: '#00B761' }}
      thumbColor={Platform.OS === 'ios' ? '#FFF' : value ? '#FFF' : '#F4F3F4'}
    />
  </View>
);

const SectionHeader = ({ icon, title, color = '#E8FBF2', iconColor = '#00B761' }: any) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.iconContainer, { backgroundColor: color }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

export default function ProviderNotificationPreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Booking Notifications
  const [newBooking, setNewBooking] = useState(true);
  const [bookingConfirmation, setBookingConfirmation] = useState(true);
  const [bookingCancellation, setBookingCancellation] = useState(true);
  const [bookingModification, setBookingModification] = useState(true);
  const [customerMessages, setCustomerMessages] = useState(true);
  
  // Payment Notifications
  const [paymentReceived, setPaymentReceived] = useState(true);
  const [payoutProcessed, setPayoutProcessed] = useState(true);
  
  // Other Alerts
  const [promotionalOffers, setPromotionalOffers] = useState(false);
  const [platformUpdates, setPlatformUpdates] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  // DYNAMIC TIME PICKER STATE
  const [dailySummaryTime, setDailySummaryTime] = useState('08:00 AM');

  React.useEffect(() => {
    let active = true;

    async function loadPreferences() {
      if (!user?.id) return;
      const preferences = await loadProviderNotificationPreferences(user.id);
      if (!active) return;
      setNewBooking(preferences.newBooking ?? true);
      setBookingConfirmation(preferences.bookingConfirmation ?? true);
      setBookingCancellation(preferences.bookingCancellation ?? true);
      setBookingModification(preferences.bookingModification ?? true);
      setCustomerMessages(preferences.customerMessages ?? true);
      setPaymentReceived(preferences.paymentReceived ?? true);
      setPayoutProcessed(preferences.payoutProcessed ?? true);
      setPromotionalOffers(preferences.promotionalOffers ?? false);
      setPlatformUpdates(preferences.platformUpdates ?? true);
      setDailySummary(preferences.dailySummary ?? true);
      setDarkMode(preferences.darkMode ?? false);
      
      // Load the saved time if it exists, otherwise default to 08:00 AM
      setDailySummaryTime(preferences.dailySummaryTime || '08:00 AM'); 
    }

    void loadPreferences();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const updatePreferences = React.useCallback(
    async (next: Partial<{
      newBooking: boolean;
      bookingConfirmation: boolean;
      bookingCancellation: boolean;
      bookingModification: boolean;
      customerMessages: boolean;
      paymentReceived: boolean;
      payoutProcessed: boolean;
      promotionalOffers: boolean;
      platformUpdates: boolean;
      dailySummary: boolean;
      dailySummaryTime: string;
      darkMode: boolean;
    }>) => {
      const nextState = {
        newBooking,
        bookingConfirmation,
        bookingCancellation,
        bookingModification,
        customerMessages,
        paymentReceived,
        payoutProcessed,
        promotionalOffers,
        platformUpdates,
        dailySummary,
        dailySummaryTime,
        darkMode,
        ...next,
      };

      setNewBooking(nextState.newBooking);
      setBookingConfirmation(nextState.bookingConfirmation);
      setBookingCancellation(nextState.bookingCancellation);
      setBookingModification(nextState.bookingModification);
      setCustomerMessages(nextState.customerMessages);
      setPaymentReceived(nextState.paymentReceived);
      setPayoutProcessed(nextState.payoutProcessed);
      setPromotionalOffers(nextState.promotionalOffers);
      setPlatformUpdates(nextState.platformUpdates);
      setDailySummary(nextState.dailySummary);
      setDailySummaryTime(nextState.dailySummaryTime);
      setDarkMode(nextState.darkMode);

      if (user?.id) {
        await saveProviderNotificationPreferences(user.id, nextState);
      }
    },
    [
      bookingCancellation,
      bookingConfirmation,
      bookingModification,
      customerMessages,
      dailySummary,
      dailySummaryTime,
      darkMode,
      newBooking,
      paymentReceived,
      payoutProcessed,
      platformUpdates,
      promotionalOffers,
      user?.id,
    ]
  );

  // Dynamic Time Cycler Function
  const handleTimeChange = () => {
    const availableTimes = ['07:00 AM', '08:00 AM', '09:00 AM', '05:00 PM', '06:00 PM'];
    const currentIndex = availableTimes.indexOf(dailySummaryTime);
    const nextTime = availableTimes[(currentIndex + 1) % availableTimes.length];
    
    void updatePreferences({ dailySummaryTime: nextTime });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Booking Notifications */}
        <SectionHeader icon="notifications-outline" title="Booking Notifications" />
        <View style={styles.section}>
          <PreferenceItem label="New Booking Requests" value={newBooking} onValueChange={(value) => void updatePreferences({ newBooking: value })} />
          <View style={styles.separator} />
          <PreferenceItem label="Booking Confirmations" value={bookingConfirmation} onValueChange={(value) => void updatePreferences({ bookingConfirmation: value })} />
          <View style={styles.separator} />
          <PreferenceItem label="Booking Cancellations" value={bookingCancellation} onValueChange={(value) => void updatePreferences({ bookingCancellation: value })} />
          <View style={styles.separator} />
          <PreferenceItem label="Booking Modifications" value={bookingModification} onValueChange={(value) => void updatePreferences({ bookingModification: value })} />
          <View style={styles.separator} />
          <PreferenceItem label="Customer Messages" value={customerMessages} onValueChange={(value) => void updatePreferences({ customerMessages: value })} />
        </View>

        {/* Payment Notifications */}
        <SectionHeader icon="cash-outline" title="Payment Notifications" />
        <View style={styles.section}>
          <PreferenceItem label="Payment Received" value={paymentReceived} onValueChange={(value) => void updatePreferences({ paymentReceived: value })} />
          <View style={styles.separator} />
          <PreferenceItem label="Payout Processed" value={payoutProcessed} onValueChange={(value) => void updatePreferences({ payoutProcessed: value })} />
        </View>

        {/* Other Alerts */}
        <SectionHeader icon="information-circle-outline" title="Other Alerts" />
        <View style={styles.section}>
          <PreferenceItem label="Promotional Offers" value={promotionalOffers} onValueChange={(value) => void updatePreferences({ promotionalOffers: value })} />
          <View style={styles.separator} />
          <PreferenceItem label="Platform Updates" value={platformUpdates} onValueChange={(value) => void updatePreferences({ platformUpdates: value })} />
          <View style={styles.separator} />
          <PreferenceItem label="Daily Summary" value={dailySummary} onValueChange={(value) => void updatePreferences({ dailySummary: value })} />
        </View>

        {/* Notification Timing */}
        <SectionHeader icon="time-outline" title="Notification Timing" />
        <View style={styles.section}>
          <Text style={styles.timingLabel}>Preferred Notification Time (Daily Summary)</Text>
          <TouchableOpacity 
            style={[styles.pickerButton, !dailySummary && { opacity: 0.5 }]} 
            onPress={handleTimeChange}
            disabled={!dailySummary}
          >
            <Text style={styles.pickerText}>{dailySummaryTime}</Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}
        >
          <Text style={styles.saveButtonText}>Return to Settings</Text>
        </TouchableOpacity>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D1B2A',
    marginLeft: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  preferenceLabel: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#F8F9FA',
  },
  timingLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  pickerText: {
    fontSize: 15,
    color: '#0D1B2A',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    marginHorizontal: 16,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerSpacer: {
    height: 40,
  },
});
