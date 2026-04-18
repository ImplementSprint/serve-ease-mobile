import { api } from '../lib/apiClient';
import { Booking, EnrichedBooking } from '../src/types/database.interfaces';
import type { PaymentMethod } from './paymentService';

const normalizeBookingPaymentMethod = (paymentMethod?: PaymentMethod | null) => {
  const normalized = String(paymentMethod || '').trim().toLowerCase();
  if (normalized === 'cash') {
    return 'cash_on_service';
  }

  return normalized || 'cash_on_service';
};

export const getCustomerBookings = async (_customerId?: string): Promise<EnrichedBooking[]> => {
  const { bookings } = await api.get<{ bookings: EnrichedBooking[] }>('/booking/customer');
  return bookings;
};

export const createBooking = async (bookingData: any) => {
  const scheduledAt = parseScheduleLocal(
    String(bookingData.scheduled_date_key || bookingData.scheduled_date || '').trim(),
    String(bookingData.scheduled_time || '').trim()
  );

  if (!scheduledAt) {
    throw new Error('Please choose a valid booking date and time before confirming.');
  }

  const inserted = await api.post<{ booking: Booking }>('/booking/create', {
    provider_id: bookingData.provider_id,
    service_id: bookingData.service_id,
    service_address: bookingData.service_address || bookingData.address || '',
    service_location_type: bookingData.service_location_type || 'mobile',
    scheduled_at: scheduledAt.toISOString(),
    total_amount: bookingData.total_amount,
    pricing_mode: bookingData.pricing_mode || 'flat',
    hourly_rate: bookingData.hourly_rate,
    flat_rate: bookingData.flat_rate,
    hours_required: bookingData.hours_required,
    payment_method: normalizeBookingPaymentMethod(bookingData.payment_method),
    customer_notes: bookingData.customer_notes || '',
  });

  return inserted.booking;
};

export const getBookingById = async (bookingId: string): Promise<EnrichedBooking> => {
  const { booking } = await api.get<{ booking: EnrichedBooking }>(`/booking/${bookingId}`);
  return booking;
};

export const cancelCustomerBooking = async (
  bookingId: string,
  _customerId: string,
  reason: string,
  explanation: string
) => {
  await api.patch<{ status: string }>(`/booking/${bookingId}/cancel`, {
    reason,
    explanation,
  });
};

// ── Helpers (keep Supabase direct for notification lookups) ─────────────────

const parseTimeTo24h = (input: string) => {
  const pattern = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
  const m = pattern.exec(String(input || '').trim());
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const period = m[3].toUpperCase();
  if (period === 'AM') { if (hours === 12) hours = 0; } else if (hours !== 12) hours += 12;
  return { hours, minutes };
};

const parseScheduleLocal = (dateInput: string, timeInput: string) => {
  const time = parseTimeTo24h(timeInput);
  if (!time) return null;
  const pattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const ymd = pattern.exec(dateInput);
  if (ymd) {
    const dt = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), time.hours, time.minutes, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const parsedDate = new Date(dateInput);
  if (Number.isNaN(parsedDate.getTime())) return null;
  const dt = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), time.hours, time.minutes, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
};


