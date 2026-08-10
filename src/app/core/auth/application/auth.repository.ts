import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthSession, EmployeeLoginCredentials, LoginCredentials } from '../domain/auth.models';

export interface AuthRepository {
  login(credentials: LoginCredentials): Observable<AuthSession | null>;
  employeeLogin(credentials: EmployeeLoginCredentials): Observable<AuthSession | null>;
  logout(): Observable<void>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AUTH_REPOSITORY');
