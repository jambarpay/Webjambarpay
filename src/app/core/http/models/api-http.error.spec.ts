import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { mapApiHttpError } from './api-http.error';

describe('mapApiHttpError', () => {
  it('maps a structured API error without losing traceability', () => {
    const source = new HttpErrorResponse({
      status: 422,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Données invalides.',
        correlationId: 'corr-body',
        validationErrors: { email: ['Adresse invalide.'] },
      },
    });

    const error = mapApiHttpError(source);

    expect(error.name).toBe('ApiHttpError');
    expect(error.status).toBe(422);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toBe('Données invalides.');
    expect(error.correlationId).toBe('corr-body');
    expect(error.validationErrors['email']).toEqual(['Adresse invalide.']);
    expect(error.originalError).toBe(source);
  });

  it('uses the response header and a safe fallback for unstructured errors', () => {
    const source = new HttpErrorResponse({
      status: 503,
      error: 'Service unavailable',
      headers: new HttpHeaders({ 'x-correlation-id': 'corr-header' }),
    });

    const error = mapApiHttpError(source);

    expect(error.code).toBe('HTTP_503');
    expect(error.correlationId).toBe('corr-header');
    expect(error.message).toBe('Le service rencontre une erreur temporaire.');
  });

  it('does not expose server diagnostics, markup, or malformed metadata', () => {
    const error = mapApiHttpError(new HttpErrorResponse({
      status: 422,
      error: {
        code: '<script>',
        message: 'https://internal.example/secret?token=private',
        correlationId: 'Bearer private-token',
        validationErrors: ['not a field map'],
      },
    }));

    expect(error.code).toBe('HTTP_422');
    expect(error.message).toBe('La requête n’a pas pu être traitée.');
    expect(error.correlationId).toBeNull();
    expect(error.validationErrors).toEqual({});
  });

  it('uses fixed infrastructure messages while retaining a safe rate-limit reason', () => {
    const failure = (status: number, message: string) => mapApiHttpError(
      new HttpErrorResponse({ status, error: { message } }),
    );

    expect(failure(503, 'Database host and password leaked').message)
      .toBe('Le service rencontre une erreur temporaire.');
    expect(failure(429, 'Trop de tentatives. Réessayez dans deux minutes.').message)
      .toBe('Trop de tentatives. Réessayez dans deux minutes.');
  });
});
