import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, SafeAreaView, StatusBar, Image, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { TOKENS } from '@/constants/tokens';
import { getAvatarUrl } from '@/lib/avatar';

import { getErrorMessage } from '@/lib/error-handling';
import { getBookingAttachments, type BookingAttachmentRow } from '@/services/bookingAttachmentService';
import { getBookingById } from '@/services/bookingService';
import { getProviderProfileData } from '@/services/marketplaceService';
import {
  getPaymentByBookingId,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from '@/services/paymentService';
import { getCustomerBookingPresentation } from '@/lib/booking-status';
import { openPhoneCall } from '@/lib/communication';
import { useAuth } from '@/hooks/useAuth';
import { ImagePreviewModal } from '@/components/ui/image-preview-modal';
import {
  getCustomerChatSummaries,
  subscribeToChatSummaries,
  type ChatSummary,
} from '@/services/chatService';
import {
  getProviderAdditionalChargeRequests,
  getProviderRescheduleRequests,
  reviewAdditionalChargeRequest,
  reviewRescheduleRequest,
  type AdditionalChargeRow,
  type BookingRescheduleRequestRow,
} from '@/services/providerBookingActionsService';

import {
  Booking,
  Payment,
} from '@/src/types/database.interfaces';

const { width } = Dimensions.get('window');

const formatScheduleFromProposal = (dateRaw: string, timeRaw: string) => {
  const parsed = new Date(`${dateRaw} ${timeRaw}`);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      date: parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      year: String(parsed.getFullYear()),
      time: parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  }

  return {
    date: dateRaw,
    year: '',
    time: timeRaw,
  };
};

const getServiceLocationSummary = (serviceLocationType?: string | null) => {
  return serviceLocationType === 'in_shop'
    ? {
        label: "Provider's Place (In-Shop)",
        helper: 'You go to the provider for this service.',
      }
    : {
        label: "Customer's Place (Mobile)",
        helper: 'The provider travels to the booking address.',
      };
};

const getProviderAvatarUrl = (providerId: string) => {
  const normalizedProviderId = String(providerId || '').trim();
  if (!normalizedProviderId) {
    return 'https://i.pravatar.cc/150?u=provider';
  }

  return getAvatarUrl(normalizedProviderId);
};

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

const resolveDisplayedBookingTotal = (bookingData: any, payment: Payment | null): number => {
  const primaryCandidates = [
    toAmountNumber(payment?.amount),
    toAmountNumber(bookingData?.total_amount),
    toAmountNumber(bookingData?.totalAmount),
  ];

  const positivePrimary = primaryCandidates.find(
    (value): value is number => value !== null && value > 0,
  );
  if (positivePrimary !== undefined) return positivePrimary;

  const hourlyRate = toAmountNumber(bookingData?.hourly_rate);
  const rawHoursRequired = toAmountNumber(bookingData?.hours_required);
  const hoursRequired = rawHoursRequired !== null && rawHoursRequired > 0 ? rawHoursRequired : 1;
  const hourlyComputed =
    hourlyRate !== null && hourlyRate > 0 ? hourlyRate * hoursRequired : null;
  if (hourlyComputed !== null && hourlyComputed > 0) return hourlyComputed;

  const servicePrice = toAmountNumber(
    bookingData?.serviceAmount ?? bookingData?.service?.price,
  );
  if (servicePrice !== null && servicePrice > 0) return servicePrice;

  const fallbackPrimary = primaryCandidates.find(
    (value): value is number => value !== null,
  );
  if (fallbackPrimary !== undefined) return fallbackPrimary;

  return 0;
};

