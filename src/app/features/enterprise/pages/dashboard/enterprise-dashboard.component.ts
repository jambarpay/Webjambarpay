import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { TableModule } from 'primeng/table';
import { KpiCardComponent } from '../../../../design-system/components/kpi-card/kpi-card.component';
import { AuthFacade } from '../../../../core/auth/application/auth.facade';
import { BackendApiClient } from '../../../../core/http/backend-api.client';
import { ApiEnvelope } from '../../../../core/http/models/api-response';
import { MONITORING_REPOSITORY, MonitoringRepository } from '../../../monitoring/application/monitoring.repository';

interface FinancialKpi {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: 'charged' | 'consumed' | 'balance' | 'rate';
}

interface EnterpriseTransaction {
  employee: string;
  restaurant: string;
  amount: string;
  date: string;
  status: 'Validé' | 'En attente' | 'Échoué';
}

interface DailyMeal { day: number; count: number }
interface RestaurantUsage { name: string; meals: number }
interface BackendUser { id: string; status: string }
interface BackendTransaction {
  payerUserId: string;
  restaurantId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}
interface BackendWallet { balance: number }

@Component({
  selector: 'app-enterprise-dashboard',
  imports: [TableModule, TitleCasePipe, KpiCardComponent],
  templateUrl: './enterprise-dashboard.component.html',
  styleUrls: ['./enterprise-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnterpriseDashboardComponent {
  private readonly api = inject(BackendApiClient);
  private readonly auth = inject(AuthFacade);
  private readonly monitoringRepository = inject<MonitoringRepository>(MONITORING_REPOSITORY);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly referenceDate = new Date();

  readonly companyName = this.auth.getProfile()?.name ?? 'Entreprise';
  readonly displayedPeriod = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    .format(this.referenceDate);
  consumptionRate = 0;
  availableRate = 100;
  dailyMeals: DailyMeal[] = [];
  maxDailyMeals = 1;
  topRestaurants: RestaurantUsage[] = [];
  maxRestaurantMeals = 1;
  transactions: EnterpriseTransaction[] = [];
  financialKpis: FinancialKpi[] = this.createKpis(0, 0, 0, 0);

  constructor() {
    const companyId = this.auth.getProfile()?.id;
    if (!companyId) {
      this.changeDetector.markForCheck();
      return;
    }
    forkJoin({
      users: this.api.get<ApiEnvelope<BackendUser[]>>(`users/company/${encodeURIComponent(companyId)}/employees`),
      transactions: this.monitoringRepository.list(),
      wallet: this.api.get<BackendWallet>(`wallets/owners/${encodeURIComponent(companyId)}/types/COMPANY`).pipe(
        catchError(() => of(null)),
      ),
    }).subscribe({
      next: ({ users, transactions, wallet }) => {
        this.applyBackendData(users.data, transactions.map(transaction => ({
          payerUserId: transaction.employee,
          restaurantId: transaction.restaurant,
          amount: Number(transaction.amount),
          currency: 'FCFA',
          status: transaction.status === 'Validé'
            ? 'SUCCESS'
            : transaction.status === 'Échoué' ? 'FAILED' : 'PENDING',
          createdAt: transaction.date,
        })), wallet?.balance ?? 0);
        this.changeDetector.markForCheck();
      },
      error: () => this.changeDetector.markForCheck(),
    });
  }

  dailyMealHeight(count: number): number {
    return Math.round((count / this.maxDailyMeals) * 100);
  }

  restaurantUsageWidth(meals: number): number {
    return Math.round((meals / this.maxRestaurantMeals) * 100);
  }

  private applyBackendData(users: BackendUser[], allTransactions: BackendTransaction[], charged: number): void {
    const month = `${this.referenceDate.getFullYear()}-${String(this.referenceDate.getMonth() + 1).padStart(2, '0')}`;
    const transactions = allTransactions.filter(transaction => transaction.createdAt.startsWith(month));
    const consumed = transactions.reduce((total, transaction) => total + transaction.amount, 0);
    const activeEmployees = users.filter(user => user.status === 'ACTIVE').length;

    this.transactions = transactions.slice(0, 11).map(transaction => ({
      employee: transaction.payerUserId,
      restaurant: transaction.restaurantId,
      amount: `${new Intl.NumberFormat('fr-FR').format(transaction.amount)} ${transaction.currency}`,
      date: transaction.createdAt,
      status: this.toStatus(transaction.status),
    }));
    this.dailyMeals = this.groupByDay(transactions);
    this.maxDailyMeals = Math.max(1, ...this.dailyMeals.map(item => item.count));
    this.topRestaurants = this.groupByRestaurant(transactions).slice(0, 4);
    this.maxRestaurantMeals = Math.max(1, ...this.topRestaurants.map(item => item.meals));
    this.financialKpis = this.createKpis(charged, consumed, activeEmployees, users.length);
    this.changeDetector.markForCheck();
  }

  private createKpis(charged: number, consumed: number, activeEmployees: number, totalEmployees: number): FinancialKpi[] {
    const remaining = Math.max(0, charged - consumed);
    this.consumptionRate = charged ? Math.min(100, Math.round((consumed / charged) * 100)) : 0;
    this.availableRate = 100 - this.consumptionRate;
    return [
      { label: 'Solde chargé ce mois', value: this.formatAmount(charged), helper: 'Donnée du payment-service', icon: 'pi pi-money-bill', tone: 'charged' },
      { label: 'Montant consommé', value: this.formatAmount(consumed), helper: 'Transactions du mois', icon: 'pi pi-shopping-cart', tone: 'consumed' },
      { label: 'Solde restant', value: this.formatAmount(remaining), helper: `${this.availableRate}% disponible`, icon: 'pi pi-credit-card', tone: 'balance' },
      { label: 'Salariés actifs', value: `${activeEmployees}/${totalEmployees}`, helper: `${this.transactions.length} transaction(s) récente(s)`, icon: 'pi pi-users', tone: 'rate' },
    ];
  }

  private groupByDay(transactions: BackendTransaction[]): DailyMeal[] {
    const counts = new Map<number, number>();
    transactions.forEach(transaction => {
      const day = new Date(transaction.createdAt).getDate();
      counts.set(day, (counts.get(day) ?? 0) + 1);
    });
    return Array.from(counts, ([day, count]) => ({ day, count })).sort((a, b) => a.day - b.day);
  }

  private groupByRestaurant(transactions: BackendTransaction[]): RestaurantUsage[] {
    const counts = new Map<string, number>();
    transactions.forEach(transaction => counts.set(
      transaction.restaurantId,
      (counts.get(transaction.restaurantId) ?? 0) + 1,
    ));
    return Array.from(counts, ([name, meals]) => ({ name, meals })).sort((a, b) => b.meals - a.meals);
  }

  private toStatus(status: string): EnterpriseTransaction['status'] {
    if (status === 'COMPLETED' || status === 'SUCCESS') return 'Validé';
    if (status === 'FAILED' || status === 'REJECTED') return 'Échoué';
    return 'En attente';
  }

  private formatAmount(value: number): string {
    return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
  }
}
