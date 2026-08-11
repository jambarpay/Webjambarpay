import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { AuditRepository } from '../application/audit.repository';
import { AuditLog } from '../domain/audit-log.model';

interface BackendPaymentAuditLog {
  transactionId: string;
  payerUserId: string;
  eventType: string;
  correlationId: string;
  flagged: boolean;
  flagReason: string | null;
  message: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BackendAuditRepository implements AuditRepository {
  private readonly api = inject(BackendApiClient);

  list(): Observable<AuditLog[]> {
    return this.api.get<BackendPaymentAuditLog[]>('payments/admin/audit-logs', {
      params: { limit: 100 },
    }).pipe(map(logs => logs.map(log => ({
      action: toDisplayAction(log.eventType),
      user: log.payerUserId || 'Système',
      details: buildDetails(log),
      date: log.createdAt,
    }))));
  }
}

function toDisplayAction(eventType: string): string {
  const labels: Record<string, string> = {
    PAYMENT_REQUEST_RECEIVED: 'Demande de paiement',
    QR_VALIDATED: 'QR validé',
    TRANSACTION_PERSISTED: 'Transaction enregistrée',
    PAYMENT_COMPLETED: 'Paiement validé',
    PAYMENT_FAILED: 'Paiement échoué',
    PAYMENT_COMPENSATED: 'Paiement compensé',
  };
  return labels[eventType] ?? eventType;
}

function buildDetails(log: BackendPaymentAuditLog): string {
  return [
    log.message,
    log.transactionId ? `Transaction : ${log.transactionId}` : '',
    log.correlationId ? `Corrélation : ${log.correlationId}` : '',
    log.flagged && log.flagReason ? `Signalement : ${log.flagReason}` : '',
  ].filter(Boolean).join(' — ');
}
