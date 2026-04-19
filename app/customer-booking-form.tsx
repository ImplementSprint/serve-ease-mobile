import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getUserAddresses } from '@/services/addressService';
import {

  type BookingAttachmentDraft,
  saveBookingAttachments,
  uploadBookingAttachment,
} from '@/services/bookingAttachmentService';
import { createBooking } from '@/services/bookingService';
import { getPaymentMethodLabel, type PaymentMethod } from '@/services/paymentService';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getProviderAvailability,
  getProviderReservedSlots,
  type ProviderReservedSlot,
  type ProviderAvailabilityState,
  validateProviderAvailability,
} from '@/services/providerAvailabilityService';
import { api } from '@/lib/apiClient';

// Styles moved to top for hoisting/accessibility
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D1B2A',
    marginLeft: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  providerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FBF2',
    borderWidth: 1,
    borderColor: '#B8EACD',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  providerBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
    marginLeft: 8,
  },
  providerBannerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  providerBannerFallbackIcon: {
    marginRight: 8,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 18,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarMonth: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  calendarCaption: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  calendarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  calendarNavButtonDisabled: {
    backgroundColor: '#F8F9FA',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    paddingVertical: 4,
    alignItems: 'center',
  },
  calendarDateButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDateButtonSelected: {
    backgroundColor: '#00B761',
  },
  calendarDateButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  calendarDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  calendarDateTextSelected: {
    color: '#FFF',
  },
  calendarDateTextDisabled: {
    color: '#C0C4CC',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: '#FF5252',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  dropdownText: {
    fontSize: 15,
    color: '#0D1B2A',
  },
  placeholderText: {
    color: '#8E8E93',
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    color: '#C62828',
  },
  inputIcon: {
    marginRight: 8,
  },
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 16,
  },
  addressSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8FBF2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 4,
  },
  addressDetail: {
    fontSize: 13,
    color: '#8E8E93',
  },
  locationInfoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 16,
  },
  locationInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D1B2A',
    marginLeft: 10,
  },
  locationInfoAddress: {
    fontSize: 14,
    color: '#0D1B2A',
    lineHeight: 20,
  },
  locationInfoNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    lineHeight: 18,
  },
  textAreaContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
  },
  textArea: {
    height: 100,
    fontSize: 15,
    color: '#0D1B2A',
  },
  paymentMethodsContainer: {
    gap: 12,
  },
  paymentMethodCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethodCardSelected: {
    borderColor: '#00B761',
    backgroundColor: '#F3FDF7',
  },
  paymentMethodCopy: {
    flex: 1,
    paddingRight: 16,
  },
  paymentMethodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  paymentMethodLabelSelected: {
    color: '#00B761',
  },
  paymentMethodHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 17,
  },
  attachmentList: {
    marginTop: 12,
    gap: 10,
  },
  attachmentItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentPreview: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#E2E8F0',
  },
  attachmentCopy: {
    flex: 1,
    marginRight: 10,
  },
  attachmentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  attachmentUri: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
  },
  uploadBox: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00B761',
    marginTop: 12,
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#8E8E93',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00B761',
  },
  confirmButton: {
    backgroundColor: '#00B761',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00B761',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  modalOptionSelected: {
    backgroundColor: '#F8FBF9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#0D1B2A',
  },
  modalOptionTextSelected: {
    fontWeight: '700',
    color: '#00B761',
  },
  modalAddressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  modalAddressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8FBF2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAddressDetails: {
    flex: 1,
    paddingRight: 16,
  },
  modalAddressLine: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  pricingModeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pricingModeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  pricingModeOptionSelected: {
    borderColor: '#00B761',
    backgroundColor: '#00B761',
  },
  pricingModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  pricingModeTextSelected: {
    color: '#FFFFFF',
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginLeft: 4,
  },
});

type PricingMode = 'hourly' | 'flat';

type ServiceOption = {
  id: string;
  title: string;
  price: number;
  supports_hourly: boolean;
  hourly_rate: number | null;
  supports_flat: boolean;
  flat_rate: number | null;
  default_pricing_mode: PricingMode | null;
  service_location_type: 'mobile' | 'in_shop';
  service_location_address: string | null;
};

export function getDefaultPricingModeForService(service: ServiceOption | null): PricingMode | null {
  if (!service) return null;
  if (service.supports_hourly && service.supports_flat) return service.default_pricing_mode || 'hourly';
  if (service.supports_hourly) return 'hourly';
  if (service.supports_flat) return 'flat';
  return null;
}

