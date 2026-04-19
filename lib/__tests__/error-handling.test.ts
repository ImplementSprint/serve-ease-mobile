import { getErrorMessage } from '../error-handling';

describe('getErrorMessage', () => {
  it('returns fallback when no useful message is available', () => {
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
    expect(getErrorMessage({}, 'Fallback')).toBe('Fallback');
  });

  it('maps duplicate key database errors', () => {
    expect(getErrorMessage({ code: '23505', message: 'insert failed' })).toBe(
      'This record already exists.',
    );
    expect(getErrorMessage({ message: 'duplicate key value violates unique constraint' })).toBe(
      'This record already exists.',
    );
  });

  it('maps authentication errors', () => {
    expect(getErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'Invalid email or password.',
    );
    expect(getErrorMessage({ message: 'Email not confirmed' })).toBe(
      'Please verify your email before logging in.',
    );
  });

  it('maps permission errors from message, code, and status', () => {
    expect(getErrorMessage({ message: 'Row-level security policy violation' })).toBe(
      'Permission denied by database policy. Please check RLS policies.',
    );
    expect(getErrorMessage({ code: '42501', message: 'forbidden' })).toBe(
      'Permission denied by database policy. Please check RLS policies.',
    );
    expect(getErrorMessage({ status: 403, message: 'forbidden' })).toBe(
      'Permission denied by database policy. Please check RLS policies.',
    );
  });

  it('maps network/fetch failures', () => {
    expect(getErrorMessage({ message: 'Network request failed' })).toBe(
      'Network error. Check your internet connection and try again.',
    );
    expect(getErrorMessage({ message: 'Failed to fetch' })).toBe(
      'Network error. Check your internet connection and try again.',
    );
  });

  it('returns original message for unmapped cases', () => {
    expect(getErrorMessage({ message: 'Service temporarily unavailable' })).toBe(
      'Service temporarily unavailable',
    );
  });
});
