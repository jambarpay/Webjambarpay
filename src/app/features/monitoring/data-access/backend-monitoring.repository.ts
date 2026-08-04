import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, map, Observable, reduce, throwError } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { MonitoringRepository } from '../application/monitoring.repository';
import { MonitoringTransaction } from '../domain/monitoring-transaction.model';

interface BackendPaymentTransaction {
  id: string;
  payerUserId: string;
  restaurantId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  createdAt: string;
}

interface BackendTransactionPage {
  content: BackendPaymentTransaction[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const BACKEND_PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class BackendMonitoringRepository implements MonitoringRepository {
  private readonly api = inject(BackendApiClient);

  list(): Observable<MonitoringTransaction[]> {
    return this.loadPage(0).pipe(
      expand(page => page.page + 1 < page.totalPages ? this.loadPage(page.page + 1) : EMPTY),
      map(page => page.content.map(transaction => this.toDomain(transaction))),
      reduce((all, page) => [...all, ...page], [] as MonitoringTransaction[]),
    );
  }

  saveAll(transactions: readonly MonitoringTransaction[]): Observable<void> {
    void transactions;
    return throwError(() => new Error(
      'L’import de transactions est interdit : les transactions financières sont créées uniquement par le payment-service.',
    ));
  }

  private loadPage(page: number): Observable<BackendTransactionPage> {
    return this.api.get<BackendTransactionPage>('payments/transactions', {
      params: { page, size: BACKEND_PAGE_SIZE },
    });
  }

  private toDomain(transaction: BackendPaymentTransaction): MonitoringTransaction {
    return {
      id: transaction.id,
      employee: transaction.payerUserId,
      company: '—',
      restaurant: transaction.restaurantId,
      amount: String(transaction.amount),
      date: transaction.createdAt,
      status: this.toStatus(transaction.status),
    };
  }

  private toStatus(status: BackendPaymentTransaction['status']): MonitoringTransaction['status'] {
    if (status === 'SUCCESS') return 'Validé';
    if (status === 'PENDING') return 'En attente';
    return 'Échoué';
  }

}
