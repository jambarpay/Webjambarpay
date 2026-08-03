import { inject, Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { ApiEnvelope } from '../../../core/http/models/api-response';
import { CompaniesRepository } from '../application/companies.repository';
import { Company } from '../domain/company.model';

interface BackendCompanyUserDto {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'ENTREPRISE';
  status: 'PENDING_OTP' | 'ACTIVE' | 'BLOCKED' | 'DISABLED';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BackendCompaniesRepository implements CompaniesRepository {
  private readonly api = inject(BackendApiClient);

  list(): Observable<Company[]> {
    return this.api.get<ApiEnvelope<BackendCompanyUserDto[]>>('users/role/ENTREPRISE').pipe(
      map(response => response.data.map(company => ({
        id: company.id,
        name: [company.firstName, company.lastName].filter(Boolean).join(' '),
        employeeCount: 0,
        totalBalance: 0,
        registrationDate: company.createdAt?.slice(0, 10) ?? '',
        status: company.status === 'ACTIVE' ? 'Actif' : 'Inactif',
      }))),
    );
  }

  saveAll(companies: readonly Company[]): Observable<void> {
    void companies;
    return this.missingWriteContract();
  }

  upsert(company: Company): Observable<Company> {
    void company;
    return this.missingWriteContract();
  }

  private missingWriteContract<T>(): Observable<T> {
    return throwError(() => new Error(
      'Le user-service ne fournit pas encore de route publique de création ou modification d’entreprise.',
    ));
  }
}
