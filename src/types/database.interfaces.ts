export interface User {
  id: string;
  full_name: string;
  email: string;
  contact_number: string;
  role: 'customer' | 'provider' | 'admin';
  status: 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended';
  is_verified: boolean;
  date_of_birth?: string;
  trust_score: number;
  created_at: string;
}

export interface ProviderProfile {
  id: string;
  user_id: string;
  business_name: string;
  bio?: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  is_available: boolean;
  average_rating: number;
  total_reviews: number;
  years_experience?: string;
  service_area?: string;
  service_areas?: string[];
  languages?: string[];
  tags?: string[];
  avatar_url?: string;
  facebook_url?: string;
  instagram_handle?: string;
  website_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderService {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  description?: string;
  price: number;
  supports_hourly: boolean;
  hourly_rate?: number;
  supports_flat: boolean;
  flat_rate?: number;
  default_pricing_mode?: PricingMode;
  service_location_type?: 'mobile' | 'in_shop';
  service_location_address?: string | null;
  created_at: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type PricingMode = 'flat' | 'hourly';

export interface Booking {
  id: string;
  booking_reference: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  status: BookingStatus;
  service_address: string;
  service_location_type?: 'mobile' | 'in_shop';
  scheduled_at: string;
  total_amount: number;
  customer_notes?: string;
  pricing_mode: PricingMode;
  flat_rate?: number;
  hourly_rate?: number;
  hours_required?: number;
  cancellation_reason?: string;
  cancellation_explanation?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EnrichedBooking extends Booking {
  provider?: {
    full_name: string;
    contact_number: string;
    avatar_url?: string;
    business_name?: string;
    average_rating?: number;
  };
  service?: {
    title: string;
    price: number;
  };
  provider_name?: string;
  provider_rating?: number;
  provider_avatar?: string;
  service_name?: string;
}

export interface Dispute {
  dispute_id: string;
  booking_id: string;
  raised_by: string;
  reason: string;
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  admin_notes?: string;
  resolved_at?: string;
  created_at: string;
}

export interface ProviderReview {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  amount: number;
  method: 'cash' | 'card' | 'wallet';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paid_at?: string | null;
  transaction_reference?: string | null;
  transaction_ref?: string;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  parent_id?: string;
  icon_name?: string;
  display_order: number;
  category_level: string;
  created_at: string;
}

export interface BookingRescheduleRequest {
  id: string;
  booking_id: string;
  provider_id: string;
  reason: string;
  explanation: string;
  proposed_date: string;
  proposed_time: string;
  status: 'pending' | 'approved' | 'declined';
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
}

export interface AdditionalCharge {
  id: string;
  booking_id: string;
  requested_by: string;
  description: string;
  amount: number;
  justification: string;
  status: 'pending' | 'approved' | 'declined';
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
}

export interface ProviderDocument {
  document_id: string;
  provider_id: string;
  document_type: 'business_permit' | 'government_id' | 'certification';
  document_file_path: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
}

export interface SupportTicket {
  ticket_id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  booking_id?: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  data?: any;
  created_at: string;
}
