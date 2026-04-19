import { Storage } from '../lib/storage';
import { api } from '../lib/apiClient';
import { getErrorMessage } from '../lib/error-handling';

export type VerificationStatus = 'not_started' | 'draft' | 'submitted' | 'approved' | 'rejected';
export type VerificationLevel = 'unverified' | 'basic_verified' | 'fully_verified' | 'premium_verified';

export type ProviderVerificationDraft = {
  businessName: string;
  governmentIdType: string;
  governmentIdNumber: string;
  nbiClearanceNumber: string;
  prcLicenseNumber: string;
  businessPermitNumber: string;
  tinNumber: string;
  proofOfAddressNotes: string;
  serviceAreas: string[];
  languages: string[];
  yearsExperience: string;
  portfolioSummary: string;
  referenceContacts: string;
  hasInsurance: boolean;
  status: VerificationStatus;
  verificationLevel: VerificationLevel;
  score: number;
  submittedAt?: string | null;
  lastUpdatedAt?: string | null;
};

const STORAGE_PREFIX = 'provider-verification';

const createEmptyDraft = (): ProviderVerificationDraft => ({
  businessName: '',
  governmentIdType: '',
  governmentIdNumber: '',
  nbiClearanceNumber: '',
  prcLicenseNumber: '',
  businessPermitNumber: '',
  tinNumber: '',
  proofOfAddressNotes: '',
  serviceAreas: [],
  languages: [],
  yearsExperience: '',
  portfolioSummary: '',
  referenceContacts: '',
  hasInsurance: false,
  status: 'not_started',
  verificationLevel: 'unverified',
  score: 0,
  submittedAt: null,
  lastUpdatedAt: null,
});

const getStorageKey = (userId: string) => `${STORAGE_PREFIX}:${userId}`;

const normalizeArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];

const normalizeStatus = (statusRaw?: string | null): VerificationStatus => {
  const status = String(statusRaw || '').trim().toLowerCase();
  if (status.includes('approve')) return 'approved';
  if (status.includes('reject')) return 'rejected';
  if (status.includes('submit') || status.includes('review')) return 'submitted';
  if (status.includes('draft') || status.includes('progress')) return 'draft';
  return 'not_started';
};

export const formatVerificationStatusLabel = (statusRaw: string | null | undefined) => {
  const status = normalizeStatus(statusRaw);
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Needs attention';
  if (status === 'submitted') return 'Under review';
  if (status === 'draft') return 'Draft saved';
  return 'Not started';
};

export const formatVerificationLevelLabel = (level: VerificationLevel) => {
  if (level === 'premium_verified') return 'Premium Verified';
  if (level === 'fully_verified') return 'Fully Verified';
  if (level === 'basic_verified') return 'Basic Verified';
  return 'Unverified';
};

const calculateVerificationScore = (draft: Partial<ProviderVerificationDraft>): number => {
  let score = 0;
  if (draft.governmentIdType && draft.governmentIdNumber) score += 20;
  if (draft.nbiClearanceNumber) score += 20;
  if (draft.prcLicenseNumber) score += 10;
  if (draft.businessPermitNumber) score += 10;
  if (draft.tinNumber) score += 10;
  if ((draft.serviceAreas || []).length > 0) score += 5;
  if ((draft.languages || []).length > 0) score += 5;
  if (draft.yearsExperience) score += 8;
  if (draft.portfolioSummary) score += 5;
  if (draft.referenceContacts) score += 5;
  if (draft.proofOfAddressNotes) score += 2;
  if (draft.hasInsurance) score += 5;
  return score;
};

const determineVerificationLevel = (draft: Partial<ProviderVerificationDraft>): VerificationLevel => {
  const hasBasic = Boolean(draft.governmentIdType && draft.governmentIdNumber && draft.nbiClearanceNumber);
  const hasFull = hasBasic && Boolean(draft.businessPermitNumber && draft.tinNumber);
  const hasPremium = hasFull && Boolean(draft.hasInsurance && draft.portfolioSummary);

  if (hasPremium) return 'premium_verified';
  if (hasFull) return 'fully_verified';
  if (hasBasic) return 'basic_verified';
  return 'unverified';
};

export const assessProviderVerification = (
  draftInput: Partial<ProviderVerificationDraft>
): Pick<ProviderVerificationDraft, 'score' | 'verificationLevel'> => {
  return {
    score: calculateVerificationScore(draftInput),
    verificationLevel: determineVerificationLevel(draftInput),
  };
};