export function buildBookingPricingSnapshot(
  service: ServiceOption | null,
  pricingMode: PricingMode | null,
  hoursRequired: string
) {
  const effectivePricingMode = pricingMode || getDefaultPricingModeForService(service);
  const hourlyRate = service?.hourly_rate ?? service?.price ?? 0;
  const flatRate = service?.flat_rate ?? service?.price ?? 0;
  const parsedHoursRequired = Math.max(1, Number(hoursRequired || 1));
  const isHourly = effectivePricingMode === 'hourly';
  const isFlat = effectivePricingMode === 'flat';

  let totalAmount = service?.price || 0;
  if (isHourly) {
    totalAmount = Number(hourlyRate) * parsedHoursRequired;
  } else if (isFlat) {
    totalAmount = Number(flatRate);
  }

  return {
    effectivePricingMode,
    hourlyRate,
    flatRate,
    parsedHoursRequired,
    isHourly,
    isFlat,
    totalAmount,
  };
}

export function pickInitialServiceOption(
  services: ServiceOption[],
  requestedServiceId?: string,
  requestedServiceName?: string
) {
  const normalizedRequestedServiceId = String(requestedServiceId || '').trim();
  if (normalizedRequestedServiceId) {
    const exactIdMatch = services.find((service) => service.id === normalizedRequestedServiceId);
    if (exactIdMatch) return exactIdMatch;
  }

  const normalizedRequestedServiceName = String(requestedServiceName || '').trim().toLowerCase();
  if (normalizedRequestedServiceName) {
    const exactNameMatch = services.find((service) => service.title.toLowerCase() === normalizedRequestedServiceName);
    if (exactNameMatch) return exactNameMatch;
  }

  return services[0] || null;
}

const INITIAL_ADDRESSES: { id: string; type: string; fullAddress: string }[] = [];

const TIME_OPTIONS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(value || '').trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

function buildScheduledAtDate(dateKey: string, time: string) {
  const [year, month, day] = String(dateKey)
    .split('-')
    .map((value) => Number(value));
  const timeInMinutes = parseTimeToMinutes(time);

  if (
    !year ||
    !month ||
    !day ||
    timeInMinutes === null
  ) {
    return null;
  }

  const scheduledAt = new Date(year, month - 1, day);
  scheduledAt.setHours(
    Math.floor(timeInMinutes / 60),
    timeInMinutes % 60,
    0,
    0,
  );
  return scheduledAt;
}

function buildReservedSlotDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const BOOKABLE_DAYS = 21;

function formatDateValue(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

const WEEKDAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildAvailableKeys(today: Date) {
  const keys = new Set<string>();
  for (let index = 0; index < BOOKABLE_DAYS; index += 1) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + index);
    keys.add(formatDateKey(nextDate));
  }
  return keys;
}

function buildDaysOffSet(daysOff?: { day: string }[]) {
  const daysOffSet = new Set<string>();
  if (daysOff) {
    for (const dayOff of daysOff) {
      daysOffSet.add(dayOff.day);
    }
  }
  return daysOffSet;
}

function buildBookableDays(monthDate: Date, providerAvailability?: ProviderAvailabilityState | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availableKeys = buildAvailableKeys(today);
  const daysOffSet = buildDaysOffSet(providerAvailability?.daysOff);

  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const leadingDays = firstDay.getDay();

  const cells: (
    | { key: string; type: 'empty' }
    | { key: string; type: 'day'; date: Date; isAvailable: boolean; unavailableReason?: string }
  )[] = [];

  for (let index = 0; index < leadingDays; index += 1) {
    cells.push({ key: `empty-${index}`, type: 'empty' });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const dateKey = formatDateKey(date);
    let isAvailable = availableKeys.has(dateKey);
    let unavailableReason: string | undefined;

    if (isAvailable && providerAvailability) {
      if (daysOffSet.has(dateKey)) {
        isAvailable = false;
        unavailableReason = 'Provider is unavailable on this date';
      }
      else {
        const weekdayName = WEEKDAY_NAMES_FULL[date.getDay()];
        const daySchedule = providerAvailability.weeklySchedule[weekdayName];
        if (daySchedule && !daySchedule.active) {
          isAvailable = false;
          unavailableReason = `Provider doesn't work on ${weekdayName}s`;
        }
      }
    }

    cells.push({
      key: dateKey,
      type: 'day',
      date,
      isAvailable,
      unavailableReason,
    });
  }

  return cells;
}

