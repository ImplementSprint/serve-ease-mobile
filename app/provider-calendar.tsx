import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/error-handling';
import {
  getProviderAvailability,
  getDefaultProviderAvailabilityState,
  saveProviderAvailability,
  type ProviderAvailabilityState,
} from '@/services/providerAvailabilityService';
import {
  getProviderBookings,
  getProviderBookingActionState,
  normalizeProviderBookingStatus,
  type ProviderBookingView,
} from '@/services/providerBookingService';

type ViewMode = 'Month' | 'Week' | 'Day';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatMonthTitle = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const formatLongDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDate = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const startOfMonthGrid = (date: Date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = firstDay.getDay();
  return new Date(date.getFullYear(), date.getMonth(), 1 - offset);
};

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  next.setDate(date.getDate() - date.getDay());
  next.setHours(0, 0, 0, 0);
  return next;
};

const getScheduleLabel = (schedule?: { active: boolean; start: string; end: string; break: { start: string; end: string } | null }) => {
  if (!schedule) return 'No saved schedule';
  if (!schedule.active) return 'Unavailable';
  const breakLabel =
    schedule.break?.start && schedule.break?.end
      ? ` • Break ${schedule.break.start} - ${schedule.break.end}`
      : '';
  return `${schedule.start} - ${schedule.end}${breakLabel}`;
};

const toDayEntries = (bookings: ProviderBookingView[], selectedDate: Date) => {
  const key = formatDateKey(selectedDate);
  return bookings
    .filter((booking) => {
      const scheduled = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
      if (!scheduled || Number.isNaN(scheduled.getTime())) return false;
      return formatDateKey(scheduled) === key;
    })
    .sort((left, right) => String(left.scheduled_at).localeCompare(String(right.scheduled_at)));
};

