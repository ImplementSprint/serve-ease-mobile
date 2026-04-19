import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import { getProviderBookingById } from '@/services/providerBookingService';
import { createProviderRescheduleRequest } from '@/services/providerBookingActionsService';
import { TimePickerModal } from '../components/TimePickerModal';
import { DatePickerModal } from '../components/DatePickerModal';

const RESCHEDULE_REASONS = [
  'Schedule Conflict',
  'Emergency',
  'Location Issues',
  'Equipment Failure',
  'Weather Conditions',
  'Other',
];

export default function ProviderRescheduleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [explanation, setExplanation] = React.useState('');
  const [showReasons, setShowReasons] = React.useState(false);
  const [isPickerVisible, setPickerVisible] = React.useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = React.useState(false);

  React.useEffect(() => {
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
        const data = await getProviderBookingById(String(id));
        if (!mounted) return;
        setBooking(data);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Could not load booking details.'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const scheduledLabel = React.useMemo(() => {
    if (!booking?.scheduled_at) return 'N/A';
    const dateValue = new Date(booking.scheduled_at);
    if (Number.isNaN(dateValue.getTime())) return 'N/A';
    return `${dateValue.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })} at ${dateValue.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }, [booking?.scheduled_at]);

  const canSubmit =
    !!reason.trim() && !!date.trim() && !!time.trim() && !!explanation.trim() && !isSubmitting;

  const onSubmit = async () => {
    if (!user?.id || !booking?.id) {
      Alert.alert('Missing Details', 'Please reopen this booking and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createProviderRescheduleRequest({
        bookingId: booking.id,
        providerId: user.id,
        reason,
        explanation,
        proposedDate: date,
        proposedTime: time,
      });

      Alert.alert('Request Sent', 'The reschedule request was saved and is ready for customer review.', [
        {
          text: 'Back to Booking',
          onPress: () =>
            router.replace({ pathname: '/provider-booking-details', params: { id: booking.id } } as any),
        },
      ]);
    } catch (err) {
      Alert.alert('Submit Failed', getErrorMessage(err, 'Could not submit reschedule request.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/(provider-tabs)/bookings' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Request</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator size="small" color="#00B761" />
                <Text style={styles.stateText}>Loading booking details...</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {!isLoading && booking ? (
              <>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Current Booking Details</Text>
                  <Text style={styles.serviceName}>{booking.service_title || 'Service'}</Text>
                  <Text style={styles.customerName}>Customer: {booking.customer_name || 'Customer'}</Text>

                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#777" />
                    <Text style={styles.detailText}>{scheduledLabel}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#777" />
                    <Text style={styles.detailText}>{booking.service_address || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.formLabel}>Reason for Reschedule</Text>
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </View>
                  <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowReasons((value) => !value)}>
                    <Text style={[styles.pickerText, !reason && styles.placeholderText]}>
                      {reason || 'Select a reason'}
                    </Text>
                    <Ionicons name={showReasons ? 'chevron-up' : 'chevron-down'} size={20} color="#AAA" />
                  </TouchableOpacity>

                  {showReasons ? (
                    <View style={styles.reasonsList}>
                      {RESCHEDULE_REASONS.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={styles.reasonItem}
                          onPress={() => {
                            setReason(item);
                            setShowReasons(false);
                          }}
                        >
                          <Text style={[styles.reasonText, reason === item && styles.selectedReasonText]}>{item}</Text>
                          {reason === item ? <Ionicons name="checkmark" size={18} color="#00B761" /> : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.formLabel}>Proposed New Date</Text>
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </View>
                  <TouchableOpacity style={styles.pickerTrigger} onPress={() => setDatePickerVisible(true)}>
                    <Text style={[styles.pickerText, !date && styles.placeholderText]}>{date || 'dd/mm/yyyy'}</Text>
                    <Ionicons name="calendar-outline" size={18} color="#AAA" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.formLabel}>Proposed New Time</Text>
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </View>
                  <TouchableOpacity style={styles.pickerTrigger} onPress={() => setPickerVisible(true)}>
                    <Text style={[styles.pickerText, !time && styles.placeholderText]}>{time || 'Select a time'}</Text>
                    <Ionicons name="time-outline" size={20} color="#AAA" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.formLabel}>Explanation</Text>
                    <Text style={styles.requiredAsterisk}>*</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Explain the situation to the customer..."
                    placeholderTextColor="#AAA"
                    value={explanation}
                    onChangeText={setExplanation}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.blueAlert}>
                  <Ionicons name="information-circle-outline" size={20} color="#2D5B7A" />
                  <Text style={styles.blueAlertText}>
                    Customer approval is still required before the booking schedule changes.
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            disabled={!canSubmit}
            onPress={() => void onSubmit()}
          >
            <Text style={styles.submitButtonText}>{isSubmitting ? 'Sending...' : 'Send Reschedule Request'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <TimePickerModal
        key="reschedule-time-picker"
        visible={isPickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={(value) => setTime(value)}
        initialTime={time || '02:00 PM'}
        title="Select Proposed Time"
      />

      <DatePickerModal
        key="reschedule-date-picker"
        visible={isDatePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(value) => setDate(value)}
        initialDate={date}
        title="Select Proposed Date"
      />
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
  container: { flex: 1 },
  scrollContainer: { flex: 1 },
  content: { padding: 24 },
  stateWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  stateText: { color: '#64748B' },
  errorText: { color: '#C62828', marginBottom: 16 },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  infoLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginBottom: 12 },
  serviceName: { fontSize: 18, fontWeight: '700', color: '#0D1B2A', marginBottom: 4 },
  customerName: { fontSize: 14, color: '#444', fontWeight: '500', marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  detailText: { fontSize: 13, color: '#444', marginLeft: 8, fontWeight: '500', flex: 1 },
  formGroup: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  formLabel: { fontSize: 14, fontWeight: '700', color: '#0D1B2A' },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  requiredAsterisk: { color: '#FF4D4D', fontSize: 16, marginLeft: 4, marginTop: -4 },
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F3F5',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  pickerText: { fontSize: 15, color: '#0D1B2A' },
  placeholderText: { color: '#AAA' },
  textInput: {
    backgroundColor: '#F2F3F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    fontSize: 15,
    color: '#0D1B2A',
  },
  textArea: { minHeight: 120, paddingTop: 16, textAlignVertical: 'top' },
  reasonsList: { backgroundColor: '#F8F9FA', borderRadius: 12, marginTop: 8, padding: 4 },
  reasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  reasonText: { fontSize: 14, color: '#444' },
  selectedReasonText: { color: '#00B761', fontWeight: '600' },
  blueAlert: {
    flexDirection: 'row',
    backgroundColor: '#EBF5FF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2D5B7A20',
  },
  blueAlertText: { flex: 1, fontSize: 13, color: '#2D5B7A', fontWeight: '700' },
  footer: { padding: 24, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  submitButton: {
    backgroundColor: '#99E6C3',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
