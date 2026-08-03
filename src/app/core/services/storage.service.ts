import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  get(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  set(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  remove(key: string): void {
    sessionStorage.removeItem(key);
  }

  clear(): void {
    sessionStorage.clear();
  }
}
