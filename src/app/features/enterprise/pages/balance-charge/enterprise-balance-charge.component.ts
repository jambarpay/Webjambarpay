import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { userErrorMessage } from '../../../../core/http/models/user-error-message';
import { AuthFacade } from '../../../../core/auth/application/auth.facade';
import { EmployeeTopUp, EmployeeTopUpRequest, EmployeeTopUpsClient } from '../../application/employee-top-ups.client';
import {
  EnterpriseEmployeesFacade,
} from '../../application/enterprise-employees.facade';

type ChargeScope = 'all' | 'selected';
interface PendingCheckout {
  request?: EmployeeTopUpRequest;
  id?: string;
  transactionId?: string;
}

@Component({
  selector: 'app-enterprise-balance-charge',
  imports: [FormsModule, RouterLink],
  providers: [EnterpriseEmployeesFacade],
  templateUrl: './enterprise-balance-charge.component.html',
  styleUrls: ['./enterprise-balance-charge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnterpriseBalanceChargeComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly topUps = inject(EmployeeTopUpsClient);
  private readonly auth = inject(AuthFacade);
  private readonly facade = inject(EnterpriseEmployeesFacade);

  readonly employees = computed(() => this.facade.employeeOptions()
    .filter(employee => employee.status === 'Validé' && !!employee.walletId));
  readonly ineligibleCount = computed(() => this.facade.employeeOptions().length - this.employees().length);
  readonly employeeSearchTerm = signal('');
  readonly filteredEmployees = computed(() => {
    const query = this.employeeSearchTerm().trim().toLowerCase();
    if (!query) return this.employees();

    return this.employees().filter(employee => [employee.name, employee.id, employee.phone, employee.email]
      .some(value => value.toLowerCase().includes(query)));
  });
  readonly step = signal<1 | 2 | 3>(1);
  readonly submitted = signal(false);
  readonly errorMessage = signal('');
  readonly processing = signal(false);
  readonly hasPendingCheckout = signal(false);
  readonly pendingTopUp = signal<EmployeeTopUp | null>(null);
  readonly pendingTransactionId = signal('');
  readonly legacyCheckout = computed(() => !!this.pendingTopUp()
    && this.pendingTopUp()!.paymentProvider !== 'PAYDUNYA');
  private recovery: PendingCheckout = {};

  scope: ChargeScope = 'all';
  selectedEmployeeIds: string[] = [];
  amount = '';
  reason = '';
  transactionReference = '';

  constructor() {
    this.facade.loadAllEmployees();
    void this.restoreCheckout();
  }

  get selectedEmployees() {
    const ids = new Set(this.selectedEmployeeIds);
    return this.scope === 'all'
      ? this.employees()
      : this.employees().filter(employee => ids.has(employee.id));
  }

  get amountValue(): number {
    return this.parseAmount(this.amount);
  }

  get totalAmount(): number {
    return this.selectedEmployees.length * this.amountValue;
  }

  toggleEmployee(employeeId: string, checked: boolean): void {
    this.selectedEmployeeIds = checked
      ? [...new Set([...this.selectedEmployeeIds, employeeId])]
      : this.selectedEmployeeIds.filter(id => id !== employeeId);
  }

  isSelected(employeeId: string): boolean {
    return this.selectedEmployeeIds.includes(employeeId);
  }

  continueToAmount(): void {
    this.submitted.set(true);
    if (!this.selectedEmployees.length) {
      return;
    }
    this.submitted.set(false);
    this.step.set(2);
  }

  continueToReview(): void {
    this.submitted.set(true);
    if (this.amountError) {
      return;
    }
    this.submitted.set(false);
    this.step.set(3);
  }

  previousStep(): void {
    this.errorMessage.set('');
    this.submitted.set(false);
    this.step.update(current => current === 3 ? 2 : 1);
  }

  async confirmCharge(): Promise<void> {
    if (this.processing()) return;
    this.processing.set(true);
    this.errorMessage.set('');
    try {
      const ids = this.selectedEmployees.map(employee => employee.id);
      if (!ids.length) throw new Error('Sélectionnez au moins un salarié.');
      if (this.amountError) throw new Error(this.amountError);
      const details = {
        employeeIds: ids.slice().sort(),
        amountPerEmployee: this.amountValue,
        reason: this.reason.trim(),
        callbackUrl: `${location.origin}/enterprise-employees/charge-balances`,
      };
      const previous = this.readPending().request;
      const request = previous && JSON.stringify({ ...previous, requestId: undefined }) === JSON.stringify(details)
        ? previous : { ...details, requestId: crypto.randomUUID() };
      this.recovery = { request };
      this.rememberPending();
      const topUp = await this.topUps.create(request);
      this.acceptPending(topUp);
      if (topUp.status === 'COMPLETED') await this.finish(topUp);
      else this.openPayment(topUp);
    } catch (error) {
      this.errorMessage.set(userErrorMessage(error, 'Le chargement des comptes a échoué.'));
    } finally {
      this.processing.set(false);
    }
  }

  get amountError(): string {
    if (!this.amount.trim()) return 'Le montant est requis.';
    if (this.amountValue <= 0) return 'Le montant doit être supérieur à zéro.';
    if (!Number.isSafeInteger(this.amountValue) || !Number.isSafeInteger(this.totalAmount)
      || this.totalAmount > 999_999_999_999_999) return 'Saisissez un montant entier valide en FCFA.';
    if (this.reason.length > 500) return 'Le motif est limité à 500 caractères.';
    return '';
  }

  formatAmount(value: number): string {
    return `${new Intl.NumberFormat('fr-FR').format(value)} Fcfa`;
  }

  private parseAmount(value: string): number {
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
  }

  async restoreCheckout(): Promise<void> {
    const query = this.route.snapshot.queryParamMap;
    this.recovery = this.readPending();
    const id = query.get('topUpId') || this.recovery.id;
    const cancelled = query.get('paymentCancelled') === 'true';
    const transactionId = cancelled ? undefined
      : query.get('token') || query.get('transactionId') || this.recovery.transactionId;
    if (cancelled) delete this.recovery.transactionId;
    if (!id && !this.recovery.request) {
      if (transactionId) {
        this.hasPendingCheckout.set(true);
        this.pendingTransactionId.set(transactionId);
        this.errorMessage.set('Ce lien de paiement ne contient pas de demande de chargement. Conservez sa référence et contactez l’assistance.');
      }
      return;
    }
    this.hasPendingCheckout.set(true);
    this.processing.set(true);
    this.errorMessage.set('');
    try {
      if (id) this.recovery.id = id;
      if (transactionId) this.recovery.transactionId = transactionId;
      this.pendingTransactionId.set(transactionId ?? '');
      this.rememberPending();
      const topUp = id ? await this.topUps.get(id) : await this.topUps.create(this.recovery.request!);
      this.acceptPending(topUp);
      if (topUp.status === 'COMPLETED') await this.finish(topUp);
      else if (this.legacyCheckout()) {
        this.errorMessage.set('Ce chargement utilise l’ancien fournisseur. Vérifiez son paiement avant de créer un nouveau chargement PayDunya.');
      } else if (transactionId) await this.finish(await this.topUps.complete(topUp.id, transactionId));
    } catch (error) {
      this.errorMessage.set(userErrorMessage(error, 'La vérification PayDunya a échoué.'));
    } finally {
      this.processing.set(false);
    }
  }

  async resumePayment(): Promise<void> {
    const topUp = this.pendingTopUp();
    if (!topUp || this.processing() || this.pendingTransactionId() || this.legacyCheckout()) return;
    this.processing.set(true);
    this.errorMessage.set('');
    try {
      const refreshed = await this.topUps.renew(topUp.id);
      this.acceptPending(refreshed);
      if (refreshed.status === 'COMPLETED') await this.finish(refreshed);
      else this.openPayment(refreshed);
    } catch (error) {
      this.errorMessage.set(userErrorMessage(error, 'Le paiement est indisponible.'));
    } finally {
      this.processing.set(false);
    }
  }

  async verifyReference(): Promise<void> {
    if (this.processing() || !this.pendingTopUp()) return;
    const transactionId = this.transactionReference.trim();
    if (!/^[A-Za-z0-9_-]{1,255}$/.test(transactionId)) {
      this.errorMessage.set('Saisissez la référence du paiement PayDunya.');
      return;
    }
    await this.router.navigate([], { relativeTo: this.route,
      queryParams: { topUpId: this.pendingTopUp()!.id, token: transactionId }, replaceUrl: true });
    await this.restoreCheckout();
  }

  newCharge(): void {
    if (this.processing() || this.pendingTransactionId()) return;
    this.clearPending();
    this.recovery = {};
    this.hasPendingCheckout.set(false);
    this.pendingTopUp.set(null);
    this.errorMessage.set('');
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  private acceptPending(topUp: EmployeeTopUp): void {
    this.pendingTopUp.set(topUp);
    this.hasPendingCheckout.set(true);
    this.recovery.id = topUp.id;
    this.rememberPending();
  }

  private openPayment(topUp: EmployeeTopUp): void {
    if (topUp.paymentProvider !== 'PAYDUNYA') throw new Error('Créez un nouveau chargement PayDunya après avoir vérifié l’ancien paiement.');
    if (!topUp.paymentUrl) throw new Error('Le lien de paiement PayDunya est indisponible.');
    location.assign(topUp.paymentUrl);
  }

  private async finish(topUp: EmployeeTopUp): Promise<void> {
    if (topUp.status !== 'COMPLETED') throw new Error('Le paiement doit encore être vérifié.');
    this.clearPending();
    await this.router.navigate(['/enterprise-employees'], { state: { balanceChargeSuccess:
      `${topUp.employeeIds.length} compte(s) chargé(s) pour un total de ${this.formatAmount(topUp.totalAmount)}.` } });
  }

  private get storageKey(): string {
    return `jp_employee_topup_${this.auth.getProfile()?.id ?? ''}`;
  }

  private readPending(): PendingCheckout {
    try {
      const pending = JSON.parse(sessionStorage.getItem(this.storageKey) ?? '{}') as PendingCheckout;
      return pending && typeof pending === 'object' ? pending : {};
    } catch { return {}; }
  }

  private rememberPending(): void {
    try { sessionStorage.setItem(this.storageKey, JSON.stringify(this.recovery)); } catch { /* The callback also carries the server request id. */ }
  }

  private clearPending(): void {
    try { sessionStorage.removeItem(this.storageKey); } catch { /* Server completion remains authoritative. */ }
  }
}
