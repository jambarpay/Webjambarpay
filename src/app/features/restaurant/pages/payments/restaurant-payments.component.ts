
import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../../design-system/components/empty-state/empty-state.component';
import { FeedbackMessageComponent } from '../../../../design-system/components/feedback-message/feedback-message.component';
import { LoadingStateComponent } from '../../../../design-system/components/loading-state/loading-state.component';
import { RestaurantPaymentsFacade } from '../../application/restaurant-payments.facade';

@Component({
    selector: 'app-restaurant-payments',
    imports: [EmptyStateComponent, FeedbackMessageComponent, LoadingStateComponent],
    templateUrl: './restaurant-payments.component.html',
    styleUrls: ['./restaurant-payments.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantPaymentsComponent {
  private readonly restaurantPayments = inject(RestaurantPaymentsFacade);

  feedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly qrPhoneNumber = this.restaurantPayments.qrPhoneNumber;
  readonly qrCodeUrl = this.restaurantPayments.qrCodeUrl;
  readonly qrCodeStatus = this.restaurantPayments.qrCodeStatus;

  showMobilePaymentInstructions(): void {
    this.feedback.set({
      type: 'success',
      message: 'Demandez au salarié de scanner le QR avec Jambaar Pay Mobile. Il vérifiera le montant et confirmera le paiement avec son PIN sur son téléphone.',
    });
  }
}
