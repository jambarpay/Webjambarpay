import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { ApiEnvelope } from '../../../core/http/models/api-response';
import { PlatformSettingsRepository } from '../application/platform-settings.repository';
import { PlatformSettings } from '../domain/platform-settings.model';

@Injectable({ providedIn: 'root' })
export class BackendPlatformSettingsRepository implements PlatformSettingsRepository {
  private readonly api = inject(BackendApiClient);

  read(): Observable<PlatformSettings> {
    return this.api.get<ApiEnvelope<PlatformSettings>>('settings/platform').pipe(map(response => response.data));
  }

  save(settings: PlatformSettings): Observable<void> {
    return this.api.put<ApiEnvelope<null>, PlatformSettings>('settings/platform', settings).pipe(map(() => undefined));
  }
}
