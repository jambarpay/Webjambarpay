import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';
import { FeedbackMessage, FeedbackMessageComponent } from '../../../design-system/components/feedback-message/feedback-message.component';
import { COMPANIES_REPOSITORY, CompaniesRepository } from '../application/companies.repository';
import {
  hasMinLength,
  hasValue,
  isValidEmail,
  isValidNinea,
  isValidSenegalPhone,
} from '../../../core/utils/form-validation';

@Component({
    selector: 'app-company-add',
    imports: [FormsModule, RouterModule, InputTextModule, FeedbackMessageComponent],
    templateUrl: './company-add.component.html',
    styleUrls: ['./company-add.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyAddComponent {
  private readonly router = inject(Router);
  private readonly companiesRepository = inject<CompaniesRepository>(COMPANIES_REPOSITORY);

  submitted = signal(false);
  submitting = signal(false);
  feedback = signal<FeedbackMessage | null>(null);

  form = {
    name: '',
    sector: '',
    managerName: '',
    email: '',
    phone: '+221 ',
    employeeCount: '',
    ninea: '',
    location: '',
    city: 'Dakar',
  };

  onCancel(): void {
    this.router.navigate(['/companies']);
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.feedback.set(null);

    if (!this.isFormValid() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    try {
      const company = await firstValueFrom(this.companiesRepository.register(this.form));
      if (company.temporaryPassword) {
        this.feedback.set({
          type: 'success',
          message: `Entreprise créée. Mot de passe temporaire du responsable : ${company.temporaryPassword}. Notez-le maintenant.`,
        });
        return;
      }
      await this.router.navigate(['/companies']);
    } catch (error) {
      this.feedback.set({
        type: 'error',
        message: error instanceof Error
          ? error.message
          : 'L’entreprise n’a pas pu être enregistrée.',
      });
    } finally {
      this.submitting.set(false);
    }
  }

  isFormValid(): boolean {
    return !this.nameError
      && !this.sectorError
      && !this.managerNameError
      && !this.emailError
      && !this.phoneError
      && !this.nineaError
      && !this.employeeCountError
      && !this.locationError
      && !this.cityError;
  }

  get nameError(): string {
    if (!hasValue(this.form.name)) return 'Le nom de l’entreprise est requis.';
    if (!hasMinLength(this.form.name, 2)) return 'Le nom de l’entreprise doit contenir au moins 2 caracteres.';
    return '';
  }

  get sectorError(): string {
    if (!hasValue(this.form.sector)) return 'Le secteur d’activite est requis.';
    return '';
  }

  get managerNameError(): string {
    if (!hasValue(this.form.managerName)) return 'Le nom du responsable est requis.';
    if (!hasMinLength(this.form.managerName, 3)) return 'Le nom du responsable doit contenir au moins 3 caracteres.';
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

  get nineaError(): string {
    if (!this.form.ninea.trim()) return '';
    if (!isValidNinea(this.form.ninea)) return 'Le NINEA doit contenir entre 6 et 20 caracteres valides.';
    return '';
  }

  get employeeCountError(): string {
    if (!hasValue(this.form.employeeCount)) return 'Le nombre de salariés est requis.';
    if (!Number.isInteger(Number(this.form.employeeCount)) || Number(this.form.employeeCount) <= 0) {
      return 'Le nombre de salariés doit être un entier positif.';
    }
    return '';
  }

  get locationError(): string {
    if (!hasValue(this.form.location)) return 'La localisation est requise.';
    if (!hasMinLength(this.form.location, 5)) return 'La localisation doit être plus précise.';
    return '';
  }

  get cityError(): string {
    if (!hasValue(this.form.city)) return 'La ville est requise.';
    return '';
  }

}
