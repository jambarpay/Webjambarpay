import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { StorageService } from '../../services/storage.service';
import { AuthRepository } from '../application/auth.repository';
import { TEMPORARY_DEMO_ACCOUNTS } from '../demo/demo-accounts';
import { AuthSession, LoginCredentials } from '../domain/auth.models';
import { BackendAuthRepository } from './backend-auth.repository';

const DEMO_SESSION_KEY = 'jp_demo_session';

/**
 * Temporary UI-only access while the backend login contract is unavailable.
 * It must be removed as soon as cookie-based backend authentication is live.
 */
@Injectable({ providedIn: 'root' })
export class TemporaryDemoAuthRepository implements AuthRepository {
  private readonly backend = inject(BackendAuthRepository);
  private readonly storage = inject(StorageService);

  login(credentials: LoginCredentials): Observable<AuthSession | null> {
    const email = credentials.email.trim().toLowerCase();
    const account = TEMPORARY_DEMO_ACCOUNTS.find(candidate =>
      candidate.email === email && candidate.password === credentials.password,
    );

    if (account) {
      this.storage.set(DEMO_SESSION_KEY, account.profile.id);
      return of({ profile: account.profile });
    }

    this.storage.remove(DEMO_SESSION_KEY);
    return this.backend.login(credentials);
  }

  logout(): Observable<void> {
    this.storage.remove(DEMO_SESSION_KEY);
    return of(undefined);
  }
}
