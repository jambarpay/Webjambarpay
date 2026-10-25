import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BackendApiClient } from '../../../core/http/backend-api.client';

export interface EmployeeTopUpRequest {
  requestId: string;
  employeeIds: string[];
  amountPerEmployee: number;
  reason: string;
  callbackUrl: string;
}

export interface EmployeeTopUp {
  id: string;
  requestId: string;
  status: 'PENDING' | 'COMPLETED';
  employeeIds: string[];
  amountPerEmployee: number;
  totalAmount: number;
  currency: 'XOF';
  reason: string;
  paymentUrl: string;
  expiresAt: string;
  sandbox: boolean;
  paymentProvider: string;
  checkoutToken: string | null;
  transactionId: string | null;
}

@Injectable({ providedIn: 'root' })
export class EmployeeTopUpsClient {
  private readonly api = inject(BackendApiClient);
  private readonly path = 'wallets/employee-topups';

  create(request: EmployeeTopUpRequest): Promise<EmployeeTopUp> {
    return firstValueFrom(this.api.post<EmployeeTopUp, EmployeeTopUpRequest>(this.path, request));
  }

  get(id: string): Promise<EmployeeTopUp> {
    return firstValueFrom(this.api.get<EmployeeTopUp>(`${this.path}/${encodeURIComponent(id)}`));
  }

  renew(id: string): Promise<EmployeeTopUp> {
    return firstValueFrom(this.api.post<EmployeeTopUp, object>(`${this.path}/${encodeURIComponent(id)}/checkout`, {}));
  }

  complete(id: string, transactionId: string): Promise<EmployeeTopUp> {
    return firstValueFrom(this.api.post<EmployeeTopUp, { transactionId: string }>(
      `${this.path}/${encodeURIComponent(id)}/complete`, { transactionId }));
  }
}
