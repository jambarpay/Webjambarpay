import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './core/seo/seo.service';
import { ConfirmationDialogService } from './core/ui/confirmation-dialog.service';
import { ConfirmationDialogComponent } from './design-system/components/confirmation-dialog/confirmation-dialog.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ConfirmationDialogComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
    readonly confirmation = inject(ConfirmationDialogService);

    constructor() {
        inject(SeoService);
    }
}
