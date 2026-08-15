import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Company } from '../domain/company.model';

export interface CompaniesRepository {
  list(): Observable<Company[]>;
  saveAll(companies: readonly Company[]): Observable<void>;
  upsert(company: Company): Observable<Company>;
  update(company: Company): Observable<Company>;
  disable(id: string): Observable<void>;
  register(input: CompanyRegistration): Observable<Company>;
}

export interface CompanyRegistration {
  name: string;
  sector: string;
  managerName: string;
  email: string;
  phone: string;
  employeeCount: string;
  ninea: string;
  location: string;
  city: string;
}

export const COMPANIES_REPOSITORY = new InjectionToken<CompaniesRepository>('COMPANIES_REPOSITORY');
