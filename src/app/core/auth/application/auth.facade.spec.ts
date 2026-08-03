import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { StorageService } from '../../services/storage.service';
import { AuthRepository } from './auth.repository';
import { AuthFacade } from './auth.facade';
import { AUTH_REPOSITORY } from './auth.repository';
import { LoginCredentials, USER_ROLES } from '../domain/auth.models';

class FakeAuthRepository implements AuthRepository {
  login(credentials: LoginCredentials) {
    return of({
      profile: {
        id: 'admin-test',
        name: 'Admin Test',
        email: credentials.email,
        role: USER_ROLES.admin,
      },
    });
  }

  logout() {
    return of(undefined);
  }
}

describe('AuthFacade', () => {
  const router = {
    navigate: jasmine.createSpy('navigate'),
  };

  const setup = (): AuthFacade => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        FakeAuthRepository,
        StorageService,
        { provide: AUTH_REPOSITORY, useExisting: FakeAuthRepository },
        { provide: Router, useValue: router },
      ],
    });

    return TestBed.inject(AuthFacade);
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    router.navigate.calls.reset();
  });

  it('stores only the profile in sessionStorage after login', async () => {
    const service = setup();

    const authenticated = await firstValueFrom(service.login({
      email: 'adminjambar@jambaarpay.com',
      password: 'JambarPay2@26',
    }));

    expect(authenticated).toBeTrue();
    expect(sessionStorage.getItem('jp_user')).toContain('admin-test');
    expect(localStorage.length).toBe(0);
  });

  it('ignores corrupted persisted profiles without crashing', () => {
    sessionStorage.setItem('jp_user', '{bad json');

    const service = setup();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getProfile()).toBeNull();
    expect(sessionStorage.getItem('jp_user')).toBeNull();
  });
});
