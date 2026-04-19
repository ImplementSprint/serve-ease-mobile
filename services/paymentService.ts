import { api } from '../lib/apiClient';
import { Payment } from '../src/types/database.interfaces';

export type ProviderPaymentHistoryItem = Payment & {
  booking_reference: string;
  customer_name: string;
  service_title: string;
  scheduled_at?: string | null;
  net_earnings: number;
  platform_fee: number;
};

export type ProviderEarningsSummary = {
  payments: ProviderPaymentHistoryItem[];
  totalNetEarnings: number;
  pendingRevenue: number;
  cashOnHand: number;
  averagePerService: number;
  paidCount: number;
  totalGrossEarnings: number;
  platformFees: number;
  monthlyEarnings: number;
};

type RawProviderEarningsSummary = {
  total_earnings?: unknown;
  net_earnings?: unknown;
  platform_fees?: unknown;
  monthly_earnings?: unknown;
  completed_payments?: unknown;
  pending_revenue?: unknown;
  pendingRevenue?: unknown;
  cash_on_hand?: unknown;
  cashOnHand?: unknown;
  average_per_service?: unknown;
  averagePerService?: unknown;
};

type RawProviderBookingEarnings = {
  service_id?: unknown;
  service_title?: unknown;
  status?: unknown;
  total_amount?: unknown;
  totalAmount?: unknown;
  hourly_rate?: unknown;
  flat_rate?: unknown;
  service_price?: unknown;
  hours_required?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  completed_at?: unknown;
};

type RawProviderServiceForEarnings = {
  id?: unknown;
  title?: unknown;
  price?: unknown;
  hourly_rate?: unknown;
  flat_rate?: unknown;
};

const toTrimmedString = (value: unknown): string => String(value ?? '').trim();

const normalizeStatus = (value: unknown): string =>
  toTrimmedString(value)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

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

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = toAmountNumber(value);
  return parsed !== null ? parsed : fallback;
};

const resolveMetric = (summaryValue: unknown, fallbackValue: number): number => {
  const parsedSummary = toAmountNumber(summaryValue);
  if (parsedSummary !== null && parsedSummary > 0) return parsedSummary;
  if (fallbackValue > 0) return fallbackValue;
  return parsedSummary ?? fallbackValue;
};

const resolveCount = (summaryValue: unknown, fallbackValue: number): number => {
  const parsedSummary = toAmountNumber(summaryValue);
  if (parsedSummary !== null && parsedSummary > 0) return Math.round(parsedSummary);
  if (fallbackValue > 0) return Math.round(fallbackValue);
  return parsedSummary !== null ? Math.round(parsedSummary) : Math.round(fallbackValue);
};

const PAID_PAYMENT_STATUSES = new Set([
  'paid',
  'completed',
  'success',
  'succeeded',
  'settled',
  'captured',
  'done',
]);
const PENDING_PAYMENT_STATUSES = new Set([
  'pending',
  'authorized',
  'processing',
  'in_progress',
  'awaiting_payment',
]);
const FAILED_PAYMENT_STATUSES = new Set([
  'failed',
  'cancelled',
  'canceled',
  'refunded',
  'voided',
  'chargeback',
]);

const isPaidPayment = (payment: ProviderPaymentHistoryItem) => {
  const status = normalizeStatus(payment.status);
  if (PAID_PAYMENT_STATUSES.has(status)) return true;
  const hasPaidAt = Boolean(toTrimmedString(payment.paid_at));
  if (hasPaidAt && !FAILED_PAYMENT_STATUSES.has(status)) return true;
  return false;
};

const isPendingPayment = (payment: ProviderPaymentHistoryItem) => {
  if (isPaidPayment(payment)) return false;
  const status = normalizeStatus(payment.status);
  return PENDING_PAYMENT_STATUSES.has(status);
};

const isCompletedBookingStatus = (statusRaw: unknown) => {
  const status = normalizeStatus(statusRaw);
  return (
    status === 'completed' ||
    status === 'complete' ||
    status === 'done' ||
    status.includes('completed')
  );
};

