import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { ApiEnvelope } from '../../../core/http/models/api-response';
import { PlatformSettingsRepository } from '../application/platform-settings.repository';
import { PlatformSettings } from '../domain/platform-settings.model';

interface BackendPlatformSettings {
  platformName: string;
  address: string;
  supportPhone: string;
  maxTransactionAmount: number;
  maxTransactionsPerDay: number;
}

interface UpdatePlatformSettingsPayload {
  platformName: string;
  address: string;
  supportPhone: string;
  maxTransactionAmount: number;
  maxTransactionsPerDay: number;
}

@Injectable({ providedIn: 'root' })
export class BackendPlatformSettingsRepository implements PlatformSettingsRepository {
  private readonly api = inject(BackendApiClient);

  read(): Observable<PlatformSettings> {
    return this.api.get<ApiEnvelope<BackendPlatformSettings>>('platform-settings').pipe(
      map(response => this.toDomain(response.data)),
    );
  }

  save(settings: PlatformSettings): Observable<void> {
    return this.api.put<ApiEnvelope<BackendPlatformSettings>, UpdatePlatformSettingsPayload>(
      'platform-settings',
      {
        platformName: settings.platformName.trim(),
        address: settings.address.trim(),
        supportPhone: settings.supportPhone.trim(),
        maxTransactionAmount: Number(settings.maxTransactionAmount),
        maxTransactionsPerDay: Number(settings.maxTransactionsPerDay),
      },
    ).pipe(map(() => undefined));
  }

  private toDomain(settings: BackendPlatformSettings): PlatformSettings {
    return {
      platformName: settings.platformName,
      address: settings.address,
      supportPhone: settings.supportPhone,
      maxTransactionAmount: String(settings.maxTransactionAmount),
      maxTransactionsPerDay: String(settings.maxTransactionsPerDay),
    };
  }
}
