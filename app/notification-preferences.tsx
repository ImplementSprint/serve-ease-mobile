import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  Switch,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import {
  loadCustomerNotificationPreferences,
  saveCustomerNotificationPreferences,
} from '@/lib/notification-preferences';

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [messages, setMessages] = useState(true);
  const [reminders, setReminders] = useState(true);

  React.useEffect(() => {
    let active = true;

    async function loadPreferences() {
      if (!user?.id) return;
      const preferences = await loadCustomerNotificationPreferences(user.id);
      if (!active) return;
      setBookingUpdates(preferences.bookingUpdates);
      setPromotions(preferences.promotions);
      setMessages(preferences.messages);
      setReminders(preferences.reminders);
    }

    void loadPreferences();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const updatePreferences = React.useCallback(
    async (next: {
      bookingUpdates?: boolean;
      promotions?: boolean;
      messages?: boolean;
      reminders?: boolean;
    }) => {
      const nextState = {
        bookingUpdates,
        promotions,
        messages,
        reminders,
        ...next,
      };

      setBookingUpdates(nextState.bookingUpdates);
      setPromotions(nextState.promotions);
      setMessages(nextState.messages);
      setReminders(nextState.reminders);

      if (user?.id) {
        await saveCustomerNotificationPreferences(user.id, nextState);
      }
    },
    [bookingUpdates, messages, promotions, reminders, user?.id]
  );

  const PreferenceItem = ({ label, description, value, onValueChange, icon }: any) => (
    <View style={styles.preferenceItem}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={22} color="#00C853" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <Switch
        trackColor={{ false: "#E0E0E0", true: "#00C853" }}
        thumbColor={"#FFF"}
        ios_backgroundColor="#E0E0E0"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

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

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Manage what we send you</Text>
        
        <PreferenceItem 
          icon="calendar-outline"
          label="Booking Updates" 
          description="Get notified about the status of your service bookings."
          value={bookingUpdates} 
          onValueChange={(value: boolean) => void updatePreferences({ bookingUpdates: value })} 
        />
        
        <PreferenceItem 
          icon="pricetag-outline"
          label="Promotions & Discounts" 
          description="Receive exclusive offers and promo codes."
          value={promotions} 
          onValueChange={(value: boolean) => void updatePreferences({ promotions: value })} 
        />
        
        <PreferenceItem 
          icon="chatbubble-outline"
          label="Messages" 
          description="Alerts when providers message you."
          value={messages} 
          onValueChange={(value: boolean) => void updatePreferences({ messages: value })} 
        />
        
        <PreferenceItem 
          icon="time-outline"
          label="Reminders" 
          description="Reminders before your scheduled service."
          value={reminders} 
          onValueChange={(value: boolean) => void updatePreferences({ reminders: value })} 
        />

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
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8FBF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#8E8E93',
  },
  footerSpacer: {
    height: 40,
  },
});

