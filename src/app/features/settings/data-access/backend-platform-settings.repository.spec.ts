import { firstValueFrom } from 'rxjs';
import { BackendPlatformSettingsRepository } from './backend-platform-settings.repository';

describe('BackendPlatformSettingsRepository', () => {
  it('does not call an endpoint that is absent from the backend', async () => {
    const repository = new BackendPlatformSettingsRepository();

    await expectAsync(firstValueFrom(repository.read()))
      .toBeRejectedWithError(/Aucun microservice/);
  });
});
