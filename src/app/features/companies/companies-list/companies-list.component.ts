import { ChangeDetectionStrategy, Component, ElementRef, HostListener, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { DialogModule } from 'primeng/dialog';
import { MenuItem } from 'primeng/api';
import { EmptyStateComponent } from '../../../design-system/components/empty-state/empty-state.component';
import { FeedbackMessageComponent } from '../../../design-system/components/feedback-message/feedback-message.component';
import { LoadingStateComponent } from '../../../design-system/components/loading-state/loading-state.component';
import { PaginationComponent } from '../../../design-system/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../design-system/components/status-badge/status-badge.component';
import {
  CompaniesListFacade,
  CompanyDateFilter,
  CompanyStatusFilter,
} from './companies-list.facade';
import { Company } from '../domain/company.model';

@Component({
    selector: 'app-companies-list',
    imports: [DecimalPipe, FormsModule, RouterModule, TableModule, InputTextModule, MenuModule, DialogModule, EmptyStateComponent, FeedbackMessageComponent, LoadingStateComponent, PaginationComponent, StatusBadgeComponent],
    providers: [CompaniesListFacade],
    templateUrl: './companies-list.component.html',
    styleUrls: ['./companies-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompaniesListComponent {
  private readonly el = inject(ElementRef);
  private readonly facade = inject(CompaniesListFacade);

  readonly searchTerm = this.facade.searchTerm;
  readonly statusFilter = this.facade.statusFilter;
  readonly dateFilter = this.facade.dateFilter;
  readonly pageSize = this.facade.pageSize;
  readonly currentPage = this.facade.currentPage;
  readonly feedback = this.facade.feedback;
  readonly loading = this.facade.loading;
  readonly filterLabel = this.facade.filterLabel;
  readonly pageSizeOptions = this.facade.pageSizeOptions;
  readonly statusOptions = this.facade.statusOptions;
  readonly dateOptions = this.facade.dateOptions;
  readonly totalPages = this.facade.totalPages;
  readonly companies = this.facade.companies;

  readonly filterMenuOpen = signal(false);
  readonly exportMenuOpen = signal(false);
  readonly selectedCompany = signal<Company | null>(null);
  readonly editingCompany = signal<Company | null>(null);
  readonly saving = signal(false);
  editForm = { name: '', phoneNumber: '', address: '' };

  menuItemsFor(company: Company): MenuItem[] {
    return [
      { label: 'Voir détails', icon: 'pi pi-eye', command: () => this.viewDetails(company) },
      { label: 'Modifier', icon: 'pi pi-pencil', command: () => this.startEdit(company) },
      { label: 'Supprimer', icon: 'pi pi-trash', styleClass: 'danger-item', command: () => void this.disable(company) },
    ];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
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

  setPage(page: number | '...'): void {
    this.facade.setPage(page);
  }

  setStatusFilter(status: CompanyStatusFilter): void {
    this.facade.setStatusFilter(status);
    this.filterMenuOpen.set(false);
  }

  setDateFilter(date: CompanyDateFilter): void {
    this.facade.setDateFilter(date);
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

    if (!file) {
      return;
    }

    try {
      await this.facade.importCompanies(file);
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Import impossible.');
    } finally {
      input.value = '';
    }
  }

  exportExcel(): void {
    this.facade.exportExcel();
    this.exportMenuOpen.set(false);
  }

  exportPdf(): void {
    try {
      this.facade.exportPdf();
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Export PDF impossible.');
    } finally {
      this.exportMenuOpen.set(false);
    }
  }

  viewDetails(company: Company): void {
    this.selectedCompany.set(company);
  }

  closeDetails(): void {
    this.selectedCompany.set(null);
  }

  startEdit(company: Company): void {
    this.editingCompany.set(company);
    this.editForm = {
      name: company.name,
      phoneNumber: company.phoneNumber ?? '',
      address: company.address ?? '',
    };
  }

  closeEdit(): void {
    if (!this.saving()) {
      this.editingCompany.set(null);
    }
  }

  async saveEdit(): Promise<void> {
    const company = this.editingCompany();
    const name = this.editForm.name.trim();
    const phoneNumber = this.editForm.phoneNumber.replace(/\D/g, '').replace(/^221/, '');

    if (!company || name.length < 2 || !/^\d{9}$/.test(phoneNumber)) {
      this.facade.setErrorFeedback(new Error('Saisissez un nom et un numéro sénégalais valide.'), 'Modification impossible.');
      return;
    }

    this.saving.set(true);
    try {
      await this.facade.updateCompany({
        ...company,
        name,
        phoneNumber,
        address: this.editForm.address.trim(),
      });
      this.editingCompany.set(null);
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Modification de l’entreprise impossible.');
    } finally {
      this.saving.set(false);
    }
  }

  async disable(company: Company): Promise<void> {
    if (!window.confirm(`Supprimer l’entreprise « ${company.name} » ? Elle sera désactivée.`)) {
      return;
    }

    try {
      await this.facade.disableCompany(company);
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Suppression de l’entreprise impossible.');
    }
  }
}
