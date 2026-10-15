import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationDialogService } from '../../../core/ui/confirmation-dialog.service';
import { Restaurant } from '../domain/restaurant.model';
import { RestaurantsListComponent } from './restaurants-list.component';
import { RestaurantsListFacade } from './restaurants-list.facade';

describe('RestaurantsListComponent deletion confirmation', () => {
  const restaurant: Restaurant = {
    id: 'restaurant-test', name: 'Restaurant Test', address: 'Dakar',
    totalTransactions: 10, totalVolume: 10000, registrationDate: '2026-10-15', status: 'Actif',
  };
  let fixture: ComponentFixture<RestaurantsListComponent>;
  let confirmation: ConfirmationDialogService;
  let facade: ReturnType<typeof createFacade>;

  function createFacade() {
    return {
      searchTerm: signal(''), statusFilter: signal('Tous'), pageSize: signal(6),
      currentPage: signal(1), feedback: signal(null), loading: signal(false),
      pageSizeOptions: [6, 12, 18], filterOptions: ['Tous', 'Actif', 'Inactif', 'En attente'],
      totalPages: signal(1), restaurants: signal([restaurant]), deletingRestaurantId: signal<string | null>(null),
      deleteRestaurant: jasmine.createSpy('deleteRestaurant').and.resolveTo(undefined),
      setErrorFeedback: jasmine.createSpy('setErrorFeedback'),
    };
  }

  beforeEach(() => {
    facade = createFacade();
    TestBed.configureTestingModule({ imports: [RestaurantsListComponent], providers: [provideRouter([])] });
    TestBed.overrideComponent(RestaurantsListComponent, { set: {
      template: '', imports: [], providers: [{ provide: RestaurantsListFacade, useValue: facade }],
    } });
    confirmation = TestBed.inject(ConfirmationDialogService);
    fixture = TestBed.createComponent(RestaurantsListComponent);
  });

  it('adds the delete action to the existing restaurant menu', () => {
    const action = fixture.componentInstance.menuItemsFor(restaurant).find(item => item.label === 'Supprimer');
    expect(action?.icon).toBe('pi pi-trash');
    expect(action?.disabled).toBeFalse();
    facade.deletingRestaurantId.set(restaurant.id);
    expect(fixture.componentInstance.menuItemsFor(restaurant).find(item => item.label === 'Supprimer')?.disabled).toBeTrue();
  });

  it('does not delete before confirmation or after cancellation', async () => {
    const deletion = fixture.componentInstance.delete(restaurant);
    expect(confirmation.request()?.message).toContain(restaurant.name);
    expect(confirmation.request()?.details).toContain('historique');
    expect(facade.deleteRestaurant).not.toHaveBeenCalled();
    confirmation.respond(false);
    await deletion;
    expect(facade.deleteRestaurant).not.toHaveBeenCalled();
  });

  it('deletes once after confirmation and closes details for the removed restaurant', async () => {
    fixture.componentInstance.selectedRestaurant.set(restaurant);
    const deletion = fixture.componentInstance.delete(restaurant);
    confirmation.respond(true);
    confirmation.respond(true);
    await deletion;
    expect(facade.deleteRestaurant).toHaveBeenCalledOnceWith(restaurant);
    expect(fixture.componentInstance.selectedRestaurant()).toBeNull();
  });

  it('does not start another confirmation while deletion is pending', async () => {
    facade.deletingRestaurantId.set(restaurant.id);
    await fixture.componentInstance.delete(restaurant);
    expect(confirmation.request()).toBeNull();
    expect(facade.deleteRestaurant).not.toHaveBeenCalled();
  });

  it('surfaces an error without closing the restaurant details or reporting success', async () => {
    const error = new Error('Action refusée.');
    facade.deleteRestaurant.and.rejectWith(error);
    fixture.componentInstance.selectedRestaurant.set(restaurant);
    const deletion = fixture.componentInstance.delete(restaurant);
    confirmation.respond(true);
    await deletion;
    expect(facade.setErrorFeedback).toHaveBeenCalledOnceWith(error, 'Suppression du restaurant impossible.');
    expect(fixture.componentInstance.selectedRestaurant()).toEqual(restaurant);
  });
});
