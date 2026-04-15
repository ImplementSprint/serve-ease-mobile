import { getAppConfig, resolveEnvironment } from '@config/appConfig';

describe('appConfig', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_APP_NAME;
    delete process.env.EXPO_PUBLIC_APP_ENV;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it('defaults to development for unknown environment', () => {
    expect(resolveEnvironment('qa')).toBe('development');
    expect(resolveEnvironment(undefined)).toBe('development');
  });

  it('allows development, staging, and production values', () => {
    expect(resolveEnvironment('development')).toBe('development');
    expect(resolveEnvironment('staging')).toBe('staging');
    expect(resolveEnvironment('production')).toBe('production');
  });

  it('uses fallback values when extras and env vars are missing', () => {
    const config = getAppConfig();

    expect(config).toEqual({
      appName: 'Template Repo Mobile Single',
      environment: 'development',
      apiBaseUrl: 'https://api.example.com',
    });
  });

  it('uses environment variables for environment and api base url', () => {
    process.env.EXPO_PUBLIC_APP_NAME = 'Template Staging';
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://staging.api.example.com';

    const config = getAppConfig();

    expect(config.appName).toBe('Template Staging');
    expect(config.environment).toBe('staging');
    expect(config.apiBaseUrl).toBe('https://staging.api.example.com');
  });
});
