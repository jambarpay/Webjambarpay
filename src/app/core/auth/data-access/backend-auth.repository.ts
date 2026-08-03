import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { AuthRepository } from '../application/auth.repository';
import { AuthSession, LoginCredentials } from '../domain/auth.models';

@Injectable({ providedIn: 'root' })
export class BackendAuthRepository implements AuthRepository {
  login(credentials: LoginCredentials): Observable<AuthSession> {
    void credentials;
    return throwError(() => new Error(
      'Le user-service ne fournit pas encore de route de connexion. Utilisez temporairement un compte de démonstration.',
    ));
  }

  logout(): Observable<void> {
    return throwError(() => new Error(
      'Le user-service ne fournit pas encore de route de déconnexion.',
    ));
  }
}
