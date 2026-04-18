import { useSyncExternalStore } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from './error-handling';
import { Storage } from './storage';
import { loginUser, logoutUser, registerCustomer } from '@/services/authService';

export type CustomerProfile = {
  fullName: string;
  mobileNumber: string;
  referralCode: string;
};

export type CustomerAddress = {
  label: string;
  streetAddress: string;
  barangay: string;
  province: string;
  city: string;
  postalCode: string;
  locationNote: string;
  isDefault: boolean;
};

type PendingCustomerDraft = {
  email: string;
  profile: CustomerProfile;
  address: CustomerAddress | null;
};

type CustomerSessionSnapshot = {
  pendingCustomer: PendingCustomerDraft | null;
};

const STORAGE_KEY = 'customer-pending-onboarding';
const listeners = new Set<() => void>();

let snapshot: CustomerSessionSnapshot = {
  pendingCustomer: null,
};
let hasLoadedDraft = false;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: CustomerSessionSnapshot) {
  snapshot = next;
  emitChange();
}

async function loadPendingDraft() {
  if (hasLoadedDraft) return;
  hasLoadedDraft = true;

  try {
    const parsed = await Storage.getJson<PendingCustomerDraft>(STORAGE_KEY);
    if (parsed?.email && parsed?.profile) {
      snapshot = { pendingCustomer: parsed };
    }
  } catch {
    snapshot = { pendingCustomer: null };
  }
}

async function persistPendingDraft(nextDraft: PendingCustomerDraft | null) {
  if (!nextDraft) {
    await Storage.removeItem(STORAGE_KEY);
    setSnapshot({ pendingCustomer: null });
    return;
  }

  await Storage.setJson(STORAGE_KEY, nextDraft);
  setSnapshot({ pendingCustomer: nextDraft });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadPendingDraft().then(() => emitChange());
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function useCustomerSession() {
  const localSnapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { user } = useAuth();

  const currentCustomer = user
    ? {
        email: String(user.email || '').trim().toLowerCase(),
        signupName:
          String(user.user_metadata?.full_name || '').trim() ||
          String(user.email || '').split('@')[0] ||
          'Customer',
        profile: {
          fullName:
            String(user.user_metadata?.full_name || '').trim() ||
            String(user.email || '').split('@')[0] ||
            'Customer',
          mobileNumber: String(user.user_metadata?.phone || '').trim(),
          referralCode: String(user.user_metadata?.referral_code || '').trim(),
        },
      }
    : null;

  return {
    currentCustomer,
    pendingCustomer: localSnapshot.pendingCustomer,
    isLoggedIn: !!user,
    isInSignupOnboarding: Boolean(localSnapshot.pendingCustomer),
  };
}

export async function registerCustomerAccount(input: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  referralCode: string;
}) {
  const email = input.email.trim().toLowerCase();
  const profile: CustomerProfile = {
    fullName: input.fullName.trim(),
    mobileNumber: input.phone.trim(),
    referralCode: input.referralCode.trim(),
  };

  try {
    await registerCustomer({
      email,
      password: input.password,
      fullName: profile.fullName,
      phone: profile.mobileNumber,
      referralCode: profile.referralCode,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create customer account.'));
  }

  await persistPendingDraft({
    email,
    profile,
    address: null,
  });
}

export async function savePendingCustomerAddress(address: CustomerAddress) {
  await loadPendingDraft();
  const existing = snapshot.pendingCustomer;
  if (!existing) return;

  await persistPendingDraft({
    ...existing,
    address,
  });
}

export async function finishSignupOnboarding() {
  await persistPendingDraft(null);
}

export async function loginCustomer(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  await loginUser(normalizedEmail, password.trim());

  await finishSignupOnboarding();

  return { ok: true as const };
}

export async function logoutCustomer() {
  await logoutUser();
}
