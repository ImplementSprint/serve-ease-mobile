import { api } from '../lib/apiClient';

export type AddressRecord = {
  id?: string;
  address_id?: string;
  user_id?: string;
  created_at?: string;
  label?: string;
  street?: string;
  street_address?: string;
  barangay?: string;
  city?: string;
  province?: string;
  region?: string;
  postal_code?: string;
  zip_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
};

type AddressResponseShape =
  | AddressRecord[]
  | { addresses?: AddressRecord[]; data?: AddressRecord[] };

const ADD_ADDRESS_LOOKUP_ATTEMPTS = 8;
const ADD_ADDRESS_LOOKUP_DELAY_MS = 200;

const toTrimmedString = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeAddressValue = (value?: string | null) =>
  String(value || '').trim().toLowerCase();

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractAddressRows(response: AddressResponseShape): AddressRecord[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.addresses)) return response.addresses;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function normalizeAddressRecord(record: AddressRecord): AddressRecord {
  const normalizedId =
    toTrimmedString(record.id) || toTrimmedString(record.address_id);
  const normalizedStreet =
    toTrimmedString(record.street_address) || toTrimmedString(record.street);
  const normalizedZip =
    toTrimmedString(record.zip_code) || toTrimmedString(record.postal_code);

  return {
    ...record,
    id: normalizedId || undefined,
    address_id: normalizedId || undefined,
    street: normalizedStreet || undefined,
    street_address: normalizedStreet || undefined,
    zip_code: normalizedZip || undefined,
    postal_code: normalizedZip || undefined,
    city: toTrimmedString(record.city) || undefined,
    province: toTrimmedString(record.province) || undefined,
    region: toTrimmedString(record.region) || undefined,
    barangay: toTrimmedString(record.barangay) || undefined,
    label: toTrimmedString(record.label) || undefined,
    user_id: toTrimmedString(record.user_id) || undefined,
    created_at: toTrimmedString(record.created_at) || undefined,
    latitude: toOptionalNumber(record.latitude),
    longitude: toOptionalNumber(record.longitude),
    is_default:
      typeof record.is_default === 'boolean' ? record.is_default : undefined,
  };
}

function buildAddressWritePayload(address: Partial<AddressRecord>) {
  const streetAddress = toTrimmedString(address.street_address ?? address.street);
  const zipCode = toTrimmedString(address.zip_code ?? address.postal_code);

  const payload: Record<string, unknown> = {
    label: toTrimmedString(address.label) || undefined,
    street_address: streetAddress || undefined,
    street: streetAddress || undefined,
    city: toTrimmedString(address.city) || undefined,
    province: toTrimmedString(address.province) || undefined,
    region: toTrimmedString(address.region) || undefined,
    barangay: toTrimmedString(address.barangay) || undefined,
    zip_code: zipCode || undefined,
    postal_code: zipCode || undefined,
  };

  if (typeof address.is_default === 'boolean') {
    payload.is_default = address.is_default;
  }
  if (
    typeof address.latitude === 'number' &&
    Number.isFinite(address.latitude)
  ) {
    payload.latitude = address.latitude;
  }
  if (
    typeof address.longitude === 'number' &&
    Number.isFinite(address.longitude)
  ) {
    payload.longitude = address.longitude;
  }

  return payload;
}

function isMatchingAddress(
  candidate: AddressRecord,
  target: {
    label: string;
    street: string;
    city: string;
    province: string;
    zip: string;
  },
) {
  const candidateStreet = normalizeAddressValue(
    candidate.street_address ?? candidate.street,
  );
  const candidateZip = normalizeAddressValue(
    candidate.zip_code ?? candidate.postal_code,
  );

  if (target.street && candidateStreet !== target.street) return false;
  if (target.label && normalizeAddressValue(candidate.label) !== target.label) {
    return false;
  }
  if (target.city && normalizeAddressValue(candidate.city) !== target.city) {
    return false;
  }
  if (
    target.province &&
    normalizeAddressValue(candidate.province) !== target.province
  ) {
    return false;
  }
  if (target.zip && candidateZip !== target.zip) return false;

  return true;
}

export const getUserAddresses = async (): Promise<AddressRecord[]> => {
  const response = await api.get<AddressResponseShape>('/addresses');
  return extractAddressRows(response).map(normalizeAddressRecord);
};

export const addAddress = async (address: AddressRecord): Promise<AddressRecord> => {
  const payload = buildAddressWritePayload(address);
  const targetStreet = normalizeAddressValue(
    (payload.street_address as string) || (payload.street as string),
  );

  if (!targetStreet) {
    throw new Error('Please provide a valid street address before saving.');
  }

  await api.post<{ status: string }>('/addresses', payload);

  const target = {
    label: normalizeAddressValue(payload.label as string),
    street: targetStreet,
    city: normalizeAddressValue(payload.city as string),
    province: normalizeAddressValue(payload.province as string),
    zip: normalizeAddressValue(
      (payload.zip_code as string) || (payload.postal_code as string),
    ),
  };

  for (let attempt = 0; attempt < ADD_ADDRESS_LOOKUP_ATTEMPTS; attempt += 1) {
    const addresses = await getUserAddresses();
    const matched = [...addresses]
      .reverse()
      .find((item) => isMatchingAddress(item, target));

    if (matched?.id) {
      return matched;
    }

    if (attempt < ADD_ADDRESS_LOOKUP_ATTEMPTS - 1) {
      await pause(ADD_ADDRESS_LOOKUP_DELAY_MS);
    }
  }

  throw new Error(
    'Address save was accepted but is still processing. Please refresh and try again.',
  );
};

export const updateAddress = async (
  id: string,
  updates: Partial<AddressRecord>,
): Promise<void> => {
  await api.patch<{ status: string }>(
    `/addresses/${id}`,
    buildAddressWritePayload(updates),
  );
};

export const deleteAddress = async (id: string): Promise<void> => {
  await api.delete(`/addresses/${id}`);
};
