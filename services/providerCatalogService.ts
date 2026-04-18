import { api } from '@/lib/apiClient';

export type PricingMode = 'hourly' | 'flat';

export type ProviderServiceRecord = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category_id: string;
  supports_hourly: boolean;
  hourly_rate: number | null;
  supports_flat: boolean;
  flat_rate: number | null;
  default_pricing_mode: PricingMode | null;
  service_location_type: 'mobile' | 'in_shop';
  service_location_address: string | null;
};

export type ServiceCategoryRecord = {
  id: string;
  name: string;
  slug: string;
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toTrimmedString = (value: unknown) => String(value ?? '').trim();
const toNormalizedString = (value: unknown) => toTrimmedString(value).toLowerCase();

const toSlug = (value: unknown) =>
  toTrimmedString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toFiniteNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = toFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return fallback;
};

const toPricingMode = (value: unknown, fallback: PricingMode): PricingMode => {
  const mode = toNormalizedString(value);
  if (mode === 'hourly' || mode === 'flat') return mode;
  return fallback;
};

const toServiceLocationType = (value: unknown): ProviderServiceRecord['service_location_type'] =>
  toNormalizedString(value) === 'in_shop' ? 'in_shop' : 'mobile';

const toNullableTrimmedString = (value: unknown) => {
  const parsed = toTrimmedString(value);
  return parsed ? parsed : null;
};

const isSchemaMismatchError = (error: unknown) => {
  const message = toTrimmedString((error as { message?: unknown })?.message);
  if (!message) return false;
  return /column .* does not exist|could not find.*column|schema cache|pgrst204|pgrst200/i.test(message);
};

const normalizeCategoryRecord = (row: unknown): ServiceCategoryRecord | null => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const category = row as Record<string, unknown>;
  const id = toTrimmedString(category.id);
  const name = toTrimmedString(category.name);
  if (!id || !name) return null;
  const slug = toSlug(category.slug || name);
  return { id, name, slug };
};

const normalizeProviderServiceRecord = (row: unknown): ProviderServiceRecord | null => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const service = row as Record<string, unknown>;

  const id = toTrimmedString(service.id);
  if (!id) return null;

  const basePrice = Math.max(0, toFiniteNumber(service.price));
  let hourlyRate = toNullableNumber(service.hourly_rate);
  let flatRate = toNullableNumber(service.flat_rate);

  let supportsHourly = toBoolean(service.supports_hourly, Boolean(hourlyRate && hourlyRate > 0));
  let supportsFlat = toBoolean(service.supports_flat, Boolean(flatRate && flatRate > 0));

  if (!supportsHourly && !supportsFlat) {
    supportsFlat = true;
  }

  if (supportsHourly && (hourlyRate === null || hourlyRate <= 0) && basePrice > 0) {
    hourlyRate = basePrice;
  }
  if (supportsFlat && (flatRate === null || flatRate <= 0) && basePrice > 0) {
    flatRate = basePrice;
  }

  const resolvedPrice = basePrice > 0 ? basePrice : Math.max(toFiniteNumber(hourlyRate), toFiniteNumber(flatRate), 0);
  const defaultModeFallback: PricingMode = supportsHourly ? 'hourly' : 'flat';
  const defaultPricingMode = toPricingMode(service.default_pricing_mode, defaultModeFallback);

  return {
    id,
    title: toTrimmedString(service.title) || 'Untitled Service',
    description: toNullableTrimmedString(service.description),
    price: resolvedPrice,
    category_id: toTrimmedString(service.category_id),
    supports_hourly: supportsHourly,
    hourly_rate: supportsHourly ? hourlyRate ?? (resolvedPrice > 0 ? resolvedPrice : null) : null,
    supports_flat: supportsFlat,
    flat_rate: supportsFlat ? flatRate ?? (resolvedPrice > 0 ? resolvedPrice : null) : null,
    default_pricing_mode: supportsHourly || supportsFlat ? defaultPricingMode : null,
    service_location_type: toServiceLocationType(service.service_location_type),
    service_location_address: toNullableTrimmedString(service.service_location_address),
  };
};

const normalizeMutationPayload = (payload: Record<string, unknown>) => {
  const supportsHourlyInput = toBoolean(payload.supports_hourly);
  const supportsFlatInput = toBoolean(payload.supports_flat);

  let hourlyRate = toNullableNumber(payload.hourly_rate);
  let flatRate = toNullableNumber(payload.flat_rate);
  const basePrice = Math.max(0, toFiniteNumber(payload.price));

  let supportsHourly = supportsHourlyInput || Boolean(hourlyRate && hourlyRate > 0);
  let supportsFlat = supportsFlatInput || Boolean(flatRate && flatRate > 0);

  if (!supportsHourly && !supportsFlat) {
    if (basePrice > 0) {
      supportsFlat = true;
      flatRate = basePrice;
    } else {
      supportsHourly = true;
    }
  }

  if (supportsHourly && (hourlyRate === null || hourlyRate <= 0) && basePrice > 0) {
    hourlyRate = basePrice;
  }
  if (supportsFlat && (flatRate === null || flatRate <= 0) && basePrice > 0) {
    flatRate = basePrice;
  }

  const resolvedPrice = Math.max(basePrice, toFiniteNumber(hourlyRate), toFiniteNumber(flatRate), 0);
  const locationType = toServiceLocationType(payload.service_location_type);

  return {
    title: toTrimmedString(payload.title),
    description: toNullableTrimmedString(payload.description),
    price: resolvedPrice,
    category_id: toTrimmedString(payload.category_id),
    supports_hourly: supportsHourly,
    hourly_rate: supportsHourly ? hourlyRate : null,
    supports_flat: supportsFlat,
    flat_rate: supportsFlat ? flatRate : null,
    default_pricing_mode: supportsHourly && supportsFlat
      ? toPricingMode(payload.default_pricing_mode, 'hourly')
      : supportsHourly
        ? 'hourly'
        : 'flat',
    service_location_type: locationType,
    service_location_address:
      locationType === 'in_shop' ? toNullableTrimmedString(payload.service_location_address) : null,
  };
};

