import { Storage } from './storage';

export type AppAuthUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  user_metadata: Record<string, string>;
  app_metadata: Record<string, string>;
};

export type AppAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user: AppAuthUser;
  role: string;
};

export type PasswordResetContext = {
  accessToken?: string | null;
  refreshToken?: string | null;
  code?: string | null;
  tokenHash?: string | null;
  type?: string | null;
};

type AuthSnapshot = {
  session: AppAuthSession | null;
  passwordResetContext: PasswordResetContext | null;
};

const SESSION_STORAGE_KEY = 'app-auth-session';
const PASSWORD_RESET_STORAGE_KEY = 'app-password-reset-context';
const listeners = new Set<() => void>();

let snapshot: AuthSnapshot = {
  session: null,
  passwordResetContext: null,
};
let hasLoadedSnapshot = false;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: AuthSnapshot) {
  snapshot = next;
  emitChange();
}

export function subscribeAuthSnapshot(listener: () => void) {
  listeners.add(listener);
  void loadAuthSnapshot().then(() => emitChange());
  return () => listeners.delete(listener);
}

export function getAuthSnapshot() {
  return snapshot;
}

export async function loadAuthSnapshot() {
  if (hasLoadedSnapshot) return snapshot;
  hasLoadedSnapshot = true;

  const [session, passwordResetContext] = await Promise.all([
    Storage.getJson<AppAuthSession>(SESSION_STORAGE_KEY),
    Storage.getJson<PasswordResetContext>(PASSWORD_RESET_STORAGE_KEY),
  ]);

  snapshot = {
    session,
    passwordResetContext,
  };

  return snapshot;
}

export async function persistAuthSession(session: AppAuthSession | null) {
  if (!session) {
    await Storage.removeItem(SESSION_STORAGE_KEY);
    setSnapshot({
      ...snapshot,
      session: null,
    });
    return;
  }

  await Storage.setJson(SESSION_STORAGE_KEY, session);
  setSnapshot({
    ...snapshot,
    session,
  });
}

export async function persistPasswordResetContext(
  passwordResetContext: PasswordResetContext | null,
) {
  if (!passwordResetContext) {
    await Storage.removeItem(PASSWORD_RESET_STORAGE_KEY);
    setSnapshot({
      ...snapshot,
      passwordResetContext: null,
    });
    return;
  }

  await Storage.setJson(PASSWORD_RESET_STORAGE_KEY, passwordResetContext);
  setSnapshot({
    ...snapshot,
    passwordResetContext,
  });
}

export async function getStoredAccessToken() {
  if (!hasLoadedSnapshot) {
    await loadAuthSnapshot();
  }
  return snapshot.session?.access_token ?? null;
}

export async function getStoredRefreshToken() {
  if (!hasLoadedSnapshot) {
    await loadAuthSnapshot();
  }
  return snapshot.session?.refresh_token ?? null;
}
