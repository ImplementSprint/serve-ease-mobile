import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getProviderBookingById } from '@/services/providerBookingService';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getPaymentByBookingId,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getProviderPaymentHistory,
  type ProviderPaymentHistoryItem,
} from '@/services/paymentService';
import {
  getMyProviderServices,
  type ProviderServiceRecord,
} from '@/services/providerCatalogService';

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

const toTrimmedString = (value: unknown): string => String(value ?? '').trim();
const toComparableString = (value: unknown): string =>
  toTrimmedString(value).toLowerCase();

type ReceiptHints = {
  amount: number | null;
  platformFee: number | null;
  earnings: number | null;
};

const resolveReceiptAmounts = (
  booking: any,
  payment: any,
  historyPayment: ProviderPaymentHistoryItem | null,
  matchedService: ProviderServiceRecord | null,
  hints: ReceiptHints,
): { amount: number; platformFee: number; earnings: number } => {
  const primaryAmountCandidates = [
    hints.amount,
    toAmountNumber(payment?.amount),
    toAmountNumber(historyPayment?.amount),
    toAmountNumber(booking?.total_amount),
    toAmountNumber(booking?.totalAmount),
  ];

  let amount =
    primaryAmountCandidates.find(
      (value): value is number => value !== null && value > 0,
    ) ?? null;

  if (amount === null) {
    const hourlyRate =
      toAmountNumber(booking?.hourly_rate) ??
      toAmountNumber(matchedService?.hourly_rate);
    const rawHoursRequired = toAmountNumber(booking?.hours_required);
    const hoursRequired =
      rawHoursRequired !== null && rawHoursRequired > 0 ? rawHoursRequired : 1;
    const hourlyComputed =
      hourlyRate !== null && hourlyRate > 0 ? hourlyRate * hoursRequired : null;
    const flatRate =
      toAmountNumber(booking?.flat_rate) ??
      toAmountNumber(matchedService?.flat_rate);
    const servicePrice = toAmountNumber(
      booking?.service_price ??
        booking?.serviceAmount ??
        booking?.service?.price ??
        matchedService?.price,
    );

    amount =
      [hourlyComputed, flatRate, servicePrice].find(
        (value): value is number => value !== null && value > 0,
      ) ??
      primaryAmountCandidates.find(
        (value): value is number => value !== null,
      ) ??
      0;
  }

  const paymentPlatformFee =
    hints.platformFee ??
    toAmountNumber(payment?.platform_fee) ??
    toAmountNumber(historyPayment?.platform_fee);
  const paymentNetEarnings =
    hints.earnings ??
    toAmountNumber(payment?.net_earnings) ??
    toAmountNumber(historyPayment?.net_earnings);

  let platformFee = paymentPlatformFee;
  let earnings = paymentNetEarnings;

  if (platformFee === null && earnings !== null && amount > 0) {
    platformFee = Math.max(amount - earnings, 0);
  }
  if (earnings === null && platformFee !== null && amount > 0) {
    earnings = Math.max(amount - platformFee, 0);
  }
  if (platformFee === null) {
    platformFee = amount > 0 ? amount * 0.1 : 0;
  }
  if (earnings === null) {
    earnings = Math.max(amount - platformFee, 0);
  }

  return {
    amount,
    platformFee,
    earnings,
  };
};

