import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_API_URL } from '../../../core/http/backend-api.config';
import { BackendMonitoringRepository } from './backend-monitoring.repository';

describe('BackendMonitoringRepository', () => {
  it('maps payment statuses and XOF amounts', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BACKEND_API_URL, useValue: '/api/v1' }],
    });
    const repository = TestBed.inject(BackendMonitoringRepository);
    const http = TestBed.inject(HttpTestingController);

    repository.list().subscribe(transactions => {
      expect(transactions[0].status).toBe('Validé');
      expect(transactions[0].amount).toContain('XOF');
      expect(transactions[1].status).toBe('Échoué');
    });

    const request = http.expectOne(req => req.url === '/api/v1/payments/transactions');
    expect(request.request.params.get('pageSize')).toBe('100');
    request.flush({
      data: [
        { id: '1', payerUserId: 'u1', restaurantId: 'r1', amount: 2000, currency: 'XOF', status: 'COMPLETED', createdAt: '2026-08-03T12:00:00Z' },
        { id: '2', payerUserId: 'u2', restaurantId: 'r1', amount: 1500, currency: 'XOF', status: 'FAILED', createdAt: '2026-08-03T13:00:00Z' },
      ],
      meta: { page: 0, pageSize: 100, totalItems: 2, totalPages: 1 },
    });
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
