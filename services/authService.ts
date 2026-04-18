import { api } from '@/lib/apiClient';
import {
  AppAuthSession,
  PasswordResetContext,
  persistAuthSession,
  persistPasswordResetContext,
} from '@/lib/auth-session';

type CustomerSignupInput = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  referralCode: string;
};

type PartialAuthUser = Partial<AppAuthSession['user']> & {
  full_name?: string | null;
  contact_number?: string | null;
};

type SessionResponse = {
  session?: Partial<AppAuthSession> | null;
} & Partial<AppAuthSession>;

type ProviderSignupResponse = {
  status: string;
  message: string;
  data: {
    provider_id: string;
    business_name: string;
    verification_status: string;
  };
};

function toStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === null) continue;
    normalized[key] = String(item);
  }

  return normalized;
}

function normalizeUser(user: PartialAuthUser | null | undefined): AppAuthSession['user'] {
  const role = String(
    user?.role ??
      user?.user_metadata?.role ??
      user?.app_metadata?.role ??
      '',
  )
    .trim()
    .toLowerCase();

  const userMetadata = toStringRecord(user?.user_metadata);
  const appMetadata = toStringRecord(user?.app_metadata);

  if (role && !userMetadata.role) userMetadata.role = role;
  if (role && !appMetadata.role) appMetadata.role = role;

  const fullName = String(user?.full_name || '').trim();
  if (fullName && !userMetadata.full_name) userMetadata.full_name = fullName;

  const contactNumber = String(user?.contact_number || '').trim();
  if (contactNumber && !userMetadata.phone) userMetadata.phone = contactNumber;

  return {
    id: String(user?.id || ''),
    email: String(user?.email || ''),
    role: role || 'customer',
    status: String(user?.status || 'active'),
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  };
}

function normalizeSession(input: SessionResponse | Partial<AppAuthSession>): AppAuthSession {
  const candidate =
    input && typeof input === 'object' && 'session' in input && input.session
      ? input.session
      : input;

  const user = normalizeUser((candidate?.user ?? null) as PartialAuthUser | null);
  const role = String(candidate?.role || user.role || '').trim().toLowerCase() || user.role;

  return {
    access_token: String(candidate?.access_token || ''),
    refresh_token: String(candidate?.refresh_token || ''),
    expires_at: String(candidate?.expires_at || ''),
    user,
    role,
  };
}

async function applySession(input: SessionResponse | Partial<AppAuthSession>) {
  const session = normalizeSession(input);
  if (!session.access_token || !session.refresh_token || !session.user.id) {
    throw new Error('Authentication response is missing required session data.');
  }

  await persistAuthSession(session);
  return session;
}

export async function registerCustomer(input: CustomerSignupInput) {
  const response = await api.post<SessionResponse>('/auth/register/customer', {
    full_name: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    contact_number: input.phone.trim(),
    role: 'customer',
  });

  return applySession(response);
}

export async function loginUser(identifier: string, password: string) {
  const session = await api.post<SessionResponse>('/auth/login', {
    email: identifier.trim().toLowerCase(),
    password: password.trim(),
  });

  return applySession(session);
}

export async function refreshSession(refreshToken: string) {
  const session = await api.post<SessionResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  });

  return applySession(session);
}

export async function fetchCurrentUser() {
  const response = await api.get<{ user: PartialAuthUser }>('/auth/me');
  return { user: normalizeUser(response.user) };
}

export async function logoutUser() {
  try {
    await api.post<{ ok: boolean }>('/auth/logout');
  } catch {
    // Local session cleanup is the source of truth for the mobile app.
  } finally {
    await persistAuthSession(null);
  }
}

export async function requestPasswordReset(email: string, redirectUrl: string) {
  await api.post<{ message: string }>('/auth/forgot-password', {
    email: email.trim().toLowerCase(),
    redirect_to: redirectUrl,
  });
}

export async function resetPassword(password: string, context: PasswordResetContext | null) {
  await api.post<{ message: string }>('/auth/reset-password', {
    password: password.trim(),
    access_token: context?.accessToken,
    refresh_token: context?.refreshToken,
    code: context?.code,
    token_hash: context?.tokenHash,
    type: context?.type,
  });

  await persistPasswordResetContext(null);
  await persistAuthSession(null);
}

export async function registerProvider(formData: FormData) {
  return api.postForm<ProviderSignupResponse>('/auth/v2/register', formData);
}
