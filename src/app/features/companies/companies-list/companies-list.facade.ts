import { computed, Injectable, signal, inject } from '@angular/core';
import { finalize, firstValueFrom, take } from 'rxjs';
import { DataTransferService, ExportColumn, ImportedRecord } from '../../../core/services/data-transfer.service';
import { sliceCurrentPage } from '../../../core/utils/pagination';
import { COMPANIES_REPOSITORY, CompaniesRepository } from '../application/companies.repository';
import { Company } from '../domain/company.model';

export type CompanyStatusFilter = 'Tous' | 'Actif' | 'Inactif';
export type CompanyDateFilter = 'Tous' | 'Ce mois' | 'Ce trimestre' | 'Cette année';
export type CompanyFeedbackState = { type: 'success' | 'error'; message: string } | null;

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10];
const STATUS_OPTIONS: CompanyStatusFilter[] = ['Tous', 'Actif', 'Inactif'];
const DATE_OPTIONS: CompanyDateFilter[] = ['Tous', 'Ce mois', 'Ce trimestre', 'Cette année'];

@Injectable()
export class CompaniesListFacade {
  private readonly dataTransfer = inject(DataTransferService);
  private readonly companiesRepository = inject<CompaniesRepository>(COMPANIES_REPOSITORY);

  private readonly allCompanies = signal<Company[]>([]);
  private readonly exportColumns: ExportColumn<Company>[] = [
    { header: 'ID', value: company => company.id },
    { header: 'Entreprise', value: company => company.name },
    { header: 'Salaries', value: company => company.employeeCount },
    { header: 'Solde total', value: company => company.totalBalance },
    { header: 'Date inscription', value: company => company.registrationDate },
    { header: 'Statut', value: company => company.status },
  ];

  readonly searchTerm = signal('');
  readonly statusFilter = signal<CompanyStatusFilter>('Tous');
  readonly dateFilter = signal<CompanyDateFilter>('Tous');
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly currentPage = signal(1);
  readonly feedback = signal<CompanyFeedbackState>(null);
  readonly loading = signal(true);

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;
  readonly dateOptions = DATE_OPTIONS;

  readonly filterLabel = computed(() => {
    const status = this.statusFilter();
    const date = this.dateFilter();

    if (status !== 'Tous') {
      return status;
    }

    if (date !== 'Tous') {
      return date;
    }

    return 'Tous';
  });

  readonly filteredCompanies = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const date = this.dateFilter();

