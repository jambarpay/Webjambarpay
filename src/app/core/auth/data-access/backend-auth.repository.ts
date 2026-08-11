import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, of, throwError } from 'rxjs';
import { BackendApiClient } from '../../http/backend-api.client';
import { ApiHttpError } from '../../http/models/api-http.error';
import { AuthRepository } from '../application/auth.repository';
import { AuthSession, EmployeeLoginCredentials, LoginCredentials, UserRole, USER_ROLES } from '../domain/auth.models';
import { AuthTokenStore } from './auth-token.store';

interface BackendAuthEnvelope {
  success: boolean;
  data: BackendAuthentication;
}

interface BackendAuthentication {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    restaurantId?: string;
  };
}

const BACKEND_ROLE_MAP: Readonly<Record<string, UserRole>> = {
  ADMIN: USER_ROLES.admin,
  ENTREPRISE: USER_ROLES.enterprise,
  RESTAURANT: USER_ROLES.restaurant,
  CLIENT: USER_ROLES.client,
  VENDEUR: USER_ROLES.seller,
  EMPLOYE: USER_ROLES.employee,
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

  employeeLogin(credentials: EmployeeLoginCredentials): Observable<AuthSession | null> {
    this.tokenStore.clear();
    return this.api.post<BackendAuthEnvelope, EmployeeLoginCredentials>('auth/employee/login', {
      phoneNumber: credentials.phoneNumber.replace(/\D/g, '').replace(/^221/, ''),
      pin: credentials.pin,
    }).pipe(
      map(response => this.toSession(response)),
      catchError(error => this.isUnauthorized(error) ? of(null) : throwError(() => error)),
    );
  }

  logout(): Observable<void> {
    const accessToken = this.tokenStore.getAccessToken();
    if (!accessToken) {
      this.tokenStore.clear();
      return of(undefined);
    }

    return this.api.post<unknown, Record<string, never>>('auth/logout', {}, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).pipe(
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

    const expiresAt = this.toIsoExpiration(authentication.expiresAt);
    this.tokenStore.setAccessToken(authentication.accessToken, expiresAt);
    return {
      profile: {
        id: backendProfile.id,
        name: backendProfile.name,
        email: backendProfile.email,
        role,
        restaurantId: backendProfile.restaurantId,
      },
    };
  }

  private isUnauthorized(error: unknown): boolean {
    return (error instanceof ApiHttpError || error instanceof HttpErrorResponse) && error.status === 401;
  }

  private toIsoExpiration(expiresAtEpochSeconds: number): string {
    if (!Number.isFinite(expiresAtEpochSeconds) || expiresAtEpochSeconds <= 0) {
      throw new Error('La date d’expiration du jeton est invalide.');
    }

    return new Date(expiresAtEpochSeconds * 1_000).toISOString();
  }
}