export default function ProviderReceiptScreen() {
  const router = useRouter();
  const { id, amountHint, platformFeeHint, earningsHint } = useLocalSearchParams<{
    id: string;
    amountHint?: string;
    platformFeeHint?: string;
    earningsHint?: string;
  }>();
  const [booking, setBooking] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<ProviderPaymentHistoryItem[]>(
    [],
  );
  const [providerServices, setProviderServices] = useState<ProviderServiceRecord[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return setIsLoading(false);
      try {
        const row = await getProviderBookingById(String(id));
        if (!row?.id) {
          if (mounted) setBooking(row);
          return;
        }

        const [pay, history, services] = await Promise.all([
          getPaymentByBookingId(String(row.id)).catch(() => null),
          getProviderPaymentHistory().catch(() => [] as ProviderPaymentHistoryItem[]),
          getMyProviderServices().catch(() => [] as ProviderServiceRecord[]),
        ]);

        if (mounted) {
          setBooking(row);
          setPayment(pay);
          setPaymentHistory(history);
          setProviderServices(services);
        }
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load receipt.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const receiptHints = useMemo<ReceiptHints>(
    () => ({
      amount: toAmountNumber(amountHint),
      platformFee: toAmountNumber(platformFeeHint),
      earnings: toAmountNumber(earningsHint),
    }),
    [amountHint, earningsHint, platformFeeHint],
  );

  const matchedHistoryPayment = useMemo(() => {
    const bookingId = toComparableString(booking?.id);
    const bookingReference = toComparableString(booking?.booking_reference);
    return (
      paymentHistory.find((item) => {
        const itemBookingId = toComparableString(item.booking_id);
        const itemReference = toComparableString(item.booking_reference);
        if (bookingId && itemBookingId && bookingId === itemBookingId) return true;
        return Boolean(
          bookingReference && itemReference && bookingReference === itemReference,
        );
      }) || null
    );
  }, [booking?.booking_reference, booking?.id, paymentHistory]);

  const matchedService = useMemo(() => {
    const bookingServiceId = toComparableString(booking?.service_id);
    const bookingServiceTitle = toComparableString(booking?.service_title);

    return (
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
      }) || null
    );
  }, [booking?.service_id, booking?.service_title, providerServices]);

  const { amount, platformFee, earnings } = useMemo(
    () =>
      resolveReceiptAmounts(
        booking,
        payment,
        matchedHistoryPayment,
        matchedService,
        receiptHints,
      ),
    [booking, matchedHistoryPayment, matchedService, payment, receiptHints],
  );

  const onShare = async () => {
    if (!booking) return;
    await Share.share({
      message: `Receipt ${booking.booking_reference || booking.id}: ${
        booking.service_title
      } - P${amount.toFixed(2)}`,
    });
  };

  const paymentStatusRaw = payment?.status ?? matchedHistoryPayment?.status ?? 'pending';
  const paymentMethodRaw = payment?.method ?? matchedHistoryPayment?.method ?? 'cash';
  const transactionReference =
    payment?.transaction_reference ??
    payment?.transaction_ref ??
    matchedHistoryPayment?.transaction_reference ??
    matchedHistoryPayment?.transaction_ref ??
    null;

  const exitReceipt = () => {
    router.replace('/(provider-tabs)/bookings' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={exitReceipt}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Receipt</Text>
        <TouchableOpacity onPress={onShare}>
          <Ionicons name="share-outline" size={22} color="#0D1B2A" />
        </TouchableOpacity>
      </View>

      {isLoading ? <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 28 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!isLoading && booking ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.ref}>{booking.booking_reference || booking.id}</Text>
          <Text style={styles.title}>{booking.service_title}</Text>
          <Text style={styles.sub}>Customer: {booking.customer_name}</Text>
          <Text style={styles.sub}>Address: {booking.service_address}</Text>
          <Text style={styles.sub}>Payment Status: {getPaymentStatusLabel(paymentStatusRaw)}</Text>
          <Text style={styles.sub}>Payment Method: {getPaymentMethodLabel(paymentMethodRaw)}</Text>
          {transactionReference ? (
            <Text style={styles.sub}>Transaction Ref: {String(transactionReference)}</Text>
          ) : null}
          <Text style={styles.sub}>Total Charged: P{amount.toFixed(2)}</Text>
          <Text style={styles.sub}>Platform Fee (10%): P{platformFee.toFixed(2)}</Text>
          <Text style={styles.earnings}>Your Earnings: P{earnings.toFixed(2)}</Text>

          <TouchableOpacity style={styles.doneBtn} onPress={exitReceipt}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { padding: 20, gap: 8 },
  ref: { fontSize: 12, color: '#667' },
  title: { fontSize: 18, fontWeight: '800', color: '#0D1B2A' },
  sub: { fontSize: 14, color: '#445' },
  earnings: { marginTop: 8, fontSize: 16, fontWeight: '800', color: '#00B761' },
  doneBtn: {
    marginTop: 18,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#00B761',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { color: '#FFF', fontWeight: '700' },
  error: { color: '#C62828', padding: 12 },
});

