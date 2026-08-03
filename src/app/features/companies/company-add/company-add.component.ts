import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';
import { FeedbackMessage, FeedbackMessageComponent } from '../../../design-system/components/feedback-message/feedback-message.component';
import { COMPANIES_REPOSITORY, CompaniesRepository } from '../application/companies.repository';
import { Company } from '../domain/company.model';
import {
  hasMinLength,
  hasValue,
  isPositiveNumber,
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
    phone: '',
    ninea: '',
    initialBalance: '',
    address: '',
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
      await firstValueFrom(this.companiesRepository.upsert(this.buildCompany()));
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
      && !this.initialBalanceError
      && !this.addressError;
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

  get initialBalanceError(): string {
    if (!this.form.initialBalance.trim()) return '';
    if (!isPositiveNumber(this.form.initialBalance)) return 'Le solde initial doit etre un montant positif.';
    return '';
  }

  get addressError(): string {
    if (!this.form.address.trim()) return '';
    if (!hasMinLength(this.form.address, 5)) return 'L’adresse doit contenir au moins 5 caracteres.';
    return '';
  }

  private buildCompany(): Company {
    return {
      id: `company-${Date.now()}`,
      name: this.form.name.trim(),
      employeeCount: 0,
      totalBalance: this.toNumber(this.form.initialBalance),
      registrationDate: new Date().toISOString().slice(0, 10),
      status: 'Actif',
    };
  }

  private toNumber(value: string): number {
    const normalized = value.replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
