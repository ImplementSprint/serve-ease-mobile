import Constants from 'expo-constants';

export type RuntimeEnvironment = 'development' | 'staging' | 'production';

export type AppConfig = {
  appName: string;
  environment: RuntimeEnvironment;
  apiBaseUrl: string;
};

type AppConfigExtra = Partial<AppConfig>;

const allowedEnvironments = new Set<RuntimeEnvironment>(['development', 'staging', 'production']);

export function resolveEnvironment(value: string | undefined): RuntimeEnvironment {
  if (value && allowedEnvironments.has(value as RuntimeEnvironment)) {
    return value as RuntimeEnvironment;
  }

  return 'development';
}

export function getAppConfig(): AppConfig {
  const extra = Constants.expoConfig?.extra as AppConfigExtra | undefined;
  const appName = extra?.appName ?? process.env.EXPO_PUBLIC_APP_NAME ?? 'Template Repo Mobile Single';
  const environment = resolveEnvironment(extra?.environment ?? process.env.EXPO_PUBLIC_APP_ENV);
  const apiBaseUrl = extra?.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.example.com';

  return {
    appName,
    environment,
    apiBaseUrl,
  };
}
