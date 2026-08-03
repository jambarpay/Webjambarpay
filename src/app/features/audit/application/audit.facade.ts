import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, take } from 'rxjs';
import { DataTransferService, ExportColumn } from '../../../core/services/data-transfer.service';
import { sliceCurrentPage } from '../../../core/utils/pagination';
import { AuditLog } from '../domain/audit-log.model';
import { AUDIT_REPOSITORY, AuditRepository } from './audit.repository';

export type AuditActionFilter = 'Tous'
  | 'Demande de paiement'
  | 'QR validé'
  | 'Transaction enregistrée'
  | 'Paiement validé'
  | 'Paiement échoué'
  | 'Paiement compensé';

@Injectable()
export class AuditFacade {
  private readonly repository = inject<AuditRepository>(AUDIT_REPOSITORY);
  private readonly dataTransfer = inject(DataTransferService);
  private readonly allLogs = signal<AuditLog[]>([]);
  private readonly exportColumns: ExportColumn<AuditLog>[] = [
    { header: 'Action', value: log => log.action },
    { header: 'Utilisateur', value: log => log.user },
    { header: 'Détails', value: log => log.details },
    { header: 'Date', value: log => log.date },
  ];

  readonly searchTerm = signal('');
  readonly actionFilter = signal<AuditActionFilter>('Tous');
  readonly pageSize = signal(6);
  readonly currentPage = signal(1);
  readonly loading = signal(true);
  readonly feedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly pageSizeOptions = [6, 12, 18];
  readonly filterOptions: AuditActionFilter[] = [
    'Tous',
    'Demande de paiement',
    'QR validé',
    'Transaction enregistrée',
    'Paiement validé',
    'Paiement échoué',
    'Paiement compensé',
  ];

  readonly filtered = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const action = this.actionFilter();
    return this.allLogs().filter(log => {
      const matchesQuery = !query || [log.action, log.user, log.details]
        .some(value => value.toLowerCase().includes(query));
      return matchesQuery && (action === 'Tous' || log.action === action);
    });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  readonly logs = computed(() => sliceCurrentPage(this.filtered(), this.currentPage(), this.pageSize()));

  constructor() {
    this.repository.list().pipe(
      take(1),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: logs => this.allLogs.set(logs),
      error: error => this.feedback.set({
        type: 'error',
        message: error instanceof Error ? error.message : 'Chargement du journal d’audit impossible.',
      }),
    });
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  setFilter(filter: AuditActionFilter): void {
    this.actionFilter.set(filter);
    this.currentPage.set(1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  exportPdf(): void {
    this.dataTransfer.exportPdf('Journal d’audit', this.filtered(), this.exportColumns);
  }

  exportExcel(): void {
    this.dataTransfer.exportCsv('journal-audit-jambaarpay', this.filtered(), this.exportColumns);
  }
}
