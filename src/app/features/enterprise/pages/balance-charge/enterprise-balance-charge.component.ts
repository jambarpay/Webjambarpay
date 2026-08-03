import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  EnterpriseEmployeesFacade,
} from '../../application/enterprise-employees.facade';

type ChargeScope = 'all' | 'selected';

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
  private readonly facade = inject(EnterpriseEmployeesFacade);

  readonly employees = this.facade.employeeOptions;
  readonly step = signal<1 | 2 | 3>(1);
  readonly submitted = signal(false);
  readonly errorMessage = signal('');

  scope: ChargeScope = 'all';
  selectedEmployeeIds: string[] = [];
  amount = '';
  reason = '';

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
    if (this.scope === 'selected' && !this.selectedEmployeeIds.length) {
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
    try {
      const ids = this.selectedEmployees.map(employee => employee.id);
      const result = await this.facade.chargeBalances(ids, this.amountValue);
      await this.router.navigate(['/enterprise-employees'], {
        state: {
          balanceChargeSuccess:
            `${result.employeeCount} compte(s) chargé(s) pour un total de ${this.formatAmount(result.totalAmount)}.`,
        },
      });
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Le chargement des comptes a échoué.');
    }
  }

  get amountError(): string {
    if (!this.amount.trim()) return 'Le montant est requis.';
    if (this.amountValue <= 0) return 'Le montant doit être supérieur à zéro.';
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
}
