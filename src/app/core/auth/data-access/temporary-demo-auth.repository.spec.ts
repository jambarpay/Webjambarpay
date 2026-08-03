import { TestBed } from '@angular/core/testing';
import { firstValueFrom, throwError } from 'rxjs';
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

  it('reports that backend login is unavailable for non-demo credentials', async () => {
    const credentials = { email: 'real@example.com', password: 'Password@1234' };
    backend.login.and.returnValue(throwError(() => new Error('connexion indisponible')));

    await expectAsync(firstValueFrom(repository.login(credentials)))
      .toBeRejectedWithError('connexion indisponible');

    expect(backend.login).toHaveBeenCalledOnceWith(credentials);
  });

  it('closes a demo session without calling the backend', async () => {
    const account = TEMPORARY_DEMO_ACCOUNTS[0];
    await firstValueFrom(repository.login({ email: account.email, password: account.password }));

    await firstValueFrom(repository.logout());

    expect(backend.logout).not.toHaveBeenCalled();
  });
});
