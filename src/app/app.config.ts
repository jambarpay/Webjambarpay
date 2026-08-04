import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { JAMBAAR_PRESET } from './design-system/theme/jambaar.preset';
import { routes } from './app.routes';
import { errorInterceptor } from './core/http/interceptors/error.interceptor';
import { correlationInterceptor } from './core/http/interceptors/correlation.interceptor';
import { authTokenInterceptor } from './core/http/interceptors/auth-token.interceptor';
import { AUTH_REPOSITORY } from './core/auth/application/auth.repository';
import { BackendAuthRepository } from './core/auth/data-access/backend-auth.repository';
import { COMPANIES_REPOSITORY } from './features/companies/application/companies.repository';
import { BackendCompaniesRepository } from './features/companies/data-access/backend-companies.repository';
import { RESTAURANTS_REPOSITORY } from './features/restaurants/application/restaurants.repository';
import { BackendRestaurantsRepository } from './features/restaurants/data-access/backend-restaurants.repository';
import { MONITORING_REPOSITORY } from './features/monitoring/application/monitoring.repository';
import { BackendMonitoringRepository } from './features/monitoring/data-access/backend-monitoring.repository';
import { AUDIT_REPOSITORY } from './features/audit/application/audit.repository';
import { BackendAuditRepository } from './features/audit/data-access/backend-audit.repository';
import { PLATFORM_SETTINGS_REPOSITORY } from './features/settings/application/platform-settings.repository';
import { BackendPlatformSettingsRepository } from './features/settings/data-access/backend-platform-settings.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    BackendAuthRepository,
    { provide: AUTH_REPOSITORY, useExisting: BackendAuthRepository },
    { provide: COMPANIES_REPOSITORY, useExisting: BackendCompaniesRepository },
    { provide: RESTAURANTS_REPOSITORY, useExisting: BackendRestaurantsRepository },
    { provide: MONITORING_REPOSITORY, useExisting: BackendMonitoringRepository },
    { provide: AUDIT_REPOSITORY, useExisting: BackendAuditRepository },
    { provide: PLATFORM_SETTINGS_REPOSITORY, useExisting: BackendPlatformSettingsRepository },
    provideHttpClient(withInterceptors([correlationInterceptor, authTokenInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: JAMBAAR_PRESET,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: {
            name: 'primeng',
            order: 'primeng, app',
          },
        },
      },
    }),
  ],
};
