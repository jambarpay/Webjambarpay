import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Event, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ConfirmationDialogService } from './confirmation-dialog.service';

describe('ConfirmationDialogService', () => {
  let service: ConfirmationDialogService;
  let events: Subject<Event>;
  const options = { title: 'Supprimer le salarié ?', message: 'Supprimer Awa Diop ?', confirmLabel: 'Supprimer le salarié' };

  beforeEach(() => {
    events = new Subject<Event>();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { events } }] });
    service = TestBed.inject(ConfirmationDialogService);
  });

  afterEach(() => service.respond(false));

  it('waits for explicit confirmation without a native browser dialog', async () => {
    const nativeConfirmation = spyOn(window, 'confirm');
    const result = service.confirm(options);
    expect(service.request()?.message).toBe(options.message);
    expect(service.request()?.tone).toBe('danger');
    expect(nativeConfirmation).not.toHaveBeenCalled();
    service.respond(true);
    expect(await result).toBeTrue();
    expect(service.request()).toBeNull();
  });

  it('cancels when dismissed', async () => {
    const result = service.confirm(options);
    service.respond(false);
    expect(await result).toBeFalse();
  });

  it('does not replace a pending confirmation with another action', async () => {
    const first = service.confirm(options);
    expect(await service.confirm({ ...options, message: 'Supprimer une autre personne ?' })).toBeFalse();
    expect(service.request()?.message).toBe(options.message);
    service.respond(false);
    expect(await first).toBeFalse();
  });

  it('settles the result only once', async () => {
    const result = service.confirm(options);
    service.respond(true);
    service.respond(false);
    expect(await result).toBeTrue();
  });

  it('cancels a pending action when navigating away', async () => {
    const result = service.confirm(options);
    events.next(new NavigationStart(1, '/enterprise-dashboard'));
    expect(await result).toBeFalse();
    expect(service.request()).toBeNull();
  });

  it('never confirms a destructive action during server rendering', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [
      { provide: Router, useValue: { events } },
      { provide: PLATFORM_ID, useValue: 'server' },
    ] });
    service = TestBed.inject(ConfirmationDialogService);
    expect(await service.confirm(options)).toBeFalse();
    expect(service.request()).toBeNull();
  });
});
