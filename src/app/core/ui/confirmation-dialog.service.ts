import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

export interface ConfirmationDialogOptions {
  title: string;
  message: string;
  details?: string;
  confirmLabel: string;
  tone?: 'danger' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly currentRequest = signal<ConfirmationDialogOptions | null>(null);
  private resolveConfirmation: ((confirmed: boolean) => void) | null = null;
  private returnFocusTo: HTMLElement | null = null;

  readonly request = this.currentRequest.asReadonly();

  constructor() {
    inject(Router).events.pipe(
      filter(event => event instanceof NavigationStart),
      takeUntilDestroyed(),
    ).subscribe(() => this.respond(false));
    inject(DestroyRef).onDestroy(() => this.respond(false));
  }

  confirm(options: ConfirmationDialogOptions): Promise<boolean> {
    // Never approve a destructive action without an explicit browser interaction.
    // A second request must not replace the first action awaiting confirmation.
    if (!isPlatformBrowser(this.platformId) || this.resolveConfirmation) {
      return Promise.resolve(false);
    }

    const activeElement = this.document.activeElement;
    this.returnFocusTo = activeElement instanceof HTMLElement ? activeElement : null;
    return new Promise<boolean>(resolve => {
      this.resolveConfirmation = resolve;
      this.currentRequest.set({ ...options, tone: options.tone ?? 'danger' });
    });
  }

  respond(confirmed: boolean): void {
    const resolve = this.resolveConfirmation;
    this.resolveConfirmation = null;
    this.currentRequest.set(null);
    resolve?.(confirmed);
  }

  restoreFocus(): void {
    if (this.currentRequest()) return;
    if (this.returnFocusTo?.isConnected) {
      this.returnFocusTo.focus();
    }
    this.returnFocusTo = null;
  }
}
