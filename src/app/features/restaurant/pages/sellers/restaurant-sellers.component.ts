import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BackendApiClient } from '../../../../core/http/backend-api.client';
import { ApiHttpError } from '../../../../core/http/models/api-http.error';

interface CreateSellerRequest {
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface CreateSellerResponse {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  temporaryPassword?: string | null;
}

interface CreateSellerEnvelope {
  success: boolean;
  data?: CreateSellerResponse;
  message?: string;
}

interface ListSellersEnvelope {
  success: boolean;
  data?: SellerListItem[];
  message?: string;
}

interface SellerListItem {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  status: string;
}

@Component({
  selector: 'app-restaurant-sellers',
  imports: [FormsModule],
  templateUrl: './restaurant-sellers.component.html',
  styleUrls: ['./restaurant-sellers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantSellersComponent {
  private readonly api = inject(BackendApiClient);

  firstName = '';
  lastName = '';
  phoneNumber = '';
  email = '';
  readonly saving = signal(false);
  readonly loadingSellers = signal(false);
  readonly deletingSellerId = signal<string | null>(null);
  readonly sellers = signal<SellerListItem[]>([]);
  readonly feedback = signal('');
  readonly error = signal('');

  constructor() {
    void this.loadSellers();
  }

  async createSeller(): Promise<void> {
    const seller = this.toRequest();
    this.feedback.set('');
    this.error.set('');

    if (!seller) {
      this.error.set('Renseignez un prénom, un nom et un numéro sénégalais à 9 chiffres.');
      return;
    }

    this.saving.set(true);
    try {
      const response = await firstValueFrom(this.api.post<CreateSellerEnvelope, CreateSellerRequest>('users/vendeur', seller));
      const temporaryPassword = response.data?.temporaryPassword?.trim();
      this.firstName = '';
      this.lastName = '';
      this.phoneNumber = '';
      this.email = '';
      this.feedback.set(temporaryPassword
        ? `Vendeur créé. Mot de passe temporaire: ${temporaryPassword}. Il devra finaliser son activation par OTP avant de pouvoir encaisser.`
        : 'Vendeur créé. Il devra finaliser son activation par OTP avant de pouvoir encaisser.');
      await this.loadSellers();
    } catch (error) {
      this.error.set(this.formatError(error, 'La création du vendeur a échoué.'));
    } finally {
      this.saving.set(false);
    }
  }

  trackSeller(_: number, seller: SellerListItem): string {
    return seller.id;
  }

  async loadSellers(): Promise<void> {
    this.loadingSellers.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(this.api.get<ListSellersEnvelope>('users/role/VENDEUR'));
      const sellers = (response.data ?? []).filter(seller => seller.status !== 'DISABLED');
      this.sellers.set(sellers);
    } catch (error) {
      this.error.set(this.formatError(error, 'La liste des vendeurs est indisponible.'));
    } finally {
      this.loadingSellers.set(false);
    }
  }

  async deleteSeller(seller: SellerListItem): Promise<void> {
    if (this.deletingSellerId()) return;

    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm(`Supprimer le vendeur ${seller.firstName} ${seller.lastName} ?`);
    if (!confirmed) return;

    this.deletingSellerId.set(seller.id);
    this.error.set('');
    this.feedback.set('');
    try {
      await firstValueFrom(this.api.delete(`users/${encodeURIComponent(seller.id)}`));
      this.feedback.set('Vendeur supprimé.');
      await this.loadSellers();
    } catch (error) {
      this.error.set(this.formatError(error, 'La suppression du vendeur a échoué.'));
    } finally {
      this.deletingSellerId.set(null);
    }
  }

  sellerTrack(_: number, seller: SellerListItem): string {
    return seller.id;
  }

  private toRequest(): CreateSellerRequest | null {
    const firstName = this.firstName.trim();
    const lastName = this.lastName.trim();
    const phoneNumber = this.phoneNumber.replace(/\D/g, '').replace(/^221/, '');

    if (!firstName || !lastName || !/^\d{9}$/.test(phoneNumber)
      || !/^\S+@\S+\.\S+$/.test(this.email.trim())) {
      return null;
    }

    return { firstName, lastName, phoneNumber, email: this.email.trim() };
  }

  private formatError(error: unknown, fallbackMessage: string): string {
    if (error instanceof ApiHttpError) {
      if (error.status === 0 || error.status >= 500) {
        return 'Le service est temporairement indisponible. Réessayez dans quelques instants.';
      }

      if (error.status === 403) {
        return 'Vous n’avez pas l’autorisation de consulter cette liste.';
      }

      if (error.message?.trim()) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallbackMessage;
  }
}
