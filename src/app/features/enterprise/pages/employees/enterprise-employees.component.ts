import { ChangeDetectionStrategy, Component, ElementRef, HostListener, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { EmptyStateComponent } from '../../../../design-system/components/empty-state/empty-state.component';
import { FeedbackMessageComponent } from '../../../../design-system/components/feedback-message/feedback-message.component';
import { PaginationComponent } from '../../../../design-system/components/pagination/pagination.component';
import {
  EmployeeStatusFilter,
  EnterpriseEmployeesFacade,
} from '../../application/enterprise-employees.facade';

@Component({
    selector: 'app-enterprise-employees',
    imports: [FormsModule, TableModule, InputTextModule, EmptyStateComponent, FeedbackMessageComponent, PaginationComponent],
    providers: [EnterpriseEmployeesFacade],
    templateUrl: './enterprise-employees.component.html',
    styleUrls: ['./enterprise-employees.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnterpriseEmployeesComponent {
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);
  private readonly facade = inject(EnterpriseEmployeesFacade);

  readonly searchTerm = this.facade.searchTerm;
  readonly statusFilter = this.facade.statusFilter;
  readonly pageSize = this.facade.pageSize;
  readonly currentPage = this.facade.currentPage;
  readonly feedback = this.facade.feedback;
  readonly statusOptions = this.facade.statusOptions;
  readonly pageSizeOptions = this.facade.pageSizeOptions;
  readonly totalPages = this.facade.totalPages;
  readonly employees = this.facade.employees;

  readonly filterMenuOpen = signal(false);

  constructor() {
    const successMessage = this.router.getCurrentNavigation()?.extras.state?.['balanceChargeSuccess'];
    if (typeof successMessage === 'string') {
      this.facade.setSuccessFeedback(successMessage);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.filterMenuOpen.set(false);
    }
  }

  goToAddEmployee(): void {
    this.router.navigate(['/enterprise-employees/add']);
  }

  async onImportEmployees(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      await this.facade.importEmployees(file);
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Import impossible.');
    } finally {
      input.value = '';
    }
  }

  goToChargeBalances(): void {
    this.router.navigate(['/enterprise-employees/charge-balances']);
  }

  goToEmployeeHistory(employeeName: string): void {
    this.router.navigate(['/enterprise-history'], {
      queryParams: { employee: employeeName },
    });
  }

  exportEmployees(): void {
    this.facade.exportEmployees();
  }

  exportMonthlyReport(employee: Parameters<EnterpriseEmployeesFacade['exportMonthlyReport']>[0]): void {
    try {
      this.facade.exportMonthlyReport(employee);
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Génération du rapport mensuel impossible.');
    }
  }

  onSearchChange(value: string): void {
    this.facade.setSearchTerm(value);
  }

  toggleFilterMenu(): void {
    this.filterMenuOpen.update(open => !open);
  }

  setStatusFilter(status: EmployeeStatusFilter): void {
    this.facade.setStatusFilter(status);
    this.filterMenuOpen.set(false);
  }

  setPageSize(size: number): void {
    this.facade.setPageSize(size);
  }

  setPage(page: number): void {
    this.facade.setPage(page);
  }

}
