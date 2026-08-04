import { inject, Injectable } from '@angular/core';
import { StorageService } from '../../services/storage.service';

const ACCESS_TOKEN_KEY = 'jp_access_token';

interface StoredAccessToken {
  value: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  private readonly storage = inject(StorageService);

  setAccessToken(value: string, expiresAt: string): void {
    const expiration = Date.parse(expiresAt);
    if (!value || !Number.isFinite(expiration) || expiration <= Date.now()) {
      throw new Error('Le jeton d’authentification reçu est invalide.');
    }

    this.storage.set(ACCESS_TOKEN_KEY, JSON.stringify({ value, expiresAt } satisfies StoredAccessToken));
  }

  getAccessToken(): string | null {
    const rawToken = this.storage.get(ACCESS_TOKEN_KEY);
    if (!rawToken) return null;

    try {
      const stored = JSON.parse(rawToken) as Partial<StoredAccessToken>;
      if (typeof stored.value !== 'string'
        || typeof stored.expiresAt !== 'string'
        || Date.parse(stored.expiresAt) <= Date.now()) {
        this.clear();
        return null;
      }
      return stored.value;
    } catch {
      this.clear();
      return null;
    }
  }

  clear(): void {
    this.storage.remove(ACCESS_TOKEN_KEY);
  }
}