export default function ProviderCalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [viewMode, setViewMode] = React.useState<ViewMode>('Month');
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [availability, setAvailability] = React.useState<ProviderAvailabilityState>(getDefaultProviderAvailabilityState());
  const [bookings, setBookings] = React.useState<ProviderBookingView[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isEventModalVisible, setIsEventModalVisible] = React.useState(false);
  const [eventReason, setEventReason] = React.useState('');

  const load = React.useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setAvailability(getDefaultProviderAvailabilityState());
      setBookings([]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [availabilityData, bookingData] = await Promise.all([
        getProviderAvailability(user.id),
        getProviderBookings(user.id),
      ]);
      setAvailability(availabilityData);
      setBookings(bookingData);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load provider calendar.'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      void load();
    }, [load])
  );

  const currentMonth = React.useMemo(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    [selectedDate]
  );
  const monthTitle = formatMonthTitle(currentMonth);
  const selectedDateKey = formatDateKey(selectedDate);
  const blockedDay = availability.daysOff.find((item) => item.day === selectedDateKey) || null;
  const selectedWeekday = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const selectedSchedule = availability.weeklySchedule[selectedWeekday];
  const dayBookings = React.useMemo(() => toDayEntries(bookings, selectedDate), [bookings, selectedDate]);

  const bookingCountByDate = React.useMemo(() => {
    const map = new Map<string, number>();

    bookings.forEach((booking) => {
      const scheduled = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
      if (!scheduled || Number.isNaN(scheduled.getTime())) return;
      const key = formatDateKey(scheduled);
      map.set(key, (map.get(key) || 0) + 1);
    });

    return map;
  }, [bookings]);

  const blockedDayMap = React.useMemo(
    () => new Map(availability.daysOff.map((item) => [item.day, item])),
    [availability.daysOff]
  );

  const saveDaysOff = async (nextDaysOff: ProviderAvailabilityState['daysOff']) => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please sign in again before updating your calendar.');
      return;
    }

    setIsSaving(true);
    try {
      const next = {
        ...availability,
        daysOff: nextDaysOff,
      };
      await saveProviderAvailability(user.id, { daysOff: nextDaysOff });
      setAvailability(next);
    } catch (err) {
      Alert.alert('Save Failed', getErrorMessage(err, 'Could not update the selected day.'));
    } finally {
      setIsSaving(false);
    }
  };

  const pendingBookingsOnSelectedDay = React.useMemo(() => {
    return dayBookings.filter(
      (b) => normalizeProviderBookingStatus(b.status) === 'pending'
    );
  }, [dayBookings]);

  const handleToggleBlockDay = async () => {
    // Unblocking is always allowed
    if (blockedDay) {
      await saveDaysOff(availability.daysOff.filter((item) => item.day !== selectedDateKey));
      return;
    }

    // Prevent blocking if there are pending bookings the provider hasn't responded to
    if (pendingBookingsOnSelectedDay.length > 0) {
      const count = pendingBookingsOnSelectedDay.length;
      Alert.alert(
        'Pending Bookings',
        `You have ${count} pending booking${count > 1 ? 's' : ''} on this day that need${count === 1 ? 's' : ''} your response. Please accept or decline ${count > 1 ? 'them' : 'it'} before blocking this day.`
      );
      return;
    }

    await saveDaysOff([
      ...availability.daysOff,
      {
        id: selectedDateKey,
        day: selectedDateKey,
        reason: 'Blocked from calendar',
      },
    ]);
  };

  const handleSavePersonalEvent = async () => {
    const reason = eventReason.trim();
    if (!reason) {
      Alert.alert('Missing Details', 'Please enter a reason for blocking this day.');
      return;
    }

    if (pendingBookingsOnSelectedDay.length > 0) {
      const count = pendingBookingsOnSelectedDay.length;
      Alert.alert(
        'Pending Bookings',
        `You have ${count} pending booking${count > 1 ? 's' : ''} on this day that need${count === 1 ? 's' : ''} your response. Please accept or decline ${count > 1 ? 'them' : 'it'} before blocking this day.`
      );
      return;
    }

    const nextDaysOff = [
      ...availability.daysOff.filter((item) => item.day !== selectedDateKey),
      {
        id: selectedDateKey,
        day: selectedDateKey,
        reason,
      },
    ];

    await saveDaysOff(nextDaysOff);
    setEventReason('');
    setIsEventModalVisible(false);
  };

  const monthCells = React.useMemo(() => {
    const start = startOfMonthGrid(currentMonth);
    return Array.from({ length: 42 }).map((_, index) => {
      const next = new Date(start);
      next.setDate(start.getDate() + index);
      return next;
    });
  }, [currentMonth]);

  const weekCells = React.useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }).map((_, index) => {
      const next = new Date(start);
      next.setDate(start.getDate() + index);
      return next;
    });
  }, [selectedDate]);

  const visibleCells = viewMode === 'Month' ? monthCells : weekCells;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack?.() ? router.back() : router.replace('/(provider-tabs)' as any))} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0D1B2A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{monthTitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.todayButton}
          onPress={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            setSelectedDate(today);
          }}
        >
          <Text style={styles.todayText}>Today</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.calendarControls}>
            <View style={styles.viewTabs}>
              {(['Month', 'Week', 'Day'] as ViewMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.viewTab, viewMode === mode && styles.activeViewTab]}
                  onPress={() => setViewMode(mode)}
                >
                  <Text style={[styles.viewTabText, viewMode === mode && styles.activeViewTabText]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.calendarCard}>
            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#00B761" />
                <Text style={styles.loadingText}>Loading calendar...</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {!isLoading ? (
              <>
                <View style={styles.weekHeader}>
                  {WEEKDAY_LABELS.map((label) => (
                    <Text key={label} style={styles.weekHeaderText}>
                      {label}
                    </Text>
                  ))}
                </View>

                {viewMode === 'Day' ? (
                  <View style={styles.dayViewMini}>
                    <Text style={styles.miniDayText}>{formatLongDate(selectedDate)}</Text>
                    <Text style={styles.miniDaySubtext}>
                      {blockedDay ? `Blocked • ${blockedDay.reason || 'Unavailable'}` : getScheduleLabel(selectedSchedule)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.gridWrap}>
                    {visibleCells.map((date, index) => {
                      const isSelected = isSameDate(date, selectedDate);
                      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                      const isBlocked = blockedDayMap.has(formatDateKey(date));
                      const bookingCount = bookingCountByDate.get(formatDateKey(date)) || 0;
                      const showRowBreak = viewMode === 'Month' && index > 0 && index % 7 === 0;

                      return (
                        <React.Fragment key={formatDateKey(date)}>
                          {showRowBreak ? <View style={styles.rowBreak} /> : null}
                          <TouchableOpacity
                            style={[
                              viewMode === 'Month' ? styles.dayCell : styles.weekDayCell,
                              isSelected && styles.selectedDayCell,
                              isBlocked && styles.blockedDayCell,
                            ]}
                            onPress={() => setSelectedDate(date)}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                !isCurrentMonth && styles.dimmedDayText,
                                isSelected && styles.selectedDayText,
                                isBlocked && styles.blockedDayText,
                              ]}
                            >
                              {date.getDate()}
                            </Text>
                            {bookingCount > 0 ? <View style={styles.eventDot} /> : null}
                          </TouchableOpacity>
                        </React.Fragment>
                      );
                    })}
                  </View>
                )}
              </>
            ) : null}
          </View>

          <View style={[styles.dayDetailsPanel, viewMode === 'Day' && styles.fullDayPanel]}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>{formatLongDate(selectedDate)}</Text>
                <Text style={styles.panelSubtext}>{selectedWeekday}</Text>
              </View>
              {blockedDay ? (
                <View style={styles.blockedBadge}>
                  <Text style={styles.blockedBadgeText}>Blocked</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="briefcase-outline" size={18} color="#00B761" />
              <View style={styles.infoCardTextWrap}>
                <Text style={styles.infoCardTitle}>Working Hours</Text>
                <Text style={styles.infoCardBody}>{getScheduleLabel(selectedSchedule)}</Text>
              </View>
            </View>

            {blockedDay?.reason ? (
              <View style={styles.infoCard}>
                <Ionicons name="remove-circle-outline" size={18} color="#FF4D4D" />
                <View style={styles.infoCardTextWrap}>
                  <Text style={styles.infoCardTitle}>Blocked Reason</Text>
                  <Text style={styles.infoCardBody}>{blockedDay.reason}</Text>
                </View>
              </View>
            ) : null}

            {dayBookings.length > 0 ? (
              dayBookings.map((item) => {
                const scheduled = item.scheduled_at ? new Date(item.scheduled_at) : null;
                const timeLabel =
                  scheduled && !Number.isNaN(scheduled.getTime())
                    ? scheduled.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : 'N/A';
                const actionState = getProviderBookingActionState(item.status);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.scheduleItem}
                    onPress={() => router.push({ pathname: '/provider-booking-details', params: { id: item.id } } as any)}
                  >
                    <View style={[styles.scheduleIconContainer, { backgroundColor: '#E8F1FF' }]}>
                      <Ionicons name="calendar-outline" size={20} color="#3A86FF" />
                    </View>
                    <View style={styles.scheduleInfo}>
                      <View style={styles.scheduleItemHeader}>
                        <Text style={styles.scheduleItemTitle}>{item.customer_name}</Text>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>{actionState.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.scheduleItemSub}>{item.service_title}</Text>
                      <Text style={styles.scheduleItemTime}>{timeLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#EEE" />
                <Text style={styles.emptyText}>
                  {blockedDay ? 'This day is blocked.' : 'No bookings scheduled for this day.'}
                </Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.blockDayButton, isSaving && styles.disabledButton]}
                onPress={() => void handleToggleBlockDay()}
                disabled={isSaving}
              >
                <Text style={styles.blockDayText}>
                  {isSaving
                    ? 'Please wait...'
                    : blockedDay
                      ? 'Unblock This Day'
                      : 'Block This Day'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.setHoursButton} onPress={() => router.push('/provider-availability' as any)}>
                <Text style={styles.setHoursText}>Manage Weekly Hours</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addEventButton} onPress={() => setIsEventModalVisible(true)}>
                <Text style={styles.addEventText}>Add Personal Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isEventModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEventModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsEventModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={{ width: '100%', justifyContent: 'flex-end' }}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Block Day with Reason</Text>
                <TouchableOpacity onPress={() => setIsEventModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#0D1B2A" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Doctor appointment, personal errand, vacation, etc."
                value={eventReason}
                onChangeText={setEventReason}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity style={styles.modalSaveButton} onPress={() => void handleSavePersonalEvent()}>
                <Text style={styles.modalSaveButtonText}>Save Blocked Day</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { padding: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0D1B2A' },
  todayButton: { backgroundColor: '#00B761', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  todayText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  scrollContainer: { flex: 1 },
  container: { padding: 24 },
  calendarControls: { marginBottom: 20 },
  viewTabs: { flexDirection: 'row', backgroundColor: '#F2F3F5', borderRadius: 12, padding: 4 },
  viewTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeViewTab: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewTabText: { fontSize: 14, color: '#8E8E93', fontWeight: '600' },
  activeViewTabText: { color: '#0D1B2A' },
  calendarCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 20 },
  loadingText: { color: '#64748B' },
  errorText: { color: '#C62828', textAlign: 'center', marginBottom: 12 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#AAA',
    textTransform: 'uppercase',
  },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  rowBreak: { width: '100%', height: 8 },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  weekDayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  selectedDayCell: { backgroundColor: '#00B761' },
  blockedDayCell: { backgroundColor: '#FEEFEF' },
  dayText: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  selectedDayText: { color: '#FFF' },
  blockedDayText: { color: '#FF4D4D' },
  dimmedDayText: { color: '#D0D5DD' },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#00B761', marginTop: 4 },
  dayViewMini: { padding: 20, alignItems: 'center' },
  miniDayText: { color: '#0D1B2A', fontSize: 15, fontWeight: '700' },
  miniDaySubtext: { marginTop: 6, color: '#8E8E93', textAlign: 'center' },
  dayDetailsPanel: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F0F0F0' },
  fullDayPanel: { minHeight: 400 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#0D1B2A' },
  panelSubtext: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  blockedBadge: { backgroundColor: '#FEEFEF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  blockedBadgeText: { color: '#FF4D4D', fontSize: 12, fontWeight: '700' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 14,
  },
  infoCardTextWrap: { flex: 1 },
  infoCardTitle: { fontSize: 14, fontWeight: '700', color: '#0D1B2A' },
  infoCardBody: { fontSize: 13, color: '#556', marginTop: 4 },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scheduleInfo: { flex: 1 },
  scheduleItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 10 },
  scheduleItemTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0D1B2A' },
  scheduleItemSub: { fontSize: 13, color: '#8E8E93', marginBottom: 4 },
  scheduleItemTime: { fontSize: 13, color: '#444', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#E8FBF2' },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#00B761' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#AAA', textAlign: 'center' },
  actionButtons: { marginTop: 20, gap: 12 },
  blockDayButton: {
    height: 56,
    backgroundColor: '#FFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF4D4D',
  },
  disabledButton: { opacity: 0.6 },
  blockDayText: { fontSize: 16, fontWeight: '700', color: '#FF4D4D' },
  setHoursButton: {
    height: 56,
    backgroundColor: '#FFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00B761',
  },
  setHoursText: { fontSize: 16, fontWeight: '700', color: '#00B761' },
  addEventButton: {
    height: 56,
    backgroundColor: '#FFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  addEventText: { fontSize: 16, fontWeight: '700', color: '#555' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0D1B2A' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 10, marginTop: 16 },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    fontSize: 15,
    color: '#0D1B2A',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  textArea: { minHeight: 100, paddingTop: 16, textAlignVertical: 'top' },
  modalSaveButton: {
    height: 56,
    backgroundColor: '#00B761',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  modalSaveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
