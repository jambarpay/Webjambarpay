import { computed, inject, Injectable, signal } from '@angular/core';
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

export interface CreateRestaurantPaymentInput {
  payerUserId: string;
  qrContent: string;
  pin: string;
  table: string;
  amountLabel: string;
  company?: string;
  channel?: RestaurantPaymentRecord['channel'];
}

interface BackendRestaurantDto {
  id: string;
  phoneNumber: string;
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

  async createPayment(input: CreateRestaurantPaymentInput): Promise<RestaurantPaymentRecord> {
    const response = await new Promise<{ id: string; qrReference: string; amount: number; status: string }>((resolve, reject) => {
      this.api.post<{ id: string; qrReference: string; amount: number; status: string }, unknown>('payments/qr', {
        payerUserId: input.payerUserId,
        qrContent: input.qrContent,
        amount: Number(input.amountLabel.replace(/[^\d]/g, '')),
        currency: 'XOF',
        pin: input.pin,
      }).subscribe({ next: resolve, error: reject });
    });
    return {
      id: response.id, reference: response.qrReference, customerPhone: '', company: '', table: input.table,
      amount: response.amount, amountLabel: `${response.amount} FCFA`, date: new Date().toISOString(),
      status: response.status === 'COMPLETED' ? 'Validé' : 'En attente', channel: 'QR fixe telephone',
      idempotencyKey: '', correlationId: '', qrPhoneNumber: this.qrPhoneNumber(), fingerprint: '',
    };
  }

  private loadRestaurantContext(): void {
    const ownerId = this.auth.getProfile()?.id;
    if (!ownerId) {
      this.qrCodeStatus.set('error');
      return;
    }

    this.api.get<BackendRestaurantDto[]>(`restaurants/owner/${encodeURIComponent(ownerId)}`).subscribe({
      next: restaurants => {
        const restaurant = restaurants[0];
        if (!restaurant) {
          this.paymentsState.set([]);
          this.qrCodeStatus.set('error');
          return;
        }
        this.qrPhoneNumber.set(restaurant.phoneNumber);
        this.qrCodeStatus.set('error');
        this.paymentsState.set([]);
      },
      error: () => {
        this.paymentsState.set([]);
        this.qrCodeStatus.set('error');
      },
    });
  }
}
