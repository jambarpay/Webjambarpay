import { TestBed } from '@angular/core/testing';
import { AuthTokenStore } from './auth-token.store';

describe('AuthTokenStore', () => {
  let store: AuthTokenStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [AuthTokenStore] });
    store = TestBed.inject(AuthTokenStore);
  });

  afterEach(() => sessionStorage.clear());

  it('keeps a valid access token for the current browser tab', () => {
    store.setAccessToken('jwt-token', new Date(Date.now() + 60_000).toISOString());

    expect(store.getAccessToken()).toBe('jwt-token');
    expect(localStorage.length).toBe(0);
  });

  it('removes expired access tokens', () => {
    sessionStorage.setItem('jp_access_token', JSON.stringify({
      value: 'expired-token',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    }));

    expect(store.getAccessToken()).toBeNull();
    expect(sessionStorage.getItem('jp_access_token')).toBeNull();
  });
});
