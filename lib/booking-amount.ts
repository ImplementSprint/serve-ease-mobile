import type { Payment } from '@/src/types/database.interfaces';

export const toAmountNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const resolveDisplayedBookingTotal = (
  bookingData: any,
  payment?: Payment | null,
): number => {
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
  const hoursRequired =
    rawHoursRequired !== null && rawHoursRequired > 0 ? rawHoursRequired : 1;
  const hourlyComputed =
    hourlyRate !== null && hourlyRate > 0 ? hourlyRate * hoursRequired : null;
  if (hourlyComputed !== null && hourlyComputed > 0) return hourlyComputed;

  const flatRate = toAmountNumber(bookingData?.flat_rate);
  if (flatRate !== null && flatRate > 0) return flatRate;

  const servicePrice = toAmountNumber(
    bookingData?.service_price ??
      bookingData?.serviceAmount ??
      bookingData?.service?.price,
  );
  if (servicePrice !== null && servicePrice > 0) return servicePrice;

  const fallbackPrimary = primaryCandidates.find(
    (value): value is number => value !== null,
  );
  if (fallbackPrimary !== undefined) return fallbackPrimary;

  return 0;
};