export function CustomerBookingDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ booking?: string; id?: string; freshBooking?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState<ChatSummary | null>(null);
  const [attachments, setAttachments] = useState<BookingAttachmentRow[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<BookingAttachmentRow | null>(null);
  const [rescheduleRequests, setRescheduleRequests] = useState<BookingRescheduleRequestRow[]>([]);
  const [additionalChargeRequests, setAdditionalChargeRequests] = useState<AdditionalChargeRow[]>([]);
  const [requestAction, setRequestAction] = useState<'reschedule' | 'charges' | null>(null);

  const initialBooking = useMemo<Partial<Booking> & { service?: string; date?: string; year?: string; time?: string; totalAmount?: string; rawId?: string; countdown?: any; provider?: any; loadError?: string } | null>(() => {
    if (params.booking) {
      try {
        return JSON.parse(params.booking);
      } catch {}
    }
    return null;
  }, [params.booking]);

  const [booking, setBooking] = useState<any>(initialBooking);
  const provider = booking?.provider || {};
  const [payment, setPayment] = useState<Payment | null>(null);
  const bookingIdForChat = String(booking?.rawId || params.id || '').trim();
  const bookingId = String(booking?.rawId || params.id || '').trim();
  const isFreshBooking = String(params.freshBooking || '').toLowerCase() === 'true';
  const countdown = booking?.countdown || {};
  const resolvedTotalAmount = useMemo(
    () => resolveDisplayedBookingTotal(booking, payment),
    [booking, payment],
  );
  const safeBooking = {
    id: booking?.booking_reference || booking?.id || 'Booking',
    rawId: booking?.id || booking?.rawId || '',
    service: booking?.service || 'Service Booking',
    address: booking?.service_address || booking?.address || 'No address provided.',
    date: booking?.date || 'N/A',
    year: booking?.year || '',
    time: booking?.time || 'N/A',
    totalAmount: resolvedTotalAmount.toFixed(2),
    notes: booking?.customer_notes || booking?.notes || '',
  };
  const locationSummary = getServiceLocationSummary(booking?.service_location_type);

  const loadChatSummary = React.useCallback(async () => {
    if (!user?.id || !bookingIdForChat) {
      setChatSummary(null);
      return;
    }

    try {
      const summaries = await getCustomerChatSummaries(user.id);
      setChatSummary(summaries.find((entry) => entry.bookingId === bookingIdForChat) || null);
    } catch {
      setChatSummary(null);
    }
  }, [bookingIdForChat, user?.id]);

  useEffect(() => {
    let active = true;

    async function loadLiveBooking() {
      const bookingId = String(params.id || initialBooking?.id || '').trim();
      if (!bookingId || bookingId.startsWith('BK-')) return;

      setIsLoading(true);
      try {
        const bookingRow = await getBookingById(bookingId);
        if (!bookingRow) return;

        const providerId = String(bookingRow.provider_id || '').trim();
        const providerProfilePayload = providerId
          ? await getProviderProfileData(providerId).catch(() => null)
          : null;
        const providerProfile = providerProfilePayload?.profile || null;
        const providerServices = Array.isArray(providerProfilePayload?.services)
          ? providerProfilePayload.services
          : [];
        const matchedService = providerServices.find(
          (service: any) => String(service?.id || '').trim() === String(bookingRow.service_id || '').trim()
        );

        const scheduled = bookingRow.scheduled_at ? new Date(bookingRow.scheduled_at) : null;
        const now = new Date();
        const diffMs = scheduled ? Math.max(0, scheduled.getTime() - now.getTime()) : 0;
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const statusRaw = String(bookingRow.status || 'Pending');
        const providerName = String((bookingRow as any)?.provider?.full_name || 'Service Provider');
        const serviceTitle = String(matchedService?.title || initialBooking?.service || 'Service Booking');
        const ratingRaw =
          Number(providerProfile?.average_rating) ||
          Number((bookingRow as any)?.provider?.average_rating) ||
          0;
        const specialty = String(
          providerProfile?.business_name ||
            (bookingRow as any)?.provider?.business_name ||
            serviceTitle
        ).trim();

        const normalized: Partial<Booking> & {
          rawId: string;
          service: string;
          address: string;
          date: string;
          year: string;
          time: string;
          totalAmount: string;
          serviceAmount?: number | null;
          provider: any;
          countdown: any;
          notes: string;
        } = {
          id: bookingRow.id,
          rawId: bookingRow.id,
          booking_reference: bookingRow.booking_reference,
          status: statusRaw as any,
          service: serviceTitle,
          service_location_type: bookingRow.service_location_type,
          service_address: bookingRow.service_address,
          address: bookingRow.service_address || 'N/A',
          date: scheduled
            ? scheduled.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
            : initialBooking?.date || 'N/A',
          year: scheduled ? String(scheduled.getFullYear()) : initialBooking?.year || '',
          time: scheduled
            ? scheduled.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : initialBooking?.time || 'N/A',
          total_amount: bookingRow.total_amount,
          totalAmount: Number(
            toAmountNumber(bookingRow.total_amount) ??
              toAmountNumber((bookingRow as any).totalAmount) ??
              toAmountNumber(matchedService?.price) ??
              0,
          ).toFixed(2),
          hourly_rate: bookingRow.hourly_rate,
          flat_rate: (bookingRow as any).flat_rate ?? matchedService?.flat_rate ?? null,
          hours_required: bookingRow.hours_required,
          serviceAmount: toAmountNumber(matchedService?.price),
          customer_notes: bookingRow.customer_notes || '',
          notes: String(bookingRow.customer_notes || '').trim(),
          countdown: {
            days: String(days),
            hours: String(hours),
            mins: String(mins),
          },
          provider: {
            id: providerId,
            name: providerName,
            phone: String((bookingRow as any)?.provider?.contact_number || ''),
            rating: ratingRaw.toFixed(1),
            specialty: specialty || serviceTitle,
            avatar: getProviderAvatarUrl(providerId),
            isVerified:
              String(providerProfile?.verification_status || '').toLowerCase() === 'approved',
          },
        };

        if (active) {
          setBooking((prev: any) => ({ ...prev, ...normalized }));
          try {
            const pay = await getPaymentByBookingId(String(bookingRow.id));
            if (active) setPayment(pay);
          } catch {
            if (active) setPayment(null);
          }
          try {
            const files = await getBookingAttachments(String(bookingRow.id));
            if (active) setAttachments(files);
          } catch {
            if (active) setAttachments([]);
          }
        }
      } catch (error) {
        console.error('Failed to load booking details:', error);
        if (active) {
          setBooking((prev: any) => ({
            ...prev,
            loadError: getErrorMessage(error, 'Failed to load live booking details.'),
          }));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadLiveBooking();
    return () => {
      active = false;
    };
  }, [initialBooking?.date, initialBooking?.id, initialBooking?.service, initialBooking?.time, initialBooking?.year, params.id]);

  useEffect(() => {
    void loadChatSummary();
  }, [loadChatSummary]);

  useEffect(() => {
    if (!user?.id) return;

    return subscribeToChatSummaries({
      role: 'customer',
      userId: user.id,
      onChange: () => {
        void loadChatSummary();
      },
    });
  }, [loadChatSummary, user?.id]);

  const bookingState = getCustomerBookingPresentation(booking?.status);
  const isCompleted = bookingState.normalizedStatus === 'completed';
  const isCancelled = bookingState.normalizedStatus === 'cancelled';
  const isPending = bookingState.normalizedStatus === 'pending';
  const isConfirmed = bookingState.normalizedStatus === 'confirmed';
  const isUpcoming = bookingState.tab === 'inProgress';
  const showMyBookingsCta = isPending || isConfirmed;
  const canReviewBooking = isCompleted;
  const canTrackBooking = bookingState.canTrack && Boolean(booking?.rawId || params.id);
  const canCancelBooking = bookingState.canCancel && Boolean(booking?.rawId || params.id);
  const pendingRescheduleRequest = rescheduleRequests.find(
    (entry) => String(entry.status || '').toLowerCase() === 'pending'
  ) || null;
  const pendingAdditionalCharges = additionalChargeRequests.filter(
    (entry) => String(entry.status || '').toLowerCase() === 'pending'
  );
  const pendingAdditionalChargeTotal = pendingAdditionalCharges.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0
  );

  useEffect(() => {
    let active = true;

    async function loadRequestState() {
      if (!bookingId) {
        if (active) {
          setRescheduleRequests([]);
          setAdditionalChargeRequests([]);
        }
        return;
      }

      try {
        const [reschedules, charges] = await Promise.all([
          getProviderRescheduleRequests(bookingId),
          getProviderAdditionalChargeRequests(bookingId),
        ]);

        if (!active) return;
        setRescheduleRequests(reschedules);
        setAdditionalChargeRequests(charges);
      } catch (error) {
        console.warn('Failed to load booking requests:', error);
        if (!active) return;
        setRescheduleRequests([]);
        setAdditionalChargeRequests([]);
      }
    }

    void loadRequestState();
    return () => {
      active = false;
    };
  }, [bookingId]);

  const refreshPayment = React.useCallback(async () => {
    if (!bookingId) {
      setPayment(null);
      return;
    }

    try {
      const pay = await getPaymentByBookingId(bookingId);
      setPayment(pay);
    } catch {
      setPayment(null);
    }
  }, [bookingId]);

  const refreshRequests = React.useCallback(async () => {
    if (!bookingId) {
      setRescheduleRequests([]);
      setAdditionalChargeRequests([]);
      return;
    }

    try {
      const [reschedules, charges] = await Promise.all([
        getProviderRescheduleRequests(bookingId),
        getProviderAdditionalChargeRequests(bookingId),
      ]);
      setRescheduleRequests(reschedules);
      setAdditionalChargeRequests(charges);
    } catch {
      setRescheduleRequests([]);
      setAdditionalChargeRequests([]);
    }
  }, [bookingId]);

  const handleGoToMyBookings = React.useCallback(() => {
    if (isFreshBooking && typeof router.dismissAll === 'function') {
      router.dismissAll();
    }

    router.replace('/(tabs)/bookings' as any);
  }, [isFreshBooking, router]);

  const handleReviewReschedule = React.useCallback(
    async (decision: 'approved' | 'declined') => {
      if (!pendingRescheduleRequest || !bookingId || !user?.id) return;

      setRequestAction('reschedule');
      try {
        await reviewRescheduleRequest({
          requestId: pendingRescheduleRequest.id,
          bookingId,
          customerId: user.id,
          decision,
        });

        if (decision === 'approved') {
          const nextSchedule = formatScheduleFromProposal(
            pendingRescheduleRequest.proposed_date,
            pendingRescheduleRequest.proposed_time
          );

          setBooking((prev: any) => ({
            ...prev,
            date: nextSchedule.date,
            year: nextSchedule.year,
            time: nextSchedule.time,
          }));
        }

        await refreshRequests();
        Alert.alert(
          decision === 'approved' ? 'Reschedule Approved' : 'Reschedule Declined',
          decision === 'approved'
            ? 'The provider will now see the updated service schedule.'
            : 'The provider has been notified that the reschedule was declined.'
        );
      } catch (error) {
        Alert.alert(
          'Review Failed',
          getErrorMessage(error, 'Could not review this reschedule request.')
        );
      } finally {
        setRequestAction(null);
      }
    },
    [bookingId, pendingRescheduleRequest, refreshRequests, user?.id]
  );

  const handleReviewAdditionalCharges = React.useCallback(
    async (decision: 'approved' | 'declined') => {
      if (!pendingAdditionalCharges.length || !bookingId || !user?.id) return;

      setRequestAction('charges');
      try {
        await reviewAdditionalChargeRequest({
          bookingId,
          customerId: user.id,
          chargeIds: pendingAdditionalCharges.map((entry) => entry.id),
          decision,
        });

        if (decision === 'approved') {
          setBooking((prev: any) => {
            const currentTotal = resolveDisplayedBookingTotal(prev, null);
            const nextTotal = currentTotal + pendingAdditionalChargeTotal;
            return {
              ...prev,
              total_amount: nextTotal,
              totalAmount: nextTotal.toFixed(2),
            };
          });
          await refreshPayment();
        }

        await refreshRequests();
        Alert.alert(
          decision === 'approved' ? 'Charges Approved' : 'Charges Declined',
          decision === 'approved'
            ? 'The booking total was updated with the approved charges.'
            : 'The provider has been notified that the extra charges were declined.'
        );
      } catch (error) {
        Alert.alert(
          'Review Failed',
          getErrorMessage(error, 'Could not review these additional charges.')
        );
      } finally {
        setRequestAction(null);
      }
    },
    [bookingId, pendingAdditionalChargeTotal, pendingAdditionalCharges, refreshPayment, refreshRequests, user?.id]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} 
          style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={TOKENS.colors.text.primary} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <Text style={styles.bookingId}>{safeBooking.id}</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}>
          <Ionicons name="share-outline" size={20} color={TOKENS.colors.text.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#00C853" />
            <Text style={styles.loadingText}>Refreshing booking details from database...</Text>
          </View>
        ) : null}
        {booking?.loadError ? <Text style={styles.errorText}>{String(booking.loadError)}</Text> : null}
        
        {/* Status and Service Title */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={
              isCancelled ? [TOKENS.colors.danger.bg, TOKENS.colors.white] :
              isCompleted ? [TOKENS.colors.info.bg, TOKENS.colors.white] :
              [TOKENS.colors.success.bg, TOKENS.colors.white]
            }
            style={styles.heroStatusBadge}
          >
            <View style={[
              styles.statusDot,
              isCancelled && { backgroundColor: TOKENS.colors.danger.text },
              isCompleted && { backgroundColor: TOKENS.colors.info.text }
            ]} />
            <Text style={[
              styles.heroStatusText,
              { color: isCancelled ? TOKENS.colors.danger.text : isCompleted ? TOKENS.colors.info.text : TOKENS.colors.success.text }
            ]}>
              {bookingState.label}
            </Text>
          </LinearGradient>
          <Text style={styles.heroServiceTitle}>{safeBooking.service}</Text>
          <View style={styles.heroAddressRow}>
            <Ionicons name="location" size={14} color={TOKENS.colors.primary} />
            <Text style={styles.heroAddressText} numberOfLines={2} ellipsizeMode="tail">
              {safeBooking.address}
            </Text>
          </View>
          <View style={styles.locationTypeBadge}>
            <Ionicons name="navigate-outline" size={14} color={TOKENS.colors.primary} />
            <Text style={styles.locationTypeBadgeText}>{locationSummary.label}</Text>
          </View>
        </View>

        {/* Schedule Cards */}
        <View style={styles.scheduleContainer}>
          <View style={styles.scheduleCard}>
            <Ionicons name="calendar" size={24} color="#00C853" />
            <Text style={styles.scheduleDate}>{safeBooking.date}</Text>
            <Text style={styles.scheduleYear}>{safeBooking.year}</Text>
          </View>
          <View style={styles.scheduleCard}>
            <Ionicons name="time" size={24} color="#00C853" />
            <Text style={styles.scheduleTime}>{safeBooking.time}</Text>
            <Text style={styles.scheduleSub}>Scheduled</Text>
          </View>
        </View>

        {/* Status Summary */}
        {isUpcoming ? (
          <View style={styles.countdownSection}>
            <Text style={styles.countdownLabel}>SERVICE STARTS IN</Text>
            <View style={styles.timerRow}>
              <View style={styles.timerItem}>
                <View style={styles.timerBox}><Text style={styles.timerNumber}>{String(countdown.days || '0')}</Text></View>
                <Text style={styles.timerLabel}>DAYS</Text>
              </View>
              <Text style={styles.timerSeparator}>:</Text>
              <View style={styles.timerItem}>
                <View style={styles.timerBox}><Text style={styles.timerNumber}>{String(countdown.hours || '0')}</Text></View>
                <Text style={styles.timerLabel}>HRS</Text>
              </View>
              <Text style={styles.timerSeparator}>:</Text>
              <View style={styles.timerItem}>
                <View style={styles.timerBox}><Text style={styles.timerNumber}>{String(countdown.mins || '0')}</Text></View>
                <Text style={styles.timerLabel}>MINS</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.countdownSection, isCancelled && styles.countdownSectionCancelled]}>
            <Text style={styles.summaryTitle}>{bookingState.summaryTitle}</Text>
            <Text style={styles.summaryText}>{bookingState.summaryText}</Text>
          </View>
        )}

        {/* Provider Assigned Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PROVIDER ASSIGNED</Text>
        </View>
        <View style={styles.providerCard}>
          <View style={styles.providerHeader}>
            <View>
              <Image source={{ uri: provider.avatar || 'https://i.pravatar.cc/150?u=provider' }} style={styles.providerAvatar} />
              {provider.isVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-sharp" size={10} color="#fff" />
                </View>
              ) : null}
            </View>
            <View style={styles.providerMainInfo}>
              <View style={styles.providerNameRow}>
                <Text style={styles.providerName}>{provider.name || 'Service Provider'}</Text>
                {provider.isVerified && (
                  <View style={styles.verifiedTag}>
                    <Ionicons name="shield-checkmark" size={12} color="#00C853" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              <View style={styles.providerRatingRow}>
                <Ionicons name="star" size={14} color="#FFA000" />
                <Text style={styles.providerRating}>{provider.rating ?? '0.0'}</Text>
                <Text style={styles.providerSpecialty}> • {provider.specialty || safeBooking.service}</Text>
              </View>
            </View>
          </View>

          <View style={styles.providerActions}>
            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && { backgroundColor: '#F1F5F9' }]}
              onPress={() => openPhoneCall(provider.phone, provider.name)}
            >
              <Ionicons name="call" size={18} color="#0D1B2A" />
              <Text style={styles.actionButtonText}>Call</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && { backgroundColor: '#F1F5F9' }]}
              onPress={() =>
                router.push({
                  pathname: '/customer-chat',
                  params: {
                    id: String(booking.rawId || params.id || ''),
                    providerName: provider.name || 'Service Provider',
                    serviceName: provider.specialty || safeBooking.service,
                    phone: provider.phone || '',
                  },
                } as any)
              }
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#0D1B2A" />
              <Text style={styles.actionButtonText}>Message</Text>
            </Pressable>
          </View>
        </View>

        {/* Booking Details Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>BOOKING DETAILS</Text>
        </View>
        <View style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="location-outline" size={20} color="#666" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Service Address</Text>
              <Text style={[styles.detailValue, styles.detailValueAddress]}>
                {safeBooking.address}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="wallet-outline" size={20} color="#666" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>
                {getPaymentMethodLabel(payment?.method || 'cash')}
              </Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="card-outline" size={20} color="#666" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Payment Status</Text>
              <Text style={styles.detailValue}>
                {getPaymentStatusLabel(payment?.status || 'pending')}
              </Text>
            </View>
          </View>
          {safeBooking.notes ? (
            <View style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="document-text-outline" size={20} color="#666" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Customer Notes</Text>
                <Text style={styles.detailValue}>{safeBooking.notes}</Text>
              </View>
            </View>
          ) : null}
          
          <View style={styles.priceContainer}>
            <Text style={styles.totalLabel}>Total Amount ({getPaymentMethodLabel(payment?.method || 'cash')})</Text>
            <Text style={styles.totalValue}>P{safeBooking.totalAmount}</Text>
          </View>
        </View>

        {attachments.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ATTACHMENTS</Text>
            </View>
            <View style={styles.detailsCard}>
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
          </>
        ) : null}

        {pendingRescheduleRequest ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PENDING RESCHEDULE REQUEST</Text>
            </View>
            <View style={styles.requestCard}>
              <View style={styles.requestHeaderRow}>
                <View style={styles.requestIconWrap}>
                  <Ionicons name="calendar-outline" size={18} color="#00C853" />
                </View>
                <View style={styles.requestContent}>
                  <Text style={styles.requestTitle}>Provider requested a new schedule</Text>
                  <Text style={styles.requestSubtitle}>
                    {pendingRescheduleRequest.proposed_date} at {pendingRescheduleRequest.proposed_time}
                  </Text>
                </View>
              </View>
              <Text style={styles.requestBody}>{pendingRescheduleRequest.reason}</Text>
              <Text style={styles.requestExplanation}>{pendingRescheduleRequest.explanation}</Text>
              <View style={styles.requestActions}>
                <Pressable
                  style={({ pressed }) => [styles.requestDeclineButton, pressed && { backgroundColor: '#FEF2F2' }]}
                  disabled={requestAction === 'reschedule'}
                  onPress={() => void handleReviewReschedule('declined')}
                >
                  <Text style={styles.requestDeclineText}>
                    {requestAction === 'reschedule' ? 'Saving...' : 'Decline'}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.requestApproveButton, pressed && { opacity: 0.9 }]}
                  disabled={requestAction === 'reschedule'}
                  onPress={() => void handleReviewReschedule('approved')}
                >
                  <Text style={styles.requestApproveText}>
                    {requestAction === 'reschedule' ? 'Saving...' : 'Approve'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

        {pendingAdditionalCharges.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>PENDING ADDITIONAL CHARGES</Text>
            </View>
            <View style={styles.requestCard}>
              <View style={styles.requestHeaderRow}>
                <View style={[styles.requestIconWrap, styles.requestIconWrapWarn]}>
                  <Ionicons name="cash-outline" size={18} color="#C77800" />
                </View>
                <View style={styles.requestContent}>
                  <Text style={styles.requestTitle}>Provider requested extra charges</Text>
                  <Text style={styles.requestSubtitle}>
                    +P{pendingAdditionalChargeTotal.toFixed(2)} across {pendingAdditionalCharges.length}{' '}
                    {pendingAdditionalCharges.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>
              {pendingAdditionalCharges.map((charge) => (
                <View key={charge.id} style={styles.chargeItemRow}>
                  <View style={styles.chargeItemTextWrap}>
                    <Text style={styles.chargeItemTitle}>{charge.description}</Text>
                    {charge.justification ? (
                      <Text style={styles.chargeItemBody}>{charge.justification}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.chargeAmount}>P{Number(charge.amount || 0).toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.requestActions}>
                <Pressable
                  style={({ pressed }) => [styles.requestDeclineButton, pressed && { backgroundColor: '#FEF2F2' }]}
                  disabled={requestAction === 'charges'}
                  onPress={() => void handleReviewAdditionalCharges('declined')}
                >
                  <Text style={styles.requestDeclineText}>
                    {requestAction === 'charges' ? 'Saving...' : 'Decline'}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.requestApproveButton, pressed && { opacity: 0.9 }]}
                  disabled={requestAction === 'charges'}
                  onPress={() => void handleReviewAdditionalCharges('approved')}
                >
                  <Text style={styles.requestApproveText}>
                    {requestAction === 'charges' ? 'Saving...' : 'Approve'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

        {chatSummary ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>RECENT CONTACT</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.contactCard, pressed && { backgroundColor: '#F9FAFB' }]}
              onPress={() =>
                router.push({
                  pathname: '/customer-chat',
                  params: {
                    id: String(booking.rawId || params.id || ''),
                    providerName: provider.name || 'Service Provider',
                    serviceName: provider.specialty || safeBooking.service,
                    phone: provider.phone || '',
                  },
                } as any)
              }
            >
              <View style={styles.contactIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#00C853" />
              </View>
              <View style={styles.contactContent}>
                <View style={styles.contactTitleRow}>
                  <Text style={styles.contactTitle}>Last message {chatSummary.lastMessageTime}</Text>
                  {chatSummary.unreadCount > 0 ? (
                    <View style={styles.contactUnreadPill}>
                      <Text style={styles.contactUnreadText}>
                        {chatSummary.unreadCount > 1
                          ? `${chatSummary.unreadCount} new messages`
                          : 'New message'}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.contactBody} numberOfLines={2}>
                  {chatSummary.lastMessage}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          </>
        ) : null}

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {canReviewBooking ? (
            <>
              <Pressable 
                style={({ pressed }) => [styles.cancelBookingButton, { borderColor: '#00C853', backgroundColor: pressed ? '#DDF7E9' : '#E8FBF2', marginBottom: 15 }]}
                onPress={() => router.push({
                  pathname: '/customer-review',
                  params: {
                    booking: JSON.stringify({
                      ...booking,
                      providerId: booking?.providerId || booking?.provider?.id || '',
                      provider: {
                        ...(booking?.provider || {}),
                        id: booking?.provider?.id || booking?.providerId || '',
                      },
                    }),
                  }
                })}
              >
                <Ionicons name="star" size={20} color="#00C853" />
                <Text style={[styles.cancelBookingText, { color: '#00C853' }]}>Leave a Review</Text>
              </Pressable>
              <Pressable 
                style={({ pressed }) => [styles.rebookButton, pressed && { opacity: 0.9, backgroundColor: TOKENS.colors.primary + 'E6' }]}
                onPress={() => router.push({
                  pathname: '/customer-book-again',
                  params: { booking: JSON.stringify(booking) }
                } as any)}
              >
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text style={styles.rebookButtonText}>Book Again</Text>
              </Pressable>
            </>
          ) : null}

          {showMyBookingsCta ? (
            <Pressable
              style={({ pressed }) => [
                styles.rebookButton,
                pressed && { opacity: 0.9, backgroundColor: TOKENS.colors.primary + 'E6' },
              ]}
              onPress={handleGoToMyBookings}
            >
              <Ionicons name="list-outline" size={20} color="#fff" />
              <Text style={styles.rebookButtonText}>Go to My Bookings</Text>
            </Pressable>
          ) : null}

          {isUpcoming ? (
            <>
              {canTrackBooking ? (
                <Pressable
                  style={({ pressed }) => [styles.trackBookingButton, pressed && { opacity: 0.9, backgroundColor: '#1F2937' }]}
                  onPress={() =>
                    router.push({
                      pathname: '/customer-track-order',
                      params: {
                        id: String(booking.rawId || params.id || ''),
                        booking: JSON.stringify(booking),
                      },
                    } as any)
                  }
                >
                  <Ionicons name="location-outline" size={20} color="#fff" />
                  <Text style={styles.trackBookingText}>Track Booking</Text>
                </Pressable>
              ) : null}

              {canCancelBooking ? (
               <Pressable 
                style={({ pressed }) => [styles.cancelBookingButton, pressed && { backgroundColor: '#F8FAFC' }]}
                onPress={() =>
                  router.push({
                    pathname: '/customer-cancel-booking',
                    params: {
                      id: String(booking.rawId || booking.id || ''),
                      booking: JSON.stringify(booking),
                    },
                  } as any)
                }
              >
                <Ionicons name="close" size={20} color="#FF5252" />
                <Text style={styles.cancelBookingText}>Cancel Booking</Text>
              </Pressable>
              ) : null}
              <Text style={styles.policyFootnote}>Free cancellation up to 24 hours before the service</Text>
            </>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ImagePreviewModal
        visible={Boolean(previewAttachment)}
        imageUrl={previewAttachment?.file_url || ''}
        title={previewAttachment?.file_name || 'Attachment Preview'}
        onClose={() => setPreviewAttachment(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: TOKENS.colors.white,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    letterSpacing: -0.3,
  },
  bookingId: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.colors.text.muted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    padding: 24,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 32,
    ...TOKENS.shadows.medium,
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  heroStatusText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.primary,
    marginRight: 10,
  },
  heroServiceTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: TOKENS.colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 8,
  },
  heroAddressText: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.colors.text.secondary,
    flexShrink: 1,
    lineHeight: 20,
  },
  locationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: TOKENS.colors.success.bg,
  },
  locationTypeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: TOKENS.colors.primary,
  },
  scheduleContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  scheduleCard: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    ...TOKENS.shadows.soft,
  },
  scheduleDate: {
    fontSize: 16,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    marginTop: 12,
  },
  scheduleYear: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.text.muted,
    marginTop: 2,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    marginTop: 12,
  },
  scheduleSub: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.text.muted,
    marginTop: 2,
  },
  countdownSection: {
    backgroundColor: TOKENS.colors.text.primary,
    padding: 24,
    borderRadius: 24,
    marginBottom: 32,
    ...TOKENS.shadows.medium,
  },
  countdownSectionCancelled: {
    backgroundColor: '#FDECEC',
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 20,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timerItem: {
    alignItems: 'center',
  },
  timerBox: {
    width: 54,
    height: 54,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  timerNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: TOKENS.colors.white,
    fontFamily: 'Courier',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  timerSeparator: {
    fontSize: 24,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.2)',
    marginTop: -20,
  },
  sectionHeader: {
    marginBottom: 16,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: TOKENS.colors.text.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  providerCard: {
    backgroundColor: TOKENS.colors.white,
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    ...TOKENS.shadows.soft,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  providerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: TOKENS.colors.border,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: TOKENS.colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
  },
  providerMainInfo: {
    flex: 1,
    marginLeft: 16,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.success.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '900',
    color: TOKENS.colors.success.text,
  },
  providerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  providerRating: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.text.secondary,
    marginLeft: 4,
  },
  providerSpecialty: {
    fontSize: 13,
    color: TOKENS.colors.text.muted,
    fontWeight: '600',
  },
  providerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  detailsCard: {
    backgroundColor: TOKENS.colors.white,
    padding: 24,
    borderRadius: 24,
    marginBottom: 32,
    ...TOKENS.shadows.soft,
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.colors.text.muted,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
    marginTop: 2,
    flexShrink: 1,
    lineHeight: 22,
  },
  detailValueAddress: {
    flexWrap: 'wrap',
  },
  detailHelper: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.text.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  priceContainer: {
    marginTop: 12,
    paddingTop: 20,
    borderTopWidth: 1.5,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.text.secondary,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '900',
    color: TOKENS.colors.primary,
    marginTop: 4,
    letterSpacing: -1,
  },
  attachmentGallery: {
    gap: 12,
    paddingRight: 16,
  },
  attachmentCard: {
    width: 100,
    gap: 8,
  },
  attachmentPreview: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.background,
  },
  attachmentTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.colors.text.secondary,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: TOKENS.colors.white,
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    ...TOKENS.shadows.medium,
  },
  requestHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  requestIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.success.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  requestSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TOKENS.colors.text.secondary,
    marginTop: 2,
  },
  requestBody: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  requestExplanation: {
    fontSize: 13,
    color: TOKENS.colors.text.secondary,
    lineHeight: 18,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  requestApproveButton: {
    flex: 1,
    height: 50,
    backgroundColor: TOKENS.colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...TOKENS.shadows.glow,
  },
  requestApproveText: {
    fontSize: 15,
    fontWeight: '900',
    color: TOKENS.colors.white,
  },
  requestDeclineButton: {
    flex: 1,
    height: 50,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestDeclineText: {
    fontSize: 15,
    fontWeight: '800',
    color: TOKENS.colors.danger.text,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    padding: 16,
    borderRadius: 24,
    marginBottom: 40,
    ...TOKENS.shadows.soft,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.success.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  contactBody: {
    fontSize: 13,
    color: TOKENS.colors.text.secondary,
    lineHeight: 18,
  },
  bottomActions: {
    gap: 16,
  },
  trackBookingButton: {
    height: 60,
    backgroundColor: TOKENS.colors.text.primary,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...TOKENS.shadows.medium,
  },
  trackBookingText: {
    fontSize: 16,
    fontWeight: '900',
    color: TOKENS.colors.white,
  },
  cancelBookingButton: {
    height: 60,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  rebookButton: {
    height: 60,
    backgroundColor: TOKENS.colors.primary,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...TOKENS.shadows.glow,
  },
  rebookButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: TOKENS.colors.white,
  },
  cancelBookingText: {
    fontSize: 15,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
    padding: 16,
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    ...TOKENS.shadows.soft,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.colors.text.secondary,
  },
  errorText: {
    color: TOKENS.colors.danger.text,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: TOKENS.colors.danger.bg,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: TOKENS.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  requestIconWrapWarn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.warning.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestContent: {
    flex: 1,
  },
  chargeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chargeItemTextWrap: {
    flex: 1,
  },
  chargeItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
  },
  chargeItemBody: {
    fontSize: 12,
    fontWeight: '500',
    color: TOKENS.colors.text.secondary,
    marginTop: 2,
  },
  chargeAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: TOKENS.colors.primary,
  },
  contactContent: {
    flex: 1,
  },
  contactUnreadPill: {
    backgroundColor: TOKENS.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  contactUnreadText: {
    fontSize: 10,
    fontWeight: '900',
    color: TOKENS.colors.white,
  },
  policyFootnote: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
});
