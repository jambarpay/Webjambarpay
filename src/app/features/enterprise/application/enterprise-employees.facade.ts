import { Injectable, computed, signal, inject } from '@angular/core';
import { DataTransferService, ExportColumn, ImportedRecord } from '../../../core/services/data-transfer.service';
import { DatasetStorageService } from '../../../core/services/dataset-storage.service';
import { sliceCurrentPage } from '../../../core/utils/pagination';
import { EMPLOYEE_NAMES, createEnterpriseDemoTransactions } from '../domain/enterprise-demo-data';

export interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: string;
  status: 'Validé';
}

export interface BalanceChargeResult {
  employeeCount: number;
  totalAmount: number;
}

export type EmployeeStatusFilter = 'Tous' | 'Validé';
export type EmployeeFeedbackState = { type: 'success' | 'error'; message: string } | null;

const EMPLOYEES_STORAGE_KEY = 'jp_enterprise_employees_dataset';
const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10];
const STATUS_OPTIONS: EmployeeStatusFilter[] = ['Tous', 'Validé'];

@Injectable()
export class EnterpriseEmployeesFacade {
  private readonly dataTransfer = inject(DataTransferService);
  private readonly datasetStorage = inject(DatasetStorageService);

  private readonly allEmployees = signal<EmployeeRow[]>([]);
  private readonly exportColumns: ExportColumn<EmployeeRow>[] = [
    { header: 'ID', value: employee => employee.id },
    { header: 'Nom', value: employee => employee.name },
    { header: 'Email', value: employee => employee.email },
    { header: 'Telephone', value: employee => employee.phone },
    { header: 'Solde', value: employee => employee.balance },
    { header: 'Statut', value: employee => employee.status },
  ];

  readonly searchTerm = signal('');
  readonly statusFilter = signal<EmployeeStatusFilter>('Tous');
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  readonly currentPage = signal(1);
  readonly feedback = signal<EmployeeFeedbackState>(null);

