import { InjectionToken } from '@angular/core';

export type DataSourceMode = 'local' | 'bff' | 'backend';

export interface AppRuntimeConfig {
  dataSource: DataSourceMode;
  bffApiUrl: string;
  backendApiUrl: string;
}

export const APP_RUNTIME_CONFIG = new InjectionToken<AppRuntimeConfig>('APP_RUNTIME_CONFIG', {
  providedIn: 'root',
  factory: readRuntimeConfig,
});

export function selectRepository<T>(config: AppRuntimeConfig, local: T, bff: T, backend?: T): T {
  if (config.dataSource === 'bff') return bff;
  if (config.dataSource === 'backend') return backend ?? local;
  return local;
}

function readRuntimeConfig(): AppRuntimeConfig {
  const dataSource = readMeta('jambaar-data-source');
  const bffApiUrl = readMeta('jambaar-bff-api-url');
  const backendApiUrl = readMeta('jambaar-backend-api-url');

  return {
    dataSource: dataSource === 'bff' || dataSource === 'backend' ? dataSource : 'local',
    bffApiUrl: bffApiUrl || '/bff',
    backendApiUrl: backendApiUrl || '/api/v1',
  };
}

function readMeta(name: string): string {
  if (typeof document === 'undefined') return '';
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content.trim() ?? '';
}
