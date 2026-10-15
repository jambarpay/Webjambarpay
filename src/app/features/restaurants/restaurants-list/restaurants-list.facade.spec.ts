import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { DataTransferService } from '../../../core/services/data-transfer.service';
import { RESTAURANTS_REPOSITORY, RestaurantsRepository } from '../application/restaurants.repository';
import { Restaurant } from '../domain/restaurant.model';
import { RestaurantsListFacade } from './restaurants-list.facade';

describe('RestaurantsListFacade deletion', () => {
  const restaurant: Restaurant = {
    id: 'restaurant-test', name: 'Restaurant Test', address: 'Dakar',
    totalTransactions: 10, totalVolume: 10000, registrationDate: '2026-10-15', status: 'Actif',
  };
  const other: Restaurant = { ...restaurant, id: 'restaurant-kept', name: 'Restaurant Conservé' };
  let repository: jasmine.SpyObj<RestaurantsRepository>;
  let facade: RestaurantsListFacade;

  beforeEach(() => {
    repository = jasmine.createSpyObj<RestaurantsRepository>('RestaurantsRepository', [
      'list', 'saveAll', 'upsert', 'activate', 'suspend', 'delete',
    ]);
    repository.list.and.returnValue(of([{ ...restaurant }, { ...other }]));
    TestBed.configureTestingModule({ providers: [
      RestaurantsListFacade,
      { provide: RESTAURANTS_REPOSITORY, useValue: repository },
      { provide: DataTransferService, useValue: {} },
    ] });
    facade = TestBed.inject(RestaurantsListFacade);
  });

  it('removes only the selected restaurant after the server acknowledges deletion', async () => {
    const response = new Subject<void>();
    repository.delete.and.returnValue(response);
    const deletion = facade.deleteRestaurant(restaurant);
    expect(facade.deletingRestaurantId()).toBe(restaurant.id);
    expect(facade.restaurants()).toEqual([restaurant, other]);

    response.next(undefined);
    await deletion;

    expect(repository.delete).toHaveBeenCalledOnceWith(restaurant.id);
    expect(facade.restaurants()).toEqual([other]);
    expect(facade.deletingRestaurantId()).toBeNull();
    expect(facade.feedback()?.message).toContain('Son historique est conservé.');
  });

  it('preserves the restaurant and unlocks the action when deletion fails', async () => {
    repository.delete.and.returnValue(throwError(() => new Error('Suppression refusée.')));
    await expectAsync(facade.deleteRestaurant(restaurant)).toBeRejectedWithError('Suppression refusée.');
    expect(facade.restaurants()).toEqual([restaurant, other]);
    expect(facade.deletingRestaurantId()).toBeNull();
    expect(facade.feedback()).toBeNull();
  });

  it('prevents duplicate or concurrent deletion requests', async () => {
    const response = new Subject<void>();
    repository.delete.and.returnValue(response);
    const deletion = facade.deleteRestaurant(restaurant);
    await facade.deleteRestaurant(restaurant);
    await facade.deleteRestaurant(other);
    expect(repository.delete).toHaveBeenCalledOnceWith(restaurant.id);
    response.next(undefined);
    await deletion;
    expect(facade.restaurants()).toEqual([other]);
  });

  it('returns to the previous page when the final row is removed', async () => {
    facade.setPageSize(1);
    facade.setPage(2);
    repository.delete.and.returnValue(of(undefined));
    await facade.deleteRestaurant(other);
    expect(facade.currentPage()).toBe(1);
    expect(facade.totalPages()).toBe(1);
    expect(facade.restaurants()).toEqual([restaurant]);
  });
});
