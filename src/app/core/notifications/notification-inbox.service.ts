import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { finalize } from 'rxjs';
import { BackendApiClient } from '../http/backend-api.client';
import { ApiEnvelope } from '../http/models/api-response';

export interface InboxNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  targetPath: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  items: InboxNotification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  unreadCount: number;
}

/** Scoped to the widget: no inbox data survives logout or a change of account. */
@Injectable()
export class NotificationInboxService {
  private readonly api = inject(BackendApiClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly endpoint = 'users/me/notifications';
  readonly items = signal<InboxNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly updating = signal(false);
  readonly error = signal('');

  refresh(page = this.page()): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.api.get<ApiEnvelope<NotificationPage>>(this.endpoint, { params: { page, size: 20 } })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.items.set(response.data.items);
          this.unreadCount.set(response.data.unreadCount);
          this.page.set(response.data.page);
          this.totalPages.set(response.data.totalPages);
        },
        error: () => this.error.set('Impossible de charger les notifications. Réessayez.'),
      });
  }

  markRead(item: InboxNotification): void {
    if (item.readAt || this.updating()) return;
    this.update(`${this.endpoint}/${encodeURIComponent(item.id)}/read`);
  }

  markAllRead(): void {
    if (this.updating() || this.unreadCount() === 0) return;
    this.update(`${this.endpoint}/read-all`);
  }

  private update(path: string): void {
    this.updating.set(true);
    this.error.set('');
    this.api.put<ApiEnvelope<null>, Record<string, never>>(path, {})
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.updating.set(false)))
      .subscribe({
        next: () => this.refresh(),
        error: () => this.error.set('Impossible de marquer les notifications comme lues. Réessayez.'),
      });
  }
}
