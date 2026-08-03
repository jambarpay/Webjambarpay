import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { MonitoringRepository } from '../application/monitoring.repository';
import { MonitoringTransaction } from '../domain/monitoring-transaction.model';

@Injectable({ providedIn: 'root' })
export class BackendMonitoringRepository implements MonitoringRepository {
  list(): Observable<MonitoringTransaction[]> {
    return throwError(() => new Error(
      'Le payment-service ne fournit pas encore de route de liste des transactions.',
    ));
  }

  saveAll(transactions: readonly MonitoringTransaction[]): Observable<void> {
    void transactions;
    return throwError(() => new Error(
      'L’import de transactions est interdit : les transactions financières sont créées uniquement par le payment-service.',
    ));
  }

}
