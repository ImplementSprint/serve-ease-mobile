import * as Linking from 'expo-linking';

type AuthCallbackParams = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  tokenHash: string | null;
  type: string | null;
};

const parseParamString = (raw: string | null | undefined) => {
  const params = new URLSearchParams(String(raw || '').replace(/^#/, ''));
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    code: params.get('code'),
    tokenHash: params.get('token_hash'),
    type: params.get('type'),
  };
};

export const getPasswordResetRedirectUrl = () => Linking.createURL('reset-password');

export const parseSupabaseAuthCallback = (url: string): AuthCallbackParams => {
  const [withoutHash, hash = ''] = String(url || '').split('#');
  const queryIndex = withoutHash.indexOf('?');
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';

  const queryParams = parseParamString(query);
  const hashParams = parseParamString(hash);

  return {
    accessToken: hashParams.accessToken || queryParams.accessToken,
    refreshToken: hashParams.refreshToken || queryParams.refreshToken,
    code: queryParams.code || hashParams.code,
    tokenHash: queryParams.tokenHash || hashParams.tokenHash,
    type: hashParams.type || queryParams.type,
  };
};
