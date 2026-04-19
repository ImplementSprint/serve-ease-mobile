import { api } from '../lib/apiClient';

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  parent_id?: string | null;
  category_level?: 'category' | 'subcategory';
};
export type ProviderService = { id: string; provider_id: string; category_id: string; title: string; description?: string | null; price: number };
export type ProviderCard = {
  id: string;
  name: string;
  businessName: string;
  avatarUrl: string;
  serviceId: string;
  serviceName: string;
  rating: number;
  reviews: number;
  priceLabel: string;
  serviceLocationType: 'mobile' | 'in_shop';
  serviceLocationAddress: string | null;
};

type RawProviderRow = {
  id: string;
  title?: string | null;
  price?: number | null;
  category_id?: string | null;
  service_location_type?: string | null;
  service_location_address?: string | null;
  provider_id?: string | null;
  business_name?: string | null;
  average_rating?: number | null;
  avatar_url?: string | null;
  provider_profiles?: {
    user_id?: string | null;
    business_name?: string | null;
    average_rating?: number | null;
    avatar_url?: string | null;
  } | null;
};

type ProviderServiceDiscoveryResponse =
  | RawProviderRow[]
  | { providers?: RawProviderRow[]; data?: RawProviderRow[]; success?: boolean };

const normalizeText = (value: unknown) => String(value || '').trim();

const toCategoryRecord = (value: unknown): ServiceCategory | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = normalizeText(row.id);
  const name = normalizeText(row.name);
  if (!id || !name) return null;

  const slugValue = normalizeText(row.slug);
  return {
    id,
    name,
    slug: slugValue || name.toLowerCase().replace(/\s+/g, '-'),
    is_active: typeof row.is_active === 'boolean' ? row.is_active : undefined,
    parent_id: row.parent_id ? normalizeText(row.parent_id) : null,
    category_level:
      row.category_level === 'category' || row.category_level === 'subcategory'
        ? row.category_level
        : undefined,
  };
};

function mapProviderRowToCard(row: RawProviderRow): ProviderCard | null {
  const businessName = normalizeText(row.provider_profiles?.business_name || row.business_name);
  const providerId = normalizeText(row.provider_profiles?.user_id || row.provider_id);
  const rating = Number(row.provider_profiles?.average_rating ?? row.average_rating ?? 0);
  const rawPrice = Number(row.price);

  if (!providerId) {
    console.warn('Provider discovery row is missing provider_profiles.user_id; dropping row from provider list.', {
      serviceRowId: row.id,
      businessName,
    });
    return null;
  }

  return {
    id: providerId,
    name: businessName || 'Provider',
    businessName,
    avatarUrl: normalizeText(row.provider_profiles?.avatar_url || row.avatar_url),
    serviceId: normalizeText(row.id),
    serviceName: normalizeText(row.title),
    rating: Number.isFinite(rating) ? rating : 0,
    reviews: 0,
    priceLabel: Number.isFinite(rawPrice) && rawPrice >= 0 ? `P${rawPrice.toFixed(2)}` : '',
    serviceLocationType: row.service_location_type === 'in_shop' ? 'in_shop' : 'mobile',
    serviceLocationAddress:
      typeof row.service_location_address === 'string' && row.service_location_address.trim()
        ? row.service_location_address.trim()
        : null,
  };
}

function normalizeProviderRows(response: ProviderServiceDiscoveryResponse): RawProviderRow[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.providers)) return response.providers;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function mapProviderRowsToCards(rows: RawProviderRow[]): ProviderCard[] {
  const cardsByServiceKey = new Map<string, ProviderCard>();

  for (const row of rows || []) {
    const card = mapProviderRowToCard(row);
    if (!card) continue;
    const key = card.serviceId || `${card.id}::${card.serviceName.toLowerCase()}::${card.priceLabel}`;
    if (!cardsByServiceKey.has(key)) {
      cardsByServiceKey.set(key, card);
    }
  }

  return Array.from(cardsByServiceKey.values());
}

export const getServiceCategories = async (): Promise<ServiceCategory[]> => {
  const { categories } = await api.get<{ categories: unknown[] }>('/services/categories');
  const deduped = new Map<string, ServiceCategory>();

  for (const raw of categories || []) {
    const category = toCategoryRecord(raw);
    if (!category) continue;
    if (!deduped.has(category.id)) {
      deduped.set(category.id, category);
    }
  }

  return Array.from(deduped.values());
};

export const getServicesByCategoryName = async (categoryName: string) => {
  const { services } = await api.get<{ services: any[] }>(`/services/categories/${encodeURIComponent(categoryName)}/services`);
  return services;
};

export const getProvidersByServiceName = async (serviceName: string): Promise<ProviderCard[]> => {
  const response = await api.get<ProviderServiceDiscoveryResponse>(`/services/providers/${encodeURIComponent(serviceName)}`);
  return mapProviderRowsToCards(normalizeProviderRows(response));
};

export const getProvidersByCategoryId = async (categoryId: string): Promise<ProviderCard[]> => {
  const response = await api.get<ProviderServiceDiscoveryResponse>('/provider', {
    params: { serviceId: categoryId },
  });

  return mapProviderRowsToCards(normalizeProviderRows(response));
};

export const getProviderProfileData = async (providerId: string) => {
  return api.get<any>(`/services/provider-profile/${providerId}`);
};
