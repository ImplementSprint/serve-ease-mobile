import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CategoryDetailsScreen from '../category-details';
import { useLocalSearchParams } from 'expo-router';
import { getServiceCategories } from '@/services/marketplaceService';

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
  getServiceCategories: jest.fn(() =>
    Promise.resolve([
      { id: 'cat-parent', name: 'Home Maintenance & Repair', slug: 'home-maintenance-repair' },
      { id: 'cat-electrical', name: 'Electrical', slug: 'electrical', parent_id: 'cat-parent' },
    ])
  ),
  getServicesByCategoryName: jest.fn(() => Promise.resolve([])),
}));

describe('CategoryDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates subcategory taps directly to the provider list', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      title: 'Home Maintenance & Repair',
    });

    const { getByText } = render(<CategoryDetailsScreen />);
    await waitFor(() => {
      expect(getServiceCategories).toHaveBeenCalled();
    });

    fireEvent.press(getByText('Electrical'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/provider-list',
      params: {
        serviceName: 'Electrical',
        categoryName: 'Electrical',
        categoryId: 'cat-electrical',
      },
    });
  });
});
