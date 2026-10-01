import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthFacade } from '../../../../core/auth/application/auth.facade';
import { BackendApiClient } from '../../../../core/http/backend-api.client';
import { isStrongPassword } from '../../../../core/utils/form-validation';

@Component({
  selector: 'app-enterprise-settings',
  imports: [FormsModule],
  templateUrl: './enterprise-settings.component.html',
  styleUrl: './enterprise-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnterpriseSettingsComponent {
  private readonly api = inject(BackendApiClient);
  private readonly auth = inject(AuthFacade);

  readonly profile = this.auth.getProfile();
  readonly feedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly saving = signal(false);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  async updatePassword(): Promise<void> {
    if (this.saving()) return;

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.feedback.set({ type: 'error', message: 'Renseignez les trois champs du mot de passe.' });
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.feedback.set({ type: 'error', message: 'La confirmation du nouveau mot de passe ne correspond pas.' });
      return;
    }
    if (this.newPassword.length < 8 || !isStrongPassword(this.newPassword)) {
      this.feedback.set({
        type: 'error',
        message: 'Le nouveau mot de passe doit avoir au moins 8 caractères, une majuscule, une minuscule et un chiffre.',
      });
      return;
    }

    this.saving.set(true);
    this.feedback.set(null);
    try {
      await firstValueFrom(this.api.post('auth/change-password', {
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      }));
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.feedback.set({ type: 'success', message: 'Mot de passe mis à jour.' });
    } catch (error) {
      this.feedback.set({
        type: 'error',
        message: error instanceof Error ? error.message : 'La modification du mot de passe a échoué.',
      });
    } finally {
      this.saving.set(false);
    }
  }
}
