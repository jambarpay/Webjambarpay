import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthFacade } from '../../../core/auth/application/auth.facade';
import { ApiHttpError } from '../../../core/http/models/api-http.error';

@Component({
  selector: 'app-employee-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './employee-login.component.html',
  styleUrls: ['../login/login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'login-page' },
})
export class EmployeeLoginComponent {
  private readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);

  phoneNumber = '';
  pin = '';
  readonly loading = signal(false);
  readonly error = signal('');

  async submit(): Promise<void> {
    const phoneNumber = this.phoneNumber.replace(/\D/g, '').replace(/^221/, '');
    this.error.set('');
    if (!/^\d{9}$/.test(phoneNumber) || !/^\d{4}$/.test(this.pin)) {
      this.error.set('Saisissez un téléphone sénégalais à 9 chiffres et un PIN à 4 chiffres.');
      return;
    }

    this.loading.set(true);
    try {
      const authenticated = await firstValueFrom(this.auth.employeeLogin({ phoneNumber, pin: this.pin }));
      if (authenticated) {
        await this.router.navigate([this.auth.getLandingRoute()]);
      } else {
        this.error.set('Téléphone ou PIN incorrect.');
      }
    } catch (error) {
      this.error.set(error instanceof ApiHttpError && error.status === 401
        ? 'Téléphone ou PIN incorrect.'
        : 'Le service de connexion est temporairement indisponible.');
    } finally {
      this.loading.set(false);
    }
  }
}
