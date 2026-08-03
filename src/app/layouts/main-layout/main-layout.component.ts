import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { PageRouteData } from '../../core/routing/page-route-data';

@Component({
    selector: 'app-main-layout',
    imports: [RouterOutlet, SidebarComponent, TopbarComponent],
    templateUrl: './main-layout.component.html',
    styleUrls: ['./main-layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);

  readonly pageTitle = signal('Jambaar Pay');
  readonly pageSubtitle = signal('');
  readonly isCompactPage = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.updatePageMeta());
  }

  skipToMainContent(): void {
    this.document.getElementById('main-content')?.focus();
  }

  private updatePageMeta(): void {
    let currentRoute = this.activatedRoute;

    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }

    const data = currentRoute.snapshot.data as Partial<PageRouteData>;
    this.pageTitle.set(currentRoute.snapshot.title ?? 'Jambaar Pay');
    this.pageSubtitle.set(data.subtitle ?? '');
    this.isCompactPage.set(data.compact ?? false);
  }
}
