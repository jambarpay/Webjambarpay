import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthFacade } from '../../../core/auth/application/auth.facade';

@Component({
  selector: 'app-account-access',
  template: `<section class="access"><h2>Connexion réussie</h2><p>Votre rôle <strong>{{ role }}</strong> est reconnu. Cet espace web n'est pas encore disponible pour ce profil.</p></section>`,
  styles: ['.access { padding: 2rem; border-radius: 1rem; background: #fff; box-shadow: 0 10px 24px rgba(24,23,47,.08); } h2 { margin-top: 0; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountAccessComponent {
  private readonly auth = inject(AuthFacade);
  readonly role = this.auth.getRole() ?? 'Utilisateur';
}
