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
      partnerType: 'RESTAURANT',
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
      partnerType: 'RESTAURANT',
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

  it('deletes only the selected restaurant through the gateway and accepts a 204 response', () => {
    let completed = false;
    repository.delete('restaurant-1').subscribe(() => completed = true);
    const request = httpTesting.expectOne('http://localhost:8888/api/v1/restaurants/restaurant-1');
    expect(request.request.method).toBe('DELETE');
    expect(completed).toBeFalse();
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBeTrue();
    httpTesting.expectNone(request => request.url.includes('/users/') || request.url.includes('/wallets/'));
  });

  it('reads the real category returned by the backend', () => {
    let result: Restaurant[] = [];
    repository.list().subscribe(restaurants => result = restaurants);
    httpTesting.expectOne('http://localhost:8888/api/v1/restaurants').flush([
      { id: 'shop-1', name: 'Boutique', partnerType: 'SHOP', status: 'SUSPENDED' },
      { id: 'market-1', name: 'Marché', partnerType: 'MARKET', status: 'ACTIVE' },
    ]);
    expect(result.map(partner => partner.partnerType)).toEqual(['SHOP', 'MARKET']);
    expect(result[0].status).toBe('Inactif');
  });

  it('sends a changed category with an update without changing owner or payment rules', () => {
    const restaurant: Restaurant = {
      id: 'partner-1', name: 'Boutique', address: 'Dakar', phone: '770001122',
      totalTransactions: 0, totalVolume: 0, registrationDate: '', status: 'Inactif',
      ownerId: 'owner-kept', partnerType: 'SHOP', source: 'backend',
    };
    repository.upsert(restaurant).subscribe();
    const request = httpTesting.expectOne('http://localhost:8888/api/v1/restaurants/partner-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.partnerType).toBe('SHOP');
    expect(request.request.body.ownerId).toBeUndefined();
    expect(request.request.body.status).toBeUndefined();
    expect(request.request.body.paymentEligibilityStatus).toBeUndefined();
    request.flush({ id: 'partner-1', name: 'Boutique', partnerType: 'SHOP', status: 'SUSPENDED' });
  });

  it('omits an absent type on old updates so it cannot reset an existing category', () => {
    repository.upsert({
      id: 'partner-1', name: 'Ancien client', address: 'Dakar',
      totalTransactions: 0, totalVolume: 0, registrationDate: '', status: 'Actif', source: 'backend',
    }).subscribe();
    const request = httpTesting.expectOne('http://localhost:8888/api/v1/restaurants/partner-1');
    expect(request.request.body.partnerType).toBeUndefined();
    request.flush({ id: 'partner-1', name: 'Ancien client', partnerType: 'MARKET', status: 'ACTIVE' });
  });
});