const toLegacyPayload = (payload: ReturnType<typeof normalizeMutationPayload>) => ({
  title: payload.title,
  description: payload.description,
  price: payload.price,
  category_id: payload.category_id,
});

const submitServiceMutation = async (
  method: 'post' | 'patch',
  path: string,
  payload: ReturnType<typeof normalizeMutationPayload>,
) => {
  try {
    if (method === 'post') {
      await api.post<{ status: string }>(path, payload);
    } else {
      await api.patch<{ status: string }>(path, payload);
    }
  } catch (error) {
    if (!isSchemaMismatchError(error)) throw error;
    const legacyPayload = toLegacyPayload(payload);
    if (method === 'post') {
      await api.post<{ status: string }>(path, legacyPayload);
    } else {
      await api.patch<{ status: string }>(path, legacyPayload);
    }
  }
};

const waitForMyService = async (
  matcher: (service: ProviderServiceRecord) => boolean,
  options?: { expectMissing?: boolean; attempts?: number; delayMs?: number },
) => {
  const attempts = options?.attempts ?? 10;
  const delayMs = options?.delayMs ?? 500;
  const expectMissing = options?.expectMissing ?? false;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const services = await getMyProviderServices();
      const matched = services.find(matcher) ?? null;
      if ((expectMissing && !matched) || (!expectMissing && matched)) {
        return matched;
      }
    } catch {
      // Best effort: event processing can lag briefly.
    }

    if (attempt < attempts - 1) {
      await pause(delayMs);
    }
  }

  return null;
};

export async function getActiveServiceCategories() {
  const { categories } = await api.get<{ categories: unknown[] }>(
    '/services/categories',
  );
  const seen = new Set<string>();
  const normalized = (categories || [])
    .map((row) => normalizeCategoryRecord(row))
    .filter((row): row is ServiceCategoryRecord => Boolean(row))
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
  return normalized;
}

export async function getProviderServices(providerId: string) {
  const { services } = await api.get<{ services: unknown[] }>(
    `/services/provider/${providerId}/services`,
  );
  return (services || [])
    .map((row) => normalizeProviderServiceRecord(row))
    .filter((row): row is ProviderServiceRecord => Boolean(row));
}

export async function getMyProviderServices() {
  const { services } = await api.get<{ services: unknown[] }>(
    '/provider/my-services',
  );
  return (services || [])
    .map((row) => normalizeProviderServiceRecord(row))
    .filter((row): row is ProviderServiceRecord => Boolean(row));
}

export async function createMyProviderService(payload: Record<string, unknown>): Promise<ProviderServiceRecord | null> {
  const normalizedPayload = normalizeMutationPayload(payload);
  const existingServices = await getMyProviderServices().catch(() => null);
  const existingIds = new Set((existingServices || []).map((service) => service.id));
  const hasExistingSnapshot = Array.isArray(existingServices);

  await submitServiceMutation('post', '/provider/my-services', normalizedPayload);
  await pause(250);

  const expectedTitle = toNormalizedString(normalizedPayload.title);
  const expectedCategoryId = toTrimmedString(normalizedPayload.category_id);
  const expectedPrice = toFiniteNumber(normalizedPayload.price);

  const created = await waitForMyService((service) => {
    if (hasExistingSnapshot && !existingIds.has(service.id)) return true;
    if (expectedTitle && toNormalizedString(service.title) !== expectedTitle) return false;
    if (expectedCategoryId && service.category_id !== expectedCategoryId) return false;
    return Math.abs(service.price - expectedPrice) < 0.01;
  });

  if (!created) {
    throw new Error('Service creation was accepted but not applied. Please retry in a few seconds.');
  }

  return created;
}

export async function updateMyProviderService(
  serviceId: string,
  payload: Record<string, unknown>,
): Promise<ProviderServiceRecord | null> {
  const normalizedPayload = normalizeMutationPayload(payload);
  await submitServiceMutation('patch', `/provider/my-services/${serviceId}`, normalizedPayload);
  await pause(250);

  const expectedTitle = toNormalizedString(normalizedPayload.title);
  const expectedCategoryId = toTrimmedString(normalizedPayload.category_id);

  const updated = await waitForMyService((service) => {
    if (service.id !== serviceId) return false;
    if (expectedTitle && toNormalizedString(service.title) !== expectedTitle) return false;
    if (expectedCategoryId && service.category_id !== expectedCategoryId) return false;
    return true;
  });

  if (updated) return updated;

  const services = await getMyProviderServices().catch(() => [] as ProviderServiceRecord[]);
  const existing = services.find((service) => service.id === serviceId) ?? null;
  if (!existing) {
    throw new Error('Service update was accepted but no updated record was found. Please retry.');
  }
  return existing;
}

export async function deleteMyProviderService(serviceId: string) {
  await api.delete(`/provider/my-services/${serviceId}`);
  await pause(250);
  await waitForMyService((service) => service.id === serviceId, { expectMissing: true });
  const services = await getMyProviderServices().catch(() => [] as ProviderServiceRecord[]);
  if (services.some((service) => service.id === serviceId)) {
    throw new Error('Service deletion was accepted but not yet applied. Please retry.');
  }
}
