import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationDialogService } from '../../../core/ui/confirmation-dialog.service';
import { Company, CompanyAccountStatus } from '../domain/company.model';
import { CompaniesListComponent } from './companies-list.component';
import { CompaniesListFacade } from './companies-list.facade';

describe('CompaniesListComponent admin actions', () => {
  const company: Company = {
    id: 'enterprise-1', name: 'Entreprise Test', employeeCount: 1, totalBalance: 0,
    registrationDate: '2026-10-14', status: 'Inactif', accountStatus: 'DISABLED',
  };
  let fixture: ComponentFixture<CompaniesListComponent>;
  let confirmation: ConfirmationDialogService;
  let facade: ReturnType<typeof createFacade>;

  function createFacade() {
    return {
      searchTerm: signal(''), statusFilter: signal('Tous'), dateFilter: signal('Tous'), pageSize: signal(5),
      currentPage: signal(1), feedback: signal(null), loading: signal(false), filterLabel: signal('Tous'),
      pageSizeOptions: [5, 10], statusOptions: ['Tous', 'Actif', 'Inactif'], dateOptions: ['Tous'],
      totalPages: signal(1), companies: signal([company]),
      activateCompany: jasmine.createSpy('activateCompany').and.resolveTo(undefined),
      deleteCompany: jasmine.createSpy('deleteCompany').and.resolveTo(undefined),
      setErrorFeedback: jasmine.createSpy('setErrorFeedback'),
    };
  }

  beforeEach(() => {
    facade = createFacade();
    TestBed.configureTestingModule({ imports: [CompaniesListComponent], providers: [provideRouter([])] });
    TestBed.overrideComponent(CompaniesListComponent, { set: {
      template: '', imports: [], providers: [{ provide: CompaniesListFacade, useValue: facade }],
    } });
    confirmation = TestBed.inject(ConfirmationDialogService);
    fixture = TestBed.createComponent(CompaniesListComponent);
  });

  it('offers reactivation only for disabled enterprises', () => {
    expect(fixture.componentInstance.menuItemsFor(company).some(item => item.label === 'Réactiver')).toBeTrue();
    const unavailable: CompanyAccountStatus[] = ['ACTIVE', 'BLOCKED', 'PENDING_OTP', 'PENDING_PIN'];
    for (const accountStatus of unavailable) {
      const target: Company = { ...company, accountStatus, status: accountStatus === 'ACTIVE' ? 'Actif' : 'Inactif' };
      expect(fixture.componentInstance.menuItemsFor(target).some(item => item.label === 'Réactiver')).toBeFalse();
    }
    expect(fixture.componentInstance.menuItemsFor({ ...company, accountStatus: undefined })
      .some(item => item.label === 'Réactiver')).toBeFalse();
  });

  it('does not reactivate before confirmation or after cancellation', async () => {
    const activation = fixture.componentInstance.activate(company);
    expect(confirmation.request()?.message).toContain(company.name);
    expect(facade.activateCompany).not.toHaveBeenCalled();

    confirmation.respond(false);
    await activation;
    expect(facade.activateCompany).not.toHaveBeenCalled();
  });

  it('reactivates the selected enterprise once after confirmation', async () => {
    const activation = fixture.componentInstance.activate(company);
    confirmation.respond(true);
    confirmation.respond(true);
    await activation;

    expect(facade.activateCompany).toHaveBeenCalledOnceWith(company);
    expect(facade.deleteCompany).not.toHaveBeenCalled();
  });

  it('shows a reactivation failure instead of reporting success', async () => {
    const error = new Error('Action refusée.');
    facade.activateCompany.and.rejectWith(error);
    const activation = fixture.componentInstance.activate(company);
    confirmation.respond(true);
    await activation;

    expect(facade.setErrorFeedback).toHaveBeenCalledOnceWith(error, 'Réactivation de l’entreprise impossible.');
  });

  it('never deletes after cancellation', async () => {
    const deletion = fixture.componentInstance.delete(company);
    expect(facade.deleteCompany).not.toHaveBeenCalled();
    confirmation.respond(false);
    await deletion;
    expect(facade.deleteCompany).not.toHaveBeenCalled();
  });

  it('surfaces a refused deletion without retrying or cascading to linked accounts', async () => {
    const error = new Error('Cette entreprise possède encore des comptes rattachés.');
    facade.deleteCompany.and.rejectWith(error);
    const deletion = fixture.componentInstance.delete(company);
    confirmation.respond(true);
    await deletion;

    expect(facade.deleteCompany).toHaveBeenCalledOnceWith(company);
    expect(facade.setErrorFeedback).toHaveBeenCalledOnceWith(error, 'Suppression définitive de l’entreprise impossible.');
    expect(facade.activateCompany).not.toHaveBeenCalled();
  });
});
