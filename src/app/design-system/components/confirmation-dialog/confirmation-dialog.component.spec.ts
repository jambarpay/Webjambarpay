import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ConfirmationDialogService } from '../../../core/ui/confirmation-dialog.service';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let confirmation: ConfirmationDialogService;
  const options = {
    title: 'Supprimer le salarié ?', message: 'Supprimer définitivement Awa Diop ?',
    details: 'Cette action est irréversible.', confirmLabel: 'Supprimer le salarié',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ConfirmationDialogComponent], providers: [
      provideRouter([]), provideNoopAnimations(),
    ] });
    confirmation = TestBed.inject(ConfirmationDialogService);
    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  async function open(message = options.message): Promise<{ result: Promise<boolean> }> {
    const result = confirmation.confirm({ ...options, message });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { result };
  }

  it('shows the operation and its warning, focusing the safe cancel action', async () => {
    const { result } = await open();
    const dialog = document.querySelector('.p-dialog[role="alertdialog"]');
    expect(dialog?.textContent).toContain(options.title);
    expect(dialog?.textContent).toContain(options.details);
    expect(document.activeElement?.id).toBe('app-confirmation-cancel');
    (document.querySelector('.confirmation-cancel') as HTMLButtonElement).click();
    expect(await result).toBeFalse();
  });

  it('approves only when the explicit destructive button is clicked', async () => {
    const { result } = await open();
    (document.querySelector('.confirmation-submit') as HTMLButtonElement).click();
    expect(await result).toBeTrue();
  });

  it('treats closing the dialog as cancellation', async () => {
    const { result } = await open();
    fixture.componentInstance.onVisibleChange(false);
    expect(await result).toBeFalse();
  });

  it('renders user-provided names as text rather than HTML', async () => {
    const { result } = await open('<img src=x onerror=alert(1)>');
    expect(document.querySelector('.confirmation-content img')).toBeNull();
    expect(document.querySelector('.confirmation-message')?.textContent).toContain('<img');
    confirmation.respond(false);
    expect(await result).toBeFalse();
  });
});
