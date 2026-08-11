import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthFacade } from '../../../../core/auth/application/auth.facade';
import { BackendApiClient } from '../../../../core/http/backend-api.client';
import { isStrongPassword } from '../../../../core/utils/form-validation';

interface BackendRestaurant {
  id: string;
  name: string;
  registrationNumber: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string;
  street: string;
}

@Component({
  selector: 'app-restaurant-settings',
  imports: [FormsModule],
  templateUrl: './restaurant-settings.component.html',
  styleUrls: ['./restaurant-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantSettingsComponent {
  private readonly api = inject(BackendApiClient);
  private readonly auth = inject(AuthFacade);
  private restaurant: BackendRestaurant | null = null;

  restaurantName = '';
  managerName = '';
  phone = '';
  email = '';
  address = '';
  ninea = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  paymentAlertEnabled = true;
  confirmationSoundEnabled = false;
  readonly feedback = signal('');
  readonly saving = signal(false);

  constructor() {
    const ownerId = this.auth.getProfile()?.id;
    if (!ownerId) return;
    this.api.get<BackendRestaurant[]>(`restaurants/owner/${encodeURIComponent(ownerId)}`).subscribe({
      next: restaurants => this.populate(restaurants[0] ?? null),
      error: () => this.feedback.set('Les informations du restaurant sont indisponibles.'),
    });
  }

  async saveRestaurant(): Promise<void> {
    if (!this.restaurant || this.saving()) return;
    this.saving.set(true);
    this.feedback.set('');
    try {
      const response = await firstValueFrom(this.api.put<BackendRestaurant>(
        `restaurants/${encodeURIComponent(this.restaurant.id)}`,
        {
          name: this.restaurantName.trim(),
          phoneNumber: this.phone.replace(/\D/g, '').replace(/^221/, ''),
          country: this.restaurant.country,
          city: this.restaurant.city,
          district: this.restaurant.district,
          street: this.address.trim(),
        },
      ));
      this.populate(response);
      this.feedback.set('Informations enregistrées.');
    } catch (error) {
      this.feedback.set(error instanceof Error ? error.message : 'Enregistrement impossible.');
    } finally {
      this.saving.set(false);
    }
  }

  async updatePassword(): Promise<void> {
    if (!this.currentPassword || !this.newPassword || this.newPassword !== this.confirmPassword) {
      this.feedback.set('Les trois champs du mot de passe sont requis et doivent correspondre.');
      return;
    }
    if (this.newPassword.length < 8 || !isStrongPassword(this.newPassword)) {
      this.feedback.set('Le nouveau mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre.');
      return;
    }
    try {
      await firstValueFrom(this.api.post('auth/change-password', {
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      }));
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.feedback.set('Mot de passe mis à jour.');
    } catch (error) {
      this.feedback.set(error instanceof Error ? error.message : 'Modification du mot de passe impossible.');
    }
  }

  private populate(restaurant: BackendRestaurant | null): void {
    this.restaurant = restaurant;
    if (!restaurant) return;
    this.restaurantName = restaurant.name;
    this.phone = restaurant.phoneNumber;
    this.address = [restaurant.street, restaurant.district, restaurant.city, restaurant.country].filter(Boolean).join(', ');
    this.ninea = restaurant.registrationNumber;
  }
}
