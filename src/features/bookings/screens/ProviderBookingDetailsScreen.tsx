import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { getInitials, openPhoneCall } from '@/lib/communication';
import { ImagePreviewModal } from '@/components/ui/image-preview-modal';
import { getBookingAttachments, type BookingAttachmentRow } from '@/services/bookingAttachmentService';
import {
  getProviderBookingActionState,
  getProviderBookingById,
  updateBookingStatus,
} from '@/services/providerBookingService';
import {
  getProviderChatSummaries,
  subscribeToChatSummaries,
  type ChatSummary,
} from '@/services/chatService';
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

const getServiceLocationLabel = (serviceLocationType?: string | null) =>
  serviceLocationType === 'in_shop'
    ? "Provider's Place (In-Shop)"
    : "Customer's Place (Mobile)";

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

const toComparableString = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const resolveDisplayedAmount = (
  booking: any,
  payment: any,
  historyPayment: ProviderPaymentHistoryItem | null,
  matchedService: ProviderServiceRecord | null,
): number => {
  const paymentAmount = toAmountNumber(payment?.amount);
  const historyAmount = toAmountNumber(historyPayment?.amount);
  const paymentNet = toAmountNumber(
    payment?.net_earnings ?? historyPayment?.net_earnings,
  );
  const paymentPlatformFee = toAmountNumber(
    payment?.platform_fee ?? historyPayment?.platform_fee,
  );
  const paymentDerivedAmount =
    paymentAmount ??
    historyAmount ??
    (paymentNet !== null
      ? paymentNet + (paymentPlatformFee ?? paymentNet * (1 / 9))
      : null);

  const primaryCandidates = [
    paymentDerivedAmount,
    toAmountNumber(booking?.total_amount),
    toAmountNumber(booking?.totalAmount),
  ];
  const positivePrimary = primaryCandidates.find(
    (value): value is number => value !== null && value > 0,
  );
  if (positivePrimary !== undefined) return positivePrimary;

  const hourlyRate =
    toAmountNumber(booking?.hourly_rate) ??
    toAmountNumber(matchedService?.hourly_rate);
  const rawHoursRequired = toAmountNumber(booking?.hours_required);
  const hoursRequired = rawHoursRequired !== null && rawHoursRequired > 0 ? rawHoursRequired : 1;
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

  const fallbackPositive = [hourlyComputed, flatRate, servicePrice].find(
    (value): value is number => value !== null && value > 0,
  );
  if (fallbackPositive !== undefined) return fallbackPositive;

  const nullablePrimary = primaryCandidates.find(
    (value): value is number => value !== null,
  );
  return nullablePrimary ?? 0;
};

