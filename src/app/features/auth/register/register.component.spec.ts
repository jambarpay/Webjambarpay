import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { PARTNER_TYPES } from '../../restaurants/domain/restaurant.model';
import { RegisterComponent } from './register.component';

describe('Public partner registration', () => {
  let post: jasmine.Spy;
  let route: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(() => {
    post = jasmine.createSpy('post').and.returnValue(of({ data: { id: 'test-user' } }));
    route = { snapshot: { queryParamMap: convertToParamMap({ type: 'restaurant' }) } };
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: BackendApiClient, useValue: { post } },
      ],
    });
    TestBed.overrideComponent(RegisterComponent, { set: { template: '', imports: [] } });
  });

  function component(): RegisterComponent {
    const result = TestBed.createComponent(RegisterComponent).componentInstance;
    Object.assign(result.form, {
      companyName: 'Partenaire Test', email: 'awa@example.org', phone: '+221 77 000 11 22',
      hrManager: 'Awa Ndiaye', location: 'Grand Yoff', city: 'Dakar',
      password: 'ExamplePassword123', confirmPassword: 'ExamplePassword123',
    });
    return result;
  }

  it('does not create an account when continuing from category selection', async () => {
    const form = component();
    await form.onSubmit();
    expect(form.registrationStep()).toBe(2);
    expect(post).not.toHaveBeenCalled();
  });

  for (const category of PARTNER_TYPES) {
    it(`forwards ${category.value} without changing the owner role`, async () => {
      const form = component();
      form.form.partnerType = category.value;
      form.continueToDetails();
      await form.onSubmit();
      expect(post).toHaveBeenCalledOnceWith('auth/register/organization', jasmine.objectContaining({
        role: 'RESTAURANT', partnerType: category.value, organizationName: 'Partenaire Test',
        phoneNumber: '770001122', firstName: 'Awa', lastName: 'Ndiaye',
      }));
      expect(form.successMessage()).toContain('compte partenaire');
    });
  }

  it('preserves entered information when changing category', async () => {
    const form = component();
    form.continueToDetails();
    form.backToCategory();
    form.form.partnerType = 'MARKET';
    form.continueToDetails();
    expect(form.form.companyName).toBe('Partenaire Test');
    expect(form.form.password).toBe('ExamplePassword123');
    await form.onSubmit();
    expect(post).toHaveBeenCalledOnceWith('auth/register/organization', jasmine.objectContaining({ partnerType: 'MARKET' }));
  });

  it('does not submit incorrect password confirmations', async () => {
    const form = component();
    form.continueToDetails();
    form.form.confirmPassword = 'DifferentPassword123';
    await form.onSubmit();
    expect(post).not.toHaveBeenCalled();
    expect(form.confirmPasswordError).toContain('ne correspondent pas');
  });

  it('prevents double submission while pending and after success', async () => {
    const response = new Subject<{ data: { id: string } }>();
    post.and.returnValue(response);
    const form = component();
    form.continueToDetails();
    const submission = form.onSubmit();
    expect(form.submitting()).toBeTrue();
    await form.onSubmit();
    form.backToCategory();
    expect(form.registrationStep()).toBe(2);
    expect(post).toHaveBeenCalledTimes(1);
    response.next({ data: { id: 'created' } });
    response.complete();
    await submission;
    await form.onSubmit();
    expect(form.submitting()).toBeFalse();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('keeps entered information and permits retry after a server error', async () => {
    post.and.returnValue(throwError(() => new Error('Inscription indisponible.')));
    const form = component();
    form.form.partnerType = 'SHOP';
    form.continueToDetails();
    await form.onSubmit();
    expect(form.errorMessage()).toBe('Inscription indisponible.');
    expect(form.submitting()).toBeFalse();
    expect(form.successMessage()).toBe('');
    expect(form.form.partnerType).toBe('SHOP');
    post.and.returnValue(of({ data: { id: 'created' } }));
    await form.onSubmit();
    expect(post).toHaveBeenCalledTimes(2);
    expect(form.successMessage()).toContain('compte partenaire');
  });

  it('keeps enterprise registration independent of partner categories', async () => {
    route.snapshot.queryParamMap = convertToParamMap({ type: 'enterprise' });
    const form = component();
    Object.assign(form.form, { sector: 'Services', employeeCount: '5', ninea: 'SN-DKR-123456' });
    await form.onSubmit();
    expect(post).toHaveBeenCalledOnceWith('auth/register/organization', jasmine.objectContaining({ role: 'ENTREPRISE' }));
    expect(post.calls.mostRecent().args[1].partnerType).toBeUndefined();
  });
});
