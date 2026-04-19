import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function CustomerBookAgainScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ booking?: string }>();
  const [bookingData, setBookingData] = useState<any>(null);

  useEffect(() => {
    if (params.booking) {
      try {
        setBookingData(JSON.parse(params.booking));
      } catch {}
    }
  }, [params.booking]);

  const handleBookAgain = () => {
    if (!bookingData) {
      router.push('/customer-booking-form');
      return;
    }

    router.push({
      pathname: '/customer-booking-form',
      params: {
        providerId: bookingData.providerId || '',
        serviceName: bookingData.service,
        providerName: bookingData.provider?.name || bookingData.providerName,
        date: `${bookingData.date}, ${bookingData.year || '2026'}`,
        time: bookingData.time,
        newAddress: JSON.stringify({
          id: 'prev_address',
          type: 'Previous',
          addressLine1: bookingData.address || 'Previous service address',
          addressLine2: '',
        }),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Again</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PREVIOUS BOOKING</Text>
        </View>

        {bookingData ? (
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeaderInfo}>
              <View style={styles.iconCircle}>
                <Ionicons name="construct-outline" size={20} color="#00C853" />
              </View>
              <View style={styles.bookingTextWrap}>
                <Text style={styles.bookingService}>{bookingData.service}</Text>
                <Text style={styles.bookingProvider}>
                  by {bookingData.provider?.name || bookingData.providerName}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.bookingDetailsRow}>
              <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
              <Text style={styles.bookingDetailText}>
                {bookingData.date}
                {bookingData.year ? `, ${bookingData.year}` : ''} at {bookingData.time}
              </Text>
            </View>
            <View style={styles.bookingDetailsRow}>
              <Ionicons name="location-outline" size={16} color="#8E8E93" />
              <Text style={styles.bookingDetailText}>
                {bookingData.address || 'Use your previous service address'}
              </Text>
            </View>

            <TouchableOpacity style={styles.bookAgainButton} onPress={handleBookAgain}>
              <Text style={styles.bookAgainButtonText}>Book Again</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No booking details found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A', marginLeft: 8 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionHeader: { marginBottom: 12, marginTop: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#999', letterSpacing: 1 },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  bookingHeaderInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bookingTextWrap: { flex: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8FBF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bookingService: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  bookingProvider: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F0F0F5', marginBottom: 16 },
  bookingDetailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bookingDetailText: { fontSize: 14, color: '#444', marginLeft: 8, flex: 1 },
  bookAgainButton: {
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  bookAgainButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  buttonIcon: { marginLeft: 8 },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  emptyText: { fontSize: 15, color: '#666' },
});

