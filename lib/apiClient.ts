import {
  getStoredAccessToken,
  getStoredRefreshToken,
  persistAuthSession,
} from './auth-session';
import type { AppAuthSession } from './auth-session';

const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000').trim().replace(/\/$/, '');
const VERSION_SEGMENT_PATTERN = /^v\d+$/i;
const LEGACY_VERSION_FIRST_MODULES = new Set(['uploads']);
const CORRELATION_ID_HEADER = 'x-correlation-id';
const parsedTimeoutMs = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
const REQUEST_TIMEOUT_MS =
  Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0
    ? Math.max(3000, parsedTimeoutMs)
    : 15000;

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
  params?: Record<string, QueryValue>;
};

function createCorrelationId(): string {
  const cryptoProvider = globalThis.crypto as
    | { randomUUID?: () => string }
    | undefined;
  if (cryptoProvider && typeof cryptoProvider.randomUUID === 'function') {
    return cryptoProvider.randomUUID();
  }

  return `mb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeApiResponse<T>(json: unknown): T {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const body = json as Record<string, unknown>;
    if ('data' in body) {
      const keys = Object.keys(body);
      const shouldUnwrap = keys.length === 1 || 'statusCode' in body || 'success' in body;
      if (shouldUnwrap) {
        return body.data as T;
      }
    }
  }

  return json as T;
}

function extractErrorMessage(json: unknown, status: number): string {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const body = json as Record<string, unknown>;
    if (typeof body.error === 'string' && body.error.trim()) return body.error;
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
    if (Array.isArray(body.message)) {
      const message = body.message.filter((item): item is string => typeof item === 'string').join(', ');
      if (message) return message;
    }
  }

  return `Request failed with status ${status}`;
}

function resolveApiPath(path: string): string {
  const rawPath = String(path || '').trim();
  if (!rawPath) {
    return '/api';
  }

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const [pathnamePart, ...queryParts] = normalized.split('?');
  const query = queryParts.length ? `?${queryParts.join('?')}` : '';

  if (pathnamePart === '/api' || pathnamePart.startsWith('/api/')) {
    return `${pathnamePart}${query}`;
  }

  let segments = pathnamePart.split('/').filter(Boolean);
  if (segments[0] === 'addresses') {
    segments = ['users', 'addresses', ...segments.slice(1)];
  } else if (segments[0] === 'users' && segments[1] === 'support-tickets') {
    segments = ['support', 'tickets', ...segments.slice(2)];
  } else if (
    segments[0] === 'auth' &&
    segments[1] === 'register' &&
    segments[2] === 'provider'
  ) {
    segments = ['auth', 'v2', 'register', ...segments.slice(3)];
  }

  const moduleName = segments[0];
  if (!moduleName) {
    return `/api${query}`;
  }

  const isVersioned = VERSION_SEGMENT_PATTERN.test(segments[1] ?? '');
  if (!isVersioned) {
    if (LEGACY_VERSION_FIRST_MODULES.has(moduleName)) {
      return `/api/v1/${segments.join('/')}${query}`;
    }

    segments = [moduleName, 'v1', ...segments.slice(1)];
  }

  return `/api/${segments.join('/')}${query}`;
}

function buildRequestUrl(path: string, options?: RequestOptions): URL {
  const resolvedPath = resolveApiPath(path);
  const url = /^https?:\/\//i.test(resolvedPath)
    ? new URL(resolvedPath)
    : new URL(resolvedPath, `${API_ORIGIN}/`);

  for (const [key, value] of Object.entries(options?.params || {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

function normalizeSessionPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const body = payload as Record<string, unknown>;
  if (body.session && typeof body.session === 'object' && !Array.isArray(body.session)) {
    return body.session;
  }

  return body;
}

function toStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === null) continue;
    record[key] = String(item);
  }

  return record;
}

function toSafeString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
}

function toStoredSession(payload: Record<string, unknown>): AppAuthSession | null {
  const accessToken = toSafeString(payload.access_token);
  const refreshToken = toSafeString(payload.refresh_token);
  if (!accessToken || !refreshToken) {
    return null;
  }

  const userPayload =
    payload.user && typeof payload.user === 'object' && !Array.isArray(payload.user)
      ? (payload.user as Record<string, unknown>)
      : {};

  const role =
    (toSafeString(payload.role) || toSafeString(userPayload.role)).toLowerCase() ||
    'customer';

  const userMetadata = toStringMap(userPayload.user_metadata);
  const appMetadata = toStringMap(userPayload.app_metadata);
  if (role && !userMetadata.role) userMetadata.role = role;
  if (role && !appMetadata.role) appMetadata.role = role;

  const fullName = toSafeString(userPayload.full_name);
  if (fullName && !userMetadata.full_name) userMetadata.full_name = fullName;

  const contactNumber = toSafeString(userPayload.contact_number);
  if (contactNumber && !userMetadata.phone) userMetadata.phone = contactNumber;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: toSafeString(payload.expires_at),
    role,
    user: {
      id: toSafeString(userPayload.id),
      email: toSafeString(userPayload.email),
      role,
      status: toSafeString(userPayload.status) || 'active',
      user_metadata: userMetadata,
      app_metadata: appMetadata,
    },
  };
}

async function getJsonResponse(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${timeoutMs / 1000} seconds`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function getAuthHeaders(
  correlationId: string,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    [CORRELATION_ID_HEADER]: correlationId,
  };
  const accessToken = await getStoredAccessToken();
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return headers;
}

async function tryRefreshSession(correlationId: string) {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return false;

  const refreshUrl = buildRequestUrl('/auth/refresh');
  const res = await fetchWithTimeout(refreshUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [CORRELATION_ID_HEADER]: correlationId,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    await persistAuthSession(null);
    return false;
  }

  const json = await getJsonResponse(res);
  const payload = normalizeSessionPayload(normalizeApiResponse<unknown>(json));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    await persistAuthSession(null);
    return false;
  }

  const session = toStoredSession(payload as Record<string, unknown>);
  if (!session) {
    await persistAuthSession(null);
    return false;
  }

  await persistAuthSession(session);
  return true;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
  hasRetried = false,
  correlationId = createCorrelationId(),
): Promise<T> {
  const headers = await getAuthHeaders(correlationId);
  const url = buildRequestUrl(path, options);

  const res = await fetchWithTimeout(url.toString(), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const json = await getJsonResponse(res);

  if (res.status === 401 && !hasRetried) {
    const didRefresh = await tryRefreshSession(correlationId);
    if (didRefresh) {
      return request<T>(method, path, body, options, true, correlationId);
    }
  }

  if (!res.ok) {
    throw new Error(extractErrorMessage(json, res.status));
  }

  return normalizeApiResponse<T>(json);
}

async function requestForm<T>(
  path: string,
  formData: FormData,
  hasRetried = false,
  correlationId = createCorrelationId(),
): Promise<T> {
  const accessToken = await getStoredAccessToken();
  const headers: Record<string, string> = {
    [CORRELATION_ID_HEADER]: correlationId,
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = buildRequestUrl(path);
  const res = await fetchWithTimeout(url.toString(), {
    method: 'POST',
    headers,
    body: formData,
  });

  const json = await getJsonResponse(res);

  if (res.status === 401 && !hasRetried) {
    const didRefresh = await tryRefreshSession(correlationId);
    if (didRefresh) {
      return requestForm<T>(path, formData, true, correlationId);
    }
  }

  if (!res.ok) {
    throw new Error(extractErrorMessage(json, res.status));
  }

  return normalizeApiResponse<T>(json);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  postForm: <T>(path: string, formData: FormData) => requestForm<T>(path, formData),
};
