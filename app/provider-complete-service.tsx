import React, { useEffect, useState } from 'react';
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
import { clearProviderServiceSession, getProviderServiceSession, getProviderServiceElapsedSeconds } from '@/lib/provider-service-session';
import {
  ensureBookingPayment,
  getPaymentByBookingId,
  getPaymentMethodLabel,
  markBookingPaymentPaid,
  updateBookingPaymentAmount,
  type PaymentMethod,
} from '@/services/paymentService';
import { getMyProviderServices } from '@/services/providerCatalogService';

const toAmountNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toTrimmedString = (value: unknown) => String(value ?? '').trim();
const toComparableString = (value: unknown) => toTrimmedString(value).toLowerCase();

const normalizePaymentMethod = (value: unknown): PaymentMethod => {
  const method = toComparableString(value);
  if (
    method === 'cash' ||
    method === 'cash_on_service' ||
    method === 'card' ||
    method === 'wallet' ||
    method === 'gcash' ||
    method === 'paymaya'
  ) {
    return method;
  }
  return 'cash';
};

const resolveAmount = (booking: any, payment: any, fallbackService?: any): number => {
  const primaryCandidates = [
    toAmountNumber(payment?.amount),
    toAmountNumber(booking?.total_amount),
    toAmountNumber(booking?.totalAmount),
  ];

  const positivePrimary = primaryCandidates.find(
    (value): value is number => value !== null && value > 0,
  );
  if (positivePrimary !== undefined) return positivePrimary;

  const hourlyRate =
    toAmountNumber(booking?.hourly_rate) ??
    toAmountNumber(fallbackService?.hourly_rate);
  const rawHoursRequired = toAmountNumber(booking?.hours_required);
  const hoursRequired = rawHoursRequired !== null && rawHoursRequired > 0 ? rawHoursRequired : 1;
  const hourlyComputed =
    hourlyRate !== null && hourlyRate > 0 ? hourlyRate * hoursRequired : null;
  const flatRate =
    toAmountNumber(booking?.flat_rate) ??
    toAmountNumber(fallbackService?.flat_rate);
  const servicePrice =
    toAmountNumber(booking?.service_price) ??
    toAmountNumber(booking?.serviceAmount) ??
    toAmountNumber(fallbackService?.price);

  const positiveFallback = [hourlyComputed, flatRate, servicePrice].find(
    (value): value is number => value !== null && value > 0,
  );
  if (positiveFallback !== undefined) return positiveFallback;

  const nullablePrimary = primaryCandidates.find(
    (value): value is number => value !== null,
  );
  return nullablePrimary ?? 0;
};

