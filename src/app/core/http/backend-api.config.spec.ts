import { isBackendRequest } from './backend-api.config';

describe('backend API config', () => {
  it('recognizes only requests under the configured API boundary', () => {
    expect(isBackendRequest('/api/v1', '/api/v1')).toBeTrue();
    expect(isBackendRequest('/api/v1/restaurants', '/api/v1')).toBeTrue();
    expect(isBackendRequest('/api/v10/restaurants', '/api/v1')).toBeFalse();
    expect(isBackendRequest('https://third-party.example/api/v1', '/api/v1')).toBeFalse();
  });
});
