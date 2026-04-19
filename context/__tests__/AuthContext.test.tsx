import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AuthProvider, AuthContext } from '../AuthContext';
import { Text } from 'react-native';
import * as authSession from '../../lib/auth-session';
import * as authService from '../../services/authService';

jest.mock('../../lib/auth-session', () => ({
  getAuthSnapshot: jest.fn(() => ({ session: null, passwordResetContext: null })),
  loadAuthSnapshot: jest.fn(),
  persistAuthSession: jest.fn(),
  persistPasswordResetContext: jest.fn(),
  subscribeAuthSnapshot: jest.fn(() => () => {}),
}));

jest.mock('../../services/authService', () => ({
  fetchCurrentUser: jest.fn(),
  refreshSession: jest.fn(),
}));

const TestComponent = () => {
  const { user, isLoading, passwordResetPending } = React.useContext(AuthContext);
  if (isLoading) return <Text>Loading...</Text>;
  return <Text>{passwordResetPending ? 'Reset Pending' : user ? user.email : 'No User'}</Text>;
};

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the session on mount and provides user data', async () => {
    const mockSession = {
      access_token: 'access',
      refresh_token: 'refresh',
      expires_at: new Date().toISOString(),
      role: 'customer',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'customer',
        status: 'active',
        user_metadata: { role: 'customer' },
        app_metadata: { role: 'customer' },
      },
    };

    (authSession.loadAuthSnapshot as jest.Mock).mockResolvedValueOnce({
      session: mockSession,
      passwordResetContext: null,
    });
    (authService.refreshSession as jest.Mock).mockResolvedValueOnce(mockSession);
    (authService.fetchCurrentUser as jest.Mock).mockResolvedValueOnce({
      user: mockSession.user,
    });
    (authSession.getAuthSnapshot as jest.Mock).mockReturnValue({
      session: mockSession,
      passwordResetContext: null,
    });

    const { getByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByText('Loading...')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('test@example.com')).toBeTruthy();
    });
  });

  it('shows password reset readiness from stored context', async () => {
    (authSession.loadAuthSnapshot as jest.Mock).mockResolvedValueOnce({
      session: null,
      passwordResetContext: { accessToken: 'reset-token' },
    });
    (authSession.getAuthSnapshot as jest.Mock).mockReturnValue({
      session: null,
      passwordResetContext: { accessToken: 'reset-token' },
    });

    const { getByText, queryByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(queryByText('Loading...')).toBeNull());
    expect(getByText('Reset Pending')).toBeTruthy();
  });
});
