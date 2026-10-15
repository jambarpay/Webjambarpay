import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { DataTransferService } from '../../../core/services/data-transfer.service';
import { COMPANIES_REPOSITORY, CompaniesRepository } from '../application/companies.repository';
import { Company } from '../domain/company.model';
import { CompaniesListFacade } from './companies-list.facade';

describe('CompaniesListFacade admin actions', () => {
  const company: Company = {
    id: 'enterprise-1', name: 'Entreprise Test', employeeCount: 1, totalBalance: 0,
    registrationDate: '2026-10-14', status: 'Inactif', accountStatus: 'DISABLED',
  };
  let repository: jasmine.SpyObj<CompaniesRepository>;
  let facade: CompaniesListFacade;

  beforeEach(() => {
    repository = jasmine.createSpyObj<CompaniesRepository>('CompaniesRepository', [
      'list', 'saveAll', 'upsert', 'update', 'delete', 'disable', 'activate', 'register',
    ]);
    repository.list.and.returnValue(of([{ ...company }]));
    TestBed.configureTestingModule({ providers: [
      CompaniesListFacade,
      { provide: COMPANIES_REPOSITORY, useValue: repository },
      { provide: DataTransferService, useValue: {} },
    ] });
    facade = TestBed.inject(CompaniesListFacade);
  });

  it('marks the enterprise active only after successful server acknowledgement', async () => {
    const result = new Subject<void>();
    repository.activate.and.returnValue(result);
    const activation = facade.activateCompany(company);
    expect(repository.activate).toHaveBeenCalledOnceWith(company.id);
    expect(facade.companies()[0].status).toBe('Inactif');

    result.next(undefined);
    await activation;

    expect(facade.companies()[0]).toEqual(jasmine.objectContaining({ status: 'Actif', accountStatus: 'ACTIVE' }));
    expect(facade.feedback()?.message).toBe('Entreprise réactivée avec succès.');
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('keeps the enterprise disabled when reactivation fails', async () => {
    repository.activate.and.returnValue(throwError(() => new Error('Action refusée.')));

    await expectAsync(facade.activateCompany(company)).toBeRejectedWithError('Action refusée.');

    expect(facade.companies()[0].accountStatus).toBe('DISABLED');
    expect(facade.feedback()).toBeNull();
  });

  it('keeps the enterprise in the list when deletion is refused', async () => {
    const message = 'Cette entreprise possède encore des comptes rattachés. Sa suppression est impossible.';
    repository.delete.and.returnValue(throwError(() => new Error(message)));

    await expectAsync(facade.deleteCompany(company)).toBeRejectedWithError(message);

    expect(facade.companies()).toEqual([company]);
    expect(facade.feedback()).toBeNull();
  });

  it('removes only the selected enterprise after successful deletion', async () => {
    repository.delete.and.returnValue(of(undefined));

    await facade.deleteCompany(company);

    expect(repository.delete).toHaveBeenCalledOnceWith(company.id);
    expect(facade.companies()).toEqual([]);
    expect(facade.currentPage()).toBe(1);
  });

  it('records a successful disable so that the reactivation action becomes available', async () => {
    repository.disable.and.returnValue(of(undefined));

    await facade.disableCompany({ ...company, status: 'Actif', accountStatus: 'ACTIVE' });

    expect(facade.companies()[0]).toEqual(jasmine.objectContaining({ status: 'Inactif', accountStatus: 'DISABLED' }));
  });
});
