import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BACKEND_API_URL } from '../../core/http/backend-api.config';
import { InboxNotification } from '../../core/notifications/notification-inbox.service';
import { NotificationInboxComponent } from './notification-inbox.component';

describe('NotificationInboxComponent', () => {
  let fixture: ComponentFixture<NotificationInboxComponent>;
  let http: HttpTestingController;
  const endpoint = '/api/v1/users/me/notifications?page=0&size=20';
  const item: InboxNotification = {
    id: 'notification-1', type: 'ORGANIZATION_REGISTERED', title: 'Nouvelle entreprise inscrite',
    message: 'Entreprise Exemple vient de s’inscrire.', targetPath: '/companies',
    createdAt: '2026-10-12T12:00:00', readAt: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NotificationInboxComponent], providers: [
      provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: BACKEND_API_URL, useValue: '/api/v1' },
    ] });
    fixture = TestBed.createComponent(NotificationInboxComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    load(item);
  });
  afterEach(() => http.verify());

  function load(notification: InboxNotification): void {
    http.expectOne(endpoint).flush({ data: { items: [notification], page: 0, size: 20,
      totalElements: 1, totalPages: 1, unreadCount: notification.readAt ? 0 : 1 } });
    fixture.detectChanges();
  }

  function open(notification = item): void {
    (fixture.nativeElement.querySelector('.notification-toggle') as HTMLButtonElement).click();
    load(notification);
  }

  it('opens the internal inbox with its unread badge and closes on Escape', () => {
    expect(fixture.nativeElement.querySelector('.notification-count').textContent.trim()).toBe('1');
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    open();
    expect(fixture.nativeElement.querySelector('h3').textContent).toBe(item.title);
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/companies');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('renders notification content as text and does not link arbitrary destinations', () => {
    open({ ...item, message: '<img src=x onerror=alert(1)>', targetPath: 'https://untrusted.example' });
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.notification-item p').textContent).toContain('<img');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('marks a notification read using the backend then removes its badge', () => {
    open();
    (fixture.nativeElement.querySelector('.item-actions button') as HTMLButtonElement).click();
    const request = http.expectOne('/api/v1/users/me/notifications/notification-1/read');
    expect(request.request.method).toBe('PUT');
    request.flush({ data: null });
    load({ ...item, readAt: '2026-10-12T12:01:00' });
    expect(fixture.nativeElement.querySelector('.notification-count')).toBeNull();
    expect(fixture.nativeElement.querySelector('.read-label').textContent).toBe('Lu');
  });
});
