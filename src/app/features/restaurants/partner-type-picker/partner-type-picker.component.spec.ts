import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartnerTypePickerComponent } from './partner-type-picker.component';

describe('PartnerTypePickerComponent', () => {
  let fixture: ComponentFixture<PartnerTypePickerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PartnerTypePickerComponent] });
    fixture = TestBed.createComponent(PartnerTypePickerComponent);
    fixture.detectChanges();
  });

  it('provides four accessible radio choices and defaults to restaurant', () => {
    const radios: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('input[type=radio]'));
    expect(radios.map(radio => radio.value)).toEqual(['RESTAURANT', 'SHOP', 'SUPERMARKET', 'MARKET']);
    expect(radios.filter(radio => radio.checked).map(radio => radio.value)).toEqual(['RESTAURANT']);
    expect(fixture.nativeElement.querySelector('legend').textContent).toBe('Type de partenaire');
  });

  it('emits the chosen type without submitting the parent form', () => {
    const selected = jasmine.createSpy('selected');
    fixture.componentInstance.valueChange.subscribe(selected);
    fixture.nativeElement.querySelector('input[value=SHOP]').click();
    expect(selected).toHaveBeenCalledOnceWith('SHOP');
    fixture.componentRef.setInput('value', 'SHOP');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[value=SHOP]').checked).toBeTrue();
    expect(fixture.nativeElement.querySelector('input[value=RESTAURANT]').checked).toBeFalse();
  });

  it('disables selection during saving', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const selected = jasmine.createSpy('selected');
    fixture.componentInstance.valueChange.subscribe(selected);
    fixture.nativeElement.querySelector('input[value=MARKET]').click();
    expect(selected).not.toHaveBeenCalled();
  });
});
