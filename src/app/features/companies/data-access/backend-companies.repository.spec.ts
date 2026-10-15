import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_API_URL } from '../../../core/http/backend-api.config';
import { BackendCompaniesRepository } from './backend-companies.repository';
import { AuthFacade } from '../../../core/auth/application/auth.facade';
import { errorInterceptor } from '../../../core/http/interceptors/error.interceptor';

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
        accountStatus: 'ACTIVE',
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

  it('reactivates an enterprise through the admin-only endpoint', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BACKEND_API_URL, useValue: '/api/v1' }],
    });
    const repository = TestBed.inject(BackendCompaniesRepository);
    const http = TestBed.inject(HttpTestingController);
    let completed = false;

    repository.activate('enterprise-1').subscribe(() => completed = true);

    const request = http.expectOne('/api/v1/users/admin/activate');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userId: 'enterprise-1', status: 'ACTIVE' });
    expect(completed).toBeFalse();
    request.flush({ success: true, data: null });
    expect(completed).toBeTrue();
    http.verify();
  });

  it('preserves the distinction between disabled, blocked and unverified accounts', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: BACKEND_API_URL, useValue: '/api/v1' }],
    });
    const repository = TestBed.inject(BackendCompaniesRepository);
    const http = TestBed.inject(HttpTestingController);
    repository.list().subscribe(companies => {
      expect(companies.map(company => company.accountStatus)).toEqual(['DISABLED', 'BLOCKED', 'PENDING_OTP', 'PENDING_PIN']);
      expect(companies.every(company => company.status === 'Inactif')).toBeTrue();
    });

    http.expectOne('/api/v1/users/role/ENTREPRISE').flush({ data:
      ['DISABLED', 'BLOCKED', 'PENDING_OTP', 'PENDING_PIN'].map((status, index) => ({
        id: `enterprise-${index}`, firstName: 'Entreprise', lastName: 'Test', phoneNumber: '770001122',
        role: 'ENTREPRISE', status, createdAt: '2026-10-14T12:00:00Z',
      })),
    });
    http.verify();
  });

  it('preserves a deletion conflict and its explanation for the admin interface', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: BACKEND_API_URL, useValue: '/api/v1' },
        { provide: AuthFacade, useValue: { logout: jasmine.createSpy('logout') } },
      ],
    });
    const repository = TestBed.inject(BackendCompaniesRepository);
    const http = TestBed.inject(HttpTestingController);
    const message = 'Cette entreprise possède encore des comptes rattachés. Sa suppression est impossible.';
    const failure = jasmine.createSpy('failure');
    repository.delete('enterprise-1').subscribe({ error: failure });

    const request = http.expectOne('/api/v1/users/admin/enterprise-1');
    expect(request.request.method).toBe('DELETE');
    request.flush({ success: false, message, errorCode: 'CONFLICT' }, { status: 409, statusText: 'Conflict' });
    expect(failure).toHaveBeenCalledOnceWith(jasmine.objectContaining({ status: 409, message, code: 'CONFLICT' }));
    http.verify();
  });
});
