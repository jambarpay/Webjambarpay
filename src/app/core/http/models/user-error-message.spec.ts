import { ApiHttpError } from './api-http.error';
import { userErrorMessage } from './user-error-message';

describe('userErrorMessage', () => {
  const fallback = 'Une erreur est survenue.';

  it('uses a safe service message for infrastructure failures', () => {
    const error = new ApiHttpError('SQL password leaked', 503, 'HTTP_503', null, {});

    expect(userErrorMessage(error, fallback))
      .toBe('Le service rencontre une erreur temporaire. Réessayez dans quelques instants.');
  });

  it('keeps a validated business message', () => {
    const error = new ApiHttpError('Le numéro est déjà utilisé.', 409, 'PHONE_EXISTS', null, {});

    expect(userErrorMessage(error, fallback)).toBe('Le numéro est déjà utilisé.');
  });

  it('does not display unexpected exception details', () => {
    expect(userErrorMessage(new Error('Database host and password leaked'), fallback)).toBe(fallback);
    expect(userErrorMessage({ message: 'internal details' }, fallback)).toBe(fallback);
  });
});
