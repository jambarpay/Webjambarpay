import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BACKEND_API_URL } from '../../http/backend-api.config';
import { USER_ROLES } from '../domain/auth.models';
import { AuthTokenStore } from './auth-token.store';
import { BackendAuthRepository } from './backend-auth.repository';

describe('BackendAuthRepository', () => {
  let repository: BackendAuthRepository;
  let http: HttpTestingController;
  let tokenStore: AuthTokenStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        BackendAuthRepository,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKEND_API_URL, useValue: '/api/v1' },
      ],
    });
    repository = TestBed.inject(BackendAuthRepository);
    http = TestBed.inject(HttpTestingController);
    tokenStore = TestBed.inject(AuthTokenStore);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('authenticates through user-service and maps its role', async () => {
    const login = firstValueFrom(repository.login({
      email: ' AdminJambar@JambaarPay.com ',
      password: 'secure-password',
    }));

    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.body).toEqual({
      email: 'adminjambar@jambaarpay.com',
      password: 'secure-password',
    });
    request.flush({
      success: true,
      data: {
        accessToken: 'jwt-token',
        tokenType: 'Bearer',
        expiresAt: (Date.now() + 60_000) / 1_000,
        profile: {
          id: 'user-id',
          name: 'Admin JambaarPay',
          email: 'adminjambar@jambaarpay.com',
          role: 'ADMIN',
        },
      },
    });

    expect((await login)?.profile.role).toBe(USER_ROLES.admin);
    expect(tokenStore.getAccessToken()).toBe('jwt-token');
  });

  it('returns a failed authentication for a 401 response', async () => {
    const login = firstValueFrom(repository.login({
      email: 'adminjambar@jambaarpay.com',
      password: 'wrong-password',
    }));

    http.expectOne('/api/v1/auth/login').flush(
      { success: false, message: 'Invalid email or password', errorCode: 'INVALID_CREDENTIALS' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(await login).toBeNull();
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  it('calls logout and clears the access token', async () => {
    tokenStore.setAccessToken('jwt-token', new Date(Date.now() + 60_000).toISOString());
    const logout = firstValueFrom(repository.logout());

    http.expectOne('/api/v1/auth/logout').flush({ success: true, data: null });
    await logout;

    expect(tokenStore.getAccessToken()).toBeNull();
  });
});
