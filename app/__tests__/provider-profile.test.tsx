import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProviderProfileScreen from '../provider-profile';
import { useLocalSearchParams } from 'expo-router';
import { getProviderProfileData } from '@/services/marketplaceService';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'customer-user-1' },
  })),
}));

jest.mock('@/services/marketplaceService', () => ({
  getProviderProfileData: jest.fn(),
}));

jest.mock('@/services/providerVerificationService', () => ({
  formatVerificationStatusLabel: jest.fn(() => 'Approved'),
}));

jest.mock('@/lib/avatar', () => ({
  getAvatarUrl: jest.fn(() => 'https://example.com/uploads/avatar/provider'),
}));

describe('ProviderProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to the booking form when pressing Book Now', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      providerId: 'provider-9',
      providerName: 'Window Pros',
      serviceId: 'service-2',
      serviceName: 'Window Tinting',
    });

    (getProviderProfileData as jest.Mock).mockResolvedValue({
      user: { full_name: 'Window Pros' },
      profile: {
        business_name: 'Window Pros',
        verification_status: 'approved',
        average_rating: 4.8,
        total_reviews: 24,
      },
      services: [
        { id: 'service-1', title: 'Window Repair', price: 850 },
        { id: 'service-2', title: 'Window Tinting', price: 1200 },
      ],
    });

    const { getByText } = render(<ProviderProfileScreen />);

    await waitFor(() => {
      expect(getProviderProfileData).toHaveBeenCalledWith('provider-9');
      expect(getByText('Book Now')).toBeTruthy();
    });

    fireEvent.press(getByText('Book Now'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/customer-booking-form',
      params: expect.objectContaining({
        providerId: 'provider-9',
        providerName: 'Window Pros',
        serviceId: 'service-2',
        serviceName: 'Window Tinting',
      }),
    });
  });

  it('uses the first provider service when no suggested service is passed', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      providerId: 'provider-11',
      providerName: 'FixIt HVAC',
    });

    (getProviderProfileData as jest.Mock).mockResolvedValue({
      user: { full_name: 'FixIt HVAC' },
      profile: {
        business_name: 'FixIt HVAC',
        verification_status: 'approved',
        average_rating: 4.6,
        total_reviews: 11,
      },
      services: [
        { id: 'service-a', title: 'Aircon Repair', price: 900 },
        { id: 'service-b', title: 'Aircon Cleaning', price: 700 },
      ],
    });

    const { getByText } = render(<ProviderProfileScreen />);

    await waitFor(() => {
      expect(getByText('Book Now')).toBeTruthy();
    });

    fireEvent.press(getByText('Book Now'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/customer-booking-form',
      params: expect.objectContaining({
        providerId: 'provider-11',
        providerName: 'FixIt HVAC',
        serviceId: 'service-a',
        serviceName: 'Aircon Repair',
      }),
    });
  });
});
