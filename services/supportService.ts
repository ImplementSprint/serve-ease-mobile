import { api } from '../lib/apiClient';

export const createSupportTicket = async (input: {
  userId: string;
  subject: string;
  message: string;
  category?: string;
  role?: 'customer' | 'provider';
}): Promise<void> => {
  await api.post<{ status: string }>('/users/support-tickets', {
    subject: input.subject,
    message: input.message,
    category: input.category,
    role: input.role,
  });
};

export const createCustomerSupportTicket = async (
  userId: string,
  subject: string,
  message: string,
  category?: string
) =>
  createSupportTicket({
    userId,
    subject,
    message,
    category,
    role: 'customer',
  });

export const createProviderSupportTicket = async (
  userId: string,
  subject: string,
  message: string,
  category?: string
) =>
  createSupportTicket({
    userId,
    subject,
    message,
    category,
    role: 'provider',
  });