const readLocalDraft = async (userId: string) => {
  return await Storage.getJson<Partial<ProviderVerificationDraft>>(getStorageKey(userId));
};

const writeLocalDraft = async (userId: string, draft: ProviderVerificationDraft) => {
  await Storage.setJson(getStorageKey(userId), draft);
};

export const getProviderVerificationDraft = async (userId: string) => {
  const base = createEmptyDraft();
  const local = await readLocalDraft(userId);

  let remoteProfile: any = null;
  try {
    const response = await api.get<any>(`/provider/${userId}/profile-draft`);
    remoteProfile = response?.draft ?? response;
  } catch {
    remoteProfile = null;
  }

  const merged: ProviderVerificationDraft = {
    ...base,
    ...local,
    businessName: String(local?.businessName || remoteProfile?.business_name || ''),
    governmentIdType: String(local?.governmentIdType || ''),
    governmentIdNumber: String(local?.governmentIdNumber || ''),
    nbiClearanceNumber: String(local?.nbiClearanceNumber || ''),
    prcLicenseNumber: String(local?.prcLicenseNumber || ''),
    businessPermitNumber: String(local?.businessPermitNumber || ''),
    tinNumber: String(local?.tinNumber || ''),
    proofOfAddressNotes: String(local?.proofOfAddressNotes || ''),
    serviceAreas: normalizeArray(local?.serviceAreas),
    languages: normalizeArray(local?.languages),
    yearsExperience: String(local?.yearsExperience || ''),
    portfolioSummary: String(local?.portfolioSummary || ''),
    referenceContacts: String(local?.referenceContacts || ''),
    hasInsurance: Boolean(local?.hasInsurance),
    status: normalizeStatus(local?.status || remoteProfile?.verification_status),
    submittedAt: local?.submittedAt || null,
    lastUpdatedAt: local?.lastUpdatedAt || null,
  };

  const assessment = assessProviderVerification(merged);
  return {
    ...merged,
    ...assessment,
  };
};

export const saveProviderVerificationDraft = async (
  userId: string,
  input: Partial<ProviderVerificationDraft>,
  options?: { submit?: boolean }
) => {
  const existing = await getProviderVerificationDraft(userId);
  const now = new Date().toISOString();

  const merged: ProviderVerificationDraft = {
    ...existing,
    ...input,
    businessName: String(input.businessName ?? existing.businessName).trim(),
    governmentIdType: String(input.governmentIdType ?? existing.governmentIdType).trim(),
    governmentIdNumber: String(input.governmentIdNumber ?? existing.governmentIdNumber).trim(),
    nbiClearanceNumber: String(input.nbiClearanceNumber ?? existing.nbiClearanceNumber).trim(),
    prcLicenseNumber: String(input.prcLicenseNumber ?? existing.prcLicenseNumber).trim(),
    businessPermitNumber: String(input.businessPermitNumber ?? existing.businessPermitNumber).trim(),
    tinNumber: String(input.tinNumber ?? existing.tinNumber).trim(),
    proofOfAddressNotes: String(input.proofOfAddressNotes ?? existing.proofOfAddressNotes).trim(),
    serviceAreas: normalizeArray(input.serviceAreas ?? existing.serviceAreas),
    languages: normalizeArray(input.languages ?? existing.languages),
    yearsExperience: String(input.yearsExperience ?? existing.yearsExperience).trim(),
    portfolioSummary: String(input.portfolioSummary ?? existing.portfolioSummary).trim(),
    referenceContacts: String(input.referenceContacts ?? existing.referenceContacts).trim(),
    hasInsurance: Boolean(input.hasInsurance ?? existing.hasInsurance),
    status: existing.status,
    submittedAt: options?.submit ? now : existing.submittedAt,
    lastUpdatedAt: now,
    score: 0,
    verificationLevel: 'unverified',
  };

  let newStatus = existing.status;
  if (options?.submit) {
    newStatus = 'submitted';
  } else if (existing.status === 'not_started') {
    newStatus = 'draft';
  }
  merged.status = newStatus;

  const assessment = assessProviderVerification(merged);
  const nextDraft = {
    ...merged,
    ...assessment,
  };

  try {
    await api.patch(`/provider/${userId}/profile-draft`, {
      business_name: nextDraft.businessName || null,
      verification_status: nextDraft.status,
      submitted_at: nextDraft.submittedAt,
      last_updated_at: nextDraft.lastUpdatedAt,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to sync verification status.'));
  }

  await writeLocalDraft(userId, nextDraft);
  return nextDraft;
};
