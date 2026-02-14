/**
 * Utility / formatting functions.
 */
const Utils = {
  /**
   * Format raw bytes into human-readable string (KB, MB, GB, TB).
   */
  formatBytes(bytes) {
    if (bytes == null || isNaN(bytes)) return '0 B';
    bytes = Number(bytes);
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
    const idx = Math.min(i, units.length - 1);
    return (bytes / Math.pow(1024, idx)).toFixed(idx === 0 ? 0 : 1) + ' ' + units[idx];
  },

  /**
   * Format MB into human-readable string.
   */
  formatMB(mb) {
    if (mb == null || isNaN(mb)) return '0 MB';
    mb = Number(mb);
    if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
    return mb.toFixed(1) + ' MB';
  },

  /**
   * Format a number with comma separators.
   */
  formatNumber(n) {
    if (n == null || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-GB');
  },

  /**
   * Format an ISO date string to a short readable format.
   */
  formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  /**
   * Format date for chart labels (e.g. "14 Feb").
   */
  formatChartDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  },

  /**
   * Format a timestamp as a relative time string (e.g. "2 hours ago").
   */
  timeAgo(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    const days = Math.floor(hours / 24);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    const months = Math.floor(days / 30);
    return months + (months === 1 ? ' month ago' : ' months ago');
  },

  /**
   * Format currency amount.
   */
  formatCurrency(amount, currency) {
    if (amount == null || isNaN(amount)) return '-';
    const n = Number(amount);
    const sym = currency === 'EUR' ? '\u20AC' : currency === 'USD' ? '$' : '\u00A3';
    return sym + n.toFixed(2);
  },

  /**
   * Truncate ICCID showing last 4 digits with prefix.
   */
  truncateIccid(iccid) {
    if (!iccid) return '-';
    if (iccid.length <= 8) return iccid;
    return iccid.substring(0, 4) + '...' + iccid.substring(iccid.length - 4);
  },

  /**
   * Calculate days until a future date. Negative = past.
   */
  daysUntil(isoDate) {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  },

  /**
   * Calculate percentage used (0-100+).
   */
  percentUsed(used, total) {
    if (!total || total === 0) return 0;
    return (Number(used) / Number(total)) * 100;
  },

  /**
   * Get a date N days ago as ISO string (date only).
   */
  daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  },

  /**
   * Get today's date as ISO string (date only).
   */
  today() {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Get a date N days in the future as ISO string.
   */
  daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  },

  /**
   * Escape HTML to prevent XSS.
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};
