import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_API_URL } from '../../../core/http/backend-api.config';
import { Restaurant } from '../domain/restaurant.model';
import { BackendRestaurantsRepository } from './backend-restaurants.repository';

describe('BackendRestaurantsRepository', () => {
  let repository: BackendRestaurantsRepository;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKEND_API_URL, useValue: 'http://localhost:8888/api/v1/' },
      ],
    });

    repository = TestBed.inject(BackendRestaurantsRepository);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('maps the backend restaurant DTO without inventing statistics', () => {
    let result: Restaurant[] = [];

    repository.list().subscribe(restaurants => result = restaurants);

    const request = httpTesting.expectOne('http://localhost:8888/api/v1/restaurants');
    expect(request.request.method).toBe('GET');
    request.flush([{
      id: 'restaurant-1',
      name: 'Le Djolof',
      registrationNumber: 'SN-DKR-001',
      ownerId: 'user-1',
      phoneNumber: '771234567',
      country: 'Sénégal',
      city: 'Dakar',
      district: 'Mermoz',
      street: 'VDN',
      status: 'PENDING',
      paymentEligibilityStatus: 'NOT_ELIGIBLE',
    }]);

    expect(result[0]).toEqual(jasmine.objectContaining({
      id: 'restaurant-1',
      phone: '771234567',
      address: 'VDN, Mermoz, Dakar, Sénégal',
      status: 'En attente',
      totalTransactions: 0,
      totalVolume: 0,
      source: 'backend',
    }));
  });

  it('creates the owner and restaurant through one backend contract', () => {
    const restaurant: Restaurant = {
      id: 'temporary-id',
      name: 'Le Djolof',
      address: 'VDN, Mermoz',
      phone: '+221 77 123 45 67',
      totalTransactions: 0,
      totalVolume: 0,
      registrationDate: '',
      status: 'En attente',
      registrationNumber: 'SN-DKR-001',
      ownerFirstName: 'Moussa',
      ownerLastName: 'Ndiaye',
      ownerPhoneNumber: '+221 77 987 65 43',
      ownerEmail: 'moussa@example.com',
      country: 'Sénégal',
      city: 'Dakar',
      district: 'Mermoz',
      street: 'VDN',
      source: 'new',
    };

    repository.upsert(restaurant).subscribe();

    const request = httpTesting.expectOne('http://localhost:8888/api/v1/restaurants');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Le Djolof',
      registrationNumber: 'SN-DKR-001',
      ownerFirstName: 'Moussa',
      ownerLastName: 'Ndiaye',
      ownerPhoneNumber: '779876543',
      ownerEmail: 'moussa@example.com',
      phoneNumber: '771234567',
      country: 'Sénégal',
      city: 'Dakar',
      district: 'Mermoz',
      street: 'VDN',
    });
    request.flush({
      id: 'restaurant-1',
      name: 'Le Djolof',
      registrationNumber: 'SN-DKR-001',
      ownerId: 'user-1',
      phoneNumber: '771234567',
      country: 'Sénégal',
      city: 'Dakar',
      district: 'Mermoz',
      street: 'VDN',
      status: 'PENDING',
      paymentEligibilityStatus: 'NOT_ELIGIBLE',
      ownerTemporaryPassword: 'temporary-password',
    });
  });

  it('reuses an existing owner id without creating another user', () => {
    const restaurant: Restaurant = {
      id: 'temporary-id',
      name: 'Le Djolof',
      address: 'VDN, Mermoz',
      phone: '771234567',
      totalTransactions: 0,
      totalVolume: 0,
      registrationDate: '',
      status: 'En attente',
      registrationNumber: 'SN-DKR-002',
      ownerId: 'existing-user',
      country: 'Sénégal',
      city: 'Dakar',
      district: 'Mermoz',
      street: 'VDN',
      source: 'new',
    };

    repository.upsert(restaurant).subscribe();

    const request = httpTesting.expectOne('http://localhost:8888/api/v1/restaurants');
    expect(request.request.body.ownerUserId).toBe('existing-user');
    expect(request.request.body.ownerFirstName).toBe('');
    expect(request.request.body.ownerLastName).toBe('');
    expect(request.request.body.ownerPhoneNumber).toBe('');
    request.flush({
      id: 'restaurant-2',
      name: 'Le Djolof',
      registrationNumber: 'SN-DKR-002',
      ownerId: 'existing-user',
      phoneNumber: '771234567',
      country: 'Sénégal',
      city: 'Dakar',
      district: 'Mermoz',
      street: 'VDN',
      status: 'PENDING',
      paymentEligibilityStatus: 'NOT_ELIGIBLE',
    });
  });
});