  readonly statusOptions = STATUS_OPTIONS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly filteredEmployees = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.allEmployees().filter(employee => {
      const matchesSearch = !query || [
        employee.name,
        employee.email,
        employee.phone,
        employee.balance,
      ].some(value => value.toLowerCase().includes(query));
      const matchesStatus = status === 'Tous' || employee.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredEmployees().length / this.pageSize()))
  );

  readonly employees = computed(() => {
    return sliceCurrentPage(this.filteredEmployees(), this.currentPage(), this.pageSize());
  });
  readonly employeeOptions = computed(() => this.allEmployees());

  constructor() {
    const defaults = Array.from({ length: 144 }, (_, index) => ({
      id: `employee-${index + 1}`,
      name: index < EMPLOYEE_NAMES.length
        ? EMPLOYEE_NAMES[index]
        : `Salarié ${index + 1}`,
      email: `salarie${index + 1}@gmail.com`,
      phone: `77${String(7000000 + index).slice(-7)}`,
      balance: '2 000 Fcfa',
      status: 'Validé' as const,
    }));

    const storedEmployees = this.datasetStorage.readArray(EMPLOYEES_STORAGE_KEY, defaults);
    const migratedEmployees = storedEmployees.map((employee, index) => ({
      ...employee,
      name: /^#\d+$/.test(employee.name)
        ? (EMPLOYEE_NAMES[index] ?? `Salarié ${index + 1}`)
        : employee.name,
    }));
    this.persistEmployees(migratedEmployees);
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  setStatusFilter(status: EmployeeStatusFilter): void {
    this.statusFilter.set(status);
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

  async importEmployees(file: File): Promise<void> {
    const records = await this.dataTransfer.readRecords(file);
    const imported = records
      .map((record, index) => this.mapImportedEmployee(record, index))
      .filter((employee): employee is EmployeeRow => employee !== null);

    if (!imported.length) {
      throw new Error('Aucune ligne salarie exploitable n’a ete trouvee dans le fichier.');
    }

    const merged = this.mergeEmployees(this.allEmployees(), imported);
    this.persistEmployees(merged);
    this.setFeedback('success', `${imported.length} salarie(s) importe(s) avec succes.`);
  }

  async importBalances(file: File): Promise<void> {
    const records = await this.dataTransfer.readRecords(file);
    const updated = this.applyImportedBalances(records);
    this.persistEmployees(updated);
    this.setFeedback('success', 'Soldes mis a jour a partir du fichier importe.');
  }

  chargeBalances(employeeIds: string[], amount: number): BalanceChargeResult {
    const selectedIds = new Set(employeeIds);

    if (!selectedIds.size) {
      throw new Error('Selectionnez au moins un salarie.');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Le montant doit etre superieur a zero.');
    }

    let employeeCount = 0;
    const updated = this.allEmployees().map(employee => {
      if (!selectedIds.has(employee.id)) {
        return employee;
      }

      employeeCount += 1;
      const currentBalance = this.parseBalance(employee.balance);
      return { ...employee, balance: this.formatBalance(currentBalance + amount) };
    });

    if (!employeeCount) {
      throw new Error('Aucun salarie valide n’a ete selectionne.');
    }

    this.persistEmployees(updated);
    return { employeeCount, totalAmount: employeeCount * amount };
  }

  exportEmployees(): void {
    this.dataTransfer.exportCsv('salaries-entreprise-jambaarpay', this.filteredEmployees(), this.exportColumns);
    this.setFeedback('success', 'Export Excel prepare pour la liste des salaries.');
  }

  exportMonthlyReport(employee: EmployeeRow, referenceDate = new Date()): void {
    const month = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
    const transactions = createEnterpriseDemoTransactions(referenceDate)
      .filter(transaction => transaction.employee === employee.name && transaction.date.startsWith(month));
    const columns: ExportColumn<(typeof transactions)[number]>[] = [
      { header: 'Date', value: transaction => transaction.date },
      { header: 'Restaurant', value: transaction => transaction.restaurant },
      { header: 'Montant', value: transaction => `${this.formatBalance(transaction.amount)}` },
      { header: 'Statut', value: transaction => transaction.status },
    ];
    const period = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(referenceDate);

    this.dataTransfer.exportPdf(
      `Rapport mensuel — ${employee.name} — ${period}`,
      transactions,
      columns,
    );
    this.setFeedback('success', `Rapport mensuel de ${employee.name} préparé.`);
  }

  setErrorFeedback(error: unknown, fallbackMessage: string): void {
    this.setFeedback('error', error instanceof Error ? error.message : fallbackMessage);
  }

  setSuccessFeedback(message: string): void {
    this.setFeedback('success', message);
  }

  private mapImportedEmployee(record: ImportedRecord, index: number): EmployeeRow | null {
    const name = this.dataTransfer.getValue(record, ['name', 'nom', 'employee', 'salarie']);
    const email = this.dataTransfer.getValue(record, ['email', 'mail']);
    const phone = this.dataTransfer.getValue(record, ['phone', 'telephone']);

    if (!name && !email && !phone) {
      return null;
    }

    return {
      id: this.dataTransfer.getValue(record, ['id', 'identifiant']) || `import-employee-${Date.now()}-${index}`,
      name: name || email || phone,
      email: email || `inconnu${index + 1}@jambaarpay.local`,
      phone: phone || 'Non renseigne',
      balance: this.dataTransfer.getValue(record, ['balance', 'solde']) || '0 Fcfa',
      status: 'Validé',
    };
  }

  private mergeEmployees(current: EmployeeRow[], imported: EmployeeRow[]): EmployeeRow[] {
    const byId = new Map(current.map(employee => [employee.id, employee]));
    imported.forEach(employee => byId.set(employee.id, employee));
    return Array.from(byId.values());
  }

  private applyImportedBalances(records: ImportedRecord[]): EmployeeRow[] {
    const balances = new Map<string, string>();

    records.forEach(record => {
      const balance = this.dataTransfer.getValue(record, ['balance', 'solde', 'montant']);
      if (!balance) {
        return;
      }

      const aliases = [
        this.dataTransfer.getValue(record, ['id', 'identifiant']),
        this.dataTransfer.getValue(record, ['email', 'mail']),
        this.dataTransfer.getValue(record, ['phone', 'telephone']),
        this.dataTransfer.getValue(record, ['name', 'nom', 'employee', 'salarie']),
      ].filter(Boolean);

      aliases.forEach(alias => balances.set(alias.toLowerCase(), balance));
    });

    return this.allEmployees().map(employee => {
      const match = [
        employee.id,
        employee.email,
        employee.phone,
        employee.name,
      ].map(value => balances.get(value.toLowerCase())).find(Boolean);

      return match ? { ...employee, balance: match } : employee;
    });
  }

  private persistEmployees(employees: EmployeeRow[]): void {
    this.allEmployees.set(employees);
    this.datasetStorage.writeArray(EMPLOYEES_STORAGE_KEY, employees);
  }

  private parseBalance(value: string): number {
    const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
  }

  private formatBalance(value: number): string {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} Fcfa`;
  }

  private setFeedback(type: 'success' | 'error', message: string): void {
    this.feedback.set({ type, message });
  }
}
