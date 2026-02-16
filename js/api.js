/**
 * API client with auth header injection, caching, and error handling.
 *
 * Supports two auth methods:
 *   - JWT: sends Authorization: Bearer <token>
 *   - Service Token: sends CF-Access-Client-Id: <token>
 */
const API = (() => {
  const cache = new Map();

  function getToken() {
    return sessionStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  }

  function getAuthMethod() {
    return sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_METHOD) || 'jwt';
  }

  function buildUrl(path, params) {
    const url = new URL(CONFIG.API_BASE + path);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') url.searchParams.set(k, v);
      });
    }
    return url.toString();
  }

  function getCacheKey(url) {
    return url;
  }

  function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > CONFIG.CACHE_TTL_MS) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  function setCache(key, data) {
    cache.set(key, { data, time: Date.now() });
  }

  /** Build the auth header based on the current auth method. */
  function authHeaders() {
    const token = getToken();
    if (!token) return {};
    if (getAuthMethod() === 'jwt') {
      return { 'Authorization': 'Bearer ' + token };
    }
    return { 'CF-Access-Client-Id': token };
  }

  async function request(method, path, { params, body, skipCache } = {}) {
    const url = buildUrl(path, params);
    const token = getToken();

    if (!token) {
      Auth.logout();
      throw new Error('Not authenticated');
    }

    // Check cache for GET requests
    if (method === 'GET' && !skipCache) {
      const cached = getCached(getCacheKey(url));
      if (cached) return cached;
    }

    const headers = {
      ...authHeaders(),
    };

    const fetchOptions = { method, headers };

    if (body) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (response.status === 401 || response.status === 403) {
      Auth.logout();
      throw new Error('Authentication failed');
    }

    if (response.status === 429) {
      const reset = response.headers.get('X-RateLimit-Reset');
      throw new Error('Rate limited. Try again ' + (reset ? 'at ' + new Date(reset * 1000).toLocaleTimeString() : 'shortly') + '.');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `API error: ${response.status}`);
    }

    // For export endpoint, return raw response for blob download
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/csv') || response.headers.get('Content-Disposition')) {
      return response;
    }

    const data = await response.json();

    // Cache GET responses
    if (method === 'GET') {
      setCache(getCacheKey(url), data);
    }

    return data;
  }

  return {
    get(path, params, skipCache) {
      return request('GET', path, { params, skipCache });
    },

    post(path, body) {
      return request('POST', path, { body });
    },

    put(path, body) {
      return request('PUT', path, { body });
    },

    del(path) {
      return request('DELETE', path);
    },

    /**
     * Fetch a raw response (for file downloads).
     */
    async postRaw(path, body) {
      const url = buildUrl(path);
      const token = getToken();
      if (!token) { Auth.logout(); throw new Error('Not authenticated'); }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Export failed: ${response.status}`);
      }

      return response;
    },

    clearCache() {
      cache.clear();
    },

    // ── Auth endpoints (no auth required) ──────────────────────────

    /** Step 1: email + password → OTP token. */
    async login(email, password) {
      const response = await fetch(CONFIG.API_BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Login failed');
      }
      return data;
    },

    /** Step 2: OTP code → JWT. */
    async verifyOTP(otpToken, code) {
      const response = await fetch(CONFIG.API_BASE + '/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_token: otpToken, code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Verification failed');
      }
      return data;
    },

    /** Request password reset OTP. */
    async forgotPassword(email) {
      const response = await fetch(CONFIG.API_BASE + '/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
    },

    /** Complete password reset with OTP. */
    async resetPassword(resetToken, code, newPassword) {
      const response = await fetch(CONFIG.API_BASE + '/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_token: resetToken, code, new_password: newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Reset failed');
      }
      return data;
    },

    /**
     * Validate a service token by making a test API call (legacy).
     */
    async validateToken(token) {
      const url = buildUrl('/usage/summary', { group_by: 'daily' });
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'CF-Access-Client-Id': token },
      });
      if (!response.ok) return null;
      return response.json();
    },
  };
})();
