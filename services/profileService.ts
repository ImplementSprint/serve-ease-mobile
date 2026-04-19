import { api } from '../lib/apiClient';
import { User } from '../src/types/database.interfaces';

export const getProfile = async (_userId: string) => {
  // GET /users/v1/profile uses the auth token — userId param kept for API compat
  return api.get<User>('/users/profile');
};

export const updateProfile = async (_userId: string, updates: Partial<User>): Promise<void> => {
  await api.patch<{ status: string }>('/users/profile', updates);
};

export const getCustomerProfile = async () => {
  return api.get<{ address?: string }>('/users/customer-profile');
};

export const updateCustomerProfile = async (updates: { address?: string }): Promise<void> => {
  await api.patch<{ status: string }>('/users/customer-profile', updates);
};

