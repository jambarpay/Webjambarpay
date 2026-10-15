import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RESTAURANTS_REPOSITORY } from '../application/restaurants.repository';
import { RestaurantAddComponent } from './restaurant-add.component';

describe('RestaurantAddComponent partner category', () => {
  let fixture: ComponentFixture<RestaurantAddComponent>;
  let upsert: jasmine.Spy;

  beforeEach(() => {
    upsert = jasmine.createSpy('upsert').and.callFake(partner => of({ ...partner, id: 'created', ownerTemporaryPassword: 'test-only' }));
    TestBed.configureTestingModule({
      imports: [RestaurantAddComponent],
      providers: [provideRouter([]), { provide: RESTAURANTS_REPOSITORY, useValue: { upsert } }],
    });
    fixture = TestBed.createComponent(RestaurantAddComponent);
    Object.assign(fixture.componentInstance.form, {
      name: 'Boutique Awa', ownerName: 'Awa Ndiaye', ownerEmail: 'awa@example.org',
      phoneNumber: '770001122', city: 'Dakar', location: 'Grand Yoff',
    });
  });

  it('submits the selected shop category with the normal creation contract', async () => {
    fixture.componentInstance.form.partnerType = 'SHOP';
    await fixture.componentInstance.onSubmit();
    expect(upsert).toHaveBeenCalledOnceWith(jasmine.objectContaining({ partnerType: 'SHOP', name: 'Boutique Awa' }));
  });

  it('preserves restaurant as the default for old creation flows', async () => {
    await fixture.componentInstance.onSubmit();
    expect(upsert).toHaveBeenCalledOnceWith(jasmine.objectContaining({ partnerType: 'RESTAURANT' }));
  });
});
