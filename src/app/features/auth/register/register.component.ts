import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  step = signal<1 | 2>(1);
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

  private isFirstStepValid(): boolean {
    return !this.companyNameError
      && !this.emailError
      && !this.phoneError
      && !this.hrManagerError
      && !this.sectorError
      && !this.employeeCountError
      && !this.nineaError;
  }

  private isSecondStepValid(): boolean {
    return !this.locationError
      && !this.cityError
      && !this.passwordError
      && !this.confirmPasswordError;
  }

  nextStep(): void {
    this.submitted.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    if (!this.isFirstStepValid()) {
      return;
    }

    this.submitted.set(false);
    this.step.set(2);
  }

  previousStep(): void {
    this.submitted.set(false);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.step.set(1);
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(value => !value);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.successMessage.set('');
    this.form.location = this.form.location.trim();
    this.form.city = this.form.city.trim();

    if (!this.isSecondStepValid()) {
      return;
    }

    this.errorMessage.set(
      'Le backend ne fournit pas encore de contrat d’inscription d’entreprise. Aucune donnée n’a été enregistrée.',
    );
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
