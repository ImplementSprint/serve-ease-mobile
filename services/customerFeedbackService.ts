import { api } from '../lib/apiClient';
import { ProviderReview } from '../src/types/database.interfaces';

export type ProviderReviewsSummary = {
  provider_id: string;
  average_rating: number;
  total_reviews: number;
  reviews: ProviderReview[];
};

type ProviderReviewsSummaryResponse =
  | ProviderReviewsSummary
  | {
      status?: string;
      data?: ProviderReviewsSummary;
    };

export const getProviderReviewsSummary = async (providerId: string): Promise<ProviderReviewsSummary> => {
  const response = await api.get<ProviderReviewsSummaryResponse>(`/provider/reviews/${providerId}`);
  const normalized = (response as { data?: ProviderReviewsSummary })?.data ?? (response as ProviderReviewsSummary);

  return {
    provider_id: String(normalized?.provider_id || providerId),
    average_rating: Number(normalized?.average_rating || 0),
    total_reviews: Number(normalized?.total_reviews || normalized?.reviews?.length || 0),
    reviews: Array.isArray(normalized?.reviews) ? normalized.reviews : [],
  };
};

export const submitCustomerReview = async (input: {
  bookingId: string;
  reviewerId: string;
  providerId: string;
  rating: number;
  reviewText: string;
}): Promise<void> => {
  await api.post<{ status: string }>('/provider/reviews', {
    booking_id: input.bookingId,
    reviewer_id: input.reviewerId,
    reviewee_id: input.providerId,
    rating: input.rating,
    review_text: input.reviewText,
  });
};

export const submitProviderProfileReport = async (input: {
  providerId: string;
  reporterId: string;
  reason: string;
  details: string;
  bookingId?: string;
}): Promise<void> => {
  await api.post<{ status: string }>('/provider/reports', {
    provider_id: input.providerId,
    reporter_id: input.reporterId,
    reason: input.reason,
    details: input.details,
    booking_id: input.bookingId,
  });
};

export const submitProviderReview = async (input: {
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  review_text?: string;
}): Promise<void> => {
  await api.post<{ status: string }>('/provider/reviews', input);
};
