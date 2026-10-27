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
  const correlationId = safeCorrelationId(payload.correlationId)
    ?? safeCorrelationId(response.headers?.get('x-correlation-id'))
    ?? null;
  const message = safeBusinessMessage(payload.message, response.status)
    ?? defaultMessage(response.status);

  return new ApiHttpError(
    message,
    response.status,
    safeErrorCode(payload.code) ?? safeErrorCode(payload.errorCode) ?? `HTTP_${response.status || 'NETWORK'}`,
    correlationId,
    safeValidationErrors(payload.validationErrors),
    response,
  );
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function safeBusinessMessage(value: unknown, status: number): string | null {
  if (![400, 404, 409, 410, 422, 429].includes(status) || typeof value !== 'string') return null;
  const message = value.trim();
  if (!message || message.length > 300) return null;
  if (/[<>\r\n]|https?:\/\/|exception|stacktrace|bearer\s|eyJ[a-zA-Z0-9_-]+\./i.test(message)) return null;
  return message;
}

function safeCorrelationId(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : null;
}

function safeErrorCode(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(value) ? value : null;
}

function safeValidationErrors(value: unknown): Readonly<Record<string, readonly string[]>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([field, messages]) => /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(field)
        && Array.isArray(messages)
        && messages.length <= 10
        && messages.every(message => typeof message === 'string' && message.length <= 300))
      .map(([field, messages]) => [field, [...messages as string[]]]),
  );
}

function defaultMessage(status: number): string {
  if (status === 0) return 'Le service est temporairement inaccessible.';
  if (status === 401) return 'Votre session a expiré.';
  if (status === 403) return 'Vous ne disposez pas des autorisations nécessaires.';
  if (status === 404) return 'La ressource demandée est introuvable.';
  if (status >= 500) return 'Le service rencontre une erreur temporaire.';
  return 'La requête n’a pas pu être traitée.';
}
