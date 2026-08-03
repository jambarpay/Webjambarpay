import { inject, InjectionToken } from '@angular/core';
import { APP_RUNTIME_CONFIG } from '../config/runtime-config';

export const BACKEND_API_URL = new InjectionToken<string>('BACKEND_API_URL', {
  providedIn: 'root',
  factory: () => inject(APP_RUNTIME_CONFIG).backendApiUrl,
});
