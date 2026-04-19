type SupabaseLikeError = {
  message?: string;
  code?: string;
  status?: number;
  details?: string;
  hint?: string;
};

function normalize(input: unknown): SupabaseLikeError {
  if (typeof input === 'string') return { message: input };
  if (input && typeof input === 'object') return input as SupabaseLikeError;
  return {};
}

export function getErrorMessage(input: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const err = normalize(input);
  const raw = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();

  if (!raw && !code) return fallback;

  if (code === '23505' || raw.includes('duplicate key')) {
    return 'This record already exists.';
  }
  if (raw.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Please verify your email before logging in.';
  }
  if (raw.includes('row-level security') || code === '42501' || err.status === 403) {
    return 'Permission denied by database policy. Please check RLS policies.';
  }
  if (raw.includes('network') || raw.includes('fetch')) {
    return 'Network error. Check your internet connection and try again.';
  }

  return err.message || fallback;
}
