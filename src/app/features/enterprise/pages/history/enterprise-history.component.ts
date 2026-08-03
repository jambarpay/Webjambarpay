import { ChangeDetectionStrategy, Component, computed, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../../design-system/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../../design-system/components/pagination/pagination.component';
import { DataTransferService, ExportColumn } from '../../../../core/services/data-transfer.service';
import { sliceCurrentPage } from '../../../../core/utils/pagination';
import { createEnterpriseDemoTransactions } from '../../domain/enterprise-demo-data';

interface HistoryTransaction {
  employee: string;
  employeeEmail: string;
  restaurant: string;
  amount: string;
  date: string;
  status: 'Validé';
}

type PeriodMode = 'week' | 'month';

@Component({
    selector: 'app-enterprise-history',
    imports: [FormsModule, TableModule, EmptyStateComponent, PaginationComponent],
    templateUrl: './enterprise-history.component.html',
    styleUrls: ['./enterprise-history.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseHistoryComponent {
  private readonly dataTransfer = inject(DataTransferService);
  private readonly route = inject(ActivatedRoute);

  private readonly referenceDate = new Date();
  readonly transactions: HistoryTransaction[] = createEnterpriseDemoTransactions(this.referenceDate)
    .map(transaction => ({
      ...transaction,
      amount: `${new Intl.NumberFormat('fr-FR').format(transaction.amount)} Fcfa`,
    }));

  readonly employeeOptions = Array.from(
    new Map(this.transactions.map(transaction => [
      transaction.employee,
      { name: transaction.employee, email: transaction.employeeEmail },
    ])).values()
  );
  readonly employeeSearch = signal(this.initialEmployeeSearch());
  readonly employeeMenuOpen = signal(false);
  readonly periodMode = signal<PeriodMode>('month');
  readonly selectedMonth = signal(this.toMonthInputValue(this.referenceDate));
  readonly selectedWeek = signal(this.toWeekInputValue(this.referenceDate));
  pageSize = signal(5);
  currentPage = signal(1);
  readonly pageSizeOptions = [5, 10];
  private readonly exportColumns: ExportColumn<HistoryTransaction>[] = [
    { header: 'Salarie', value: transaction => transaction.employee },
    { header: 'Email', value: transaction => transaction.employeeEmail },
    { header: 'Restaurant', value: transaction => transaction.restaurant },
    { header: 'Montant', value: transaction => transaction.amount },
    { header: 'Date', value: transaction => transaction.date },
    { header: 'Statut', value: transaction => transaction.status },
  ];

  readonly filteredTransactions = computed(() => {
    const employeeQuery = this.employeeSearch().trim().toLowerCase();
    const mode = this.periodMode();
    const month = this.selectedMonth();
    const week = this.selectedWeek();

    return this.transactions.filter(transaction => {
      if (
        employeeQuery
        && !transaction.employee.toLowerCase().includes(employeeQuery)
        && !transaction.employeeEmail.toLowerCase().includes(employeeQuery)
      ) {
        return false;
      }

      if (mode === 'month') {
        return transaction.date.startsWith(month);
      }

      return this.toWeekInputValue(this.parseLocalDate(transaction.date)) === week;
    });
  });
  readonly employeeSuggestions = computed(() => {
    const query = this.employeeSearch().trim().toLowerCase();
    return this.employeeOptions.filter(employee =>
      !query
      || employee.name.toLowerCase().includes(query)
      || employee.email.toLowerCase().includes(query)
    );
  });

  readonly transactionCount = computed(() => this.filteredTransactions().length);
  readonly totalAmount = computed(() =>
    this.filteredTransactions().reduce((total, transaction) => total + this.parseAmount(transaction.amount), 0)
  );

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTransactions().length / this.pageSize())));

  paginatedTransactions = computed(() => {
    return sliceCurrentPage(this.filteredTransactions(), this.currentPage(), this.pageSize());
  });

  setEmployeeSearch(value: string): void {
    this.employeeSearch.set(value);
    this.employeeMenuOpen.set(true);
    this.currentPage.set(1);
  }

  selectEmployee(value: string): void {
    this.employeeSearch.set(value);
    this.employeeMenuOpen.set(false);
    this.currentPage.set(1);
  }

  showAllEmployees(): void {
    this.employeeSearch.set('');
    this.employeeMenuOpen.set(false);
    this.currentPage.set(1);
  }

  closeEmployeeMenu(): void {
    window.setTimeout(() => this.employeeMenuOpen.set(false), 120);
  }

  setPeriodMode(mode: PeriodMode): void {
    this.periodMode.set(mode);
    this.currentPage.set(1);
  }

  setSelectedMonth(value: string): void {
    this.selectedMonth.set(value);
    this.currentPage.set(1);
  }

  setSelectedWeek(value: string): void {
    this.selectedWeek.set(value);
    this.currentPage.set(1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  exportExcel(): void {
    this.dataTransfer.exportCsv(
      `historique-${this.employeeSearch().trim() || 'tous'}-${this.periodMode()}`,
      this.filteredTransactions(),
      this.exportColumns,
    );
  }

  exportPdf(): void {
    this.dataTransfer.exportPdf(
      this.employeeSearch().trim()
        ? `Historique de ${this.employeeSearch().trim()}`
        : 'Historique de tous les salariés',
      this.filteredTransactions(),
      this.exportColumns,
    );
  }

  formatAmount(value: number): string {
    return `${new Intl.NumberFormat('fr-FR').format(value)} Fcfa`;
  }

  private parseAmount(value: string): number {
    const amount = Number(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    return Number.isFinite(amount) ? amount : 0;
  }

  private parseLocalDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toMonthInputValue(date: Date): string {
    return this.toDateInputValue(date).slice(0, 7);
  }

  private toWeekInputValue(date: Date): string {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
    return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  private initialEmployeeSearch(): string {
    return this.route.snapshot.queryParamMap.get('employee') ?? '';
  }
}
