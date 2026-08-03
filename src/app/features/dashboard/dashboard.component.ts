import { DecimalPipe, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { catchError, forkJoin, of } from 'rxjs';
import { KpiCardComponent } from '../../design-system/components/kpi-card/kpi-card.component';
import { FcfaCurrencyPipe } from '../../shared/pipes/fcfa-currency.pipe';
import { COMPANIES_REPOSITORY, CompaniesRepository } from '../companies/application/companies.repository';
import { MONITORING_REPOSITORY, MonitoringRepository } from '../monitoring/application/monitoring.repository';
import { MonitoringTransaction } from '../monitoring/domain/monitoring-transaction.model';
import { RESTAURANTS_REPOSITORY, RestaurantsRepository } from '../restaurants/application/restaurants.repository';
import { DashboardKpi, RecentActivity, TopRestaurant } from './domain/dashboard.models';

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, SlicePipe, RouterLink, TableModule, ChartModule, KpiCardComponent, FcfaCurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly companiesRepository = inject<CompaniesRepository>(COMPANIES_REPOSITORY);
  private readonly restaurantsRepository = inject<RestaurantsRepository>(RESTAURANTS_REPOSITORY);
  private readonly monitoringRepository = inject<MonitoringRepository>(MONITORING_REPOSITORY);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly displayedPeriod = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date());
  readonly monthlyTransactionTarget = 500;
  monthlyActivityRate = 0;
  kpis: DashboardKpi[] = [];
  topRestaurants: TopRestaurant[] = [];
  recentActivities: RecentActivity[] = [];
  chartData: ChartData<'line', number[], string> = { datasets: [] };
  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { beginAtZero: true, border: { display: false }, ticks: { precision: 0 } },
    },
  };

  constructor() {
    forkJoin({
      companies: this.companiesRepository.list().pipe(catchError(() => of([]))),
      restaurants: this.restaurantsRepository.list().pipe(catchError(() => of([]))),
      transactions: this.monitoringRepository.list().pipe(catchError(() => of([]))),
    }).subscribe({
      next: data => {
        const validTransactions = data.transactions.filter(transaction => transaction.status === 'Validé');
        const volume = validTransactions.reduce((total, transaction) => total + this.parseAmount(transaction.amount), 0);
        this.monthlyActivityRate = Math.min(100, Math.round((data.transactions.length / this.monthlyTransactionTarget) * 100));
        this.kpis = [
          { label: 'Entreprises actives', value: data.companies.filter(company => company.status === 'Actif').length, change: 0, icon: 'pi pi-building', iconSrc: 'assets/icons/icon-business.svg' },
          { label: 'Restaurants actifs', value: data.restaurants.filter(restaurant => restaurant.status === 'Actif').length, change: 0, icon: 'pi pi-home', iconSrc: 'assets/icons/icon-restaurant-kpi.svg' },
          { label: 'Transactions globales', value: data.transactions.length, change: 0, icon: 'pi pi-chart-line', iconSrc: 'assets/icons/icon-transactions.svg' },
          { label: 'Volume global', value: volume, change: 0, icon: 'pi pi-wallet', iconSrc: 'assets/icons/icon-volumes.svg' },
        ];
        this.topRestaurants = this.buildTopRestaurants(data.transactions);
        this.recentActivities = data.transactions.slice(0, 6).map(transaction => ({
          transactionId: transaction.id,
          company: transaction.company,
          restaurant: transaction.restaurant,
          amount: this.parseAmount(transaction.amount),
          date: transaction.date,
          status: transaction.status === 'En attente' ? 'En cours' : transaction.status,
        }));
        this.chartData = this.buildChart(data.transactions);
        this.changeDetector.markForCheck();
      },
      error: () => this.changeDetector.markForCheck(),
    });
  }

  private buildTopRestaurants(transactions: MonitoringTransaction[]): TopRestaurant[] {
    const totals = new Map<string, { transactions: number; volume: number }>();
    transactions.forEach(transaction => {
      const current = totals.get(transaction.restaurant) ?? { transactions: 0, volume: 0 };
      totals.set(transaction.restaurant, {
        transactions: current.transactions + 1,
        volume: current.volume + this.parseAmount(transaction.amount),
      });
    });
    return Array.from(totals, ([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5)
      .map((restaurant, index) => ({ rank: index + 1, ...restaurant }));
  }

  private buildChart(transactions: MonitoringTransaction[]): ChartData<'line', number[], string> {
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      return date.toISOString().slice(0, 10);
    });
    const counts = days.map(day => transactions.filter(transaction => transaction.date.startsWith(day)).length);
    return {
      labels: days.map(day => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(day))),
      datasets: [{
        label: 'Transactions',
        data: counts,
        fill: true,
        borderColor: '#fde67a',
        backgroundColor: 'rgba(253, 230, 122, 0.18)',
        tension: 0.4,
      }],
    };
  }

  private parseAmount(value: string): number {
    const amount = Number(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    return Number.isFinite(amount) ? amount : 0;
  }
}
