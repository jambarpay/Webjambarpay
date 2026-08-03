import { inject, InjectionToken } from '@angular/core';
import { APP_RUNTIME_CONFIG } from '../config/runtime-config';

export const BACKEND_API_URL = new InjectionToken<string>('BACKEND_API_URL', {
  providedIn: 'root',
  factory: () => inject(APP_RUNTIME_CONFIG).backendApiUrl,
});

export function isBackendRequest(requestUrl: string, backendApiUrl: string): boolean {
  const baseOrigin = typeof location === 'undefined' ? 'http://localhost' : location.origin;
  const normalizedRequestUrl = new URL(requestUrl, baseOrigin);
  const normalizedBackendApiUrl = new URL(backendApiUrl, baseOrigin);
  const backendPath = normalizedBackendApiUrl.pathname.replace(/\/+$/, '');

  return normalizedRequestUrl.origin === normalizedBackendApiUrl.origin
    && (normalizedRequestUrl.pathname === backendPath
      || normalizedRequestUrl.pathname.startsWith(`${backendPath}/`));
}
