import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getProviderBookingActionState,
  getProviderBookingById,
} from '@/services/providerBookingService';
import {
  getProviderServiceElapsedSeconds,
  getProviderServiceSession,
  setProviderServiceSessionPaused,
  startProviderServiceSession,
  type ProviderServiceSession,
} from '@/lib/provider-service-session';

export default function ProviderServiceInProgressScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<ProviderServiceSession | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPause, setIsSavingPause] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        setError('Booking id is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const [bookingData, storedSession] = await Promise.all([
          getProviderBookingById(String(id)),
          getProviderServiceSession(String(id)),
        ]);

        const bookingActionState = getProviderBookingActionState(bookingData?.status);
        let nextSession = storedSession;
        if (!nextSession && user?.id && bookingActionState.canComplete) {
          nextSession = await startProviderServiceSession(String(id), user.id);
        }

        if (!mounted) return;

        setBooking(bookingData);
        setSession(nextSession);
        setElapsedSeconds(getProviderServiceElapsedSeconds(nextSession));
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Could not load active service.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (!session || session.pausedAt) {
      setElapsedSeconds(getProviderServiceElapsedSeconds(session));
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(getProviderServiceElapsedSeconds(session));
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const onTogglePause = async () => {
    if (!id || !session) return;

    setIsSavingPause(true);
    try {
      const next = await setProviderServiceSessionPaused(String(id), !session.pausedAt);
      setSession(next);
      setElapsedSeconds(getProviderServiceElapsedSeconds(next));
    } catch (err) {
      Alert.alert('Timer Update Failed', getErrorMessage(err, 'Could not update the service timer.'));
    } finally {
      setIsSavingPause(false);
    }
  };

  const onComplete = () => {
    if (!booking?.id) {
      Alert.alert('Missing Booking', 'Booking details are still loading.');
      return;
    }

    router.push({
      pathname: '/provider-complete-service',
      params: {
        id: booking.id,
        elapsedSeconds: String(elapsedSeconds),
      },
    } as any);
  };

  const actionState = getProviderBookingActionState(booking?.status);
  const isPaused = Boolean(session?.pausedAt);
  const canContinue = actionState.canComplete;
  const serviceSummary = useMemo(
    () => ({
      title: booking?.service_title || 'Service',
      customer: booking?.customer_name || 'Customer',
      address: booking?.service_address || 'No service address available.',
    }),
    [booking?.customer_name, booking?.service_address, booking?.service_title]
  );

  const onRecoverFlow = () => {
    if (!booking?.id) return;

    if (actionState.canStartService) {
      router.replace({ pathname: '/provider-start-service', params: { id: booking.id } } as any);
      return;
    }

    if (actionState.normalizedStatus === 'completed') {
      router.replace({ pathname: '/provider-receipt', params: { id: booking.id } } as any);
      return;
    }

    router.replace({ pathname: '/provider-booking-details', params: { id: booking.id } } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service In Progress</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color="#00B761" />
            <Text style={styles.stateText}>Loading active service...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!isLoading ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{serviceSummary.title}</Text>
              <Text style={styles.summaryMeta}>Customer: {serviceSummary.customer}</Text>
              <Text style={styles.summaryMeta}>Status: {actionState.label}</Text>
              <Text style={styles.summaryMeta}>{serviceSummary.address}</Text>
            </View>

            <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
            <Text style={styles.timerLabel}>{isPaused ? 'Timer paused' : 'Active service timer'}</Text>

            <TouchableOpacity
              style={[styles.secondaryBtn, !canContinue && styles.disabledBtn]}
              onPress={onTogglePause}
              disabled={isSavingPause || !session || !canContinue}
            >
              <Text style={styles.secondaryBtnText}>
                {isSavingPause ? 'Please wait...' : isPaused ? 'Resume Timer' : 'Pause Timer'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, !actionState.canComplete && styles.disabledBtn]}
              onPress={onComplete}
              disabled={!actionState.canComplete}
            >
              <Text style={styles.primaryBtnText}>Continue to Completion</Text>
            </TouchableOpacity>

            {!canContinue ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onRecoverFlow}>
                <Text style={styles.secondaryBtnText}>
                  {actionState.canStartService
                    ? 'Return to Start Service'
                    : actionState.normalizedStatus === 'completed'
                      ? 'View Receipt'
                      : 'View Booking'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  centerState: { alignItems: 'center', gap: 10, marginBottom: 10 },
  stateText: { color: '#64748B', fontSize: 13 },
  errorText: { color: '#B91C1C', textAlign: 'center' },
  summaryCard: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B2A', marginBottom: 6 },
  summaryMeta: { color: '#475569', fontSize: 13, marginTop: 2 },
  timer: { fontSize: 48, fontWeight: '800', color: '#0D1B2A', textAlign: 'center' },
  timerLabel: { color: '#64748B', textAlign: 'center', marginBottom: 4 },
  primaryBtn: { height: 46, borderRadius: 10, backgroundColor: '#00B761', justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '700' },
  secondaryBtn: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#D7DDE4', justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { fontWeight: '700', color: '#223' },
  disabledBtn: { opacity: 0.5 },
});
