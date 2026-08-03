import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { PlatformSettingsRepository } from '../application/platform-settings.repository';
import { PlatformSettings } from '../domain/platform-settings.model';

@Injectable({ providedIn: 'root' })
export class BackendPlatformSettingsRepository implements PlatformSettingsRepository {
  read(): Observable<PlatformSettings> {
    return this.missingContract();
  }

  save(settings: PlatformSettings): Observable<void> {
    void settings;
    return this.missingContract();
  }

  private missingContract<T>(): Observable<T> {
    return throwError(() => new Error(
      'Aucun microservice ne fournit encore de contrat public pour les paramètres de la plateforme.',
    ));
  }
}