export function computeAvailableTimeOptions(
  providerAvailability: ProviderAvailabilityState | null,
  dateKey: string,
  timeOptions: string[],
  hoursRequired: number,
  reservedSlots: ProviderReservedSlot[]
) {
  if (!providerAvailability || !dateKey) return timeOptions;

  const [year, month, day] = dateKey.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const weekdayName = WEEKDAY_NAMES_FULL[selectedDate.getDay()];
  const daySchedule = providerAvailability.weeklySchedule[weekdayName];

  if (!daySchedule?.active) return [];

  return timeOptions.filter((timeOption) => {
    const timeMinutes = parseTimeToMinutes(timeOption);
    if (timeMinutes === null) return true;

    const startMinutes = parseTimeToMinutes(daySchedule.start);
    const endMinutes = parseTimeToMinutes(daySchedule.end);

    if (startMinutes !== null && endMinutes !== null) {
      if (timeMinutes < startMinutes || timeMinutes >= endMinutes) return false;
    }

    if (daySchedule.break?.start && daySchedule.break?.end) {
      const breakStart = parseTimeToMinutes(daySchedule.break.start);
      const breakEnd = parseTimeToMinutes(daySchedule.break.end);
      if (breakStart !== null && breakEnd !== null) {
        if (timeMinutes >= breakStart && timeMinutes < breakEnd) return false;
      }
    }

    const candidateStart = buildScheduledAtDate(dateKey, timeOption);
    if (!candidateStart) return false;

    const candidateEnd = new Date(
      candidateStart.getTime() +
        Math.max(1, Number(hoursRequired || 1)) * 60 * 60 * 1000,
    );

    return !reservedSlots.some((reservedSlot) => {
      const reservedStart = buildReservedSlotDate(reservedSlot.scheduled_at);
      const reservedEnd = buildReservedSlotDate(reservedSlot.end_at);

      if (!reservedStart || !reservedEnd) {
        return false;
      }

      return (
        candidateStart.getTime() < reservedEnd.getTime() &&
        candidateEnd.getTime() > reservedStart.getTime()
      );
    });
  });
}

const getAddressIcon = (label: string = '') => {
  const lowered = label.toLowerCase();
  if (lowered.includes('home')) return 'home-outline' as const;
  if (lowered.includes('work') || lowered.includes('office')) return 'business-outline' as const;
  if (lowered.includes('gym') || lowered.includes('fitness')) return 'barbell-outline' as const;
  return 'location-outline' as const;
};

function getServiceLoadErrorMessage(error: unknown) {
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';
  const errorText = getErrorMessage(error, 'Unable to load services for this provider.');
  const normalizedErrorText = errorText.toLowerCase();

  const looksLikeSchemaAccessIssue =
    errorCode === 'PGRST106' ||
    normalizedErrorText.includes('schema') ||
    normalizedErrorText.includes('exposed') ||
    normalizedErrorText.includes('permission') ||
    normalizedErrorText.includes('not allowed');

  if (looksLikeSchemaAccessIssue) {
    return 'Provider services are temporarily unavailable due to a configuration issue. Please try again later or contact support.';
  }

  return errorText;
}

