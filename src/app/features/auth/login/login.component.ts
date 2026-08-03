import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';
import { AuthFacade } from '../../../core/auth/application/auth.facade';
import { DemoAccount, TEMPORARY_DEMO_ACCOUNTS } from '../../../core/auth/demo/demo-accounts';
import { LoginForm } from '../../../core/auth/domain/auth.models';
import { isValidEmail } from '../../../core/utils/form-validation';

@Component({
    selector: 'app-login',
    host: {
        class: 'login-page',
    },
    imports: [FormsModule, RouterLink, InputTextModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

  form: LoginForm = { email: '', password: '' };
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');
  submitted = signal(false);

  readonly passwordMinLength = 8;
  readonly demoAccounts = TEMPORARY_DEMO_ACCOUNTS;

  get emailError(): string {
    const email = this.form.email.trim();
    if (!email) return 'Veuillez renseigner votre adresse email.';
    if (!isValidEmail(email)) return 'Veuillez saisir une adresse email valide.';
    return '';
  }

  get passwordError(): string {
    const password = this.form.password;
    if (!password) return 'Veuillez renseigner votre mot de passe.';
    if (password.length < this.passwordMinLength) {
      return `Le mot de passe doit contenir au moins ${this.passwordMinLength} caracteres.`;
    }
    return '';
  }

  get isFormValid(): boolean {
    return !this.emailError && !this.passwordError;
  }

  shouldShowEmailError(): boolean {
    return this.submitted() && !!this.emailError;
  }

  shouldShowPasswordError(): boolean {
    return this.submitted() && !!this.passwordError;
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  useDemoAccount(account: DemoAccount): void {
    this.form = { email: account.email, password: account.password };
    this.error.set('');
    this.submitted.set(false);
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.error.set('');
    this.form.email = this.form.email.trim();

    if (!this.isFormValid) {
      return;
    }

    try {
      this.loading.set(true);
      const authenticated = await firstValueFrom(this.auth.login(this.form));

      if (authenticated) {
        await this.router.navigate([this.auth.getLandingRoute()]);
        return;
      }

      this.error.set('Email ou mot de passe incorrect.');
    } catch {
      this.error.set('Le service de connexion est temporairement indisponible.');
    } finally {
      this.loading.set(false);
    }
  }
}
