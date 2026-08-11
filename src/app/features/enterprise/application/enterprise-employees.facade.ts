import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';
import { AuthFacade } from '../../../core/auth/application/auth.facade';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { ApiEnvelope } from '../../../core/http/models/api-response';
import { DataTransferService, ExportColumn, ImportedRecord } from '../../../core/services/data-transfer.service';
import { sliceCurrentPage } from '../../../core/utils/pagination';
import { MONITORING_REPOSITORY, MonitoringRepository } from '../../monitoring/application/monitoring.repository';

export interface EmployeeRow {
  id: string;
  walletId: string | null;
  name: string;
  email: string;
  phone: string;
  balance: string;
  status: 'Validé' | 'Inactif';
}

export interface BalanceChargeResult {
  employeeCount: number;
  totalAmount: number;
}

interface BackendUserDto {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  status: 'PENDING_OTP' | 'ACTIVE' | 'BLOCKED' | 'DISABLED';
}

interface BackendWalletDto {
  id: string;
  balance: number;
  currency: string;
  active: boolean;
}

interface BackendBulkTransferResponse {
  sourceWalletId: string;
  destinationWalletIds: string[];
  destinationCount: number;
  amountPerWallet: number;
  totalAmount: number;
  currency: string;
}

export type EmployeeStatusFilter = 'Tous' | EmployeeRow['status'];
export type EmployeeFeedbackState = { type: 'success' | 'error'; message: string } | null;

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10];
const STATUS_OPTIONS: EmployeeStatusFilter[] = ['Tous', 'Validé', 'Inactif'];

