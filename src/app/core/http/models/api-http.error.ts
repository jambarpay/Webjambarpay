import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorPayload } from './api-response';

export class ApiHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly correlationId: string | null,
    readonly validationErrors: Readonly<Record<string, readonly string[]>>,
    readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export function mapApiHttpError(response: HttpErrorResponse): ApiHttpError {
  const payload = isApiErrorPayload(response.error) ? response.error : {};
  const correlationId = payload.correlationId
    ?? response.headers?.get('x-correlation-id')
    ?? null;

  return new ApiHttpError(
    payload.message ?? defaultMessage(response.status),
    response.status,
    payload.code ?? payload.errorCode ?? `HTTP_${response.status || 'NETWORK'}`,
    correlationId,
    payload.validationErrors ?? {},
    response,
  );
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return !!value && typeof value === 'object';
}

function defaultMessage(status: number): string {
  if (status === 0) return 'Le service est temporairement inaccessible.';
  if (status === 401) return 'Votre session a expiré.';
  if (status === 403) return 'Vous ne disposez pas des autorisations nécessaires.';
  if (status === 404) return 'La ressource demandée est introuvable.';
  if (status >= 500) return 'Le service rencontre une erreur temporaire.';
  return 'La requête n’a pas pu être traitée.';
}
