/**
 * Authentication: login/logout, session management, route guards.
 *
 * Supports two auth methods:
 *   - JWT (email/password + 2FA) — primary for browser users
 *   - Service Token (CF-Access-Client-Id) — legacy for API access
 */
const Auth = {
  isLoggedIn() {
    return !!sessionStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },

  getToken() {
    return sessionStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },

  getAuthMethod() {
    return sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_METHOD) || 'jwt';
  },

  /** Get the stored user profile object (JWT sessions only). */
  getUser() {
    try {
      return JSON.parse(sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER) || 'null');
    } catch { return null; }
  },

  getOrg() {
    const user = this.getUser();
    return user?.tenant_name || sessionStorage.getItem(CONFIG.STORAGE_KEYS.ORG) || 'Unknown';
  },

  getRole() {
    const user = this.getUser();
    return user?.role || 'tenant';
  },

  isAdmin() {
    return this.getRole() === 'admin';
  },

  getInitials() {
    const user = this.getUser();
    const name = user?.display_name || this.getOrg();
    const words = name.split(/[\s_-]+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  },

  getShortName() {
    const user = this.getUser();
    if (user?.display_name) return user.display_name;
    const org = this.getOrg();
    if (org.length > 20) {
      const words = org.split(/[\s_-]+/).filter(Boolean);
      return words.slice(0, 2).join(' ');
    }
    return org;
  },

  /** Store a JWT session after successful 2FA. */
  loginWithJWT(token, user) {
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.ORG, user.tenant_name);
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_METHOD, 'jwt');
  },

  /** Legacy: store a service token session. */
  loginWithServiceToken(org, token) {
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.ORG, org);
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_METHOD, 'service_token');
  },

  /** Kept for backward compatibility — alias for loginWithServiceToken. */
  login(org, token) {
    this.loginWithServiceToken(org, token);
  },

  async logout() {
    // If JWT auth, call server logout
    if (this.getAuthMethod() === 'jwt' && this.getToken()) {
      try {
        await fetch(CONFIG.API_BASE + '/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + this.getToken() },
        });
      } catch { /* ignore logout errors */ }
    }

    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ORG);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_METHOD);
    API.clearCache();

    // Redirect to login if not already there
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  },

  /**
   * Guard: redirect to login if not authenticated.
   * Call at top of dashboard.html.
   */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  /**
   * Guard: redirect to dashboard if not admin.
   */
  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  },
};
