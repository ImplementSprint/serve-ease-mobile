import { Storage } from './storage';

const STORAGE_PREFIX = 'provider-service-session:';

export type ProviderServiceSession = {
  bookingId: string;
  providerId: string;
  startedAt: string;
  pausedAt: string | null;
  totalPausedMs: number;
};

const keyForBooking = (bookingId: string) => `${STORAGE_PREFIX}${bookingId}`;

export const getProviderServiceSession = async (bookingId: string) => {
  return await Storage.getJson<ProviderServiceSession>(keyForBooking(bookingId));
};

export const startProviderServiceSession = async (bookingId: string, providerId: string) => {
  const existing = await getProviderServiceSession(bookingId);
  if (existing) return existing;

  const session: ProviderServiceSession = {
    bookingId,
    providerId,
    startedAt: new Date().toISOString(),
    pausedAt: null,
    totalPausedMs: 0,
  };

  await Storage.setJson(keyForBooking(bookingId), session);
  return session;
};

export const setProviderServiceSessionPaused = async (bookingId: string, paused: boolean) => {
  const existing = await getProviderServiceSession(bookingId);
  if (!existing) return null;

  let next: ProviderServiceSession = existing;

  if (paused && !existing.pausedAt) {
    next = { ...existing, pausedAt: new Date().toISOString() };
  }

  if (!paused && existing.pausedAt) {
    const pausedAtMs = new Date(existing.pausedAt).getTime();
    const nowMs = Date.now();
    const additionalPausedMs = Number.isNaN(pausedAtMs) ? 0 : Math.max(0, nowMs - pausedAtMs);
    next = {
      ...existing,
      pausedAt: null,
      totalPausedMs: existing.totalPausedMs + additionalPausedMs,
    };
  }

  await Storage.setJson(keyForBooking(bookingId), next);
  return next;
};

export const clearProviderServiceSession = async (bookingId: string) => {
  await Storage.removeItem(keyForBooking(bookingId));
};

export const getProviderServiceElapsedSeconds = (
  session: ProviderServiceSession | null,
  nowMs: number = Date.now()
) => {
  if (!session) return 0;

  const startedAtMs = new Date(session.startedAt).getTime();
  const endMs = session.pausedAt ? new Date(session.pausedAt).getTime() : nowMs;

  if (Number.isNaN(startedAtMs) || Number.isNaN(endMs)) return 0;

  const elapsedMs = Math.max(0, endMs - startedAtMs - Math.max(0, session.totalPausedMs || 0));
  return Math.floor(elapsedMs / 1000);
};
