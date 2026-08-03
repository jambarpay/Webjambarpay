import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { BACKEND_API_URL } from './backend-api.config';

export const BACKEND_REQUEST_TIMEOUT = new InjectionToken<number>('BACKEND_REQUEST_TIMEOUT', {
  providedIn: 'root',
  factory: () => 15_000,
});

export interface BackendRequestOptions {
  headers?: HttpHeaders | Record<string, string>;
  params?: HttpParams | Record<string, string | number | boolean>;
}

@Injectable({ providedIn: 'root' })
export class BackendApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(BACKEND_API_URL);
  private readonly requestTimeout = inject(BACKEND_REQUEST_TIMEOUT);

  get<T>(path: string, options: BackendRequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.buildUrl(path), { ...options, withCredentials: true })
      .pipe(timeout(this.requestTimeout));
  }

  post<TResponse, TBody = unknown>(path: string, body: TBody, options: BackendRequestOptions = {}): Observable<TResponse> {
    return this.http.post<TResponse>(this.buildUrl(path), body, { ...options, withCredentials: true })
      .pipe(timeout(this.requestTimeout));
  }

  put<TResponse, TBody = unknown>(path: string, body: TBody, options: BackendRequestOptions = {}): Observable<TResponse> {
    return this.http.put<TResponse>(this.buildUrl(path), body, { ...options, withCredentials: true })
      .pipe(timeout(this.requestTimeout));
  }

  patch<TResponse, TBody = unknown>(path: string, body: TBody, options: BackendRequestOptions = {}): Observable<TResponse> {
    return this.http.patch<TResponse>(this.buildUrl(path), body, { ...options, withCredentials: true })
      .pipe(timeout(this.requestTimeout));
  }

  delete<T>(path: string, options: BackendRequestOptions = {}): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path), { ...options, withCredentials: true })
      .pipe(timeout(this.requestTimeout));
  }

  private buildUrl(path: string): string {
    if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) {
      throw new Error('BackendApiClient only accepts relative endpoint paths.');
    }

    const baseUrl = this.baseUrl.replace(/\/+$/, '');
    const endpoint = path.replace(/^\/+/, '');
    return endpoint ? `${baseUrl}/${endpoint}` : baseUrl;
  }
}
