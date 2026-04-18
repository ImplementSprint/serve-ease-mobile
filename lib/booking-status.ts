export type NormalizedBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type CustomerBookingPresentation = {
  normalizedStatus: NormalizedBookingStatus;
  label: string;
  tone: 'warning' | 'success' | 'completed' | 'cancelled';
  tab: 'inProgress' | 'completed' | 'cancelled';
  actionLabel: 'Track Order' | 'View Details';
  actionIcon: 'location-outline' | 'calendar-outline';
  canTrack: boolean;
  canCancel: boolean;
  summaryTitle: string;
  summaryText: string;
};

export type CustomerTrackingStep = {
  key: 'booked' | 'confirmed' | 'in_progress' | 'completed';
  label: string;
  state: 'complete' | 'active' | 'upcoming';
};

export const normalizeBookingStatus = (statusRaw?: string | null): NormalizedBookingStatus => {
  const status = String(statusRaw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  if (!status) return 'pending';
  if (status.includes('cancel')) return 'cancelled';
  if (status.includes('complete') || status === 'done') return 'completed';
  if (
    status.includes('progress') ||
    status.includes('ongoing') ||
    status.includes('start') ||
    status.includes('arrived') ||
    status.includes('on_the_way')
  ) {
    return 'in_progress';
  }
  if (status.includes('confirm') || status.includes('accept') || status.includes('assign')) {
    return 'confirmed';
  }
  return 'pending';
};

export const getCustomerBookingPresentation = (
  statusRaw?: string | null
): CustomerBookingPresentation => {
  const normalizedStatus = normalizeBookingStatus(statusRaw);

  switch (normalizedStatus) {
    case 'cancelled':
      return {
        normalizedStatus,
        label: 'Cancelled',
        tone: 'cancelled',
        tab: 'cancelled',
        actionLabel: 'View Details',
        actionIcon: 'calendar-outline',
        canTrack: false,
        canCancel: false,
        summaryTitle: 'BOOKING CANCELLED',
        summaryText:
          'This booking was cancelled. You can still review the details for your records.',
      };
    case 'completed':
      return {
        normalizedStatus,
        label: 'Completed',
        tone: 'completed',
        tab: 'completed',
        actionLabel: 'View Details',
        actionIcon: 'calendar-outline',
        canTrack: false,
        canCancel: false,
        summaryTitle: 'SERVICE COMPLETED',
        summaryText:
          'This booking has been completed successfully. You can review the provider or book the service again.',
      };
    case 'in_progress':
      return {
        normalizedStatus,
        label: 'In Progress',
        tone: 'warning',
        tab: 'inProgress',
        actionLabel: 'Track Order',
        actionIcon: 'location-outline',
        canTrack: true,
        canCancel: false,
        summaryTitle: 'SERVICE IS ACTIVE',
        summaryText:
          'Your provider has already started the job. Follow updates here while the service is in progress.',
      };
    case 'confirmed':
      return {
        normalizedStatus,
        label: 'Confirmed',
        tone: 'success',
        tab: 'inProgress',
        actionLabel: 'Track Order',
        actionIcon: 'location-outline',
        canTrack: true,
        canCancel: true,
        summaryTitle: 'PROVIDER CONFIRMED',
        summaryText:
          'Your booking is confirmed and your provider is preparing for the scheduled service.',
      };
    default:
      return {
        normalizedStatus: 'pending',
        label: 'Pending',
        tone: 'warning',
        tab: 'inProgress',
        actionLabel: 'View Details',
        actionIcon: 'calendar-outline',
        canTrack: false,
        canCancel: true,
        summaryTitle: 'BOOKING REQUESTED',
        summaryText:
          'Your booking request has been received and is waiting for provider confirmation.',
      };
  }
};

export const getCustomerTrackingSteps = (
  statusRaw?: string | null
): CustomerTrackingStep[] => {
  const normalizedStatus = normalizeBookingStatus(statusRaw);
  const stage =
    normalizedStatus === 'pending'
      ? 0
      : normalizedStatus === 'confirmed'
        ? 1
        : normalizedStatus === 'in_progress'
          ? 2
          : 3;

  const baseSteps: Omit<CustomerTrackingStep, 'state'>[] = [
    { key: 'booked', label: 'Booked' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ];

  return baseSteps.map((step, index) => ({
    ...step,
    state:
      index < stage
        ? 'complete'
        : index === stage
          ? normalizedStatus === 'cancelled'
            ? 'upcoming'
            : 'active'
          : 'upcoming',
  }));
};