const isPendingBookingStatus = (statusRaw: unknown) => {
  const status = normalizeStatus(statusRaw);
  return (
    status === 'pending' ||
    status === 'confirmed' ||
    status === 'in_progress' ||
    status === 'accepted' ||
    status === 'assigned'
  );
};

const toDateOrNull = (value: unknown): Date | null => {
  const text = toTrimmedString(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isCurrentMonth = (date: Date) => {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const resolveBookingAmount = (
  booking: RawProviderBookingEarnings,
  fallbackService?: RawProviderServiceForEarnings | null,
): number => {
  const primary = [
    toAmountNumber(booking.total_amount),
    toAmountNumber(booking.totalAmount),
  ];
  const primaryPositive = primary.find((value): value is number => value !== null && value > 0);
  if (primaryPositive !== undefined) return primaryPositive;

  const hourlyRate =
    toAmountNumber(booking.hourly_rate) ??
    toAmountNumber(fallbackService?.hourly_rate);
  const rawHoursRequired = toAmountNumber(booking.hours_required);
  const hoursRequired = rawHoursRequired !== null && rawHoursRequired > 0 ? rawHoursRequired : 1;
  const hourlyAmount = hourlyRate !== null && hourlyRate > 0 ? hourlyRate * hoursRequired : null;
  const flatRate =
    toAmountNumber(booking.flat_rate) ?? toAmountNumber(fallbackService?.flat_rate);
  const servicePrice =
    toAmountNumber(booking.service_price) ?? toAmountNumber(fallbackService?.price);

  const fallbackPositive = [hourlyAmount, flatRate, servicePrice].find(
    (value): value is number => value !== null && value > 0,
  );
  if (fallbackPositive !== undefined) return fallbackPositive;

  const nullablePrimary = primary.find((value): value is number => value !== null);
  return nullablePrimary ?? 0;
};

export type PaymentMethod =
  | 'cash'
  | 'cash_on_service'
  | 'card'
  | 'wallet'
  | 'gcash'
  | 'paymaya';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export const getPaymentByBookingId = async (bookingId: string): Promise<Payment | null> => {
  const { payment } = await api.get<{ payment: Payment | null }>(`/payments/booking/${bookingId}`);
  return payment;
};

export const getPaymentsByBookingIds = async (
  bookingIds: string[],
): Promise<Record<string, Payment | null>> => {
  const uniqueIds = bookingIds
    .map((value) => String(value || '').trim())
    .filter((value, index, rows) => Boolean(value) && rows.indexOf(value) === index);

  if (!uniqueIds.length) return {};

  const entries = await Promise.all(
    uniqueIds.map(async (bookingId) => {
      try {
        const payment = await getPaymentByBookingId(bookingId);
        return [bookingId, payment] as const;
      } catch {
        return [bookingId, null] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
};

export const getProviderPayments = async (_providerId?: string): Promise<Payment[]> => {
  const { payments } = await api.get<{ payments: Payment[] }>('/payments/provider/history');
  return payments;
};

export const getProviderPaymentHistory = async (_providerId?: string): Promise<ProviderPaymentHistoryItem[]> => {
  const { payments } = await api.get<{ payments: ProviderPaymentHistoryItem[] }>('/payments/provider/history');
  return payments;
};

export const getProviderEarningsSummary = async (_providerId?: string): Promise<ProviderEarningsSummary> => {
  const [summaryRaw, historyResponse, bookingResponse, servicesResponse] = await Promise.all([
    api.get<RawProviderEarningsSummary>('/payments/provider/earnings-summary'),
    getProviderPaymentHistory(),
    api.get<{ bookings: RawProviderBookingEarnings[] }>('/provider/bookings').catch(
      () => ({ bookings: [] as RawProviderBookingEarnings[] }),
    ),
    api.get<{ services: RawProviderServiceForEarnings[] }>('/provider/my-services').catch(
      () => ({ services: [] as RawProviderServiceForEarnings[] }),
    ),
  ]);

  const payments = (historyResponse || []).map((payment) => {
    const amount = toNumber(
      payment.amount ?? (payment as any).total_amount ?? (payment as any).totalAmount,
    );
    const explicitPlatformFee = toAmountNumber(
      (payment as any).platform_fee ?? (payment as any).platformFee,
    );
    const explicitNetEarnings = toAmountNumber(
      (payment as any).net_earnings ?? (payment as any).netEarnings,
    );

    let platformFee = explicitPlatformFee;
    let netEarnings = explicitNetEarnings;

    if (platformFee === null && netEarnings !== null && amount > 0) {
      platformFee = Math.max(amount - netEarnings, 0);
    }
    if (netEarnings === null && platformFee !== null && amount > 0) {
      netEarnings = Math.max(amount - platformFee, 0);
    }
    if (platformFee === null) {
      platformFee = amount > 0 ? amount * 0.1 : 0;
    }
    if (netEarnings === null) {
      netEarnings = Math.max(amount - platformFee, 0);
    }

    return {
      ...payment,
      amount,
      platform_fee: platformFee,
      net_earnings: netEarnings,
    };
  });

  const paidPayments = payments.filter((payment) => isPaidPayment(payment));
  const pendingPayments = payments.filter((payment) => isPendingPayment(payment));

  const paidCountFromHistory = paidPayments.filter((payment) => payment.amount > 0).length;
  const totalGrossFromHistory = paidPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const platformFeesFromHistory = paidPayments.reduce((sum, payment) => sum + toNumber(payment.platform_fee), 0);
  const totalNetFromHistory = paidPayments.reduce((sum, payment) => sum + toNumber(payment.net_earnings), 0);
  const pendingFromHistory = pendingPayments.reduce((sum, payment) => sum + toNumber(payment.net_earnings), 0);

  const monthlyFromHistory = paidPayments.reduce((sum, payment) => {
    const paidDate =
      toDateOrNull(payment.paid_at) ?? toDateOrNull(payment.created_at);
    if (!paidDate || !isCurrentMonth(paidDate)) return sum;
    return sum + toNumber(payment.net_earnings);
  }, 0);

  const services = servicesResponse?.services || [];
  const bookings = (bookingResponse?.bookings || []).map((booking) => {
    const bookingServiceId = toTrimmedString(booking.service_id).toLowerCase();
    const bookingServiceTitle = toTrimmedString(booking.service_title).toLowerCase();

    const matchedService =
      services.find((service) => {
        const serviceId = toTrimmedString(service.id).toLowerCase();
        const serviceTitle = toTrimmedString(service.title).toLowerCase();
        if (bookingServiceId && serviceId && bookingServiceId === serviceId) return true;
        return Boolean(
          bookingServiceTitle && serviceTitle && bookingServiceTitle === serviceTitle,
        );
      }) || null;

    return {
      status: normalizeStatus(booking.status),
      amount: resolveBookingAmount(booking, matchedService),
      when:
        toDateOrNull(booking.completed_at) ??
        toDateOrNull(booking.updated_at) ??
        toDateOrNull(booking.created_at),
    };
  });

  const completedBookings = bookings.filter(
    (booking) => isCompletedBookingStatus(booking.status) && booking.amount > 0,
  );
  const pendingBookings = bookings.filter(
    (booking) => isPendingBookingStatus(booking.status) && booking.amount > 0,
  );

  const totalGrossFromBookings = completedBookings.reduce(
    (sum, booking) => sum + booking.amount,
    0,
  );
  const platformFeesFromBookings = totalGrossFromBookings * 0.1;
  const totalNetFromBookings = Math.max(totalGrossFromBookings - platformFeesFromBookings, 0);
  const paidCountFromBookings = completedBookings.length;
  const pendingFromBookings = pendingBookings.reduce(
    (sum, booking) => sum + Math.max(booking.amount * 0.9, 0),
    0,
  );
  const monthlyFromBookings = completedBookings.reduce((sum, booking) => {
    if (!booking.when || !isCurrentMonth(booking.when)) return sum;
    return sum + Math.max(booking.amount * 0.9, 0);
  }, 0);

  const totalGrossFallback =
    totalGrossFromHistory > 0 ? totalGrossFromHistory : totalGrossFromBookings;
  const totalNetFallback =
    totalNetFromHistory > 0 ? totalNetFromHistory : totalNetFromBookings;
  const platformFeeFallback =
    platformFeesFromHistory > 0 ? platformFeesFromHistory : platformFeesFromBookings;
  const paidCountFallback =
    paidCountFromHistory > 0 ? paidCountFromHistory : paidCountFromBookings;
  const pendingFallback =
    pendingFromHistory > 0 ? pendingFromHistory : pendingFromBookings;
  const monthlyFallback =
    monthlyFromHistory > 0 ? monthlyFromHistory : monthlyFromBookings;

  const totalGrossEarnings = resolveMetric(summaryRaw?.total_earnings, totalGrossFallback);
  const totalNetEarnings = resolveMetric(summaryRaw?.net_earnings, totalNetFallback);
  const platformFees = resolveMetric(summaryRaw?.platform_fees, platformFeeFallback);
  const monthlyEarnings = resolveMetric(summaryRaw?.monthly_earnings, monthlyFallback);
  const paidCount = resolveCount(summaryRaw?.completed_payments, paidCountFallback);
  const pendingRevenue = resolveMetric(
    summaryRaw?.pending_revenue ?? summaryRaw?.pendingRevenue,
    pendingFallback,
  );
  const cashOnHand = resolveMetric(
    summaryRaw?.cash_on_hand ?? summaryRaw?.cashOnHand,
    totalNetEarnings,
  );
  const averagePerService =
    resolveMetric(
      summaryRaw?.average_per_service ?? summaryRaw?.averagePerService,
      paidCount > 0 ? totalNetEarnings / paidCount : 0,
    );

  return {
    payments,
    totalNetEarnings,
    pendingRevenue,
    cashOnHand,
    averagePerService,
    paidCount,
    totalGrossEarnings,
    platformFees,
    monthlyEarnings,
  };
};

export const ensureBookingPayment = async (input: { bookingId: string; customerId: string; provider_id: string; amount: number; method?: PaymentMethod }) => {
  const { payment } = await api.post<{ payment: Payment }>('/payments/booking/ensure', input);
  return payment;
};

export const markBookingPaymentPaid = async (input: { bookingId: string; amount?: number; customerId?: string; providerId?: string; method?: PaymentMethod }) => {
  await api.patch<{ status: string }>('/payments/booking/mark-paid', input);
};

export const cancelBookingPayment = async (bookingId: string) => {
  await api.patch<{ status: string }>(`/payments/booking/${bookingId}/cancel`);
};

export const updateBookingPaymentAmount = async (bookingId: string, amount: number) => {
  await api.patch<{ status: string }>(`/payments/booking/${bookingId}/amount`, { amount });
};

export const getPaymentStatusLabel = (statusRaw?: string | null) => {
  const s = normalizeStatus(statusRaw);
  if (PAID_PAYMENT_STATUSES.has(s)) return 'Paid';
  if (s === 'authorized') return 'Authorized';
  if (s === 'processing' || s === 'in_progress') return 'Processing';
  if (s === 'failed') return 'Failed';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  if (s === 'refunded') return 'Refunded';
  return 'Pending';
};

export const getPaymentMethodLabel = (methodRaw?: string | null) => {
  const m = String(methodRaw || '').trim().toLowerCase();
  if (m === 'gcash') return 'GCash';
  if (m === 'paymaya') return 'PayMaya';
  if (m === 'card') return 'Card';
  if (m === 'cash' || m === 'cash_on_service') return 'Cash on Service';
  return 'Cash on Service';
};
