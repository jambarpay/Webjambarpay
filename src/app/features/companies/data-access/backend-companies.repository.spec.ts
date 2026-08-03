import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_API_URL } from '../../../core/http/backend-api.config';
import { BackendCompaniesRepository } from './backend-companies.repository';

describe('BackendCompaniesRepository', () => {
  it('maps enterprise users without inventing financial values', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BACKEND_API_URL, useValue: '/api/v1' }],
    });
    const repository = TestBed.inject(BackendCompaniesRepository);
    const http = TestBed.inject(HttpTestingController);

    repository.list().subscribe(companies => {
      expect(companies).toEqual([jasmine.objectContaining({
        id: 'enterprise-1',
        name: 'Jambaar Entreprise',
        employeeCount: 0,
        totalBalance: 0,
        status: 'Actif',
      })]);
    });

    http.expectOne('/api/v1/users/role/ENTREPRISE').flush({
      data: [{
        id: 'enterprise-1', firstName: 'Jambaar', lastName: 'Entreprise', phoneNumber: '771234567',
        role: 'ENTREPRISE', status: 'ACTIVE', createdAt: '2026-08-03T12:00:00Z',
      }],
    });
    http.verify();
  });

  it('fails explicitly when the backend write contract is absent', done => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BACKEND_API_URL, useValue: '/api/v1' }],
    });
    TestBed.inject(BackendCompaniesRepository).upsert({
      id: 'new', name: 'Entreprise', employeeCount: 0, totalBalance: 0, registrationDate: '', status: 'Actif',
    }).subscribe({
      error: error => {
        expect(error.message).toContain('ne fournit pas encore');
        done();
      },
    });
  });
});
