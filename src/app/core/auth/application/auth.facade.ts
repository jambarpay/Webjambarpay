import { computed, Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { StorageService } from '../../services/storage.service';
import { AdminProfile, AuthState, isUserRole, LoginForm, UserRole, USER_ROLES } from '../domain/auth.models';
import { AUTH_REPOSITORY, AuthRepository } from './auth.repository';

const USER_KEY  = 'jp_user';
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly repository = inject<AuthRepository>(AUTH_REPOSITORY);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  private readonly state = signal<AuthState>({
    userId: null,
    role: null,
    profile: null,
    isAuthenticated: false,
  });

  readonly isAuthenticated = computed(() => this.state().isAuthenticated);
  readonly profile = computed(() => this.state().profile);

  constructor() {
    this.restoreSession();
  }

  login(form: LoginForm): Observable<boolean> {
    return this.repository.login({ email: form.email, password: form.password }).pipe(
      map(session => {
        if (!session) return false;

        this.storage.set(USER_KEY, JSON.stringify(session.profile));
        this.setAuthenticatedState(session.profile);
        return true;
      }),
    );
  }

  getLandingRoute(): string {
    if (this.getRole() === USER_ROLES.enterprise) {
      return '/enterprise-dashboard';
    }

    if (this.getRole() === USER_ROLES.restaurant) {
      return '/restaurant-dashboard';
    }

    return '/dashboard';
  }

  getRedirectRoute(): string {
    return this.isAuthenticated() ? this.getLandingRoute() : '/login';
  }

  getRole(): UserRole | null {
    return this.state().role ?? this.getProfile()?.role ?? null;
  }

  hasRole(roles: UserRole | UserRole[]): boolean {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const currentRole = this.getRole();
    return currentRole !== null && allowedRoles.includes(currentRole);
  }

  logout(): void {
    const finishLogout = () => {
      this.clearSession();
      void this.router.navigate(['/login']);
    };
    this.repository.logout().subscribe({
      next: finishLogout,
      error: finishLogout,
    });
  }

  getProfile(): AdminProfile | null {
    return this.state().profile ?? this.readStoredProfile();
  }

  private restoreSession(): void {
    const profile = this.readStoredProfile();

    if (!profile) {
      this.clearSession();
      return;
    }

    this.setAuthenticatedState(profile);
  }

  private setAuthenticatedState(profile: AdminProfile): void {
    this.state.set({
      userId: profile.id,
      role: profile.role,
      profile,
      isAuthenticated: true,
    });
  }

  private clearSession(): void {
    this.storage.remove(USER_KEY);
    this.state.set({
      userId: null,
      role: null,
      profile: null,
      isAuthenticated: false,
    });
  }

  private readStoredProfile(): AdminProfile | null {
    const raw = this.storage.get(USER_KEY);

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return this.isAdminProfile(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private isAdminProfile(value: unknown): value is AdminProfile {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const profile = value as Partial<AdminProfile>;
    return typeof profile.id === 'string'
      && typeof profile.name === 'string'
      && typeof profile.email === 'string'
      && isUserRole(profile.role);
  }
}
