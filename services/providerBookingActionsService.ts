import { api } from '../lib/apiClient';
import {
  BookingRescheduleRequest,
  AdditionalCharge,
} from '../src/types/database.interfaces';

export type ProviderRescheduleRequestInput = {
  bookingId: string;
  providerId: string;
  reason: string;
  explanation: string;
  proposedDate: string;
  proposedTime: string;
};

export type ProviderAdditionalChargeItemInput = {
  description: string;
  amount: number;
};

export type ProviderAdditionalChargeRequestInput = {
  bookingId: string;
  providerId: string;
  justification: string;
  items: ProviderAdditionalChargeItemInput[];
};

export type BookingRescheduleRequestRow = BookingRescheduleRequest;
export type AdditionalChargeRow = AdditionalCharge;

export const createProviderRescheduleRequest = async (input: ProviderRescheduleRequestInput) => {
  await api.post<{ status: string }>('/provider/reschedule-requests', {
    bookingId: input.bookingId, providerId: input.providerId, reason: input.reason,
    explanation: input.explanation, proposedDate: input.proposedDate, proposedTime: input.proposedTime,
  });
};

export const getProviderRescheduleRequests = async (bookingId: string) => {
  const { requests } = await api.get<{ requests: BookingRescheduleRequestRow[] }>(`/provider/reschedule-requests/${bookingId}`);
  return requests;
};

export const createProviderAdditionalChargeRequest = async (input: ProviderAdditionalChargeRequestInput) => {
  await api.post<{ status: string }>('/provider/additional-charges', {
    bookingId: input.bookingId, providerId: input.providerId, justification: input.justification, items: input.items,
  });
};

export const getProviderAdditionalChargeRequests = async (bookingId: string) => {
  const { charges } = await api.get<{ charges: AdditionalChargeRow[] }>(`/provider/additional-charges/${bookingId}`);
  return charges;
};

export const reviewRescheduleRequest = async (input: { requestId: string; bookingId: string; customerId: string; decision: 'approved' | 'declined' }) => {
  await api.patch<{ status: string }>(
    `/provider/reschedule-requests/${input.requestId}/review`,
    { bookingId: input.bookingId, customerId: input.customerId, decision: input.decision },
  );
};

export const reviewAdditionalChargeRequest = async (input: { bookingId: string; customerId: string; chargeIds: string[]; decision: 'approved' | 'declined' }) => {
  await api.patch<{ status: string }>('/provider/additional-charges/review', input);
};
