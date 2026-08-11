import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BACKEND_API_URL } from '../../../core/http/backend-api.config';
import { BackendPlatformSettingsRepository } from './backend-platform-settings.repository';

describe('BackendPlatformSettingsRepository', () => {
  let repository: BackendPlatformSettingsRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BackendPlatformSettingsRepository,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKEND_API_URL, useValue: '/api/v1' },
      ],
    });
    repository = TestBed.inject(BackendPlatformSettingsRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads platform settings from user-service', async () => {
    const settings = firstValueFrom(repository.read());

    http.expectOne('/api/v1/platform-settings').flush({
      success: true,
      data: {
        platformName: 'Jambaar Pay',
        address: 'VDN, Dakar',
        supportPhone: '780001122',
        maxTransactionAmount: 100000,
        maxTransactionsPerDay: 10,
      },
    });

    expect((await settings).maxTransactionAmount).toBe('100000');
  });

  it('saves normalized numeric limits', async () => {
    const save = firstValueFrom(repository.save({
      platformName: ' Jambaar Pay ',
      address: ' VDN, Dakar ',
      supportPhone: '780001122',
      maxTransactionAmount: '250000',
      maxTransactionsPerDay: '25',
    }));

    const request = http.expectOne('/api/v1/platform-settings');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      platformName: 'Jambaar Pay',
      address: 'VDN, Dakar',
      supportPhone: '780001122',
      maxTransactionAmount: 250000,
      maxTransactionsPerDay: 25,
    });
    request.flush({ success: true, data: {} });

    await save;
  });
});
