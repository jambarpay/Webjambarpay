
import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmptyStateComponent } from '../../../../design-system/components/empty-state/empty-state.component';
import { FeedbackMessageComponent } from '../../../../design-system/components/feedback-message/feedback-message.component';
import { LoadingStateComponent } from '../../../../design-system/components/loading-state/loading-state.component';
import { RestaurantPaymentsFacade } from '../../application/restaurant-payments.facade';
import { isValidSenegalPhone } from '../../../../core/utils/form-validation';

@Component({
    selector: 'app-restaurant-payments',
    imports: [FormsModule, EmptyStateComponent, FeedbackMessageComponent, LoadingStateComponent],
    templateUrl: './restaurant-payments.component.html',
    styleUrls: ['./restaurant-payments.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantPaymentsComponent {
  private readonly restaurantPayments = inject(RestaurantPaymentsFacade);

  amount = '';
  customerPhone = '';
  payerUserId = '';
  qrContent = '';
  pin = '';
  tableNumber = '';
  feedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  submitting = signal(false);

  readonly quickAmounts = ['2 000', '5 000', '10 000', '20 000'];
  readonly qrPhoneNumber = this.restaurantPayments.qrPhoneNumber;
  readonly qrCodeUrl = this.restaurantPayments.qrCodeUrl;
  readonly qrCodeStatus = this.restaurantPayments.qrCodeStatus;

  get isFormValid(): boolean {
    return !this.phoneError
      && !!this.payerUserId.trim()
      && !!this.qrContent.trim()
      && /^\d{4}$/.test(this.pin)
      && this.tableNumber.trim().length >= 2
      && this.normalizedAmount > 0;
  }

  get phoneError(): string {
    const phone = this.customerPhone.trim();

    if (!phone) {
      return 'Renseigne le téléphone du mobile qui a scanné le QR.';
    }

    if (!isValidSenegalPhone(phone)) {
      return 'Le téléphone du client doit être un numéro sénégalais valide.';
    }

    return '';
  }

  get normalizedAmount(): number {
    const normalized = this.amount.replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async submitPayment(): Promise<void> {
    this.feedback.set(null);

    if (!this.isFormValid || this.submitting()) {
      this.feedback.set({
        type: 'error',
        message: this.phoneError || 'Renseigne une table et un montant valide avant validation.',
      });
      return;
    }

    this.submitting.set(true);

    try {
      const payment = await this.restaurantPayments.createPayment({
        payerUserId: this.payerUserId,
        qrContent: this.qrContent,
        pin: this.pin,
        table: this.tableNumber,
        amountLabel: this.amount,
      });

      this.feedback.set({
        type: 'success',
        message: `Paiement ${payment.reference} validé via le QR fixe du restaurant. Clé idempotente émise pour éviter les doublons.`,
      });

      this.customerPhone = '';
      this.payerUserId = '';
      this.qrContent = '';
      this.pin = '';
      this.tableNumber = '';
      this.amount = '';
    } catch (error) {
      this.feedback.set({
        type: 'error',
        message: error instanceof Error ? error.message : 'Paiement impossible pour le moment.',
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
