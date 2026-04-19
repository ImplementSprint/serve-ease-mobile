import { api } from '../lib/apiClient';
import { getErrorMessage } from '../lib/error-handling';

export type ProviderAvailabilityRow = {
  user_id: string;
  day_of_week: string;
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
};

export type ProviderDayOffRow = {
  id?: string;
  user_id: string;
  off_date: string;
  reason: string | null;
};

export type ProviderAvailabilityState = {
  weeklySchedule: Record<
    string,
    {
      active: boolean;
      start: string;
      end: string;
      break: { start: string; end: string } | null;
    }
  >;
  daysOff: { id: string; day: string; reason: string }[];
};

export type SaveProviderAvailabilityInput = {
  weeklySchedule?: ProviderAvailabilityState['weeklySchedule'];
  daysOff?: ProviderAvailabilityState['daysOff'];
};

export type ProviderReservedSlot = {
  scheduled_at: string;
  end_at: string;
  hours_required: number;
};

const DEFAULT_WEEKLY_SCHEDULE: ProviderAvailabilityState['weeklySchedule'] = {
  Monday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
  Tuesday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
  Wednesday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
  Thursday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
  Friday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
  Saturday: { active: false, start: '08:00 AM', end: '05:00 PM', break: null },
  Sunday: { active: false, start: '08:00 AM', end: '05:00 PM', break: null },
};

const DAY_NAMES = Object.keys(DEFAULT_WEEKLY_SCHEDULE);

const to24Hour = (value: string) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return raw || null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
};

const to12Hour = (value?: string | null) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '';

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  if (hours === 0) hours = 12;
  if (hours > 12) hours -= 12;
  return `${hours}:${minutes} ${meridiem}`;
};

const normalizeDateKey = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const yyyyMmDd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDd) return `${yyyyMmDd[1]}-${yyyyMmDd[2]}-${yyyyMmDd[3]}`;

  const isoPrefix = raw.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoPrefix) return `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}`;

  const ddMmYyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddMmYyyy) return `${ddMmYyyy[3]}-${ddMmYyyy[2]}-${ddMmYyyy[1]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const weekdayForDate = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'long' });

const minutesFromTime = (value: string) => {
  const normalized = to24Hour(value);
  const match = String(normalized || '').match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const getDefaultProviderAvailabilityState = (): ProviderAvailabilityState => ({
  weeklySchedule: { ...DEFAULT_WEEKLY_SCHEDULE },
  daysOff: [],
});

export const getProviderAvailability = async (userId: string) => {
  const defaultState = getDefaultProviderAvailabilityState();

  try {
    const { weeklySchedule: weeklyRows, daysOff: daysOffRows } = await api.get<{
      weeklySchedule: ProviderAvailabilityRow[];
      daysOff: ProviderDayOffRow[];
    }>(`/provider/${userId}/availability`);

    const schedule = { ...defaultState.weeklySchedule };

    (weeklyRows || []).forEach((row: ProviderAvailabilityRow) => {
      const key = String(row.day_of_week || '').trim();
      if (!DAY_NAMES.includes(key)) return;
      schedule[key] = {
        active: Boolean(row.is_active),
        start: to12Hour(row.start_time) || schedule[key].start,
        end: to12Hour(row.end_time) || schedule[key].end,
        break:
          row.break_start_time || row.break_end_time
            ? {
                start: to12Hour(row.break_start_time) || '',
                end: to12Hour(row.break_end_time) || '',
              }
            : null,
      };
    });

    return {
      weeklySchedule: schedule,
      daysOff: (daysOffRows || []).map((row: ProviderDayOffRow) => ({
        id: String(row.id || row.off_date),
        day: normalizeDateKey(row.off_date),
        reason: String(row.reason || ''),
      })),
    } as ProviderAvailabilityState;
  } catch {
    return defaultState;
  }
};

export const saveProviderAvailability = async (
  userId: string,
  state: SaveProviderAvailabilityInput
) => {
  try {
    const payload: Record<string, unknown> = {};

    if (state.weeklySchedule) {
      payload.weeklySchedule = DAY_NAMES.map((day) => ({
        user_id: userId,
        day_of_week: day,
        is_active: Boolean(state.weeklySchedule?.[day]?.active),
        start_time: to24Hour(state.weeklySchedule?.[day]?.start || ''),
        end_time: to24Hour(state.weeklySchedule?.[day]?.end || ''),
        break_start_time: to24Hour(state.weeklySchedule?.[day]?.break?.start || ''),
        break_end_time: to24Hour(state.weeklySchedule?.[day]?.break?.end || ''),
      }));
    }

    if (state.daysOff) {
      payload.daysOff = state.daysOff
        .map((item) => ({
          off_date: normalizeDateKey(item.day),
          reason: item.reason || null,
        }))
        .filter((item) => item.off_date);
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'weeklySchedule') &&
        !Object.prototype.hasOwnProperty.call(payload, 'daysOff')) {
      return;
    }

    await api.put('/provider/availability', payload);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to save provider availability.'));
  }
};

export const getProviderReservedSlots = async (
  providerId: string,
  date: string,
) => {
  const { reservedSlots } = await api.get<{
    reservedSlots: ProviderReservedSlot[];
  }>(`/provider/${providerId}/reserved-slots`, {
    params: { date },
  });

  return reservedSlots || [];
};

export const validateProviderAvailability = async (
  providerId: string,
  scheduledAt: Date,
  hoursRequired: number
) => {
  try {
    const availability = await getProviderAvailability(providerId);
    const weekday = weekdayForDate(scheduledAt);
    const offDate = scheduledAt.toISOString().slice(0, 10);

    if (availability.daysOff.some((item) => item.day === offDate)) {
      return {
        available: false,
        reason: 'This provider is marked unavailable on the selected date.',
      };
    }

    const daySchedule = availability.weeklySchedule[weekday];
    if (!daySchedule) {
      return { available: true };
    }

    if (!daySchedule.active) {
      return {
        available: false,
        reason: `${weekday} is outside this provider's working days.`,
      };
    }

    const scheduledMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
    const startMinutes = minutesFromTime(daySchedule.start);
    const endMinutes = minutesFromTime(daySchedule.end);

    if (startMinutes !== null && endMinutes !== null) {
      if (scheduledMinutes < startMinutes || scheduledMinutes >= endMinutes) {
        return {
          available: false,
          reason: 'The selected time is outside the provider availability window.',
        };
      }
    }

    if (daySchedule.break?.start && daySchedule.break?.end) {
      const breakStart = minutesFromTime(daySchedule.break.start);
      const breakEnd = minutesFromTime(daySchedule.break.end);

      if (
        breakStart !== null &&
        breakEnd !== null &&
        scheduledMinutes >= breakStart &&
        scheduledMinutes < breakEnd
      ) {
        return {
          available: false,
          reason: 'The selected time overlaps with the provider break period.',
        };
      }
    }

    try {
      const result = await api.get<{ available: boolean; reason?: string }>(
        `/provider/${providerId}/availability/check`,
        {
          params: {
            scheduled_at: scheduledAt.toISOString(),
            hours_required: Math.max(1, Number(hoursRequired || 1)),
          },
        }
      );

      if (!result.available) {
        return {
          available: false,
          reason: result.reason || 'This time slot is already booked.',
        };
      }
    } catch {
      return { available: true };
    }

    return { available: true };
  } catch {
    return { available: true };
  }
};
