import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthTokenStore } from '../../auth/data-access/auth-token.store';
import { BACKEND_API_URL } from '../backend-api.config';
import { authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let tokenStore: AuthTokenStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: BACKEND_API_URL, useValue: '/api/v1' },
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    tokenStore = TestBed.inject(AuthTokenStore);
    tokenStore.setAccessToken('jwt-token', new Date(Date.now() + 60_000).toISOString());
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('adds the bearer token only to backend requests', () => {
    httpClient.get('/api/v1/users').subscribe();
    expect(http.expectOne('/api/v1/users').request.headers.get('Authorization'))
      .toBe('Bearer jwt-token');

    httpClient.get('https://example.com/public').subscribe();
    expect(http.expectOne('https://example.com/public').request.headers.has('Authorization'))
      .toBeFalse();
  });

  it('does not attach a stale token to login', () => {
    httpClient.post('/api/v1/auth/login', {}).subscribe();

    expect(http.expectOne('/api/v1/auth/login').request.headers.has('Authorization'))
      .toBeFalse();
  });
});
