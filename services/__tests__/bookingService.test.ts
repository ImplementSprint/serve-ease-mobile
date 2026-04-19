import { createBooking } from '../bookingService';
import { api } from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const apiPostMock = api.post as jest.MockedFunction<typeof api.post>;

describe('createBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiPostMock.mockResolvedValue({ booking: { id: 'booking-123' } } as any);
  });

  it('falls back to flat pricing when pricing_mode is missing', async () => {
    await createBooking({
      provider_id: 'provider-1',
      service_id: 'service-1',
      service_address: '123 Main St',
      scheduled_date_key: '2026-04-10',
      scheduled_time: '10:00 AM',
      pricing_mode: null,
      flat_rate: 500,
      payment_method: 'cash',
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/booking/create',
      expect.objectContaining({
        pricing_mode: 'flat',
        payment_method: 'cash_on_service',
      })
    );
  });

  it('throws a clear error and skips the API call when the schedule is invalid', async () => {
    await expect(
      createBooking({
        provider_id: 'provider-1',
        service_id: 'service-1',
        service_address: '123 Main St',
        scheduled_date_key: 'not-a-real-date',
        scheduled_time: '10:00 AM',
        pricing_mode: 'flat',
        flat_rate: 500,
      })
    ).rejects.toThrow('Please choose a valid booking date and time before confirming.');

    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
