import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, firstValueFrom, take } from 'rxjs';
import { DataTransferService, ExportColumn, ImportedRecord } from '../../../core/services/data-transfer.service';
import { sliceCurrentPage } from '../../../core/utils/pagination';
import { MonitoringTransaction } from '../domain/monitoring-transaction.model';
import { MONITORING_REPOSITORY, MonitoringRepository } from './monitoring.repository';

export type MonitoringStatusFilter = 'Tous' | MonitoringTransaction['status'];
export type MonitoringFeedback = { type: 'success' | 'error'; message: string } | null;

const PAGE_SIZE_OPTIONS = [6, 12, 18];
const FILTER_OPTIONS: MonitoringStatusFilter[] = ['Tous', 'Validé', 'En attente', 'Échoué'];

@Injectable()
export class MonitoringFacade {
  private readonly repository = inject<MonitoringRepository>(MONITORING_REPOSITORY);
  private readonly dataTransfer = inject(DataTransferService);
  private readonly allTransactions = signal<MonitoringTransaction[]>([]);
  private readonly exportColumns: ExportColumn<MonitoringTransaction>[] = [
    { header: 'ID', value: transaction => transaction.id },
    { header: 'Salarie', value: transaction => transaction.employee },
    { header: 'Entreprise', value: transaction => transaction.company },
    { header: 'Restaurant', value: transaction => transaction.restaurant },
    { header: 'Montant', value: transaction => transaction.amount },
    { header: 'Date', value: transaction => transaction.date },
    { header: 'Statut', value: transaction => transaction.status },
  ];

  readonly searchTerm = signal('');
  readonly statusFilter = signal<MonitoringStatusFilter>('Tous');
  readonly pageSize = signal(6);
  readonly currentPage = signal(1);
  readonly feedback = signal<MonitoringFeedback>(null);
  readonly loading = signal(true);
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly filterOptions = FILTER_OPTIONS;

  readonly filtered = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.allTransactions().filter(transaction => {
      const matchesQuery = !query || [
        transaction.id,
        transaction.employee,
        transaction.company,
        transaction.restaurant,
      ].some(value => value.toLowerCase().includes(query));
      return matchesQuery && (status === 'Tous' || transaction.status === status);
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  readonly transactions = computed(() => sliceCurrentPage(this.filtered(), this.currentPage(), this.pageSize()));
  readonly summary = computed(() => {
    const transactions = this.allTransactions();
    return {
      total: transactions.length,
      validated: transactions.filter(transaction => transaction.status === 'Validé').length,
      pending: transactions.filter(transaction => transaction.status === 'En attente').length,
      failed: transactions.filter(transaction => transaction.status === 'Échoué').length,
    };
  });

  constructor() {
    this.repository.list().pipe(
      take(1),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: transactions => this.allTransactions.set(transactions),
      error: error => this.setError(error, 'Chargement des transactions impossible.'),
    });
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  setFilter(status: MonitoringStatusFilter): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  async importTransactions(file: File): Promise<void> {
    const records = await this.dataTransfer.readRecords(file);
    const imported = records
      .map((record, index) => this.mapImportedTransaction(record, index))
      .filter((transaction): transaction is MonitoringTransaction => transaction !== null);

    if (!imported.length) throw new Error('Aucune transaction exploitable n’a été trouvée dans le fichier.');

    const byId = new Map(this.allTransactions().map(transaction => [transaction.id, transaction]));
    imported.forEach(transaction => byId.set(transaction.id, transaction));
    const merged = Array.from(byId.values());
    await firstValueFrom(this.repository.saveAll(merged));
    this.allTransactions.set(merged);
    this.currentPage.set(1);
    this.feedback.set({ type: 'success', message: `${imported.length} transaction(s) importée(s) avec succès.` });
  }

  exportPdf(): void {
    this.dataTransfer.exportPdf('Transactions de monitoring', this.filtered(), this.exportColumns);
    this.feedback.set({ type: 'success', message: 'Vue PDF ouverte pour les transactions.' });
  }

  exportExcel(): void {
    this.dataTransfer.exportCsv('transactions-monitoring-jambaarpay', this.filtered(), this.exportColumns);
    this.feedback.set({ type: 'success', message: 'Export Excel préparé pour les transactions.' });
  }

  setError(error: unknown, fallback: string): void {
    this.feedback.set({ type: 'error', message: error instanceof Error ? error.message : fallback });
  }

  private mapImportedTransaction(record: ImportedRecord, index: number): MonitoringTransaction | null {
    const employee = this.dataTransfer.getValue(record, ['employee', 'salarie', 'salarié']);
    const company = this.dataTransfer.getValue(record, ['company', 'entreprise']);
    const restaurant = this.dataTransfer.getValue(record, ['restaurant']);

    if (!employee || !company || !restaurant) return null;

    return {
      id: this.dataTransfer.getValue(record, ['id', 'identifiant']) || `import-transaction-${Date.now()}-${index}`,
      employee,
      company,
      restaurant,
      amount: this.dataTransfer.getValue(record, ['amount', 'montant']) || '0',
      date: this.dataTransfer.getValue(record, ['date']) || new Date().toISOString().slice(0, 10),
      status: this.normalizeStatus(this.dataTransfer.getValue(record, ['status', 'statut'])),
    };
  }

  private normalizeStatus(value: string): MonitoringTransaction['status'] {
    const normalized = value.trim().toLowerCase();
    if (normalized.startsWith('ec') || normalized.startsWith('éc')) return 'Échoué';
    if (normalized.startsWith('en')) return 'En attente';
    return 'Validé';
  }
}
