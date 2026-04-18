import { api } from '../lib/apiClient';
import { User } from '../src/types/database.interfaces';

export const getUserProfile = async () => {
  return api.get<User>('/users/profile');
};

export const updateUserProfile = async (updates: {
  full_name?: string;
  contact_number?: string;
}) => {
  return api.patch('/users/profile', updates);
};
