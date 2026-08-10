import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../design-system/components/empty-state/empty-state.component';
import { FeedbackMessageComponent } from '../../../design-system/components/feedback-message/feedback-message.component';
import { LoadingStateComponent } from '../../../design-system/components/loading-state/loading-state.component';
import { RestaurantPaymentsFacade } from '../../restaurant/application/restaurant-payments.facade';

@Component({
  selector: 'app-seller-portal',
  imports: [EmptyStateComponent, FeedbackMessageComponent, LoadingStateComponent],
  templateUrl: './seller-portal.component.html',
  styleUrls: ['./seller-portal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerPortalComponent {
  private readonly restaurantPayments = inject(RestaurantPaymentsFacade);

  readonly qrPhoneNumber = this.restaurantPayments.qrPhoneNumber;
  readonly qrCodeUrl = this.restaurantPayments.qrCodeUrl;
  readonly qrCodeStatus = this.restaurantPayments.qrCodeStatus;

  readonly feedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly scannerOpen = signal(false);

  openScanner(): void {
    this.scannerOpen.set(true);
    this.feedback.set({
      type: 'success',
      message: 'Le bouton scanner est prêt. On peut brancher ici le vrai scan caméra si tu veux le parcours complet.',
    });
  }
}
