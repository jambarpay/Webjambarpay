import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/application/auth.facade';
import { BACKEND_API_URL, isBackendRequest } from '../backend-api.config';
import { mapApiHttpError } from '../models/api-http.error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthFacade);
  const backendApiUrl = inject(BACKEND_API_URL);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const backendRequest = isBackendRequest(req.url, backendApiUrl);
      const authenticationRequest = req.url.includes('/auth/');

      if (err.status === 401 && backendRequest && !authenticationRequest) {
        auth.logout();
      }

      return throwError(() => backendRequest ? mapApiHttpError(err) : err);
    })
  );
};
