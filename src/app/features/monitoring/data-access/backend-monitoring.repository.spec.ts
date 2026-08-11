import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BACKEND_API_URL } from '../../../core/http/backend-api.config';
import { BackendMonitoringRepository } from './backend-monitoring.repository';

describe('BackendMonitoringRepository', () => {
  it('loads every backend transaction page and maps statuses', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BACKEND_API_URL, useValue: '/api/v1' }],
    });
    const repository = TestBed.inject(BackendMonitoringRepository);
    const http = TestBed.inject(HttpTestingController);

    const transactions = firstValueFrom(repository.list());
    const firstPage = http.expectOne(request => request.url === '/api/v1/payments/transactions'
      && request.params.get('page') === '0'
      && request.params.get('size') === '100');
    firstPage.flush({
      content: [{
        id: 'transaction-1',
        payerUserId: 'payer-1',
        restaurantId: 'restaurant-1',
        amount: 2500,
        currency: 'XOF',
        status: 'SUCCESS',
        createdAt: '2026-08-04T01:00:00Z',
      }],
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 2,
    });
    http.expectOne(request => request.params.get('page') === '1').flush({
      content: [{
        id: 'transaction-2',
        payerUserId: 'payer-2',
        restaurantId: 'restaurant-2',
        amount: 1500,
        currency: 'XOF',
        status: 'FAILED',
        createdAt: '2026-08-04T01:05:00Z',
      }],
      page: 1,
      size: 100,
      totalElements: 2,
      totalPages: 2,
    });

    const result = await transactions;
    expect(result.map(transaction => transaction.status)).toEqual(['Validé', 'Échoué']);
    expect(result[0].company).toBe('—');
    http.verify();
  });

  it('refuses transaction imports in the browser', done => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BACKEND_API_URL, useValue: '/api/v1' }],
    });
    TestBed.inject(BackendMonitoringRepository).saveAll([]).subscribe({
      error: error => {
        expect(error.message).toContain('interdit');
        done();
      },
    });
  });
});
