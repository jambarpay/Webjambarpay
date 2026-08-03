import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BackendApiClient } from '../../../../core/http/backend-api.client';
import { ApiEnvelope } from '../../../../core/http/models/api-response';
import {
  hasMinLength,
  hasValue,
  isValidSenegalPhone,
} from '../../../../core/utils/form-validation';

interface EmployeeForm {
  name: string;
  phone: string;
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
    phone: '',
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
      }));
      await this.router.navigate(['/enterprise-employees']);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Le salarié n’a pas pu être créé.');
    } finally {
      this.submitting.set(false);
    }
  }

  private isFormValid(): boolean {
    return !this.nameError
      && !this.phoneError;
  }

  get nameError(): string {
    if (!hasValue(this.form.name)) return 'Le nom du salarie est requis.';
    if (!hasMinLength(this.form.name, 3)) return 'Le nom du salarie doit contenir au moins 3 caracteres.';
    return '';
  }

  get phoneError(): string {
    if (!hasValue(this.form.phone)) return 'Le numero de telephone est requis.';
    if (!isValidSenegalPhone(this.form.phone)) return 'Veuillez saisir un numero senegalais valide sur 9 chiffres.';
    return '';
  }

}
