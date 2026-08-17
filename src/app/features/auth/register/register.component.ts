import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { ApiHttpError } from '../../../core/http/models/api-http.error';
import { InputTextModule } from 'primeng/inputtext';
import {
  hasMinLength,
  hasValue,
  isPositiveInteger,
  isStrongPassword,
  isValidEmail,
  isValidNinea,
  isValidSenegalPhone,
} from '../../../core/utils/form-validation';

interface RegisterForm {
  companyName: string;
  email: string;
  phone: string;
  hrManager: string;
  sector: string;
  employeeCount: string;
  ninea: string;
  location: string;
  city: string;
  password: string;
  confirmPassword: string;
}

@Component({
    selector: 'app-register',
    host: {
        class: 'register-page',
    },
    imports: [FormsModule, RouterLink, InputTextModule],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  private readonly api = inject(BackendApiClient);
  private readonly route = inject(ActivatedRoute);
  accountType = signal<'enterprise' | 'restaurant'>('enterprise');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  submitted = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  form: RegisterForm = {
    companyName: '',
    email: '',
    phone: '',
    hrManager: '',
    sector: '',
    employeeCount: '',
    ninea: '',
    location: '',
    city: '',
    password: '',
    confirmPassword: '',
  };

  readonly passwordMinLength = 8;

  constructor() {
    if (this.route.snapshot.queryParamMap.get('type') === 'restaurant') {
      this.accountType.set('restaurant');
    }
  }

  private isFormValid(): boolean {
    return !this.companyNameError
      && !this.emailError
      && !this.phoneError
      && !this.hrManagerError
      && (this.accountType() === 'restaurant' || (!this.sectorError && !this.employeeCountError && !this.nineaError))
      && !this.locationError
      && !this.cityError
      && !this.passwordError
      && !this.confirmPasswordError;
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(value => !value);
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.form.location = this.form.location.trim();
    this.form.city = this.form.city.trim();

    if (!this.isFormValid()) {
      return;
    }

    try {
      const role = this.accountType() === 'enterprise' ? 'ENTREPRISE' : 'RESTAURANT';
      await firstValueFrom(this.api.post<{ data: { id: string } }, unknown>('auth/register/organization', {
        phoneNumber: this.form.phone.replace(/\D/g, '').replace(/^221/, ''),
        firstName: this.form.hrManager.trim().split(/\s+/)[0],
        lastName: this.form.hrManager.trim().split(/\s+/).slice(1).join(' ') || this.form.hrManager.trim().split(/\s+/)[0],
        email: this.form.email.trim(),
        password: this.form.password,
        role,
        organizationName: this.form.companyName.trim(),
        sector: this.form.sector.trim() || undefined,
        employeeCount: this.form.employeeCount ? Number(this.form.employeeCount) : undefined,
        registrationNumber: this.form.ninea.trim() || undefined,
        location: this.form.location,
        city: this.form.city,
      }));

      this.successMessage.set(this.accountType() === 'restaurant'
        ? 'Restaurant inscrit avec succès. Vous pouvez maintenant vous connecter.'
        : 'Entreprise inscrite avec succès. Vous pouvez maintenant vous connecter.');
    } catch (error) {
      this.errorMessage.set(this.getRegistrationErrorMessage(error));
    }
  }

  private getRegistrationErrorMessage(error: unknown): string {
    if (error instanceof ApiHttpError) {
      if (error.message.trim()) return error.message;
      return `L’inscription a échoué (erreur ${error.status}).`;
    }
    return error instanceof Error ? error.message : 'Impossible d’inscrire le compte pour le moment.';
  }

  showRequiredError(value: string | number | null | undefined): boolean {
    return this.submitted() && !hasValue(value);
  }

  showEmailError(): boolean {
    return this.submitted() && !!this.emailError;
  }

  showPasswordError(): boolean {
    return this.submitted() && !!this.passwordError;
  }

  showConfirmPasswordError(): boolean {
    return this.submitted() && !!this.confirmPasswordError;
  }

  showPhoneError(): boolean {
    return this.submitted() && !!this.phoneError;
  }

  showEmployeeCountError(): boolean {
    return this.submitted() && !!this.employeeCountError;
  }

  showNineaError(): boolean {
    return this.submitted() && !!this.nineaError;
  }

  get companyNameError(): string {
    if (!hasValue(this.form.companyName)) return 'Le nom de l’entreprise est requis.';
    if (!hasMinLength(this.form.companyName, 2)) return 'Le nom de l’entreprise doit contenir au moins 2 caracteres.';
    return '';
  }

  get emailError(): string {
    if (!hasValue(this.form.email)) return 'L’adresse email est requise.';
    if (!isValidEmail(this.form.email)) return 'Veuillez saisir une adresse email valide.';
    return '';
  }

  get phoneError(): string {
    if (!hasValue(this.form.phone)) return 'Le telephone est requis.';
    if (!isValidSenegalPhone(this.form.phone)) return 'Veuillez saisir un numero senegalais valide sur 9 chiffres.';
    return '';
  }

  get hrManagerError(): string {
    if (!hasValue(this.form.hrManager)) return 'Le responsable RH est requis.';
    if (!hasMinLength(this.form.hrManager, 3)) return 'Le nom du responsable RH doit contenir au moins 3 caracteres.';
    return '';
  }

  get sectorError(): string {
    if (!hasValue(this.form.sector)) return 'Le secteur d’activite est requis.';
    return '';
  }

  get employeeCountError(): string {
    if (!hasValue(this.form.employeeCount)) return 'Le nombre de salaries est requis.';
    if (!isPositiveInteger(this.form.employeeCount)) return 'Le nombre de salaries doit etre un entier positif.';
    return '';
  }

  get nineaError(): string {
    if (!hasValue(this.form.ninea)) return 'Le NINEA ou RCCM est requis.';
    if (!isValidNinea(this.form.ninea)) return 'Le NINEA ou RCCM doit contenir entre 6 et 20 caracteres valides.';
    return '';
  }

  get locationError(): string {
    if (!hasValue(this.form.location)) return 'La localisation est requise.';
    if (!hasMinLength(this.form.location, 5)) return 'La localisation doit etre plus precise.';
    return '';
  }

  get cityError(): string {
    if (!hasValue(this.form.city)) return 'La ville est requise.';
    if (!hasMinLength(this.form.city, 2)) return 'La ville doit contenir au moins 2 caracteres.';
    return '';
  }

  get passwordError(): string {
    if (!hasValue(this.form.password)) return 'Le mot de passe est requis.';
    if (this.form.password.length < this.passwordMinLength) {
      return `Le mot de passe doit contenir au moins ${this.passwordMinLength} caracteres.`;
    }
    if (!isStrongPassword(this.form.password)) {
      return 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre.';
    }
    return '';
  }

  get confirmPasswordError(): string {
    if (!hasValue(this.form.confirmPassword)) return 'La confirmation du mot de passe est requise.';
    if (this.form.password !== this.form.confirmPassword) return 'Les mots de passe ne correspondent pas.';
    return '';
  }
}
