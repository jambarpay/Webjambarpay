import { inject, Injectable } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { MonitoringRepository } from '../application/monitoring.repository';
import { MonitoringTransaction, MonitoringTransactionStatus } from '../domain/monitoring-transaction.model';

interface BackendTransactionDto {
  id: string;
  payerUserId: string;
  restaurantId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface BackendTransactionPage {
  data: BackendTransactionDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class BackendMonitoringRepository implements MonitoringRepository {
  private readonly api = inject(BackendApiClient);

  list(): Observable<MonitoringTransaction[]> {
    return this.api.get<BackendTransactionPage>('payments/transactions', {
      params: { page: 0, pageSize: 100 },
    }).pipe(map(response => response.data.map(transaction => ({
      id: transaction.id,
      employee: transaction.payerUserId,
      company: '—',
      restaurant: transaction.restaurantId,
      amount: `${new Intl.NumberFormat('fr-SN').format(transaction.amount)} ${transaction.currency}`,
      date: transaction.createdAt,
      status: this.toStatus(transaction.status),
    }))));
  }

  saveAll(transactions: readonly MonitoringTransaction[]): Observable<void> {
    void transactions;
    return throwError(() => new Error(
      'L’import de transactions est interdit : les transactions financières sont créées uniquement par le payment-service.',
    ));
  }

  private toStatus(status: string): MonitoringTransactionStatus {
    if (status === 'COMPLETED' || status === 'SUCCESS') return 'Validé';
    if (status === 'FAILED' || status === 'REJECTED') return 'Échoué';
    return 'En attente';
  }
}