    return this.allCompanies().filter(company => {
      if (query && !company.name.toLowerCase().includes(query)) {
        return false;
      }

      if (status !== 'Tous' && company.status !== status) {
        return false;
      }

      return this.isInDateRange(company.registrationDate, date);
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredCompanies().length / this.pageSize())));

  readonly companies = computed(() => {
    return sliceCurrentPage(this.filteredCompanies(), this.currentPage(), this.pageSize());
  });

  constructor() {
    this.companiesRepository.list().pipe(
      take(1),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: companies => this.allCompanies.set(companies),
      error: error => this.setErrorFeedback(error, 'Chargement des entreprises impossible.'),
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

  setPage(page: number | '...'): void {
    if (page === '...' || page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
  }

  setStatusFilter(status: CompanyStatusFilter): void {
    this.statusFilter.set(status);
    this.dateFilter.set('Tous');
    this.currentPage.set(1);
  }

  setDateFilter(date: CompanyDateFilter): void {
    this.dateFilter.set(date);
    this.statusFilter.set('Tous');
    this.currentPage.set(1);
  }

  async importCompanies(file: File): Promise<void> {
    const records = await this.dataTransfer.readRecords(file);
    const importedCompanies = records
      .map((record, index) => this.mapImportedCompany(record, index))
      .filter((company): company is Company => company !== null);

    if (!importedCompanies.length) {
      throw new Error('Aucune ligne entreprise exploitable n’a ete trouvee dans le fichier.');
    }

    const mergedCompanies = this.mergeById(this.allCompanies(), importedCompanies);
    await this.persistCompanies(mergedCompanies);
    this.currentPage.set(1);
    this.setFeedback('success', `${importedCompanies.length} entreprise(s) importee(s) avec succes.`);
  }

  exportExcel(): void {
    this.dataTransfer.exportCsv('entreprises-jambaarpay', this.filteredCompanies(), this.exportColumns);
    this.setFeedback('success', 'Export Excel prepare pour la liste des entreprises.');
  }

  exportPdf(): void {
    this.dataTransfer.exportPdf('Liste des entreprises', this.filteredCompanies(), this.exportColumns);
    this.setFeedback('success', 'Vue PDF ouverte pour la liste des entreprises.');
  }

  async updateCompany(company: Company): Promise<void> {
    const updatedCompany = await firstValueFrom(this.companiesRepository.update(company));
    this.replaceCompany(updatedCompany);
    this.setFeedback('success', 'Entreprise modifiée avec succès.');
  }

  async disableCompany(company: Company): Promise<void> {
    await firstValueFrom(this.companiesRepository.disable(company.id));
    this.replaceCompany({ ...company, status: 'Inactif' });
    this.setFeedback('success', 'Entreprise désactivée avec succès.');
  }

  setErrorFeedback(error: unknown, fallbackMessage: string): void {
    this.setFeedback('error', error instanceof Error ? error.message : fallbackMessage);
  }

  private isInDateRange(dateValue: string, range: CompanyDateFilter): boolean {
    if (range === 'Tous') {
      return true;
    }

    const date = new Date(dateValue);
    const now = new Date();

    if (range === 'Ce mois') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }

    if (range === 'Ce trimestre') {
      return date.getFullYear() === now.getFullYear()
        && Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3);
    }

    if (range === 'Cette année') {
      return date.getFullYear() === now.getFullYear();
    }

    return true;
  }

  private mapImportedCompany(record: ImportedRecord, index: number): Company | null {
    const name = this.dataTransfer.getValue(record, ['name', 'entreprise', 'societe', 'company']);

    if (!name) {
      return null;
    }

    const status = this.normalizeStatus(this.dataTransfer.getValue(record, ['status', 'statut']));
    const employeeCount = this.toNumber(this.dataTransfer.getValue(record, ['employeecount', 'salaries', 'employees', 'effectif']));
    const totalBalance = this.toNumber(this.dataTransfer.getValue(record, ['totalbalance', 'soldetotal', 'balance', 'solde']));
    const registrationDate = this.dataTransfer.getValue(record, ['registrationdate', 'dateinscription', 'date', 'createdat'])
      || new Date().toISOString().slice(0, 10);
    const id = this.dataTransfer.getValue(record, ['id', 'identifiant']) || `import-company-${Date.now()}-${index}`;

    return {
      id,
      name,
      employeeCount,
      totalBalance,
      registrationDate,
      status,
    };
  }

  private normalizeStatus(value: string): Company['status'] {
    return value.trim().toLowerCase().startsWith('in') ? 'Inactif' : 'Actif';
  }

  private toNumber(value: string): number {
    const normalized = value.replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private mergeById(currentCompanies: Company[], importedCompanies: Company[]): Company[] {
    const companiesById = new Map(currentCompanies.map(company => [company.id, company]));
    importedCompanies.forEach(company => companiesById.set(company.id, company));
    return Array.from(companiesById.values());
  }

  private async persistCompanies(companies: Company[]): Promise<void> {
    await firstValueFrom(this.companiesRepository.saveAll(companies));
    this.allCompanies.set(companies);
  }

  private replaceCompany(updatedCompany: Company): void {
    this.allCompanies.update(companies => companies.map(company =>
      company.id === updatedCompany.id ? { ...company, ...updatedCompany } : company,
    ));
  }

  private setFeedback(type: 'success' | 'error', message: string): void {
    this.feedback.set({ type, message });
  }
}