const SelectionModal = ({ 
  visible, 
  title, 
  data, 
  onClose, 
  renderItem 
}: any) => (
  <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={24} color="#0D1B2A" />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {data.map((item: any, index: number) => renderItem(item, index))}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

export default function CustomerBookingFormScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    newAddress?: string;
    serviceId?: string;
    serviceName?: string;
    providerName?: string;
    providerId?: string;
    avatarUrl?: string;
    date?: string;
    time?: string;
  }>();

  // Form State
  const [service, setService] = useState(params.serviceName || '');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(params.date || '');
  const [dateKey, setDateKey] = useState('');
  const [time, setTime] = useState(params.time || '');
  const [address, setAddress] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<BookingAttachmentDraft[]>([]);
  const paymentMethod: PaymentMethod = 'cash';
  const [pricingMode, setPricingMode] = useState<PricingMode | null>(null);
  const [hoursRequired, setHoursRequired] = useState('1');
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [isServicesLoading, setIsServicesLoading] = useState(false);
  const [servicesLoadError, setServicesLoadError] = useState('');
  const [savedAddresses, setSavedAddresses] = useState(INITIAL_ADDRESSES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAvatarLoadError, setHasAvatarLoadError] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [providerAvailability, setProviderAvailability] = useState<ProviderAvailabilityState | null>(null);
  const [reservedSlots, setReservedSlots] = useState<ProviderReservedSlot[]>([]);
  const [isReservedSlotsLoading, setIsReservedSlotsLoading] = useState(false);

  useEffect(() => {
    let changed = false;
    if (params.newAddress) {
      try {
        const parsed = JSON.parse(String(params.newAddress));
        const formatted = {
           id: parsed.id || parsed.address_id,
           type: parsed.type,
           fullAddress: parsed.addressLine2
             ? `${parsed.addressLine1}, ${parsed.addressLine2}`
             : parsed.addressLine1
        };
        setSavedAddresses(prev => {
          if (prev.some(a => a.id === formatted.id)) return prev;
          return [...prev, formatted];
        });
        setAddress(formatted);
        changed = true;
      } catch {}
    }
    if (changed) {
      router.setParams({ newAddress: '' });
    }
  }, [params.newAddress, router]);

  useEffect(() => {
    let active = true;

    async function loadServiceOptions() {
      setIsServicesLoading(true);
      setServicesLoadError('');
      try {
        if (!params.providerId) {
          setServiceOptions([]);
          setIsServicesLoading(false);
          return;
        }
        const { services: rawRows } = await api.get<{ services: any[] }>(
          `/services/provider/${params.providerId}/services`
        );
        const data = rawRows;

        if (!active) return;

        const mapServiceRow = (row: any): ServiceOption => ({
          id: String(row.id),
          title: String(row.title || ''),
          price: Number(row.price || 0),
          supports_hourly: Boolean(row.supports_hourly),
          hourly_rate: row.hourly_rate ? Number(row.hourly_rate) : null,
          supports_flat: Boolean(row.supports_flat),
          flat_rate: row.flat_rate ? Number(row.flat_rate) : null,
          default_pricing_mode: (row.default_pricing_mode as PricingMode | null) || null,
          service_location_type: row.service_location_type === 'in_shop' ? 'in_shop' : 'mobile',
          service_location_address: row.service_location_address ? String(row.service_location_address) : null,
        });

        const rows: ServiceOption[] = (data || []).map(mapServiceRow);

        setServiceOptions(rows);

        if (rows.length > 0 && !serviceId) {
          const picked = pickInitialServiceOption(rows, params.serviceId, params.serviceName);
          if (!picked) return;
          setServiceId(picked.id);
          setService(picked.title);
          setPricingMode(getDefaultPricingModeForService(picked));
        }
      } catch (error) {
        if (active) {
          setServiceOptions([]);
          setServicesLoadError(getServiceLoadErrorMessage(error));
          console.error('Failed to load service options', error);
        }
      } finally {
        if (active) setIsServicesLoading(false);
      }
    }

    loadServiceOptions();
    return () => {
      active = false;
    };
  }, [params.providerId, params.serviceId, params.serviceName, serviceId]);

  useEffect(() => {
    async function loadAddresses() {
      if (!user) return;
      try {
        const dbAddresses = await getUserAddresses();
        if (!dbAddresses?.length) return;

        const formatted = dbAddresses.map((item: any) => {
          const line2 = [item.city, item.province, item.zip_code || item.postal_code].filter(Boolean).join(', ');
          return {
            id: item.id || item.address_id,
            type: item.label || 'Home',
            fullAddress: line2
              ? `${item.street_address || item.street || ''}, ${line2}`
              : (item.street_address || item.street || ''),
          };
        });

        setSavedAddresses(formatted);
        setAddress((prev: any) => prev ?? formatted[0] ?? null);
      } catch (error) {
        console.error('Failed to load customer addresses', error);
      }
    }

    loadAddresses();
  }, [user]);

  useEffect(() => {
    if (!params.providerId) return;
    let active = true;

    async function loadAvailability() {
      try {
        const availability = await getProviderAvailability(params.providerId!);
        if (active) setProviderAvailability(availability);
      } catch (error) {
        console.error('Failed to load provider availability', error);
      }
    }

    loadAvailability();
    return () => { active = false; };
  }, [params.providerId]);

  useEffect(() => {
    if (!params.providerId || !dateKey) {
      setReservedSlots([]);
      setIsReservedSlotsLoading(false);
      return;
    }

    let active = true;

    async function loadReservedSlots() {
      setIsReservedSlotsLoading(true);

      try {
        const nextReservedSlots = await getProviderReservedSlots(
          String(params.providerId),
          dateKey,
        );

        if (active) {
          setReservedSlots(nextReservedSlots);
        }
      } catch (error) {
        if (active) {
          setReservedSlots([]);
          console.error('Failed to load reserved slots', error);
        }
      } finally {
        if (active) {
          setIsReservedSlotsLoading(false);
        }
      }
    }

    loadReservedSlots();

    return () => {
      active = false;
    };
  }, [dateKey, params.providerId]);

  const selectedService = serviceOptions.find((item) => item.id === serviceId) || null;
  const isInShopService = selectedService?.service_location_type === 'in_shop';
  const inShopAddress = selectedService?.service_location_address?.trim() || '';
  const providerAvatarUrl = String(params.avatarUrl || '').trim();
  const shouldShowProviderAvatar = providerAvatarUrl.length > 0 && !hasAvatarLoadError;
  const { effectivePricingMode, isHourly, isFlat, hourlyRate, flatRate, parsedHoursRequired, totalAmount } =
    buildBookingPricingSnapshot(selectedService, pricingMode, hoursRequired);

  const availableTimeOptions = React.useMemo(
    () =>
      computeAvailableTimeOptions(
        providerAvailability,
        dateKey,
        TIME_OPTIONS,
        parsedHoursRequired,
        reservedSlots,
      ),
    [providerAvailability, dateKey, parsedHoursRequired, reservedSlots]
  );

  useEffect(() => {
    if (!time) return;
    if (availableTimeOptions.includes(time)) return;
    setTime('');
  }, [availableTimeOptions, time]);

  // Modal States
  const [isServiceModalVisible, setServiceModalVisible] = useState(false);
  const [isAddressModalVisible, setAddressModalVisible] = useState(false);
  const [isTimeModalVisible, setTimeModalVisible] = useState(false);

  const calendarDays = buildBookableDays(calendarMonth, providerAvailability);
  const monthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const isCurrentMonth = isSameMonth(calendarMonth, currentMonth);

  const handleDateSelect = (formattedDate: string, key: string, dateObj: Date) => {
    setDate(formattedDate);
    setDateKey(key);
    if (!time) return;
    
    const sched = providerAvailability?.weeklySchedule[WEEKDAY_NAMES_FULL[dateObj.getDay()]];
    if (!sched?.active) return;

    const tm = parseTimeToMinutes(time);
    if (tm === null) return;
    
    const s = parseTimeToMinutes(sched.start);
    const e = parseTimeToMinutes(sched.end);
    if (s !== null && e !== null && (tm < s || tm >= e)) {
      setTime('');
      return;
    }
    
    if (sched.break?.start && sched.break?.end) {
      const bs = parseTimeToMinutes(sched.break.start);
      const be = parseTimeToMinutes(sched.break.end);
      if (bs !== null && be !== null && tm >= bs && tm < be) {
        setTime('');
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const validateBooking = (): string | null => {
    if (!service || !date || !time) return 'Please fill in all required fields (Service, Date, and Time).';
    if (!dateKey) return 'Please pick a date from the calendar.';
    if (!serviceId) return 'Please select a valid service before confirming.';
    if ((isHourly || isFlat) && !String(hoursRequired).trim()) {
      return 'Please enter the estimated duration in hours.';
    }
    if (serviceOptions.length === 0) {
      return servicesLoadError || 'This provider has no active services yet. Please try another provider.';
    }
    if (isInShopService) {
      if (!inShopAddress) return 'This in-shop service is missing the provider address. Please try another service or contact support.';
    } else if (!address) {
      return 'Please fill in all required fields (Service, Date, Time, and Address).';
    }
    if (!user) return 'Please log in before creating a booking.';
    return null;
  };

  const saveAttachmentsForBooking = async (bookingId: string, userId: string) => {
    if (attachments.length === 0) return;
    try {
      const uploadedDrafts: BookingAttachmentDraft[] = [];
      const failedUploads: string[] = [];

      for (const attachment of attachments) {
        try {
          const uploaded = await uploadBookingAttachment({
            bookingId,
            userId,
            uri: attachment.uri,
            fileName: attachment.label,
          });
          uploadedDrafts.push({
            uri: uploaded.publicUrl,
            label: uploaded.fileName,
            storagePath: uploaded.storagePath,
          });
        } catch {
          failedUploads.push(String(attachment.label || 'Attachment').trim() || 'Attachment');
        }
      }

      if (uploadedDrafts.length > 0) {
        await saveBookingAttachments(bookingId, uploadedDrafts);
      }

      if (failedUploads.length > 0) {
        Alert.alert(
          'Attachment Upload Issue',
          `${failedUploads.length} attachment${failedUploads.length > 1 ? 's' : ''} could not be uploaded.`,
        );
      }
    } catch (attachmentError) {
      console.error('Failed to upload/save attachments:', attachmentError);
      Alert.alert('Booking Created', 'The booking was created, but attachments could not be saved.');
    }
  };

  const handleConfirmBooking = async () => {
    const errorMsg = validateBooking();
    if (errorMsg) {
      Alert.alert(errorMsg.includes('Fields') ? 'Missing Fields' : 'Error', errorMsg);
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledAt = buildScheduledAtDate(dateKey, time);
      if (!scheduledAt) {
        Alert.alert('Error', 'Could not understand the selected booking time.');
        return;
      }

      const availability = await validateProviderAvailability(
        String(params.providerId || ''),
        scheduledAt,
        parsedHoursRequired,
      );

      if (!availability.available) {
        Alert.alert(
          'Time Unavailable',
          availability.reason || 'This time slot is already booked.',
        );
        return;
      }

      const payload = {
        customer_id: user!.id,
        provider_id: params.providerId || null,
        service_id: serviceId || null,
        service_name: service,
        scheduled_date_key: dateKey,
        scheduled_date: date,
        scheduled_time: time,
        service_address: isInShopService ? inShopAddress : address.fullAddress,
        service_location_type: isInShopService ? 'in_shop' : 'mobile',
        total_amount: totalAmount,
        pricing_mode: effectivePricingMode || 'flat',
        hourly_rate: isHourly ? hourlyRate : null,
        flat_rate: isFlat ? flatRate : null,
        hours_required: parsedHoursRequired,
        payment_method: paymentMethod,
        customer_notes: notes.trim(),
      };

      const created = await createBooking(payload);
      if (created?.id) {
        await saveAttachmentsForBooking(String(created.id), user!.id);
      }
      router.push({
        pathname: '/customer-booking-details',
        params: {
          id: created?.id || 'new-booking',
          addressId: isInShopService ? '' : address.id,
          freshBooking: 'true',
        },
      });
    } catch (error: any) {
      Alert.alert(
        'Booking Save Failed',
        error?.message || getErrorMessage(error, 'Could not save booking to server.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickAttachments = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Photo library permission is required to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (result.canceled || !result.assets?.length) return;

    setAttachments((prev) => [
      ...prev,
      ...result.assets.map((asset, index) => ({
        uri: asset.uri,
        label:
          asset.fileName ||
          `Photo ${prev.length + index + 1}`,
      })),
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Service</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {params.providerName ? (
            <View style={styles.providerBanner}>
              {shouldShowProviderAvatar ? (
                <Image
                  source={{ uri: providerAvatarUrl }}
                  style={styles.providerBannerAvatar}
                  testID="provider-banner-avatar"
                  onError={() => setHasAvatarLoadError(true)}
                />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={36}
                  color="#00B761"
                  style={styles.providerBannerFallbackIcon}
                />
              )}
              <Text style={styles.providerBannerText}>Booking with {params.providerName}</Text>
            </View>
          ) : null}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Service Type <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TouchableOpacity 
              style={styles.dropdownButton} 
              onPress={() => setServiceModalVisible(true)}
            >
              <Text style={[styles.dropdownText, !service && styles.placeholderText]}>
                {isServicesLoading ? 'Loading services...' : service || 'Select a service'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#8E8E93" />
            </TouchableOpacity>
            {servicesLoadError ? <Text style={styles.fieldError}>{servicesLoadError}</Text> : null}
            {!isServicesLoading && !servicesLoadError && serviceOptions.length === 0 ? (
              <Text style={styles.fieldError}>No services are visible. Check provider services permissions/policies.</Text>
            ) : null}
          </View>

          {selectedService && (selectedService.supports_hourly || selectedService.supports_flat) ? (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Pricing Mode <Text style={styles.requiredAsterisk}>*</Text></Text>
              <View style={styles.pricingModeContainer}>
                {selectedService.supports_hourly ? (
                  <TouchableOpacity
                    style={[styles.pricingModeOption, isHourly && styles.pricingModeOptionSelected]}
                    onPress={() => setPricingMode('hourly')}
                  >
                    <Ionicons name="time-outline" size={20} color={isHourly ? '#FFFFFF' : '#0D1B2A'} />
                    <Text style={[styles.pricingModeText, isHourly && styles.pricingModeTextSelected]}>
                      Hourly (P{Number(hourlyRate).toFixed(2)}/hr)
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {selectedService.supports_flat ? (
                  <TouchableOpacity
                    style={[styles.pricingModeOption, isFlat && styles.pricingModeOptionSelected]}
                    onPress={() => setPricingMode('flat')}
                  >
                    <Ionicons name="pricetag-outline" size={20} color={isFlat ? '#FFFFFF' : '#0D1B2A'} />
                    <Text style={[styles.pricingModeText, isFlat && styles.pricingModeTextSelected]}>
                      Flat Rate (P{Number(flatRate).toFixed(2)})
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {(isHourly || isFlat) ? (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Estimated Duration (hours) <Text style={styles.requiredAsterisk}>*</Text></Text>
              <View style={[styles.dropdownButton, { paddingLeft: 12 }]}>
                <Ionicons name="hourglass-outline" size={20} color="#0D1B2A" style={styles.inputIcon} />
                <TextInput
                  style={[styles.dropdownText, { flex: 1, paddingLeft: 8 }]}
                  value={hoursRequired}
                  onChangeText={(v: string) => setHoursRequired(v.replaceAll(/\D/g, ''))}
                  keyboardType="number-pad"
                  placeholder="1"
                />
              </View>
              {isHourly ? (
                <Text style={styles.fieldHint}>Total: P{totalAmount.toFixed(2)} for {parsedHoursRequired} hour(s)</Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date <Text style={styles.requiredAsterisk}>*</Text></Text>
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <View>
                  <Text style={styles.calendarMonth}>{monthLabel}</Text>
                  <Text style={styles.calendarCaption}>
                    {date || 'Choose an available booking date'}
                  </Text>
                </View>
                <View style={styles.calendarActions}>
                  <TouchableOpacity
                    style={[styles.calendarNavButton, isCurrentMonth && styles.calendarNavButtonDisabled]}
                    onPress={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    disabled={isCurrentMonth}
                  >
                    <Ionicons name="chevron-back" size={18} color={isCurrentMonth ? '#C8CDD6' : '#0D1B2A'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                  >
                    <Ionicons name="chevron-forward" size={18} color="#0D1B2A" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((label) => (
                  <Text key={label} style={styles.weekdayLabel}>
                    {label}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((cell) => {
                  if (cell.type === 'empty') {
                    return <View key={cell.key} style={styles.calendarCell} />;
                  }

                  const formattedDate = formatDateValue(cell.date);
                  const isSelected = date === formattedDate;

                  return (
                    <View key={cell.key} style={styles.calendarCell}>
                      <TouchableOpacity
                        style={[
                          styles.calendarDateButton,
                          isSelected && styles.calendarDateButtonSelected,
                          !cell.isAvailable && styles.calendarDateButtonDisabled,
                        ]}
                        onPress={() => handleDateSelect(formattedDate, cell.key, cell.date)}
                        disabled={!cell.isAvailable}
                      >
                        <Text
                          style={[
                            styles.calendarDateText,
                            isSelected && styles.calendarDateTextSelected,
                            !cell.isAvailable && styles.calendarDateTextDisabled,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Time <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setTimeModalVisible(true)}
              disabled={isReservedSlotsLoading || (availableTimeOptions.length === 0 && !!dateKey)}
            >
              <Ionicons name="time-outline" size={20} color={time ? "#0D1B2A" : "#8E8E93"} style={styles.inputIcon} />
              <Text style={[styles.dropdownText, !time && styles.placeholderText]}>
                {time || (isReservedSlotsLoading ? 'Loading available times...' : (dateKey && availableTimeOptions.length === 0 ? 'No available times' : 'Select Time'))}
              </Text>
            </TouchableOpacity>
            {dateKey && availableTimeOptions.length === 0 ? (
              <Text style={styles.fieldError}>The provider has no available time slots on this date.</Text>
            ) : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Location <Text style={styles.requiredAsterisk}>*</Text></Text>
            {isInShopService ? (
              <View style={styles.locationInfoCard}>
                <View style={styles.locationInfoHeader}>
                  <Ionicons name="storefront-outline" size={22} color="#00B761" />
                  <Text style={styles.locationInfoTitle}>Service Location (Provider&apos;s Place)</Text>
                </View>
                <Text style={styles.locationInfoAddress}>
                  {inShopAddress || 'Provider address unavailable'}
                </Text>
                <Text style={styles.locationInfoNote}>
                  This service is performed at the provider&apos;s location. You will need to go there.
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addressSelector} 
                onPress={() => setAddressModalVisible(true)}
              >
                <View style={styles.addressSelectorContent}>
                  <View style={styles.addressIconContainer}>
                    <Ionicons name={address ? getAddressIcon(address.type) : 'location'} size={24} color="#00B761" />
                  </View>
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressType}>{address ? address.type : 'Select Address'}</Text>
                    {address && <Text style={styles.addressDetail} numberOfLines={2}>{address.fullAddress}</Text>}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Any special instructions for the provider?"
                placeholderTextColor="#A0A0A0"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={[styles.paymentMethodCard, styles.paymentMethodCardSelected]}>
              <View style={styles.paymentMethodCopy}>
                <Text style={[styles.paymentMethodLabel, styles.paymentMethodLabelSelected]}>
                  {getPaymentMethodLabel(paymentMethod)}
                </Text>
                <Text style={styles.paymentMethodHint}>
                  Cash only for now. The customer pays after service completion.
                </Text>
              </View>
              <Ionicons name="cash-outline" size={22} color="#00B761" />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Attachments (Optional)</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={() => void pickAttachments()}>
              <Ionicons name="cloud-upload-outline" size={32} color="#00B761" />
              <Text style={styles.uploadText}>Upload Photos</Text>
              <Text style={styles.uploadSubtext}>Select images from your device for the provider</Text>
            </TouchableOpacity>
            {attachments.length > 0 ? (
              <View style={styles.attachmentList}>
                {attachments.map((attachment, index) => (
                  <View key={`${attachment.uri}-${index}`} style={styles.attachmentItem}>
                    <Image source={{ uri: attachment.uri }} style={styles.attachmentPreview} />
                    <View style={styles.attachmentCopy}>
                      <Text style={styles.attachmentLabel}>{attachment.label}</Text>
                      <Text style={styles.attachmentUri} numberOfLines={1}>
                        {attachment.uri.split('/').pop() || attachment.uri}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveAttachment(index)}>
                      <Ionicons name="close-circle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomContainer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>{getPaymentMethodLabel(paymentMethod)}</Text>
          <Text style={styles.priceValue}>P{totalAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, isSubmitting && { opacity: 0.7 }]}
          onPress={handleConfirmBooking}
          disabled={isSubmitting}
        >
          <Text style={styles.confirmButtonText}>{isSubmitting ? 'Saving...' : 'Confirm Booking'}</Text>
        </TouchableOpacity>
      </View>

      <SelectionModal
        visible={isServiceModalVisible}
        title="Select Service"
        data={serviceOptions}
        onClose={() => setServiceModalVisible(false)}
        renderItem={(item: ServiceOption, index: number) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.modalOption, serviceId === item.id && styles.modalOptionSelected]}
            onPress={() => {
              setServiceId(item.id);
              setService(item.title);
              setServiceModalVisible(false);
            }}
          >
            <Text style={[styles.modalOptionText, serviceId === item.id && styles.modalOptionTextSelected]}>
              {item.title} (P{Number(item.price || 0).toFixed(2)})
            </Text>
            {serviceId === item.id && <Ionicons name="checkmark-circle" size={24} color="#00B761" />}
          </TouchableOpacity>
        )}
      />

      <SelectionModal
        visible={isTimeModalVisible}
        title="Select Time"
        data={availableTimeOptions}
        onClose={() => setTimeModalVisible(false)}
        renderItem={(item: string, index: number) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.modalOption, time === item && styles.modalOptionSelected]}
            onPress={() => {
              setTime(item);
              setTimeModalVisible(false);
            }}
          >
            <Text style={[styles.modalOptionText, time === item && styles.modalOptionTextSelected]}>
              {item}
            </Text>
            {time === item && (
              <Ionicons name="checkmark-circle" size={20} color="#00B761" />
            )}
          </TouchableOpacity>
        )}
      />

      {!isInShopService ? (
        <SelectionModal
          visible={isAddressModalVisible}
          title="Select Address"
          data={[...savedAddresses, { id: 'add_new', type: 'Add New Address' }]}
          onClose={() => setAddressModalVisible(false)}
          renderItem={(item: any) => {
            if (item.id === 'add_new') {
              return (
                <TouchableOpacity 
                  key="add_new"
                  style={[styles.modalAddressOption, { borderBottomWidth: 0, marginTop: 4 }]}
                  onPress={() => {
                    setAddressModalVisible(false);
                    router.push({ pathname: '/add-address', params: { returnTo: '/customer-booking-form' } });
                  }}
                >
                  <View style={[styles.modalAddressIcon, { backgroundColor: '#F0F0F0' }]}>
                    <Ionicons name="add" size={20} color="#0D1B2A" />
                  </View>
                  <View style={styles.modalAddressDetails}>
                    <Text style={[styles.modalOptionText, { fontWeight: '600' }]}>Add New Address</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.modalAddressOption, address?.id === item.id && styles.modalOptionSelected]}
                onPress={() => {
                  setAddress(item);
                  setAddressModalVisible(false);
                }}
              >
                <View style={styles.modalAddressIcon}>
                  <Ionicons name={getAddressIcon(item.type)} size={20} color="#00B761" />
                </View>
                <View style={styles.modalAddressDetails}>
                  <Text style={[styles.modalOptionText, address?.id === item.id && styles.modalOptionTextSelected]}>
                    {item.type}
                  </Text>
                  <Text style={styles.modalAddressLine} numberOfLines={1}>{item.fullAddress}</Text>
                </View>
                {address?.id === item.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#00B761" />
                )}
              </TouchableOpacity>
            );
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
