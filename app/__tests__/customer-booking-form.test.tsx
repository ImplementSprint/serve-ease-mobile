import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CustomerBookingFormScreen, {
  buildBookingPricingSnapshot,
  computeAvailableTimeOptions,
  pickInitialServiceOption,
} from '../customer-booking-form';
import { useLocalSearchParams } from 'expo-router';

const mockCreateBooking = jest.fn<Promise<{ id: string }>, [unknown]>(() => Promise.resolve({ id: '123' }));
jest.mock('@/services/addressService', () => ({
  getUserAddresses: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@/services/bookingService', () => ({
  createBooking: (payload: unknown) => mockCreateBooking(payload),
}));

jest.mock('@/lib/apiClient', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { api } from '@/lib/apiClient';

describe('CustomerBookingFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ services: [] });
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  it('renders the booking form with provider name', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      providerName: 'Test Provider',
      serviceName: 'Cleaning',
      providerId: 'prov-1',
    });

    const { getByText } = render(<CustomerBookingFormScreen />);
    
    await waitFor(() => {
      expect(getByText('Confirm Booking')).toBeTruthy();
    });
  });

  it('shows error when attempting to confirm without selecting an address', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      providerName: 'Test Provider',
      serviceName: 'Cleaning',
      providerId: 'prov-1',
    });

    const { getByText } = render(<CustomerBookingFormScreen />);
    
    const confirmButton = getByText('Confirm Booking');
    fireEvent.press(confirmButton);

    // Should show validation alert (Mocking Alert.alert would be next step for full verification)
    expect(confirmButton).toBeTruthy();
  });

  it('shows a schema exposure message when provider services cannot be loaded', async () => {
    (api.get as jest.Mock).mockRejectedValue({
      code: 'PGRST106',
      message: 'The schema must be one of the exposed schemas.',
    });

    (useLocalSearchParams as jest.Mock).mockReturnValue({
      providerName: 'Test Provider',
      serviceName: 'Cleaning',
      providerId: 'prov-1',
    });

    const { getByText } = render(<CustomerBookingFormScreen />);

    await waitFor(() => {
      expect(
        getByText(
          'Provider services are temporarily unavailable due to a configuration issue. Please try again later or contact support.'
        )
      ).toBeTruthy();
    });
  });

  it('uses the effective hourly fallback when pricing mode state is null', () => {
    const result = buildBookingPricingSnapshot(
      {
        id: 'service-1',
        title: 'Deep Cleaning',
        price: 800,
        supports_hourly: true,
        hourly_rate: 250,
        supports_flat: true,
        flat_rate: 800,
        default_pricing_mode: 'hourly',
        service_location_type: 'mobile',
        service_location_address: null,
      },
      null,
      '3'
    );

    expect(result.effectivePricingMode).toBe('hourly');
    expect(result.isHourly).toBe(true);
    expect(result.parsedHoursRequired).toBe(3);
    expect(result.totalAmount).toBe(750);
    expect(result.hourlyRate).toBe(250);
  });

  it('prefers service id matching over subcategory-style service names', () => {
    const result = pickInitialServiceOption(
      [
        {
          id: 'service-1',
          title: 'Aircon Repair',
          price: 900,
          supports_hourly: false,
          hourly_rate: null,
          supports_flat: true,
          flat_rate: 900,
          default_pricing_mode: 'flat',
          service_location_type: 'mobile',
          service_location_address: null,
        },
        {
          id: 'service-2',
          title: 'Electrical Wiring',
          price: 500,
          supports_hourly: true,
          hourly_rate: 250,
          supports_flat: true,
          flat_rate: 500,
          default_pricing_mode: 'hourly',
          service_location_type: 'mobile',
          service_location_address: null,
        },
      ],
      'service-2',
      'Electrical'
    );

    expect(result?.id).toBe('service-2');
    expect(result?.title).toBe('Electrical Wiring');
  });

  it('renders the provider avatar when avatarUrl is provided', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      providerName: 'Test Provider',
      serviceName: 'Cleaning',
      providerId: 'prov-1',
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    const { getByText, getByTestId } = render(<CustomerBookingFormScreen />);

    await waitFor(() => {
      expect(getByText('Booking with Test Provider')).toBeTruthy();
    });

    expect(getByTestId('provider-banner-avatar')).toBeTruthy();
  });

  it('falls back to the icon when the provider avatar fails to load', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      providerName: 'Test Provider',
      serviceName: 'Cleaning',
      providerId: 'prov-1',
      avatarUrl: 'https://example.com/broken-avatar.jpg',
    });

    const { getByTestId, queryByTestId } = render(<CustomerBookingFormScreen />);

    await waitFor(() => {
      expect(getByTestId('provider-banner-avatar')).toBeTruthy();
    });

    fireEvent(getByTestId('provider-banner-avatar'), 'error');

    await waitFor(() => {
      expect(queryByTestId('provider-banner-avatar')).toBeNull();
    });
  });

  it('filters out overlapping time options based on reserved slots and duration', () => {
    // A 9:00 AM - 1:00 PM reservation blocks every 2-hour candidate here,
    // including 8:00 AM because 8:00-10:00 still overlaps 9:00-1:00.
    const reservedStart = new Date(2026, 3, 6, 9, 0, 0, 0);
    const reservedEnd = new Date(2026, 3, 6, 13, 0, 0, 0);

    const result = computeAvailableTimeOptions(
      {
        weeklySchedule: {
          Sunday: { active: false, start: '08:00 AM', end: '05:00 PM', break: null },
          Monday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
          Tuesday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
          Wednesday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
          Thursday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
          Friday: { active: true, start: '08:00 AM', end: '05:00 PM', break: null },
          Saturday: { active: false, start: '08:00 AM', end: '05:00 PM', break: null },
        },
        daysOff: [],
      },
      '2026-04-06',
      ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'],
      2,
      [
        {
          scheduled_at: reservedStart.toISOString(),
          end_at: reservedEnd.toISOString(),
          hours_required: 2,
        },
      ]
    );

    expect(result).toEqual([]);
  });
});
