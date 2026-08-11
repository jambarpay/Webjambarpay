import { ChangeDetectionStrategy, Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../design-system/components/empty-state/empty-state.component';
import { FeedbackMessageComponent } from '../../design-system/components/feedback-message/feedback-message.component';
import { KpiCardComponent } from '../../design-system/components/kpi-card/kpi-card.component';
import { LoadingStateComponent } from '../../design-system/components/loading-state/loading-state.component';
import { PaginationComponent } from '../../design-system/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../design-system/components/status-badge/status-badge.component';
import { MonitoringFacade, MonitoringStatusFilter } from './application/monitoring.facade';

@Component({
  selector: 'app-monitoring',
  imports: [
    FormsModule,
    InputTextModule,
    MenuModule,
    TableModule,
    EmptyStateComponent,
    FeedbackMessageComponent,
    KpiCardComponent,
    LoadingStateComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  providers: [MonitoringFacade],
  templateUrl: './monitoring.component.html',
  styleUrl: './monitoring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoringComponent {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly facade = inject(MonitoringFacade);

  readonly searchTerm = this.facade.searchTerm;
  readonly statusFilter = this.facade.statusFilter;
  readonly pageSize = this.facade.pageSize;
  readonly currentPage = this.facade.currentPage;
  readonly feedback = this.facade.feedback;
  readonly loading = this.facade.loading;
  readonly pageSizeOptions = this.facade.pageSizeOptions;
  readonly filterOptions = this.facade.filterOptions;
  readonly totalPages = this.facade.totalPages;
  readonly transactions = this.facade.transactions;

  readonly filterMenuOpen = signal(false);
  readonly exportMenuOpen = signal(false);
  readonly kpis = computed(() => {
    const summary = this.facade.summary();
    const percentage = (value: number) => summary.total ? Math.round((value / summary.total) * 100) : 0;
    return [
      { label: 'Validées', value: summary.validated, change: percentage(summary.validated), iconSrc: 'assets/icons/icon-check-circle.svg' },
      { label: 'En attente', value: summary.pending, change: percentage(summary.pending), iconSrc: 'assets/icons/icon-pending.svg' },
      { label: 'Transactions échouées', value: summary.failed, change: percentage(summary.failed), iconSrc: 'assets/icons/icon-failed.svg' },
    ];
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) {
      this.filterMenuOpen.set(false);
      this.exportMenuOpen.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.facade.setSearchTerm(value);
  }

  setPageSize(size: number): void {
    this.facade.setPageSize(size);
  }

  setPage(page: number): void {
    this.facade.setPage(page);
  }

  setFilter(filter: MonitoringStatusFilter): void {
    this.facade.setFilter(filter);
    this.filterMenuOpen.set(false);
  }

  toggleFilterMenu(): void {
    this.filterMenuOpen.update(isOpen => !isOpen);
  }

  toggleExportMenu(): void {
    this.exportMenuOpen.update(isOpen => !isOpen);
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      await this.facade.importTransactions(file);
    } catch (error) {
      this.facade.setError(error, 'Import impossible.');
    } finally {
      input.value = '';
    }
  }

  exportPDF(): void {
    try {
      this.facade.exportPdf();
    } catch (error) {
      this.facade.setError(error, 'Export PDF impossible.');
    } finally {
      this.exportMenuOpen.set(false);
    }
  }

  exportExcel(): void {
    this.facade.exportExcel();
    this.exportMenuOpen.set(false);
  }
}
