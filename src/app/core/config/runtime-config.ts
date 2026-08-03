import { InjectionToken } from '@angular/core';

export interface AppRuntimeConfig {
  backendApiUrl: string;
}

export const APP_RUNTIME_CONFIG = new InjectionToken<AppRuntimeConfig>('APP_RUNTIME_CONFIG', {
  providedIn: 'root',
  factory: readRuntimeConfig,
});

function readRuntimeConfig(): AppRuntimeConfig {
  const backendApiUrl = readMeta('jambaar-backend-api-url');

  if (!backendApiUrl) {
    throw new Error('Missing required jambaar-backend-api-url runtime configuration.');
  }

  return {
    backendApiUrl,
  };
}

function readMeta(name: string): string {
  if (typeof document === 'undefined') return '';
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content.trim() ?? '';
}