export default function ProviderCompleteServiceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id, elapsedSeconds } = useLocalSearchParams<{ id: string; elapsedSeconds?: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [durationSeconds, setDurationSeconds] = useState(Number(elapsedSeconds || 0) || 0);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        setLoadError('Booking id is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const [bookingData, session, paymentData] = await Promise.all([
          getProviderBookingById(String(id)),
          getProviderServiceSession(String(id)),
          getPaymentByBookingId(String(id)).catch(() => null),
        ]);

        if (!mounted) return;

        setBooking(bookingData);
        setPayment(paymentData);
        if (session) {
          setDurationSeconds(getProviderServiceElapsedSeconds(session));
        }
      } catch (err) {
        if (mounted) {
          setLoadError(getErrorMessage(err, 'Could not load completion details.'));
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const onComplete = async () => {
    if (!id || !user?.id) {
      Alert.alert('Missing Details', 'Please reopen this booking and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingId = String(id);
      let resolvedAmount = resolveAmount(booking, payment);
      if (resolvedAmount <= 0) {
        const providerServices = await getMyProviderServices().catch(() => []);
        const bookingServiceId = toComparableString(booking?.service_id);
        const bookingServiceTitle = toComparableString(booking?.service_title);
        const matchedService =
          providerServices.find((service) => {
            const serviceId = toComparableString(service.id);
            const serviceTitle = toComparableString(service.title);
            if (bookingServiceId && serviceId && bookingServiceId === serviceId) {
              return true;
            }
            return Boolean(
              bookingServiceTitle &&
                serviceTitle &&
                bookingServiceTitle === serviceTitle,
            );
          }) || null;
        resolvedAmount = resolveAmount(booking, payment, matchedService);
      }

      await updateBookingStatus(bookingId, user.id, 'completed');
      const receiptParams = {
        id: bookingId,
        amountHint: resolvedAmount > 0 ? String(resolvedAmount) : undefined,
      };

      const customerId = toTrimmedString(booking?.customer_id);
      const providerId = toTrimmedString(booking?.provider_id || user.id);
      const paymentMethod = normalizePaymentMethod(
        payment?.method ?? booking?.payment_method,
      );

      let paymentSyncError = '';
      if (resolvedAmount > 0 && customerId && providerId) {
        try {
          await ensureBookingPayment({
            bookingId,
            customerId,
            provider_id: providerId,
            amount: resolvedAmount,
            method: paymentMethod,
          });
          await updateBookingPaymentAmount(bookingId, resolvedAmount);
          await markBookingPaymentPaid({
            bookingId,
            amount: resolvedAmount,
            customerId,
            providerId,
            method: paymentMethod,
          });
        } catch (paymentErr) {
          paymentSyncError = getErrorMessage(
            paymentErr,
            'Payment sync failed after completion.',
          );
        }
      }

      await clearProviderServiceSession(bookingId);
      if (paymentSyncError) {
        Alert.alert(
          'Completed with Warning',
          `${paymentSyncError}\n\nReceipt will use the best available amount data.`,
          [
            {
              text: 'View Receipt',
              onPress: () =>
                router.replace({
                  pathname: '/provider-receipt',
                  params: receiptParams,
                } as any),
            },
          ],
        );
        return;
      }

      router.replace({ pathname: '/provider-receipt', params: receiptParams } as any);
    } catch (err) {
      Alert.alert('Failed', getErrorMessage(err, 'Could not complete booking.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionState = getProviderBookingActionState(booking?.status);
  const isAlreadyCompleted = actionState.normalizedStatus === 'completed';

  const onFallbackAction = () => {
    if (!booking?.id) return;

    if (actionState.canResumeService) {
      router.replace({ pathname: '/provider-service-in-progress', params: { id: booking.id } } as any);
      return;
    }

    if (isAlreadyCompleted) {
      router.replace({ pathname: '/provider-receipt', params: { id: booking.id } } as any);
      return;
    }

    if (actionState.canStartService) {
      router.replace({ pathname: '/provider-start-service', params: { id: booking.id } } as any);
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
        <Text style={styles.headerTitle}>Complete Service</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="small" color="#00B761" />
            <Text style={styles.stateText}>Loading completion details...</Text>
          </View>
        ) : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {!isLoading && booking ? (
          <View style={styles.summaryCard}>
            <Text style={styles.serviceTitle}>{booking.service_title || 'Service'}</Text>
            <Text style={styles.metaText}>Customer: {booking.customer_name || 'Customer'}</Text>
            <Text style={styles.metaText}>Address: {booking.service_address || 'N/A'}</Text>
            <Text style={styles.metaText}>Current Status: {actionState.label}</Text>
            <Text style={styles.metaText}>Tracked Duration: {formatDuration(durationSeconds)}</Text>
            <Text style={styles.metaText}>Payment Method: {getPaymentMethodLabel(payment?.method || 'cash')}</Text>
          </View>
        ) : null}

        <Text style={styles.info}>
          Confirm completion to close the active service session, mark the booking as completed, and capture the payment record.
        </Text>
        <TouchableOpacity style={[styles.btn, (!actionState.canComplete || isSubmitting) && styles.disabledBtn]} onPress={onComplete} disabled={!actionState.canComplete || isSubmitting}>
          <Text style={styles.btnText}>{isSubmitting ? 'Please wait...' : 'Mark as Complete'}</Text>
        </TouchableOpacity>

        {!actionState.canComplete ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onFallbackAction}>
            <Text style={styles.secondaryBtnText}>
              {actionState.canResumeService
                ? 'Return to Active Service'
                : isAlreadyCompleted
                  ? 'View Receipt'
                  : actionState.canStartService
                    ? 'Start Service'
                    : 'View Booking'}
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
  content: { padding: 16, gap: 14 },
  stateWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stateText: { color: '#64748B' },
  errorText: { color: '#B91C1C' },
  summaryCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  serviceTitle: { fontSize: 17, fontWeight: '700', color: '#0D1B2A', marginBottom: 6 },
  metaText: { color: '#475569', fontSize: 13, marginTop: 3 },
  info: { color: '#556' },
  btn: { backgroundColor: '#00B761', borderRadius: 10, height: 44, justifyContent: 'center', alignItems: 'center' },
  secondaryBtn: {
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7DDE4',
  },
  secondaryBtnText: { color: '#223', fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  btnText: { color: '#FFF', fontWeight: '700' },
});
