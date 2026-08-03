import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { JAMBAAR_PRESET } from './design-system/theme/jambaar.preset';
import { routes } from './app.routes';
import { errorInterceptor } from './core/http/interceptors/error.interceptor';
import { correlationInterceptor } from './core/http/interceptors/correlation.interceptor';
import { jwtInterceptor } from './core/http/interceptors/jwt.interceptor';
import { AUTH_REPOSITORY } from './core/auth/application/auth.repository';
import { MockAuthRepository } from './core/auth/data-access/mock-auth.repository';
import { BffAuthRepository } from './core/auth/data-access/bff-auth.repository';
import { APP_RUNTIME_CONFIG, selectRepository } from './core/config/runtime-config';
import { COMPANIES_REPOSITORY } from './features/companies/application/companies.repository';
import { LocalCompaniesRepository } from './features/companies/data-access/local-companies.repository';
import { BffCompaniesRepository } from './features/companies/data-access/bff-companies.repository';
import { RESTAURANTS_REPOSITORY } from './features/restaurants/application/restaurants.repository';
import { LocalRestaurantsRepository } from './features/restaurants/data-access/local-restaurants.repository';
import { BffRestaurantsRepository } from './features/restaurants/data-access/bff-restaurants.repository';
import { BackendRestaurantsRepository } from './features/restaurants/data-access/backend-restaurants.repository';
import { MONITORING_REPOSITORY } from './features/monitoring/application/monitoring.repository';
import { LocalMonitoringRepository } from './features/monitoring/data-access/local-monitoring.repository';
import { BffMonitoringRepository } from './features/monitoring/data-access/bff-monitoring.repository';
import { AUDIT_REPOSITORY } from './features/audit/application/audit.repository';
import { LocalAuditRepository } from './features/audit/data-access/local-audit.repository';
import { BffAuditRepository } from './features/audit/data-access/bff-audit.repository';
import { PLATFORM_SETTINGS_REPOSITORY } from './features/settings/application/platform-settings.repository';
import { LocalPlatformSettingsRepository } from './features/settings/data-access/local-platform-settings.repository';
import { BffPlatformSettingsRepository } from './features/settings/data-access/bff-platform-settings.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: AUTH_REPOSITORY,
      deps: [APP_RUNTIME_CONFIG, MockAuthRepository, BffAuthRepository],
      useFactory: selectRepository,
    },
    {
      provide: COMPANIES_REPOSITORY,
      deps: [APP_RUNTIME_CONFIG, LocalCompaniesRepository, BffCompaniesRepository],
      useFactory: selectRepository,
    },
    {
      provide: RESTAURANTS_REPOSITORY,
      deps: [APP_RUNTIME_CONFIG, LocalRestaurantsRepository, BffRestaurantsRepository, BackendRestaurantsRepository],
      useFactory: selectRepository,
    },
    {
      provide: MONITORING_REPOSITORY,
      deps: [APP_RUNTIME_CONFIG, LocalMonitoringRepository, BffMonitoringRepository],
      useFactory: selectRepository,
    },
    {
      provide: AUDIT_REPOSITORY,
      deps: [APP_RUNTIME_CONFIG, LocalAuditRepository, BffAuditRepository],
      useFactory: selectRepository,
    },
    {
      provide: PLATFORM_SETTINGS_REPOSITORY,
      deps: [APP_RUNTIME_CONFIG, LocalPlatformSettingsRepository, BffPlatformSettingsRepository],
      useFactory: selectRepository,
    },
    provideHttpClient(withInterceptors([correlationInterceptor, jwtInterceptor, errorInterceptor])),
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
