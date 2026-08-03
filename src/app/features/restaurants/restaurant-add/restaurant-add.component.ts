import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';
import { FeedbackMessage, FeedbackMessageComponent } from '../../../design-system/components/feedback-message/feedback-message.component';
import { RESTAURANTS_REPOSITORY, RestaurantsRepository } from '../application/restaurants.repository';
import { Restaurant } from '../domain/restaurant.model';
import {
  hasMinLength,
  hasValue,
  isValidNinea,
  isValidSenegalPhone,
} from '../../../core/utils/form-validation';

@Component({
    selector: 'app-restaurant-add',
    imports: [FormsModule, RouterModule, InputTextModule, FeedbackMessageComponent],
    templateUrl: './restaurant-add.component.html',
    styleUrls: ['./restaurant-add.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantAddComponent {
  private readonly router = inject(Router);
  private readonly restaurantsRepository = inject<RestaurantsRepository>(RESTAURANTS_REPOSITORY);
  readonly backendMode = true;

  submitted = signal(false);
  submitting = signal(false);
  feedback = signal<FeedbackMessage | null>(null);

  form = {
    name: '',
    registrationNumber: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerPhoneNumber: '',
    phoneNumber: '',
    country: 'Sénégal',
    city: 'Dakar',
    district: '',
    street: '',
  };

  onCancel(): void {
    this.router.navigate(['/restaurants']);
  }

  async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.feedback.set(null);

    if (!this.isFormValid() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    try {
      await firstValueFrom(this.restaurantsRepository.upsert(this.buildRestaurant()));
      await this.router.navigate(['/restaurants']);
    } catch (error) {
      this.feedback.set({
        type: 'error',
        message: error instanceof Error
          ? error.message
          : 'Le restaurant n’a pas pu être enregistré. Veuillez réessayer.',
      });
    } finally {
      this.submitting.set(false);
    }
  }

  isFormValid(): boolean {
    return !this.nameError
      && !this.registrationNumberError
      && !this.ownerFirstNameError
      && !this.ownerLastNameError
      && !this.ownerPhoneNumberError
      && !this.phoneNumberError
      && !this.countryError
      && !this.cityError
      && !this.streetError;
  }

  get nameError(): string {
    if (!hasValue(this.form.name)) return 'Le nom du restaurant est requis.';
    if (!hasMinLength(this.form.name, 2)) return 'Le nom du restaurant doit contenir au moins 2 caracteres.';
    return '';
  }

  get registrationNumberError(): string {
    if (!hasValue(this.form.registrationNumber)) return 'Le numéro d’immatriculation/NINEA est requis.';
    if (!isValidNinea(this.form.registrationNumber)) return 'Le numéro doit contenir entre 6 et 20 caractères valides.';
    return '';
  }

  get ownerFirstNameError(): string {
    if (!hasValue(this.form.ownerFirstName)) return 'Le prénom du propriétaire est requis.';
    if (!hasMinLength(this.form.ownerFirstName, 2)) return 'Le prénom doit contenir au moins 2 caractères.';
    return '';
  }

  get ownerLastNameError(): string {
    if (!hasValue(this.form.ownerLastName)) return 'Le nom du propriétaire est requis.';
    if (!hasMinLength(this.form.ownerLastName, 2)) return 'Le nom doit contenir au moins 2 caractères.';
    return '';
  }

  get ownerPhoneNumberError(): string {
    if (!hasValue(this.form.ownerPhoneNumber)) return 'Le téléphone du propriétaire est requis.';
    if (!isValidSenegalPhone(this.form.ownerPhoneNumber)) return 'Saisissez un numéro sénégalais valide sur 9 chiffres.';
    return '';
  }

  get phoneNumberError(): string {
    if (!hasValue(this.form.phoneNumber)) return 'Le téléphone du restaurant est requis.';
    if (!isValidSenegalPhone(this.form.phoneNumber)) return 'Saisissez un numéro sénégalais valide sur 9 chiffres.';
    return '';
  }

  get countryError(): string {
    if (!hasValue(this.form.country)) return 'Le pays est requis.';
    return '';
  }

  get cityError(): string {
    if (!hasValue(this.form.city)) return 'La ville est requise.';
    return '';
  }

  get streetError(): string {
    if (!hasValue(this.form.street)) return 'La rue ou l’adresse est requise.';
    return '';
  }

  private buildRestaurant(): Restaurant {
    const address = [this.form.street, this.form.district, this.form.city, this.form.country]
      .map(value => value.trim())
      .filter(Boolean)
      .join(', ');

    return {
      id: `restaurant-${Date.now()}`,
      name: this.form.name.trim(),
      address,
      phone: this.form.phoneNumber.trim(),
      totalTransactions: 0,
      totalVolume: 0,
      registrationDate: new Date().toISOString().slice(0, 10),
      status: this.backendMode ? 'En attente' : 'Actif',
      registrationNumber: this.form.registrationNumber.trim(),
      country: this.form.country.trim(),
      city: this.form.city.trim(),
      district: this.form.district.trim() || undefined,
      street: this.form.street.trim(),
      paymentEligibilityStatus: this.backendMode ? 'NOT_ELIGIBLE' : undefined,
      ownerFirstName: this.form.ownerFirstName.trim(),
      ownerLastName: this.form.ownerLastName.trim(),
      ownerPhoneNumber: this.form.ownerPhoneNumber.trim(),
      source: this.backendMode ? 'new' : 'local',
    };
  }
}
