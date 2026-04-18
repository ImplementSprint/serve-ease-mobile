import { getProviderProfileData } from '@/services/marketplaceService';
import {
  getProviderServices,
  type ProviderServiceRecord,
} from '@/services/providerCatalogService';

export type BookingServiceFallback = ProviderServiceRecord;

const toComparableString = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const toAmountNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.-]/g, '').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeServiceFallbackRow = (row: any): ProviderServiceRecord | null => {
  const id = String(row?.id || '').trim();
  if (!id) return null;
  const price = Math.max(0, toAmountNumber(row?.price) ?? 0);
  const hourlyRate = toAmountNumber(row?.hourly_rate);
  const flatRate = toAmountNumber(row?.flat_rate);
  const supportsHourly = Boolean(hourlyRate && hourlyRate > 0);
  const supportsFlat = Boolean(flatRate && flatRate > 0) || !supportsHourly;
  return {
    id,
    title: String(row?.title || 'Service Booking').trim() || 'Service Booking',
    description: typeof row?.description === 'string' ? row.description : null,
    price,
    category_id: String(row?.category_id || ''),
    supports_hourly: supportsHourly,
    hourly_rate: supportsHourly ? hourlyRate : null,
    supports_flat: supportsFlat,
    flat_rate: supportsFlat ? flatRate ?? (price > 0 ? price : null) : null,
    default_pricing_mode: supportsHourly ? 'hourly' : 'flat',
    service_location_type: row?.service_location_type === 'in_shop' ? 'in_shop' : 'mobile',
    service_location_address:
      typeof row?.service_location_address === 'string'
        ? row.service_location_address
        : null,
  };
};

export const findServiceForBooking = (
  booking: any,
  services: BookingServiceFallback[],
): BookingServiceFallback | null => {
  const bookingServiceId = toComparableString(booking?.service_id);
  const bookingServiceTitle = toComparableString(
    booking?.service?.title || booking?.service_name || booking?.service_title,
  );

  return (
    services.find((service) => {
      const serviceId = toComparableString(service?.id);
      const serviceTitle = toComparableString(service?.title);
      if (bookingServiceId && serviceId && bookingServiceId === serviceId) return true;
      return Boolean(
        bookingServiceTitle && serviceTitle && bookingServiceTitle === serviceTitle,
      );
    }) || null
  );
};

export const loadProviderServicesForFallback = async (
  providerId: string,
): Promise<BookingServiceFallback[]> => {
  try {
    const directServices = await getProviderServices(providerId);
    if (directServices.length) return directServices;
  } catch {
    // Ignore route/contract mismatch and fall through to profile payload parsing.
  }

  try {
    const profilePayload = await getProviderProfileData(providerId);
    const profileServices = Array.isArray(profilePayload?.services)
      ? profilePayload.services
      : [];
    return profileServices
      .map((row: any) => normalizeServiceFallbackRow(row))
      .filter(
        (row: ProviderServiceRecord | null): row is ProviderServiceRecord => Boolean(row),
      );
  } catch {
    return [];
  }
};
