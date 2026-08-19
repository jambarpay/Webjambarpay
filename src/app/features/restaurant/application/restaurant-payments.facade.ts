import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthFacade } from '../../../core/auth/application/auth.facade';
import { BackendApiClient } from '../../../core/http/backend-api.client';

export type RestaurantPaymentStatus = 'Validé' | 'En attente' | 'Échoué';

export interface RestaurantPaymentRecord {
  id: string;
  reference: string;
  customerPhone: string;
  company: string;
  table: string;
  amount: number;
  amountLabel: string;
  date: string;
  status: RestaurantPaymentStatus;
  channel: 'QR fixe telephone' | 'Paiement manuel';
  idempotencyKey: string;
  correlationId: string;
  qrPhoneNumber: string;
  fingerprint: string;
}

interface BackendRestaurantDto {
  id: string;
  name: string;
  phoneNumber: string;
  country: string;
  city: string;
  district: string;
  street: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
}

interface PointOfSaleDto {
  id: string;
}

interface MerchantQrDto {
  qrReference: string;
}

interface BackendPaymentDto {
  id: string;
  payerUserId: string;
  restaurantId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
}

interface BackendPaymentPage {
  content: BackendPaymentDto[];
}

@Injectable({ providedIn: 'root' })
export class RestaurantPaymentsFacade {
  private readonly api = inject(BackendApiClient);
  private readonly auth = inject(AuthFacade);
  private readonly paymentsState = signal<RestaurantPaymentRecord[]>([]);
  readonly payments = computed(() => this.paymentsState());
  readonly qrPhoneNumber = signal('Indisponible');
  readonly qrCodeUrl = signal('');
  readonly qrCodeStatus = signal<'loading' | 'ready' | 'error'>('loading');

  constructor() {
    this.loadRestaurantContext();
  }

  private loadRestaurantContext(): void {
    const profile = this.auth.getProfile();
    // The restaurant-service owner endpoint expects the authenticated user's id.
    // `restaurantId` is a business id when present, so it must not be used here.
    const ownerId = profile?.id?.trim();
    if (!ownerId) {
      this.clearQrImage();
      this.qrCodeStatus.set('error');
      return;
    }

    this.api.get<BackendRestaurantDto[]>(`restaurants/owner/${encodeURIComponent(ownerId)}`).subscribe({
      next: restaurants => {
        const restaurant = restaurants[0];
        if (!restaurant) {
          this.paymentsState.set([]);
          this.clearQrImage();
          this.qrCodeStatus.set('error');
          return;
        }
        this.qrPhoneNumber.set(restaurant.phoneNumber);
        this.loadPayments(restaurant.id);
        this.generateRestaurantQr(restaurant);
      },
      error: () => {
        this.paymentsState.set([]);
        this.clearQrImage();
        this.qrCodeStatus.set('error');
      },
    });
  }

  private loadPayments(restaurantId: string): void {
    this.api.get<BackendPaymentPage>('payments/transactions', {
      params: { page: 0, size: 100, restaurantId },
    }).subscribe({
      next: page => this.paymentsState.set(page.content.map(payment => this.toPaymentRecord(payment))),
      error: () => this.paymentsState.set([]),
    });
  }

  private toPaymentRecord(payment: BackendPaymentDto): RestaurantPaymentRecord {
    const status: RestaurantPaymentStatus = payment.status === 'SUCCESS' || payment.status === 'COMPLETED'
      ? 'Validé'
      : payment.status === 'FAILED' || payment.status === 'REJECTED' ? 'Échoué' : 'En attente';
    const amount = Number(payment.amount);
    const amountLabel = `${new Intl.NumberFormat('fr-FR').format(amount)} ${payment.currency || 'XOF'}`;
    return {
      id: payment.id,
      reference: payment.id,
      customerPhone: payment.payerUserId,
      company: '—',
      table: '—',
      amount,
      amountLabel,
      date: payment.createdAt,
      status,
      channel: payment.method?.toUpperCase().includes('QR') ? 'QR fixe telephone' : 'Paiement manuel',
      idempotencyKey: payment.id,
      correlationId: payment.id,
      qrPhoneNumber: this.qrPhoneNumber(),
      fingerprint: payment.id,
    };
  }

  private async generateRestaurantQr(restaurant: BackendRestaurantDto): Promise<void> {
    if (restaurant.status === 'SUSPENDED' || restaurant.status === 'DISABLED') {
      this.clearQrImage();
      this.qrCodeStatus.set('error');
      return;
    }

    const pointOfSaleKey = `jp_restaurant_pos_${restaurant.id}`;
    try {
      // Restaurant activation is a back-office compliance decision, not an owner action.
      if (restaurant.status !== 'ACTIVE') {
        this.clearQrImage();
        this.qrCodeStatus.set('error');
        return;
      }

      const cachedPointOfSaleId = localStorage.getItem(pointOfSaleKey);
      let pointOfSaleId = cachedPointOfSaleId;
      if (!pointOfSaleId) {
        const pointOfSale = await this.createPointOfSale(restaurant);
        pointOfSaleId = pointOfSale.id;
        localStorage.setItem(pointOfSaleKey, pointOfSaleId);
      }

      try {
        await this.activatePointOfSale(pointOfSaleId);
      } catch (error) {
        // A browser can retain a POS id after the backend database is recreated.
        // Drop that stale id and retry once with a fresh POS.
        if (!cachedPointOfSaleId) throw error;
        localStorage.removeItem(pointOfSaleKey);
        const pointOfSale = await this.createPointOfSale(restaurant);
        pointOfSaleId = pointOfSale.id;
        localStorage.setItem(pointOfSaleKey, pointOfSaleId);
        await this.activatePointOfSale(pointOfSaleId);
      }

      const qr = await firstValueFrom(this.api.post<MerchantQrDto, unknown>(
        `restaurants/${encodeURIComponent(restaurant.id)}/points-of-sale/${encodeURIComponent(pointOfSaleId)}/qr`,
        {},
      ));
      const image = await firstValueFrom(this.api.getBlob(
        `qrs/${encodeURIComponent(qr.qrReference)}/image`,
      ));
      await this.replaceQrImage(image);
      this.qrCodeStatus.set('ready');
    } catch {
      this.clearQrImage();
      this.qrCodeStatus.set('error');
    }
  }

  private createPointOfSale(restaurant: BackendRestaurantDto): Promise<PointOfSaleDto> {
    return firstValueFrom(this.api.post<PointOfSaleDto, unknown>(
      `restaurants/${encodeURIComponent(restaurant.id)}/points-of-sale`,
      {
        name: 'Point de vente principal',
        country: restaurant.country || 'Sénégal',
        city: restaurant.city,
        district: restaurant.district,
        street: restaurant.street,
      },
    ));
  }

  private activatePointOfSale(pointOfSaleId: string): Promise<unknown> {
    return firstValueFrom(this.api.patch(
      `restaurants/points-of-sale/${encodeURIComponent(pointOfSaleId)}/activate`, {},
    ));
  }

  private replaceQrImage(image: Blob): Promise<void> {
    this.clearQrImage();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('QR image could not be converted to a data URL.'));
          return;
        }

        this.qrCodeUrl.set(reader.result);
        resolve();
      };
      reader.onerror = () => reject(reader.error ?? new Error('QR image could not be read.'));
      reader.readAsDataURL(image);
    });
  }

  private clearQrImage(): void {
    this.qrCodeUrl.set('');
  }
}
