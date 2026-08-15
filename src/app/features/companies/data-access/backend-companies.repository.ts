import { inject, Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { ApiEnvelope } from '../../../core/http/models/api-response';
import { CompaniesRepository, CompanyRegistration } from '../application/companies.repository';
import type { Company } from '../domain/company.model';

interface BackendCompanyUserDto {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'ENTREPRISE';
  status: 'PENDING_OTP' | 'ACTIVE' | 'BLOCKED' | 'DISABLED';
  address?: string;
  createdAt: string;
}

interface UpdateCompanyDto {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  address?: string;
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
        phoneNumber: company.phoneNumber,
        address: company.address,
        firstName: company.firstName,
        lastName: company.lastName,
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

  update(company: Company): Observable<Company> {
    const [firstName, ...lastNameParts] = company.name.trim().split(/\s+/);
    return this.api.put<ApiEnvelope<BackendCompanyUserDto>, UpdateCompanyDto>(
      `users/${encodeURIComponent(company.id)}`,
      {
        phoneNumber: normalizePhone(company.phoneNumber ?? ''),
        firstName: firstName || 'Entreprise',
        lastName: lastNameParts.join(' ') || 'Jambaar',
        address: company.address?.trim() || undefined,
      },
    ).pipe(map(response => this.toDomain(response.data)));
  }

  disable(id: string): Observable<void> {
    return this.api.post<ApiEnvelope<null>, { userId: string; status: string }>(
      'users/admin/disable',
      { userId: id, status: 'DISABLED' },
    ).pipe(map(() => undefined));
  }

  register(input: CompanyRegistration): Observable<Company> {
    const [firstName, ...lastNameParts] = input.managerName.trim().split(/\s+/);
    const phone = input.phone.replace(/\D/g, '').replace(/^221/, '');
    return this.api.post<ApiEnvelope<{ id: string }>, unknown>('auth/register/organization', {
      phoneNumber: phone,
      firstName,
      lastName: lastNameParts.join(' ') || firstName,
      email: input.email.trim(),
      password: input.password,
      role: 'ENTREPRISE',
      organizationName: input.name.trim(),
      sector: input.sector.trim(),
      registrationNumber: input.ninea.trim() || undefined,
      location: input.address.trim() || undefined,
    }).pipe(map(response => ({
      id: response.data.id,
      name: input.name.trim(),
      employeeCount: 0,
      totalBalance: 0,
      registrationDate: new Date().toISOString().slice(0, 10),
      status: 'Actif' as const,
    })));
  }

  private missingWriteContract<T>(): Observable<T> {
    return throwError(() => new Error(
      'Le user-service ne fournit pas encore de route publique de création ou modification d’entreprise.',
    ));
  }

  private toDomain(company: BackendCompanyUserDto): Company {
    return {
      id: company.id,
      name: [company.firstName, company.lastName].filter(Boolean).join(' '),
      employeeCount: 0,
      totalBalance: 0,
      registrationDate: company.createdAt?.slice(0, 10) ?? '',
      status: company.status === 'ACTIVE' ? 'Actif' : 'Inactif',
      phoneNumber: company.phoneNumber,
      address: company.address,
      firstName: company.firstName,
      lastName: company.lastName,
    };
  }
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('221') && digits.length === 12 ? digits.slice(3) : digits;
}
