import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';
import { ApiEnvelope } from '../../../core/http/models/api-response';
import { AuditRepository } from '../application/audit.repository';
import { AuditLog } from '../domain/audit-log.model';

@Injectable({ providedIn: 'root' })
export class BackendAuditRepository implements AuditRepository {
  private readonly api = inject(BackendApiClient);

  list(): Observable<AuditLog[]> {
    return this.api.get<ApiEnvelope<AuditLog[]>>('audit/logs').pipe(map(response => response.data));
  }
}
