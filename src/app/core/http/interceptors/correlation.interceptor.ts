import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BACKEND_API_URL, isBackendRequest } from '../backend-api.config';

export const correlationInterceptor: HttpInterceptorFn = (request, next) => {
  const backendApiUrl = inject(BACKEND_API_URL);

  if (!isBackendRequest(request.url, backendApiUrl)) {
    return next(request);
  }

  return next(request.clone({
    setHeaders: {
      'X-Correlation-ID': createCorrelationId(),
      'X-Requested-With': 'XMLHttpRequest',
    },
  }));
};

function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
