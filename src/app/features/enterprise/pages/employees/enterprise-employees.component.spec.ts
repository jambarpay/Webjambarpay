import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationDialogService } from '../../../../core/ui/confirmation-dialog.service';
import { EmployeeRow, EnterpriseEmployeesFacade } from '../../application/enterprise-employees.facade';
import { EnterpriseEmployeesComponent } from './enterprise-employees.component';

describe('EnterpriseEmployeesComponent deletion confirmation', () => {
  let fixture: ComponentFixture<EnterpriseEmployeesComponent>;
  let confirmation: ConfirmationDialogService;
  let facade: ReturnType<typeof createFacade>;
  const employee: EmployeeRow = {
    id: 'employee-test', walletId: null, name: 'Awa Diop', email: 'awa@example.org',
    phone: '770001122', balance: 'Indisponible', status: 'Inactif',
  };

  function createFacade() {
    return {
      searchTerm: signal(''), statusFilter: signal('Tous'), pageSize: signal(10),
      currentPage: signal(1), feedback: signal(null), totalPages: signal(1),
      employees: signal([employee]), loading: signal(false), deletingEmployeeId: signal<string | null>(null),
      statusOptions: ['Tous', 'Validé', 'Inactif'], pageSizeOptions: [5, 10],
      loadEmployeesPage: jasmine.createSpy('loadEmployeesPage'),
      deleteEmployee: jasmine.createSpy('deleteEmployee').and.resolveTo(undefined),
    };
  }

  beforeEach(() => {
    facade = createFacade();
    TestBed.configureTestingModule({ imports: [EnterpriseEmployeesComponent], providers: [provideRouter([])] });
    TestBed.overrideComponent(EnterpriseEmployeesComponent, { set: {
      template: '', imports: [], providers: [{ provide: EnterpriseEmployeesFacade, useValue: facade }],
    } });
    confirmation = TestBed.inject(ConfirmationDialogService);
    fixture = TestBed.createComponent(EnterpriseEmployeesComponent);
  });

  it('does not delete before confirmation or after cancellation', async () => {
    const deletion = fixture.componentInstance.deleteEmployee(employee);
    expect(confirmation.request()?.message).toContain(employee.name);
    expect(facade.deleteEmployee).not.toHaveBeenCalled();
    confirmation.respond(false);
    await deletion;
    expect(facade.deleteEmployee).not.toHaveBeenCalled();
  });

  it('deletes the selected employee once after explicit confirmation', async () => {
    const deletion = fixture.componentInstance.deleteEmployee(employee);
    confirmation.respond(true);
    confirmation.respond(true);
    await deletion;
    expect(facade.deleteEmployee).toHaveBeenCalledOnceWith(employee);
  });

  it('does not open another confirmation while deletion is in progress', async () => {
    facade.deletingEmployeeId.set('employee-already-deleting');
    await fixture.componentInstance.deleteEmployee(employee);
    expect(confirmation.request()).toBeNull();
    expect(facade.deleteEmployee).not.toHaveBeenCalled();
  });
});
