import { ChangeDetectionStrategy, Component, ElementRef, HostListener, signal, inject } from '@angular/core';

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
import { RestaurantsListFacade, RestaurantStatusFilter } from './restaurants-list.facade';
import { Restaurant, PartnerType, isPartnerType, partnerTypeLabel } from '../domain/restaurant.model';
import { PartnerTypePickerComponent } from '../partner-type-picker/partner-type-picker.component';
import { ConfirmationDialogService } from '../../../core/ui/confirmation-dialog.service';

@Component({
    selector: 'app-restaurants-list',
    imports: [FormsModule, RouterModule, TableModule, InputTextModule, MenuModule, DialogModule, EmptyStateComponent, FeedbackMessageComponent, LoadingStateComponent, PaginationComponent, StatusBadgeComponent, PartnerTypePickerComponent],
    providers: [RestaurantsListFacade],
    templateUrl: './restaurants-list.component.html',
    styleUrls: ['./restaurants-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantsListComponent {
  private readonly el = inject(ElementRef);
  private readonly facade = inject(RestaurantsListFacade);
  private readonly confirmation = inject(ConfirmationDialogService);

  readonly searchTerm = this.facade.searchTerm;
  readonly statusFilter = this.facade.statusFilter;
  readonly pageSize = this.facade.pageSize;
  readonly currentPage = this.facade.currentPage;
  readonly feedback = this.facade.feedback;
  readonly loading = this.facade.loading;
  readonly deletingRestaurantId = this.facade.deletingRestaurantId;
  readonly pageSizeOptions = this.facade.pageSizeOptions;
  readonly filterOptions = this.facade.filterOptions;
  readonly totalPages = this.facade.totalPages;
  readonly restaurants = this.facade.restaurants;

  readonly filterMenuOpen = signal(false);
  readonly exportMenuOpen = signal(false);
  readonly selectedRestaurant = signal<Restaurant | null>(null);
  readonly editingRestaurant = signal<Restaurant | null>(null);
  readonly saving = signal(false);
  readonly partnerTypeLabel = partnerTypeLabel;
  editForm = { name: '', phone: '', city: '', location: '', partnerType: 'RESTAURANT' as PartnerType };

  menuItemsFor(restaurant: Restaurant): MenuItem[] {
    const items: MenuItem[] = [
      { label: 'Voir détails', icon: 'pi pi-eye', command: () => this.viewDetails(restaurant) },
      { label: 'Modifier', icon: 'pi pi-pencil', command: () => this.startEdit(restaurant) },
      { label: 'Désactiver', icon: 'pi pi-ban', styleClass: 'danger-item', command: () => void this.disable(restaurant) },
    ];

    if (restaurant.status !== 'Actif') {
      items.splice(2, 0, {
        label: 'Activer',
        icon: 'pi pi-check-circle',
        command: () => void this.activate(restaurant),
      });
    }

    items.push({
      label: 'Supprimer',
      icon: 'pi pi-trash',
      styleClass: 'danger-item',
      disabled: this.deletingRestaurantId() !== null,
      command: () => void this.delete(restaurant),
    });

    return items;
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

  setFilter(status: RestaurantStatusFilter): void {
    this.facade.setFilter(status);
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
      await this.facade.importRestaurants(file);
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

  viewDetails(restaurant: Restaurant): void {
    this.selectedRestaurant.set(restaurant);
  }

  closeDetails(): void {
    this.selectedRestaurant.set(null);
  }

  startEdit(restaurant: Restaurant): void {
    this.editingRestaurant.set(restaurant);
    this.editForm = {
      partnerType: restaurant.partnerType ?? 'RESTAURANT',
      name: restaurant.name,
      phone: restaurant.phone ?? '',
      city: restaurant.city ?? '',
      location: restaurant.street || restaurant.district || restaurant.address,
    };
  }

  closeEdit(): void {
    if (!this.saving()) {
      this.editingRestaurant.set(null);
    }
  }

  async saveEdit(): Promise<void> {
    const restaurant = this.editingRestaurant();
    const phone = this.editForm.phone.replace(/\D/g, '').replace(/^221/, '');
    const name = this.editForm.name.trim();
    const city = this.editForm.city.trim();
    const location = this.editForm.location.trim();

    if (!restaurant || !isPartnerType(this.editForm.partnerType) || name.length < 2 || !/^\d{9}$/.test(phone) || city.length < 1 || location.length < 5) {
      this.facade.setErrorFeedback(new Error('Saisissez un nom, une localisation, une ville et un téléphone valides.'), 'Modification impossible.');
      return;
    }

    this.saving.set(true);
    try {
      await this.facade.updateRestaurant({
        ...restaurant,
        partnerType: this.editForm.partnerType,
        name,
        phone,
        address: [location, city, restaurant.country ?? 'Sénégal'].filter(Boolean).join(', '),
        city,
        district: location,
        street: location,
        source: 'backend',
      });
      this.editingRestaurant.set(null);
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Modification du restaurant impossible.');
    } finally {
      this.saving.set(false);
    }
  }

  async disable(restaurant: Restaurant): Promise<void> {
    if (!await this.confirmation.confirm({
      title: 'Désactiver le restaurant ?',
      message: `Désactiver le restaurant « ${restaurant.name} » ?`,
      details: 'Il restera visible dans la liste administrateur.',
      confirmLabel: 'Désactiver le restaurant',
      tone: 'warning',
    })) {
      return;
    }

    try {
      await this.facade.suspendRestaurant(restaurant);
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Désactivation du restaurant impossible.');
    }
  }

  async activate(restaurant: Restaurant): Promise<void> {
    try {
      await this.facade.activateRestaurant(restaurant);
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Activation du restaurant impossible.');
    }
  }

  async delete(restaurant: Restaurant): Promise<void> {
    if (this.deletingRestaurantId() !== null) return;
    if (!await this.confirmation.confirm({
      title: 'Supprimer le restaurant ?',
      message: `Supprimer le restaurant « ${restaurant.name} » ?`,
      details: 'Il sera retiré des listes et ne pourra plus recevoir de paiements. Son historique, ses points de vente et le compte propriétaire seront conservés.',
      confirmLabel: 'Supprimer le restaurant',
    })) {
      return;
    }

    try {
      await this.facade.deleteRestaurant(restaurant);
      if (this.selectedRestaurant()?.id === restaurant.id) this.selectedRestaurant.set(null);
      if (this.editingRestaurant()?.id === restaurant.id) this.editingRestaurant.set(null);
    } catch (error) {
      this.facade.setErrorFeedback(error, 'Suppression du restaurant impossible.');
    }
  }
}
