import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, of, throwError } from 'rxjs';
import { BackendApiClient } from '../../http/backend-api.client';
import { ApiHttpError } from '../../http/models/api-http.error';
import { AuthRepository } from '../application/auth.repository';
import { AuthSession, LoginCredentials, UserRole, USER_ROLES } from '../domain/auth.models';
import { AuthTokenStore } from './auth-token.store';

interface BackendAuthEnvelope {
  success: boolean;
  data: BackendAuthentication;
}

interface BackendAuthentication {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const BACKEND_ROLE_MAP: Readonly<Record<string, UserRole>> = {
  ADMIN: USER_ROLES.admin,
  ENTREPRISE: USER_ROLES.enterprise,
  RESTAURANT: USER_ROLES.restaurant,
};

@Injectable({ providedIn: 'root' })
export class BackendAuthRepository implements AuthRepository {
  private readonly api = inject(BackendApiClient);
  private readonly tokenStore = inject(AuthTokenStore);

  login(credentials: LoginCredentials): Observable<AuthSession | null> {
    this.tokenStore.clear();

    return this.api.post<BackendAuthEnvelope, LoginCredentials>('auth/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }).pipe(
      map(response => this.toSession(response)),
      catchError(error => this.isUnauthorized(error) ? of(null) : throwError(() => error)),
    );
  }

  logout(): Observable<void> {
    if (!this.tokenStore.getAccessToken()) {
      this.tokenStore.clear();
      return of(undefined);
    }

    return this.api.post<unknown, Record<string, never>>('auth/logout', {}).pipe(
      map(() => undefined),
      finalize(() => this.tokenStore.clear()),
    );
  }

  private toSession(response: BackendAuthEnvelope): AuthSession {
    const authentication = response?.data;
    const backendProfile = authentication?.profile;
    const role = backendProfile ? BACKEND_ROLE_MAP[backendProfile.role] : undefined;

    if (!response?.success
      || !authentication?.accessToken
      || !authentication?.expiresAt
      || !backendProfile?.id
      || !backendProfile?.name
      || !backendProfile?.email
      || !role) {
      throw new Error('Le contrat de connexion du backend est invalide.');
    }

    this.tokenStore.setAccessToken(authentication.accessToken, authentication.expiresAt);
    return {
      profile: {
        id: backendProfile.id,
        name: backendProfile.name,
        email: backendProfile.email,
        role,
      },
    };
  }

  private isUnauthorized(error: unknown): boolean {
    return (error instanceof ApiHttpError || error instanceof HttpErrorResponse) && error.status === 401;
  }
}
