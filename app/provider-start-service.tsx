import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getProviderBookingActionState,
  getProviderBookingById,
  updateBookingStatus,
} from '@/services/providerBookingService';
import { clearProviderServiceSession, startProviderServiceSession } from '@/lib/provider-service-session';

export default function ProviderStartServiceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);
  const [loadError, setLoadError] = useState('');

  React.useEffect(() => {
    let mounted = true;
    async function loadBooking() {
      if (!id) return;
      setIsLoadingBooking(true);
      setLoadError('');
      try {
        const data = await getProviderBookingById(String(id));
        if (mounted) {
          setBooking(data);
        }
      } catch (err) {
        if (mounted) {
          setLoadError(getErrorMessage(err, 'Could not load booking details.'));
        }
      } finally {
        if (mounted) setIsLoadingBooking(false);
      }
    }
    loadBooking();
    return () => {
      mounted = false;
    };
  }, [id]);

  const onStart = async () => {
    if (!id) {
      Alert.alert('Missing Booking', 'Booking id is missing. Please open this booking again.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in again before starting service.');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateBookingStatus(String(id), user.id, 'in_progress');
      await startProviderServiceSession(String(id), user.id);
      router.replace({ pathname: '/provider-service-in-progress', params: { id: String(id) } } as any);
    } catch (err) {
      await clearProviderServiceSession(String(id));
      Alert.alert('Failed', getErrorMessage(err, 'Could not start service.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionState = getProviderBookingActionState(booking?.status);
  const address = booking?.service_address || 'No service address found.';
  const customerName = booking?.customer_name || 'Customer';
  const serviceTitle = booking?.service_title || 'Service';
  const canStart = Boolean(booking?.id) && actionState.canStartService;
  const canResume = Boolean(booking?.id) && actionState.canResumeService;

  const onContinue = () => {
    if (!booking?.id) return;

    if (canResume) {
      router.replace({ pathname: '/provider-service-in-progress', params: { id: String(booking.id) } } as any);
      return;
    }

    if (actionState.normalizedStatus === 'completed') {
      router.replace({ pathname: '/provider-receipt', params: { id: String(booking.id) } } as any);
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}><Ionicons name="arrow-back" size={24} color="#0D1B2A" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Start Service</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.info}>Review the assignment, then start the service when you are onsite and ready to begin work.</Text>

        {isLoadingBooking ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#00B761" />
            <Text style={styles.loadingText}>Loading booking details...</Text>
          </View>
        ) : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Ionicons name="location-outline" size={18} color="#0D1B2A" />
            <Text style={styles.locationTitle}>Assigned Service</Text>
          </View>
          <Text style={styles.bookingLabel}>{serviceTitle}</Text>
          <Text style={styles.locationAddress}>{isLoadingBooking ? 'Loading address...' : address}</Text>
          <Text style={styles.metaLabel}>Customer: {customerName}</Text>
          <Text style={styles.metaLabel}>Current Status: {actionState.label}</Text>
          <Text style={styles.locationMeta}>Latitude: 14.6760</Text>
          <Text style={styles.locationMeta}>Longitude: 121.0437</Text>
          <Text style={styles.locationMeta}>Distance: 3.2 km | ETA: 12 mins</Text>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={18} color="#64748B" />
            <Text style={styles.mapPlaceholderText}>Map Preview Placeholder</Text>
          </View>
        </View>

        {!canStart && !canResume && booking?.id ? (
          <Text style={styles.helperText}>
            This booking must be in the confirmed state before service can start.
          </Text>
        ) : null}

        {canResume ? (
          <Text style={styles.helperText}>
            This service is already in progress. Continue with the active timer instead of starting again.
          </Text>
        ) : null}

        <TouchableOpacity style={[styles.btn, (!canStart || isSubmitting) && styles.btnDisabled]} onPress={onStart} disabled={!canStart || isSubmitting}>
          <Text style={styles.btnText}>{isSubmitting ? 'Please wait...' : 'Start Service'}</Text>
        </TouchableOpacity>

        {canResume || actionState.normalizedStatus === 'completed' ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onContinue}>
            <Text style={styles.secondaryBtnText}>
              {canResume ? 'Continue Service' : 'View Receipt'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { padding: 16 },
  info: { color: '#556', marginBottom: 14 },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loadingText: { color: '#64748B', fontSize: 13 },
  errorText: { color: '#B91C1C', marginBottom: 12 },
  locationCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  locationTitle: { fontSize: 14, fontWeight: '700', color: '#0D1B2A' },
  bookingLabel: { fontSize: 16, fontWeight: '700', color: '#0D1B2A', marginBottom: 4 },
  locationAddress: { fontSize: 13, color: '#334155', marginBottom: 8 },
  metaLabel: { fontSize: 12, color: '#475569', marginBottom: 2 },
  locationMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  mapPlaceholder: { marginTop: 10, height: 72, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', gap: 4 },
  mapPlaceholderText: { fontSize: 12, color: '#64748B' },
  btn: { backgroundColor: '#00B761', borderRadius: 10, height: 44, justifyContent: 'center', alignItems: 'center' },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7DDE4',
  },
  secondaryBtnText: { color: '#223', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFF', fontWeight: '700' },
  helperText: { color: '#64748B', fontSize: 12, marginBottom: 10 },
});

