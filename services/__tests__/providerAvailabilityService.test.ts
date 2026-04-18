import { api } from '@/lib/apiClient';
import {
  getProviderReservedSlots,
  validateProviderAvailability,
} from '../providerAvailabilityService';

jest.mock('@/lib/apiClient', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

describe('validateProviderAvailability', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns a conflict reason when the backend overlap check says the slot is unavailable', async () => {
    // Use a date that is within the 8 AM - 5 PM window (10 AM local time)
    const scheduledDate = new Date('2026-04-06');
    scheduledDate.setHours(10, 0, 0, 0);

    (api.get as jest.Mock)
      .mockResolvedValueOnce({
        weeklySchedule: [
          {
            user_id: 'provider-1',
            day_of_week: 'Monday',
            is_active: true,
            start_time: '08:00:00',
            end_time: '17:00:00',
            break_start_time: null,
            break_end_time: null,
          },
        ],
        daysOff: [],
      })
      .mockResolvedValueOnce({
        available: false,
        reason: 'This provider is already booked for the selected time slot.',
      });

    const result = await validateProviderAvailability(
      'provider-1',
      scheduledDate,
      2,
    );

    expect(result).toEqual({
      available: false,
      reason: 'This provider is already booked for the selected time slot.',
    });
    expect(api.get).toHaveBeenNthCalledWith(
      2,
      '/provider/provider-1/availability/check',
      {
        params: {
          scheduled_at: scheduledDate.toISOString(),
          hours_required: 2,
        },
      },
    );
  });

  it('falls back to available when the backend overlap check is unreachable', async () => {
    // Use a date that is within the 8 AM - 5 PM window (10 AM local time)
    const scheduledDate = new Date('2026-04-06');
    scheduledDate.setHours(10, 0, 0, 0);

    (api.get as jest.Mock)
      .mockResolvedValueOnce({
        weeklySchedule: [
          {
            user_id: 'provider-1',
            day_of_week: 'Monday',
            is_active: true,
            start_time: '08:00:00',
            end_time: '17:00:00',
            break_start_time: null,
            break_end_time: null,
          },
        ],
        daysOff: [],
      })
      .mockRejectedValueOnce(new Error('network'));

    const result = await validateProviderAvailability(
      'provider-1',
      scheduledDate,
      2,
    );

    expect(result).toEqual({ available: true });
  });

  it('fetches reserved slots for a provider and date', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      reservedSlots: [
        {
          scheduled_at: '2026-04-06T06:00:00.000Z',
          end_at: '2026-04-06T08:00:00.000Z',
          hours_required: 2,
        },
      ],
    });

    const result = await getProviderReservedSlots('provider-1', '2026-04-06');

    expect(result).toEqual([
      {
        scheduled_at: '2026-04-06T06:00:00.000Z',
        end_at: '2026-04-06T08:00:00.000Z',
        hours_required: 2,
      },
    ]);
    expect(api.get).toHaveBeenCalledWith('/provider/provider-1/reserved-slots', {
      params: { date: '2026-04-06' },
    });
  });
});
