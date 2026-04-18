import React, { useEffect, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { cancelCustomerBooking, getBookingById } from '@/services/bookingService';
import { getErrorMessage } from '@/lib/error-handling';
import { TOKENS } from '@/constants/tokens';
import { AppButton } from '@/src/components/common/AppButton';
import { AppTextInput } from '@/src/components/common/AppTextInput';
import { AppPressable } from '@/src/components/common/AppPressable';
import { StatusBar } from 'expo-status-bar';

import { EnrichedBooking } from '@/src/types/database.interfaces';

const { height } = Dimensions.get('window');

const CANCELLATION_REASONS = [
  'Change of Plans',
  'Found another provider',
  'Unexpected Conflict',
  'Financial reasons',
  'Service no longer needed',
  'Booking error',
  'Provider not responsive',
  'Other reasons'
];

const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

type CancelBookingUIModel = {
  id: string;
  service: string;
  provider: string;
  date: string;
  time: string;
  address: string;
  amount: string;
};

export function CustomerCancelBookingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id, booking: bookingParam } = useLocalSearchParams<{ id?: string; booking?: string }>();
  
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');
  const [showReasonsModal, setShowReasonsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState<CancelBookingUIModel | null>(null);

  useEffect(() => {
    let mounted = true;

    async function hydrateBooking() {
      // 1. Try to hydrate from params if available
      if (bookingParam) {
        try {
          const parsed = JSON.parse(bookingParam);
          if (mounted) setBookingData(parsed);
          return;
        } catch {
          // Continue to DB fallback
        }
      }

      // 2. Fetch from API if ID is provided and valid
      if (!id || !isValidUuid(id)) {
        if (mounted && !bookingParam) {
          Alert.alert('Error', 'Invalid booking reference.', [
            { text: 'Go Back', onPress: () => router.back() }
          ]);
        }
        return;
      }

      setIsLoading(true);
      try {
        const row: EnrichedBooking = await getBookingById(id);
        if (row && mounted) {
          const scheduled = row.scheduled_at ? new Date(row.scheduled_at) : null;
          setBookingData({
            id: row.id,
            service: row.service_name || row.service?.title || 'Service Booking',
            provider: row.provider_name || row.provider?.full_name || 'Service Provider',
            date: scheduled ? scheduled.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A',
            time: scheduled ? scheduled.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'N/A',
            address: row.service_address || 'No address provided',
            amount: String(row.total_amount || row.service?.price || '0.00'),
          });
        }
      } catch (err) {
        if (mounted) {
          Alert.alert('Load Failed', getErrorMessage(err, 'Could not load booking details.'));
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    hydrateBooking();
    return () => {
      mounted = false;
    };
  }, [bookingParam, id]);

  const booking = useMemo<CancelBookingUIModel>(
    () =>
      bookingData || {
        id: id || '',
        service: 'Service Booking',
        provider: 'Service Provider',
        date: 'N/A',
        time: 'N/A',
        address: 'No address provided',
        amount: '0.00',
      },
    [bookingData, id]
  );

  const handleSelectReason = (selectedReason: string) => {
    setReason(selectedReason);
    setShowReasonsModal(false);
  };

  const handleCancelBooking = async () => {
    if (!reason || !explanation) return;
    if (!user) {
      Alert.alert('Login Required', 'Please sign in first.');
      return;
    }
    if (!booking?.id || !isValidUuid(booking.id)) {
      Alert.alert('Error', 'Invalid booking ID. Cannot cancel.');
      return;
    }

    setIsSubmitting(true);
    try {
      await cancelCustomerBooking(booking.id, user.id, reason, explanation);
      Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/bookings' as any) },
      ]);
    } catch (err) {
      Alert.alert('Cancellation Failed', getErrorMessage(err, 'Could not cancel this booking.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TOKENS.colors.primary} />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <AppPressable 
          onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={TOKENS.colors.text.primary} />
        </AppPressable>
        <Text style={styles.headerTitle}>Cancel Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.content}
      >
        {/* Booking Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Booking Summary</Text>
          <Text style={styles.serviceName}>{booking.service}</Text>
          <Text style={styles.providerName}>Provider: {booking.provider}</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={TOKENS.colors.primary} />
            <Text style={styles.detailText}>{booking.date} at {booking.time}</Text>
          </View>
          
          <Text style={styles.addressText}>{booking.address}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>₱{booking.amount}</Text>
          </View>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="information-circle" size={20} color={TOKENS.colors.warning.text} />
            <Text style={styles.policyTitle}>Cancellation Policy</Text>
          </View>
          <View style={styles.policyItem}>
            <View style={styles.bullet} />
            <Text style={styles.policyText}>Free cancellation up to 24h before</Text>
          </View>
          <View style={styles.policyItem}>
            <View style={styles.bullet} />
            <Text style={styles.policyText}>Late cancellation fee: ₱150</Text>
          </View>
          <View style={styles.policyItem}>
            <View style={styles.bullet} />
            <Text style={styles.policyText}>Refunds take 3-5 business days</Text>
          </View>
        </View>

        {/* Cancellation Reason */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Reason for Cancellation <Text style={styles.required}>*</Text></Text>
          <AppPressable 
            style={[styles.pickerButton, showReasonsModal && styles.pickerButtonActive]}
            onPress={() => setShowReasonsModal(true)}
          >
            <Text style={[styles.pickerText, reason ? styles.pickerTextSelected : null]}>
              {reason || 'Select a reason'}
            </Text>
            <Ionicons name={showReasonsModal ? "chevron-up" : "chevron-down"} size={20} color={TOKENS.colors.text.muted} />
          </AppPressable>
        </View>

        {/* Detailed Explanation */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Tell us more <Text style={styles.required}>*</Text></Text>
          <AppTextInput
            placeholder="Please share more details to help us improve..."
            multiline
            numberOfLines={5}
            value={explanation}
            onChangeText={setExplanation}
            style={styles.textArea}
          />
        </View>
        
        <View style={styles.spacer} />
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <AppButton 
          label={isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
          onPress={handleCancelBooking}
          disabled={!reason || !explanation || isSubmitting}
          isLoading={isSubmitting}
          variant="danger"
          size="lg"
          leftIcon="close-circle-outline"
        />
      </View>

      {/* Reasons Modal */}
      <Modal
        visible={showReasonsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReasonsModal(false)}
      >
        <AppPressable 
          style={styles.modalOverlay} 
          onPress={() => setShowReasonsModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIndicator} />
              <Text style={styles.modalTitle}>Select Reason</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CANCELLATION_REASONS.map((item, index) => (
                <React.Fragment key={item}>
                  <AppPressable 
                    style={styles.reasonItem}
                    onPress={() => handleSelectReason(item)}
                  >
                    <Text style={[styles.reasonText, reason === item && styles.reasonTextActive]}>{item}</Text>
                    {reason === item ? (
                      <Ionicons name="checkmark-circle" size={22} color={TOKENS.colors.primary} />
                    ) : null}
                  </AppPressable>
                  {index < CANCELLATION_REASONS.length - 1 ? (
                    <View style={styles.itemSeparator} />
                  ) : null}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        </AppPressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: TOKENS.colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 25,
  },
  card: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.border,
    ...TOKENS.shadows.soft,
  },
  cardLabel: {
    fontSize: 12,
    color: TOKENS.colors.text.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 15,
    color: TOKENS.colors.text.secondary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: TOKENS.colors.text.primary,
    fontWeight: '700',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: TOKENS.colors.text.secondary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.border,
    marginVertical: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: TOKENS.colors.text.secondary,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  policyCard: {
    backgroundColor: TOKENS.colors.warning.bg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: TOKENS.colors.warning.border,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TOKENS.colors.warning.text,
    marginLeft: 8,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.warning.text,
    marginRight: 12,
    opacity: 0.6,
  },
  policyText: {
    fontSize: 13,
    color: TOKENS.colors.warning.text,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.colors.text.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  required: {
    color: TOKENS.colors.danger.text,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pickerButtonActive: {
    borderColor: TOKENS.colors.primary,
    backgroundColor: TOKENS.colors.white,
  },
  pickerText: {
    fontSize: 15,
    color: TOKENS.colors.text.muted,
  },
  pickerTextSelected: {
    color: TOKENS.colors.text.primary,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.border,
    backgroundColor: TOKENS.colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: TOKENS.colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    maxHeight: height * 0.7,
    ...TOKENS.shadows.medium,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIndicator: {
    width: 40,
    height: 5,
    backgroundColor: TOKENS.colors.border,
    borderRadius: 3,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TOKENS.colors.text.primary,
  },
  reasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  reasonText: {
    fontSize: 16,
    color: TOKENS.colors.text.primary,
    fontWeight: '500',
  },
  reasonTextActive: {
    color: TOKENS.colors.primary,
    fontWeight: '700',
  },
  itemSeparator: {
    height: 1,
    backgroundColor: TOKENS.colors.border,
  },
  spacer: {
    height: 40,
  },
});
