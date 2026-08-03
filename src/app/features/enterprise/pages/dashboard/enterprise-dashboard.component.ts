import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TitleCasePipe } from '@angular/common';

import { TableModule } from 'primeng/table';
import { createEnterpriseDemoTransactions } from '../../domain/enterprise-demo-data';
import { percentageChange } from '../../../../core/utils/percentage-change';

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
  status: 'Validé';
}

interface DailyMeal {
  day: number;
  count: number;
}

interface RestaurantUsage {
  name: string;
  meals: number;
}

@Component({
    selector: 'app-enterprise-dashboard',
    imports: [TableModule, TitleCasePipe],
    templateUrl: './enterprise-dashboard.component.html',
    styleUrls: ['./enterprise-dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseDashboardComponent {
  private readonly referenceDate = new Date();
  private readonly demoTransactions = createEnterpriseDemoTransactions(this.referenceDate);
  readonly companyName = 'Sonatel SA';
  readonly displayedPeriod = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(this.referenceDate);
  private readonly chargedAmount = 8_470_000;
  private readonly consumedAmount = 3_010_000;
  private readonly previousMonthConsumedAmount = 2_687_500;
  private readonly remainingBalance = this.chargedAmount - this.consumedAmount;
  private readonly activeEmployees = 5;
  private readonly totalEmployees = 6;
  private readonly monthlyMeals = 6;
  readonly consumptionRate = this.chargedAmount
    ? Math.round((this.consumedAmount / this.chargedAmount) * 100)
    : 0;
  readonly availableRate = 100 - this.consumptionRate;
  readonly dailyMeals: DailyMeal[] = [
    3, 5, 8, 6, 11, 7, 13, 9, 12, 8, 14, 11, 9, 13, 10, 15, 12, 14, 11, 16, 15, 13, 17, 15, 18,
  ].map((count, index) => ({ day: index + 1, count }));
  readonly maxDailyMeals = Math.max(...this.dailyMeals.map(item => item.count));
  readonly topRestaurants: RestaurantUsage[] = [
    { name: 'Restaurant Le Djolof', meals: 89 },
    { name: 'Chez Binta', meals: 74 },
    { name: 'Keur Délice', meals: 61 },
    { name: 'FoodGood', meals: 55 },
  ];
  readonly maxRestaurantMeals = Math.max(...this.topRestaurants.map(item => item.meals));

  financialKpis: FinancialKpi[] = [
    {
      label: 'Solde chargé ce mois',
      value: this.formatAmount(this.chargedAmount),
      helper: 'Cumul des soldes chargés',
      icon: 'pi pi-money-bill',
      tone: 'charged',
    },
    {
      label: 'Montant consommé',
      value: this.formatAmount(this.consumedAmount),
      helper: `+${percentageChange(this.consumedAmount, this.previousMonthConsumedAmount)}% vs mois précédent`,
      icon: 'pi pi-shopping-cart',
      tone: 'consumed',
    },
    {
      label: 'Solde restant',
      value: this.formatAmount(this.remainingBalance),
      helper: `${this.availableRate}% disponible`,
      icon: 'pi pi-credit-card',
      tone: 'balance',
    },
    {
      label: 'Salariés actifs',
      value: `${this.activeEmployees}/${this.totalEmployees}`,
      helper: `${this.monthlyMeals} repas ce mois`,
      icon: 'pi pi-users',
      tone: 'rate',
    },
  ];

  transactions: EnterpriseTransaction[] = this.demoTransactions.slice(0, 11).map(transaction => ({
    employee: transaction.employee,
    restaurant: transaction.restaurant,
    amount: this.formatAmount(transaction.amount),
    date: transaction.date,
    status: transaction.status,
  }));

  private formatAmount(value: number): string {
    return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
  }

  dailyMealHeight(count: number): number {
    return Math.round((count / this.maxDailyMeals) * 100);
  }

  restaurantUsageWidth(meals: number): number {
    return Math.round((meals / this.maxRestaurantMeals) * 100);
  }

}
