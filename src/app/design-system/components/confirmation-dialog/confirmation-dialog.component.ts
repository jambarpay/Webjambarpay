import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationDialogService } from '../../../core/ui/confirmation-dialog.service';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [DialogModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent implements OnDestroy {
  readonly confirmation = inject(ConfirmationDialogService);
  private readonly document = inject(DOCUMENT);

  onVisibleChange(visible: boolean): void {
    if (!visible) this.confirmation.respond(false);
  }

  onShow(): void {
    this.document.getElementById('app-confirmation-cancel')?.focus();
  }

  ngOnDestroy(): void {
    this.confirmation.respond(false);
  }
}
