jest.mock('../auth-session', () => ({
  getStoredAccessToken: jest.fn(async () => null),
  getStoredRefreshToken: jest.fn(async () => null),
  persistAuthSession: jest.fn(async () => undefined),
}));

import { api } from '../apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ statusCode: 200, data: { available: true } }),
    }) as jest.Mock;
  });

  it('appends GET query params to the request URL', async () => {
    await api.get('/provider/provider-1/availability/check', {
      params: {
        scheduled_at: '2026-04-06T01:00:00.000Z',
        hours_required: 2,
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/provider/v1/provider-1/availability/check?scheduled_at=2026-04-06T01%3A00%3A00.000Z&hours_required=2',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('maps auth paths to module-first versioned routes', async () => {
    await api.post('/auth/login', {
      email: 'test@example.com',
      password: 'secret',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/auth/v1/login',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('returns raw response body when no envelope is used', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ bookings: [{ id: 'booking-1' }] }),
    });

    const result = await api.get<{ bookings: Array<{ id: string }> }>('/booking/customer');

    expect(result).toEqual({ bookings: [{ id: 'booking-1' }] });
  });
});
