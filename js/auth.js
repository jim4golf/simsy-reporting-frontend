/**
 * Authentication: login/logout, session management, route guards.
 */
const Auth = {
  isLoggedIn() {
    return !!sessionStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },

  getToken() {
    return sessionStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  },

  getOrg() {
    return sessionStorage.getItem(CONFIG.STORAGE_KEYS.ORG) || 'Unknown';
  },

  getInitials() {
    const org = this.getOrg();
    const words = org.split(/[\s_-]+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return org.substring(0, 2).toUpperCase();
  },

  getShortName() {
    const org = this.getOrg();
    // Shorten long names
    if (org.length > 20) {
      const words = org.split(/[\s_-]+/).filter(Boolean);
      return words.slice(0, 2).join(' ');
    }
    return org;
  },

  login(org, token) {
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.ORG, org);
  },

  logout() {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ORG);
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
};
