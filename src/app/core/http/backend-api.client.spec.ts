import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_API_URL } from './backend-api.config';
import { BackendApiClient } from './backend-api.client';

describe('BackendApiClient', () => {
  let client: BackendApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKEND_API_URL, useValue: '/api/v1' },
      ],
    });
    client = TestBed.inject(BackendApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the gateway boundary and cookie credentials', () => {
    client.get<{ value: number }>('health').subscribe(response => expect(response.value).toBe(1));

    const request = http.expectOne('/api/v1/health');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({ value: 1 });
  });

  it('sends request headers used for idempotent financial operations', () => {
    client.post('payments/wallets/bulk-top-up', { amount: 1000 }, {
      headers: { 'Idempotency-Key': '1234567890abcdef' },
    }).subscribe();

    const request = http.expectOne('/api/v1/payments/wallets/bulk-top-up');
    expect(request.request.headers.get('Idempotency-Key')).toBe('1234567890abcdef');
    request.flush({ status: 'COMPLETED' });
  });

  it('rejects absolute URLs that could bypass the gateway', () => {
    expect(() => client.get('https://third-party.example/data')).toThrowError(
      'BackendApiClient only accepts relative endpoint paths.',
    );
  });
});
