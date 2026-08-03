import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BackendApiClient } from '../../http/backend-api.client';
import { ApiEnvelope } from '../../http/models/api-response';
import { AuthRepository } from '../application/auth.repository';
import { AdminProfile, AuthSession, LoginCredentials, USER_ROLES, UserRole } from '../domain/auth.models';

interface BackendAuthSessionDto {
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
    role: 'ADMIN' | 'ENTREPRISE' | 'RESTAURANT';
    avatarUrl?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class BackendAuthRepository implements AuthRepository {
  private readonly api = inject(BackendApiClient);

  login(credentials: LoginCredentials): Observable<AuthSession> {
    return this.api.post<ApiEnvelope<BackendAuthSessionDto>, LoginCredentials>('auth/login', credentials).pipe(
      map(response => ({ profile: this.toProfile(response.data) })),
    );
  }

  logout(): Observable<void> {
    return this.api.post<ApiEnvelope<null>, Record<string, never>>('auth/logout', {}).pipe(map(() => undefined));
  }

  private toProfile(dto: BackendAuthSessionDto): AdminProfile {
    return {
      id: dto.user.id,
      name: dto.user.name?.trim() || [dto.user.firstName, dto.user.lastName].filter(Boolean).join(' '),
      email: dto.user.email,
      role: this.toRole(dto.user.role),
      avatarUrl: dto.user.avatarUrl,
    };
  }

  private toRole(role: BackendAuthSessionDto['user']['role']): UserRole {
    if (role === 'ADMIN') return USER_ROLES.admin;
    if (role === 'ENTREPRISE') return USER_ROLES.enterprise;
    return USER_ROLES.restaurant;
  }
}
