import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_API_URL } from '../http/backend-api.config';
import { InboxNotification, NotificationInboxService } from './notification-inbox.service';

describe('NotificationInboxService', () => {
  let service: NotificationInboxService;
  let http: HttpTestingController;
  const endpoint = '/api/v1/users/me/notifications';
  const item: InboxNotification = {
    id: 'notification-1', type: 'ORGANIZATION_REGISTERED', title: 'Nouvelle entreprise inscrite',
    message: 'Entreprise Exemple vient de s’inscrire.', targetPath: '/companies',
    createdAt: '2026-10-12T12:00:00', readAt: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      NotificationInboxService, { provide: BACKEND_API_URL, useValue: '/api/v1' }] });
    service = TestBed.inject(NotificationInboxService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads only the authenticated inbox with a page limit', () => {
    service.refresh();
    const request = http.expectOne(`${endpoint}?page=0&size=20`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: { items: [item], page: 0, size: 20, totalElements: 1, totalPages: 1, unreadCount: 1 } });
    expect(service.items()).toEqual([item]);
    expect(service.unreadCount()).toBe(1);
    expect(service.loading()).toBeFalse();
  });

  it('marks an item read server-side then refreshes the authoritative state', () => {
    service.markRead(item);
    const request = http.expectOne(`${endpoint}/notification-1/read`);
    expect(request.request.method).toBe('PUT');
    request.flush({ data: null });
    http.expectOne(`${endpoint}?page=0&size=20`).flush({ data: {
      items: [{ ...item, readAt: '2026-10-12T12:01:00' }], page: 0, size: 20,
      totalElements: 1, totalPages: 1, unreadCount: 0,
    } });
    expect(service.unreadCount()).toBe(0);
    expect(service.items()[0].readAt).toBeTruthy();
  });

  it('does not claim read success after a failed update', () => {
    service.markRead(item);
    http.expectOne(`${endpoint}/notification-1/read`).flush({}, { status: 500, statusText: 'Error' });
    expect(service.error()).toContain('Impossible de marquer');
    expect(service.updating()).toBeFalse();
  });

  it('shows an inline loading failure without native alerts', () => {
    service.refresh();
    http.expectOne(`${endpoint}?page=0&size=20`).flush({}, { status: 500, statusText: 'Error' });
    expect(service.error()).toContain('Impossible de charger');
    expect(service.loading()).toBeFalse();
  });
});