@Injectable()
export class EnterpriseEmployeesFacade {
  private readonly api = inject(BackendApiClient);
  private readonly auth = inject(AuthFacade);
  private readonly monitoringRepository = inject<MonitoringRepository>(MONITORING_REPOSITORY);
  private readonly dataTransfer = inject(DataTransferService);
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
  readonly loading = signal(true);
  readonly statusOptions = STATUS_OPTIONS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly filteredEmployees = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.allEmployees().filter(employee => {
      const matchesSearch = !query || [employee.name, employee.email, employee.phone, employee.balance]
        .some(value => value.toLowerCase().includes(query));
      return matchesSearch && (status === 'Tous' || employee.status === status);
    });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEmployees().length / this.pageSize())));
  readonly employees = computed(() => sliceCurrentPage(this.filteredEmployees(), this.currentPage(), this.pageSize()));
  readonly employeeOptions = computed(() => this.allEmployees());

  constructor() {
    this.loadEmployees();
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
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  async importEmployees(file: File): Promise<void> {
    const records = await this.dataTransfer.readRecords(file);
    const requests = records.map(record => this.toRegistrationRequest(record)).filter(isRegistrationRequest);
    if (!requests.length) throw new Error('Aucun salarié exploitable dans le fichier.');

    await firstValueFrom(forkJoin(requests.map(request =>
      this.api.post<ApiEnvelope<BackendUserDto>, RegistrationRequest>('users/register/employee', request),
    )));
    this.setFeedback('success', `${requests.length} salarié(s) transmis au user-service.`);
    this.loadEmployees();
  }

  async importBalances(): Promise<void> {
    throw new Error('L’import direct de soldes est désactivé. Utilisez le chargement sécurisé des comptes.');
  }

  async chargeBalances(employeeIds: string[], amount: number): Promise<BalanceChargeResult> {
    if (!employeeIds.length) throw new Error('Sélectionnez au moins un salarié.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Le montant doit être supérieur à zéro.');

    const sourceOwnerId = this.auth.getProfile()?.id;
    if (!sourceOwnerId) {
      throw new Error('La session entreprise est requise pour charger les comptes salariés.');
    }

    const response = await firstValueFrom(this.api.post<BackendBulkTransferResponse, {
      sourceOwnerId: string;
      sourceWalletType: 'COMPANY';
      destinationOwnerIds: string[];
      destinationWalletType: 'EMPLOYEE';
      amount: number;
      currency: 'XOF';
    }>('wallets/bulk-transfers', {
      sourceOwnerId,
      sourceWalletType: 'COMPANY',
      destinationOwnerIds: employeeIds,
      destinationWalletType: 'EMPLOYEE',
      amount,
      currency: 'XOF',
    }));

    return {
      employeeCount: response.destinationCount,
      totalAmount: response.totalAmount,
    };
  }

  exportEmployees(): void {
    this.dataTransfer.exportCsv('salaries-entreprise-jambaarpay', this.filteredEmployees(), this.exportColumns);
    this.setFeedback('success', 'Export préparé pour la liste des salariés.');
  }

  async exportMonthlyReport(employee: EmployeeRow, referenceDate = new Date()): Promise<void> {
    const month = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
    const transactions = await firstValueFrom(this.monitoringRepository.list());
    const employeeTransactions = transactions
      .filter(transaction => transaction.employee === employee.id && transaction.date.startsWith(month))
      .map(transaction => ({
        employee: transaction.employee,
        restaurant: transaction.restaurant,
        amount: transaction.amount,
        date: transaction.date,
        status: transaction.status,
      }));

    this.dataTransfer.exportCsv(
      `rapport-${employee.name.replace(/\s+/g, '-').toLowerCase()}-${month}`,
      employeeTransactions,
      [
        { header: 'Salarie', value: transaction => transaction.employee },
        { header: 'Restaurant', value: transaction => transaction.restaurant },
        { header: 'Montant', value: transaction => transaction.amount },
        { header: 'Date', value: transaction => transaction.date },
        { header: 'Statut', value: transaction => transaction.status },
      ],
    );
  }

  setErrorFeedback(error: unknown, fallbackMessage: string): void {
    this.setFeedback('error', error instanceof Error ? error.message : fallbackMessage);
  }

  setSuccessFeedback(message: string): void {
    this.setFeedback('success', message);
  }

  private loadEmployees(): void {
    this.loading.set(true);
    const companyId = this.auth.getProfile()?.id;
    if (!companyId) {
      this.handleLoadError(new Error('La session entreprise est requise pour charger les salariés.'));
      return;
    }
    this.api.get<ApiEnvelope<BackendUserDto[]>>(`users/company/${encodeURIComponent(companyId)}/employees`).pipe(
      map(response => response.data),
      map(users => users.map(user => this.loadEmployeeWallet(user))),
      map(requests => requests.length ? forkJoin(requests) : of([])),
    ).subscribe({
      next: employeesRequest => employeesRequest.subscribe({
        next: employees => {
          this.allEmployees.set(employees);
          this.loading.set(false);
        },
        error: error => this.handleLoadError(error),
      }),
      error: error => this.handleLoadError(error),
    });
  }

  private loadEmployeeWallet(user: BackendUserDto) {
    if (user.status !== 'ACTIVE') {
      return of(this.toEmployee(user, null));
    }
    return this.api.get<BackendWalletDto>(`wallets/owners/${encodeURIComponent(user.id)}`).pipe(
      map(wallet => this.toEmployee(user, wallet)),
      catchError(() => of(this.toEmployee(user, null))),
    );
  }

  private toEmployee(user: BackendUserDto, wallet: BackendWalletDto | null): EmployeeRow {
    return {
      id: user.id,
      walletId: wallet?.id ?? null,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      email: '—',
      phone: user.phoneNumber,
      balance: wallet ? `${new Intl.NumberFormat('fr-FR').format(wallet.balance)} ${wallet.currency}` : 'Indisponible',
      status: user.status === 'ACTIVE' && (wallet?.active ?? true) ? 'Validé' : 'Inactif',
    };
  }

  private toRegistrationRequest(record: ImportedRecord): RegistrationRequest | null {
    const name = this.dataTransfer.getValue(record, ['name', 'nom', 'employee', 'salarie']).trim();
    const phoneNumber = this.dataTransfer.getValue(record, ['phone', 'telephone']).replace(/\D/g, '').replace(/^221/, '');
    const [firstName, ...lastNameParts] = name.split(/\s+/);
    if (!firstName || !lastNameParts.length || !/^\d{9}$/.test(phoneNumber)) return null;
    return { phoneNumber, firstName, lastName: lastNameParts.join(' ') };
  }

  private handleLoadError(error: unknown): void {
    this.allEmployees.set([]);
    this.loading.set(false);
    this.setErrorFeedback(error, 'Le user-service est indisponible.');
  }

  private setFeedback(type: 'success' | 'error', message: string): void {
    this.feedback.set({ type, message });
  }
}

interface RegistrationRequest {
  phoneNumber: string;
  firstName: string;
  lastName: string;
}

function isRegistrationRequest(value: RegistrationRequest | null): value is RegistrationRequest {
  return value !== null;
}
