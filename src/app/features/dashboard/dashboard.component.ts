import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { ChartData, ChartOptions, ScriptableContext, TooltipItem } from 'chart.js';
import { KpiCardComponent } from '../../design-system/components/kpi-card/kpi-card.component';
import { FcfaCurrencyPipe } from '../../shared/pipes/fcfa-currency.pipe';
import { DashboardKpi, RecentActivity, TopRestaurant } from './domain/dashboard.models';
import { percentageChange } from '../../core/utils/percentage-change';

@Component({
    selector: 'app-dashboard',
    imports: [DecimalPipe, SlicePipe, RouterLink, TableModule, ChartModule, KpiCardComponent, FcfaCurrencyPipe],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly monthlyMetrics = {
    companies: { current: 47, previous: 41 },
    restaurants: { current: 20, previous: 18 },
    transactions: { current: 390, previous: 342 },
    volume: { current: 21_000_000, previous: 18_600_000 },
  };

  readonly displayedPeriod = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  readonly monthlyTransactionTarget = 500;
  readonly monthlyActivityRate = Math.round(
    (this.monthlyMetrics.transactions.current / this.monthlyTransactionTarget) * 100
  );

  kpis: DashboardKpi[] = [
    {
      label: 'Entreprises actives',
      value: 47,
      change: percentageChange(this.monthlyMetrics.companies.current, this.monthlyMetrics.companies.previous),
      icon: 'pi pi-building',
      iconSrc: 'assets/icons/icon-business.svg',
    },
    {
      label: 'Restaurants actifs',
      value: '+20',
      change: percentageChange(this.monthlyMetrics.restaurants.current, this.monthlyMetrics.restaurants.previous),
      icon: 'pi pi-home',
      iconSrc: 'assets/icons/icon-restaurant-kpi.svg',
    },
    {
      label: 'Transactions globales',
      value: 390,
      change: percentageChange(this.monthlyMetrics.transactions.current, this.monthlyMetrics.transactions.previous),
      icon: 'pi pi-chart-line',
      iconSrc: 'assets/icons/icon-transactions.svg',
    },
    {
      label: 'Volume global',
      value: '21M',
      change: percentageChange(this.monthlyMetrics.volume.current, this.monthlyMetrics.volume.previous),
      icon: 'pi pi-wallet',
      iconSrc: 'assets/icons/icon-volumes.svg',
    },
  ];

  topRestaurants: TopRestaurant[] = [
    { rank: 1, name: 'Restaurant Le Djolof', transactions: 340, volume: 892_998 },
    { rank: 2, name: 'Le Plat', transactions: 340, volume: 892_998 },
    { rank: 3, name: 'La Téranga', transactions: 340, volume: 892_998 },
    { rank: 5, name: 'Thiébou Ndar', transactions: 340, volume: 892_998 },
    { rank: 6, name: 'FoodGood', transactions: 340, volume: 892_998 },
  ];

  recentActivities: RecentActivity[] = Array.from({ length: 6 }, () => ({
    transactionId: `JP-${new Date().getFullYear()}-0001`,
    company: 'Entreprise 1',
    restaurant: 'Restaurant 2',
    amount: 2_000,
    date: '2026-04-15',
    status: 'Validé' as const,
  }));

  chartData: ChartData<'line', number[], string> = { datasets: [] };
  chartOptions: ChartOptions<'line'> = {};

  ngOnInit(): void {
    this.initChart();
  }

  private initChart(): void {
    const labels = ['Apr10', 'Apr 11', 'Apr12', 'Apr13', 'Apr 14', 'Apr 15', 'Apr 16'];
    const data = [52, 25, 78, 88, 66, 104, 87];

    this.chartData = {
      labels,
      datasets: [{
        label: 'Transactions',
        data,
        fill: true,
        borderColor: '#fde67a',
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const chart = context.chart;
          const area = chart.chartArea;
          if (!area) return 'rgba(253, 230, 122, 0.18)';
          const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          gradient.addColorStop(0, 'rgba(253, 230, 122, 0.34)');
          gradient.addColorStop(1, 'rgba(253, 230, 122, 0.03)');
          return gradient;
        },
        tension: 0.42,
        borderWidth: 4,
        pointBackgroundColor: '#F7E47A',
        pointBorderColor: '#fff',
        pointBorderWidth: 3,
        pointRadius: (context: ScriptableContext<'line'>) => context.dataIndex === 5 ? 7 : 0,
        pointHoverRadius: 8,
      }],
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: '#fff',
          titleColor: '#1A1A2E',
          bodyColor: '#8d8d8d',
          borderColor: 'rgba(0,0,0,0.08)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (context: TooltipItem<'line'>) => ` ${context.parsed.y}%`,
          },
        },
      },
      layout: {
        padding: {
          bottom: 16,
          left: 6,
          right: 8,
          top: 8,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: '#1A1A2E',
            font: { size: 11, family: 'Segoe UI', weight: 600 },
            padding: 14,
            maxRotation: 0,
            minRotation: 0,
          },
        },
        y: {
          min: 0,
          max: 110,
          grid: { color: 'rgba(0,0,0,0.045)' },
          border: { display: false },
          ticks: { stepSize: 25, color: '#1A1A2E', font: { size: 12, family: 'Segoe UI', weight: 600 } },
          position: 'left',
        },
      },
    };
  }
}
