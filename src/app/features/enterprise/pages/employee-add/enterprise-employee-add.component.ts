import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, switchMap } from 'rxjs';
import { BackendApiClient } from '../../../../core/http/backend-api.client';
import { ApiEnvelope } from '../../../../core/http/models/api-response';
import {
  hasMinLength,
  hasValue,
  isPositiveNumber,
  isValidEmail,
  isValidSenegalPhone,
} from '../../../../core/utils/form-validation';

interface EmployeeForm {
  name: string;
  position: string;
  email: string;
  phone: string;
  address: string;
  initialAmount: string;
}

@Component({
    selector: 'app-enterprise-employee-add',
    imports: [FormsModule, RouterLink],
    templateUrl: './enterprise-employee-add.component.html',
    styleUrls: ['./enterprise-employee-add.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseEmployeeAddComponent {
  private readonly router = inject(Router);
  private readonly api = inject(BackendApiClient);

  submitted = signal(false);
  submitting = signal(false);
  errorMessage = signal('');

  form: EmployeeForm = {
    name: '',
    position: '',
    email: '',
    phone: '',
    address: '',
    initialAmount: '',
  };

  async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (!this.isFormValid() || this.submitting()) {
      return;
    }

    const [firstName, ...lastNameParts] = this.form.name.trim().split(/\s+/);
    this.submitting.set(true);
    try {
      await firstValueFrom(this.api.post<ApiEnvelope<{ id: string }>, {
        phoneNumber: string;
        firstName: string;
        lastName: string;
      }>('users/register/employee', {
        phoneNumber: this.form.phone.replace(/\D/g, '').replace(/^221/, ''),
        firstName,
        lastName: lastNameParts.join(' ') || firstName,
      }).pipe(
        switchMap(response => {
          const amount = Number(this.form.initialAmount.replace(/[^\d.-]/g, ''));
          if (!Number.isFinite(amount) || amount <= 0) return [response];
          return this.api.get<{ id: string }>(`payments/wallets/owners/${encodeURIComponent(response.data.id)}`).pipe(
            switchMap(wallet => this.api.patch(`payments/wallets/${encodeURIComponent(wallet.id)}/top-up`, {
              amount,
              currency: 'XOF',
            })),
          );
        }),
      ));
      await this.router.navigate(['/enterprise-employees']);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Le salarié n’a pas pu être créé.');
    } finally {
      this.submitting.set(false);
    }
  }

  private isFormValid(): boolean {
    return !this.nameError
      && !this.positionError
      && !this.emailError
      && !this.phoneError
      && !this.addressError
      && !this.initialAmountError;
  }

  get nameError(): string {
    if (!hasValue(this.form.name)) return 'Le nom du salarie est requis.';
    if (!hasMinLength(this.form.name, 3)) return 'Le nom du salarie doit contenir au moins 3 caracteres.';
    return '';
  }

  get positionError(): string {
    if (!hasValue(this.form.position)) return 'Le poste est requis.';
    if (!hasMinLength(this.form.position, 2)) return 'Le poste doit contenir au moins 2 caracteres.';
    return '';
  }

  get emailError(): string {
    if (!hasValue(this.form.email)) return 'L’adresse email est requise.';
    if (!isValidEmail(this.form.email)) return 'Veuillez saisir une adresse email valide.';
    return '';
  }

  get phoneError(): string {
    if (!hasValue(this.form.phone)) return 'Le numero de telephone est requis.';
    if (!isValidSenegalPhone(this.form.phone)) return 'Veuillez saisir un numero senegalais valide sur 9 chiffres.';
    return '';
  }

  get addressError(): string {
    if (!this.form.address.trim()) return '';
    if (!hasMinLength(this.form.address, 5)) return 'L’adresse doit contenir au moins 5 caracteres.';
    return '';
  }

  get initialAmountError(): string {
    if (!this.form.initialAmount.trim()) return '';
    if (!isPositiveNumber(this.form.initialAmount)) return 'Le montant initial doit etre un montant positif.';
    return '';
  }
}
