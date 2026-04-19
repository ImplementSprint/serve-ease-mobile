import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getProviderBookingById } from '@/services/providerBookingService';
import { getErrorMessage } from '@/lib/error-handling';

export default function ProviderSuccessScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return setIsLoading(false);
      try {
        const row = await getProviderBookingById(String(id));
        if (mounted) setBooking(row);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load summary.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {isLoading ? <ActivityIndicator size="large" color="#00B761" /> : null}
        {!isLoading ? <Ionicons name="checkmark-circle" size={88} color="#00B761" /> : null}
        <Text style={styles.title}>Service Completed</Text>
        {booking ? <Text style={styles.sub}>{booking.service_title} - P{Number(booking.total_amount || 0).toFixed(2)}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={() => router.push({ pathname: '/provider-receipt', params: { id } } as any)}>
          <Text style={styles.btnText}>View Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => router.replace('/provider-bookings' as any)}>
          <Text style={styles.linkText}>Back to Bookings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { marginTop: 12, fontSize: 24, fontWeight: '800', color: '#0D1B2A' },
  sub: { marginTop: 8, color: '#556' },
  error: { marginTop: 8, color: '#C62828' },
  btn: { marginTop: 18, minWidth: 180, height: 44, borderRadius: 10, backgroundColor: '#00B761', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  link: { marginTop: 10 },
  linkText: { color: '#00B761', fontWeight: '700' },
});
