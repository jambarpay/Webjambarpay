import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_API_URL } from '../../../core/http/backend-api.config';
import { BackendAuditRepository } from './backend-audit.repository';

describe('BackendAuditRepository', () => {
  it('uses and maps the payment-service audit contract', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BACKEND_API_URL, useValue: '/api/v1' },
      ],
    });
    const repository = TestBed.inject(BackendAuditRepository);
    const http = TestBed.inject(HttpTestingController);

    repository.list().subscribe(logs => expect(logs[0]).toEqual({
      action: 'Paiement validé',
      user: 'user-1',
      details: 'Paiement terminé — Transaction : tx-1 — Corrélation : corr-1',
      date: '2026-08-03T12:00:00Z',
    }));

    const request = http.expectOne(req => req.url === '/api/v1/payments/admin/audit-logs');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('limit')).toBe('100');
    request.flush([{
      transactionId: 'tx-1',
      payerUserId: 'user-1',
      eventType: 'PAYMENT_COMPLETED',
      correlationId: 'corr-1',
      flagged: false,
      flagReason: null,
      message: 'Paiement terminé',
      createdAt: '2026-08-03T12:00:00Z',
    }]);
    http.verify();
  });
});