export function ProviderBookingDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<ProviderPaymentHistoryItem[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderServiceRecord[]>([]);
  const [chatSummary, setChatSummary] = useState<ChatSummary | null>(null);
  const [attachments, setAttachments] = useState<BookingAttachmentRow[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<BookingAttachmentRow | null>(null);

  const loadChatSummary = React.useCallback(async () => {
    if (!user?.id || !id) {
      setChatSummary(null);
      return;
    }

    try {
      const summaries = await getProviderChatSummaries(user.id);
      setChatSummary(summaries.find((entry) => entry.bookingId === String(id)) || null);
    } catch {
      setChatSummary(null);
    }
  }, [id, user?.id]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        setError('Booking ID is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const data = await getProviderBookingById(String(id));
        if (!mounted) return;

        setBooking(data);
        if (data?.id) {
          try {
            const [pay, history, services, files] = await Promise.all([
              getPaymentByBookingId(String(data.id)).catch(() => null),
              getProviderPaymentHistory().catch(
                () => [] as ProviderPaymentHistoryItem[],
              ),
              getMyProviderServices().catch(() => [] as ProviderServiceRecord[]),
              getBookingAttachments(String(data.id)).catch(() => []),
            ]);
            if (mounted) {
              setPayment(pay);
              setPaymentHistory(history);
              setProviderServices(services);
              setAttachments(files);
            }
          } catch {
            if (mounted) {
              setPayment(null);
              setPaymentHistory([]);
              setProviderServices([]);
              setAttachments([]);
            }
          }
        }
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Failed to load booking details.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    void loadChatSummary();
  }, [loadChatSummary]);

  useEffect(() => {
    if (!user?.id) return;

    return subscribeToChatSummaries({
      role: 'provider',
      userId: user.id,
      onChange: () => {
        void loadChatSummary();
      },
    });
  }, [loadChatSummary, user?.id]);

  const schedule = useMemo(() => {
    if (!booking?.scheduled_at) return 'N/A';
    const d = new Date(booking.scheduled_at);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }, [booking?.scheduled_at]);

  const matchedHistoryPayment = useMemo(() => {
    const bookingId = toComparableString(booking?.id);
    const bookingReference = toComparableString(booking?.booking_reference);
    return (
      paymentHistory.find((entry) => {
        const paymentBookingId = toComparableString((entry as any).booking_id);
        const paymentReference = toComparableString(entry.booking_reference);
        if (bookingId && paymentBookingId && bookingId === paymentBookingId) return true;
        return Boolean(
          bookingReference &&
            paymentReference &&
            bookingReference === paymentReference,
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
        if (bookingServiceId && serviceId && bookingServiceId === serviceId) return true;
        return Boolean(
          bookingServiceTitle &&
            serviceTitle &&
            bookingServiceTitle === serviceTitle,
        );
      }) || null
    );
  }, [booking?.service_id, booking?.service_title, providerServices]);

  const resolvedAmount = useMemo(
    () =>
      resolveDisplayedAmount(booking, payment, matchedHistoryPayment, matchedService),
    [booking, matchedHistoryPayment, matchedService, payment],
  );

  const paymentStatusRaw = payment?.status ?? matchedHistoryPayment?.status ?? 'pending';
  const paymentMethodRaw = payment?.method ?? matchedHistoryPayment?.method ?? 'cash';
  const transactionReference =
    payment?.transaction_reference ??
    payment?.transaction_ref ??
    matchedHistoryPayment?.transaction_reference ??
    matchedHistoryPayment?.transaction_ref ??
    null;

  const onUpdate = async (target: 'in_progress' | 'completed' | 'cancelled' | 'confirmed') => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please log in again before updating booking.');
      return;
    }
    if (!booking?.id) {
      Alert.alert('Missing Booking', 'Booking id is missing.');
      return;
    }

    setBusyAction(target);
    try {
      await updateBookingStatus(booking.id, user.id, target);
      setBooking((prev: any) => (prev ? { ...prev, status: target } : prev));
      Alert.alert('Success', 'Booking updated.');
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update booking.');
      setError(message);
      Alert.alert('Update Failed', message);
    } finally {
      setBusyAction('');
    }
  };

  const actionState = getProviderBookingActionState(booking?.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </Pressable>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? <ActivityIndicator size="large" color="#00B761" style={{ marginTop: 40 }} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!isLoading && booking ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.ref}>{booking.booking_reference || booking.id}</Text>
            <Text style={styles.title}>{booking.service_title}</Text>
            <Text style={styles.sub}>Customer: {booking.customer_name}</Text>
            <Text style={styles.sub}>When: {schedule}</Text>
            <Text style={styles.sub}>Service Location: {getServiceLocationLabel(booking.service_location_type)}</Text>
            <Text style={styles.sub}>Address: {booking.service_address || 'N/A'}</Text>
            <Text style={styles.sub}>Status: {actionState.label}</Text>
            <Text style={styles.amount}>P{resolvedAmount.toFixed(2)}</Text>
            <Text style={styles.sub}>Payment Status: {getPaymentStatusLabel(paymentStatusRaw)}</Text>
            <Text style={styles.sub}>Payment Method: {getPaymentMethodLabel(paymentMethodRaw)}</Text>
            {booking.customer_notes ? (
              <Text style={styles.sub}>Customer Notes: {String(booking.customer_notes)}</Text>
            ) : null}
            {transactionReference ? (
              <Text style={styles.sub}>Transaction Ref: {String(transactionReference)}</Text>
            ) : null}
            {booking.service_description ? <Text style={styles.desc}>{booking.service_description}</Text> : null}
          </View>

          {attachments.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.title}>Attachments</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentGallery}>
                {attachments.map((attachment) => (
                  <Pressable
                    key={attachment.id}
                    style={({ pressed }) => [styles.attachmentCard, pressed && { opacity: 0.8 }]}
                    onPress={() => setPreviewAttachment(attachment)}
                  >
                    <Image source={{ uri: attachment.file_url }} style={styles.attachmentPreview} />
                    <Text style={styles.attachmentTitle} numberOfLines={1}>
                      {attachment.file_name || 'Attachment'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.actions}>
            {chatSummary ? (
              <Pressable
                style={({ pressed }) => [styles.chatActivityCard, pressed && { backgroundColor: '#F0FFF4', opacity: 0.9 }]}
                onPress={() =>
                  router.push({
                    pathname: '/provider-chat',
                    params: {
                      id: booking.id,
                      name: booking.customer_name || 'Customer',
                      initials: getInitials(booking.customer_name),
                      phone: booking.customer_contact || '',
                      serviceName: booking.service_title || 'Service Booking',
                    },
                  } as any)
                }
                disabled={Boolean(busyAction)}
              >
                <View style={styles.chatActivityIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#00B761" />
                </View>
                <View style={styles.chatActivityContent}>
                  <View style={styles.chatActivityTitleRow}>
                    <Text style={styles.chatActivityTitle}>
                      Last message {chatSummary.lastMessageTime}
                    </Text>
                    {chatSummary.unreadCount > 0 ? (
                      <View style={styles.chatUnreadPill}>
                        <Text style={styles.chatUnreadText}>
                          {chatSummary.unreadCount > 1
                            ? `${chatSummary.unreadCount} new messages`
                            : 'New message'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.chatActivityBody} numberOfLines={2}>
                    {chatSummary.lastMessage}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && { backgroundColor: '#F1F5F9' }]}
              onPress={() => openPhoneCall(booking.customer_contact, booking.customer_name)}
              disabled={Boolean(busyAction)}
            >
              <Text style={styles.btnSecondaryText}>Call Customer</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && { backgroundColor: '#F1F5F9' }]}
              onPress={() =>
                router.push({
                  pathname: '/provider-chat',
                  params: {
                    id: booking.id,
                    name: booking.customer_name || 'Customer',
                    initials: getInitials(booking.customer_name),
                    phone: booking.customer_contact || '',
                  },
                } as any)
              }
              disabled={Boolean(busyAction)}
            >
              <Text style={styles.btnSecondaryText}>Message Customer</Text>
            </Pressable>

            {actionState.canConfirm ? (
              <Pressable 
                style={({ pressed }) => [styles.btn, (pressed || busyAction === 'confirmed') && { opacity: 0.8 }]} 
                onPress={() => onUpdate('confirmed')} 
                disabled={busyAction === 'confirmed'}
              >
                <Text style={styles.btnText}>{busyAction === 'confirmed' ? 'Please wait...' : 'Confirm Booking'}</Text>
              </Pressable>
            ) : null}

            {actionState.canNavigate ? (
              <Pressable
                style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
                onPress={() => router.push({ pathname: '/provider-navigation', params: { id: booking.id } } as any)}
                disabled={Boolean(busyAction)}
              >
                <Text style={styles.btnText}>Open Navigation</Text>
              </Pressable>
            ) : null}

            {actionState.canStartService ? (
              <Pressable
                style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
                onPress={() => router.push({ pathname: '/provider-start-service', params: { id: booking.id } } as any)}
                disabled={Boolean(busyAction)}
              >
                <Text style={styles.btnText}>Start Service</Text>
              </Pressable>
            ) : null}

            {actionState.canCancel ? (
              <Pressable
                style={({ pressed }) => [styles.btnSecondary, pressed && { backgroundColor: '#F1F5F9' }]}
                onPress={() => router.push({ pathname: '/provider-reschedule', params: { id: booking.id } } as any)}
                disabled={Boolean(busyAction)}
              >
                <Text style={styles.btnSecondaryText}>Request Reschedule</Text>
              </Pressable>
            ) : null}

            {actionState.canResumeService ? (
              <>
                <Pressable
                  style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push({ pathname: '/provider-service-in-progress', params: { id: booking.id } } as any)}
                  disabled={Boolean(busyAction)}
                >
                  <Text style={styles.btnText}>Continue Service</Text>
                </Pressable>
                <Pressable 
                  style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]} 
                  onPress={() => router.push({ pathname: '/provider-complete-service', params: { id: booking.id } } as any)} 
                  disabled={Boolean(busyAction)}
                >
                  <Text style={styles.btnText}>Complete Service</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.btnSecondary, pressed && { backgroundColor: '#F1F5F9' }]}
                  onPress={() => router.push({ pathname: '/provider-additional-charges', params: { id: booking.id } } as any)}
                  disabled={Boolean(busyAction)}
                >
                  <Text style={styles.btnSecondaryText}>Request Additional Charges</Text>
                </Pressable>
              </>
            ) : null}

            {actionState.canCancel ? (
              <Pressable 
                style={({ pressed }) => [styles.btnDanger, pressed && { backgroundColor: '#FFD1D1' }]} 
                onPress={() => router.push({ pathname: '/provider-cancel-booking', params: { id: booking.id } } as any)} 
                disabled={Boolean(busyAction)}
              >
                <Text style={styles.btnDangerText}>Cancel Booking</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      ) : null}

      <ImagePreviewModal
        visible={Boolean(previewAttachment)}
        imageUrl={previewAttachment?.file_url || ''}
        title={previewAttachment?.file_name || 'Attachment Preview'}
        onClose={() => setPreviewAttachment(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14 },
  ref: { fontSize: 12, color: '#667' },
  title: { fontSize: 16, fontWeight: '700', color: '#0D1B2A', marginTop: 4 },
  sub: { fontSize: 13, color: '#556', marginTop: 5 },
  amount: { marginTop: 8, fontSize: 16, fontWeight: '800', color: '#00B761' },
  desc: { marginTop: 8, color: '#445', fontSize: 13 },
  actions: { gap: 10 },
  chatActivityCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCEFE5',
    backgroundColor: '#F8FFF9',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatActivityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8FBF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatActivityContent: {
    flex: 1,
    marginRight: 12,
  },
  chatActivityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  chatActivityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D1B2A',
    flex: 1,
  },
  chatUnreadPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E8FBF2',
  },
  chatUnreadText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00B761',
  },
  chatActivityBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#556',
  },
  attachmentGallery: {
    gap: 12,
    paddingTop: 12,
  },
  attachmentCard: {
    width: 132,
  },
  attachmentPreview: {
    width: 132,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  attachmentTitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  btnSecondary: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#D8DEE6', justifyContent: 'center', alignItems: 'center' },
  btnSecondaryText: { color: '#223', fontWeight: '700' },
  btn: { height: 44, borderRadius: 10, backgroundColor: '#00B761', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700' },
  btnDanger: { height: 44, borderRadius: 10, backgroundColor: '#FFE6E6', justifyContent: 'center', alignItems: 'center' },
  btnDangerText: { color: '#C62828', fontWeight: '700' },
  error: { color: '#C62828', padding: 12 },
});
