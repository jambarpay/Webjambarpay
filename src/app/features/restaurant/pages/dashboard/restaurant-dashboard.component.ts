
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../../../design-system/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../../design-system/components/loading-state/loading-state.component';
import { RestaurantPaymentsFacade } from '../../application/restaurant-payments.facade';

interface RecentPayment {
  initials: string;
  customer: string;
  table: string;
  time: string;
  amount: string;
  tone: 'blue' | 'violet' | 'green' | 'sky' | 'gold';
}

interface PartnerCompany {
  name: string;
  employees: string;
  amount: string;
  status: 'Actif' | 'Inactif';
}

@Component({
    selector: 'app-restaurant-dashboard',
    imports: [RouterLink, EmptyStateComponent, LoadingStateComponent],
    templateUrl: './restaurant-dashboard.component.html',
    styleUrls: ['./restaurant-dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantDashboardComponent {
  private readonly restaurantPayments = inject(RestaurantPaymentsFacade);

  readonly qrPhoneNumber = this.restaurantPayments.qrPhoneNumber;
  readonly qrCodeUrl = this.restaurantPayments.qrCodeUrl;
  readonly qrCodeStatus = this.restaurantPayments.qrCodeStatus;
  readonly recentPayments = computed<RecentPayment[]>(() => this.restaurantPayments.payments().slice(0, 4).map(payment => ({
    initials: payment.customerPhone.slice(-2).toUpperCase(),
    customer: payment.customerPhone,
    table: payment.table,
    time: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(payment.date)),
    amount: `+ ${payment.amountLabel}`,
    tone: 'blue',
  })));

  readonly partnerCompanies: PartnerCompany[] = [];
}
