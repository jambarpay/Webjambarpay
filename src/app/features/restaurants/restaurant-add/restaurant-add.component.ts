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
    ownerFirstName: '',
    ownerLastName: '',
    ownerPhoneNumber: '',
    phoneNumber: '',
    city: 'Dakar',
    location: '',
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
      && !this.ownerFirstNameError
      && !this.ownerLastNameError
      && !this.ownerPhoneNumberError
      && !this.phoneNumberError
      && !this.cityError
      && !this.locationError;
  }

  get nameError(): string {
    if (!hasValue(this.form.name)) return 'Le nom du restaurant est requis.';
    if (!hasMinLength(this.form.name, 2)) return 'Le nom du restaurant doit contenir au moins 2 caracteres.';
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

  get cityError(): string {
    if (!hasValue(this.form.city)) return 'La ville est requise.';
    return '';
  }

  get locationError(): string {
    if (!hasValue(this.form.location)) return 'La localisation est requise.';
    if (!hasMinLength(this.form.location, 5)) return 'La localisation doit être plus précise.';
    return '';
  }

  private buildRestaurant(): Restaurant {
    const location = this.form.location.trim();
    const city = this.form.city.trim();

    return {
      id: `restaurant-${Date.now()}`,
      name: this.form.name.trim(),
      address: [location, city, 'Sénégal'].filter(Boolean).join(', '),
      phone: this.form.phoneNumber.trim(),
      totalTransactions: 0,
      totalVolume: 0,
      registrationDate: new Date().toISOString().slice(0, 10),
      status: this.backendMode ? 'En attente' : 'Actif',
      // Le service restaurant exige encore une référence interne ; elle est générée
      // automatiquement puisque le NINEA n'est plus demandé dans l'interface.
      registrationNumber: `AUTO-${Date.now()}`,
      country: 'Sénégal',
      city,
      district: location,
      street: location,
      paymentEligibilityStatus: this.backendMode ? 'NOT_ELIGIBLE' : undefined,
      ownerFirstName: this.form.ownerFirstName.trim(),
      ownerLastName: this.form.ownerLastName.trim(),
      ownerPhoneNumber: this.form.ownerPhoneNumber.trim(),
      source: this.backendMode ? 'new' : 'local',
    };
  }
}
