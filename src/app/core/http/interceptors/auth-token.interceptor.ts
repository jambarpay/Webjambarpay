import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthTokenStore } from '../../auth/data-access/auth-token.store';
import { BACKEND_API_URL, isBackendRequest } from '../backend-api.config';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const backendApiUrl = inject(BACKEND_API_URL);
  const tokenStore = inject(AuthTokenStore);

  if (!isBackendRequest(request.url, backendApiUrl)
    || request.url.includes('/auth/login')
    || request.headers.has('Authorization')) {
    return next(request);
  }

  const accessToken = tokenStore.getAccessToken();
  if (!accessToken) return next(request);

  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${accessToken}` },
  }));
};
