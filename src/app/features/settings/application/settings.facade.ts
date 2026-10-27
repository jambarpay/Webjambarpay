import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { userErrorMessage } from '../../../core/http/models/user-error-message';
import { createEmptyPlatformSettings } from '../domain/platform-settings.model';
import { PLATFORM_SETTINGS_REPOSITORY, PlatformSettingsRepository } from './platform-settings.repository';

@Injectable()
export class SettingsFacade {
  private readonly repository = inject<PlatformSettingsRepository>(PLATFORM_SETTINGS_REPOSITORY);

  readonly form = createEmptyPlatformSettings();
  readonly feedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  constructor() {
    this.repository.read().subscribe({
      next: settings => Object.assign(this.form, settings),
      error: error => this.feedback.set({
        type: 'error',
        message: userErrorMessage(error, 'Chargement des paramètres impossible.'),
      }),
    });
  }

  save() {
    this.feedback.set(null);
    return this.repository.save(this.form).pipe(
      tap({
        next: () => this.feedback.set({ type: 'success', message: 'Les paramètres ont été enregistrés.' }),
        error: error => this.feedback.set({
          type: 'error',
          message: userErrorMessage(error, 'Enregistrement des paramètres impossible.'),
        }),
      }),
    );
  }
}
