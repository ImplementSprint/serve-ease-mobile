import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProviderListScreen from '../provider-list';
import { useLocalSearchParams } from 'expo-router';

const mockGetProvidersByServiceName = jest.fn();
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

jest.mock('@/services/marketplaceService', () => ({
  getProvidersByServiceName: (...args: unknown[]) => mockGetProvidersByServiceName(...args),
}));

describe('ProviderListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders provider cards even when rating and reviews are missing', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      serviceName: 'Deep Cleaning',
    });

    mockGetProvidersByServiceName.mockResolvedValue([
      {
        id: 'provider-1',
        name: 'Alex Home Services',
        businessName: 'Alex Home Services',
        serviceId: 'service-1',
        serviceName: 'Deep Cleaning',
        rating: null,
        reviews: null,
        priceLabel: null,
      },
    ]);

    const { getByText } = render(<ProviderListScreen />);

    await waitFor(() => {
      expect(getByText('Alex Home Services')).toBeTruthy();
      expect(getByText('Rating: 0.0')).toBeTruthy();
      expect(getByText('Reviews: 0')).toBeTruthy();
      expect(getByText('Price unavailable')).toBeTruthy();
    });
  });

  it('passes the suggested service id and name into provider profile navigation', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      serviceName: 'Electrical',
    });

    mockGetProvidersByServiceName.mockResolvedValue([
      {
        id: 'provider-1',
        name: 'Santos Electric',
        businessName: 'Santos Electric',
        serviceId: 'service-9',
        serviceName: 'Electrical Wiring',
        rating: 4.8,
        reviews: 0,
        priceLabel: 'P500.00',
      },
    ]);

    const { getByText } = render(<ProviderListScreen />);

    await waitFor(() => {
      expect(getByText('Santos Electric')).toBeTruthy();
    });

    fireEvent.press(getByText('Santos Electric'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/provider-profile',
      params: {
        providerId: 'provider-1',
        providerName: 'Santos Electric',
        serviceId: 'service-9',
        serviceName: 'Electrical Wiring',
      },
    });
  });
});
