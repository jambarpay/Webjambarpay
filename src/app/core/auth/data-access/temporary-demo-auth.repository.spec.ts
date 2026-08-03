import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { TEMPORARY_DEMO_ACCOUNTS } from '../demo/demo-accounts';
import { BackendAuthRepository } from './backend-auth.repository';
import { TemporaryDemoAuthRepository } from './temporary-demo-auth.repository';

describe('TemporaryDemoAuthRepository', () => {
  let repository: TemporaryDemoAuthRepository;
  let backend: jasmine.SpyObj<BackendAuthRepository>;

  beforeEach(() => {
    sessionStorage.clear();
    backend = jasmine.createSpyObj<BackendAuthRepository>('BackendAuthRepository', ['login', 'logout']);

    TestBed.configureTestingModule({
      providers: [
        TemporaryDemoAuthRepository,
        { provide: BackendAuthRepository, useValue: backend },
      ],
    });

    repository = TestBed.inject(TemporaryDemoAuthRepository);
  });

  afterEach(() => sessionStorage.clear());

  for (const account of TEMPORARY_DEMO_ACCOUNTS) {
    it(`opens the ${account.label} demo session without calling the backend`, async () => {
      const session = await firstValueFrom(repository.login({
        email: account.email,
        password: account.password,
      }));

      expect(session?.profile).toEqual(account.profile);
      expect(backend.login).not.toHaveBeenCalled();
    });
  }

  it('delegates non-demo credentials to the backend', async () => {
    const credentials = { email: 'real@example.com', password: 'Password@1234' };
    const backendSession = { profile: TEMPORARY_DEMO_ACCOUNTS[0].profile };
    backend.login.and.returnValue(of(backendSession));

    const session = await firstValueFrom(repository.login(credentials));

    expect(backend.login).toHaveBeenCalledOnceWith(credentials);
    expect(session).toEqual(backendSession);
  });

  it('closes a demo session without calling the backend', async () => {
    const account = TEMPORARY_DEMO_ACCOUNTS[0];
    await firstValueFrom(repository.login({ email: account.email, password: account.password }));

    await firstValueFrom(repository.logout());

    expect(backend.logout).not.toHaveBeenCalled();
  });
});

