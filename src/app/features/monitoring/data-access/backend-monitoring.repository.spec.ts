import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_API_URL } from '../../../core/http/backend-api.config';
import { BackendMonitoringRepository } from './backend-monitoring.repository';

describe('BackendMonitoringRepository', () => {
  it('fails explicitly because the backend has no transaction-list contract', done => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BACKEND_API_URL, useValue: '/api/v1' }],
    });
    const repository = TestBed.inject(BackendMonitoringRepository);
    const http = TestBed.inject(HttpTestingController);

    repository.list().subscribe({
      error: error => {
        expect(error.message).toContain('liste des transactions');
        http.expectNone('/api/v1/payments/transactions');
        http.verify();
        done();
      },
    });
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
