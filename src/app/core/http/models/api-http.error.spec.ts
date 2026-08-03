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
});
