import { api } from '../lib/apiClient';
import { ProviderProfile } from '../src/types/database.interfaces';

export type ProviderProfileDraft = Partial<ProviderProfile> & {
  trust_score?: number;
  service_description?: string | null;
};

export const getDefaultProviderProfileDraft = (): ProviderProfileDraft => ({
  business_name: '',
  bio: '',
  service_description: '',
  years_experience: '0',
  tags: [],
  service_area: '',
});

export const getProviderProfileDraft = async (userId: string): Promise<ProviderProfileDraft> => {
  const { draft } = await api.get<{ draft: ProviderProfileDraft | null }>(`/provider/${userId}/profile-draft`);
  if (!draft) {
    return getDefaultProviderProfileDraft();
  }

  return {
    ...getDefaultProviderProfileDraft(),
    ...draft,
    bio: String(draft.bio ?? draft.service_description ?? ''),
    service_description: String(draft.service_description ?? draft.bio ?? ''),
  };
};

export const saveProviderProfileDraft = async (userId: string, input: ProviderProfileDraft) => {
  await api.patch<{ status: string }>(`/provider/${userId}/profile-draft`, {
    business_name: input.business_name,
    service_description: input.service_description ?? input.bio,
    verification_status: input.verification_status,
  });
};

