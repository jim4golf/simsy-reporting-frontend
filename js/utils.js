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
   * Compute a display status for a bundle instance based on lifecycle.
   * Depleted > LIVE > Terminated > original status
   */
  computeInstanceStatus(inst) {
    const now = Date.now();
    const start = inst.start_time ? new Date(inst.start_time).getTime() : null;
    const end = inst.end_time ? new Date(inst.end_time).getTime() : null;
    const orig = inst.status_name || inst.status_moniker || '';

    // Only LIVE is computed — currently within start/end window
    if (start && end && now >= start && now <= end) return 'LIVE';
    // All other statuses (Active, Depleted, Expired, Suspended, etc.) come from the database
    return orig || '-';
  },

  /**
   * TADIG code prefix (first 3 chars) to country name.
   */
  _tadigCountries: {
    GBR: 'United Kingdom', USA: 'United States', DEU: 'Germany', FRA: 'France',
    ESP: 'Spain', ITA: 'Italy', NLD: 'Netherlands', BEL: 'Belgium', PRT: 'Portugal',
    IRL: 'Ireland', CHE: 'Switzerland', AUT: 'Austria', SWE: 'Sweden', NOR: 'Norway',
    DNK: 'Denmark', FIN: 'Finland', POL: 'Poland', CZE: 'Czech Republic',
    HUN: 'Hungary', ROU: 'Romania', BGR: 'Bulgaria', HRV: 'Croatia', SVK: 'Slovakia',
    SVN: 'Slovenia', LTU: 'Lithuania', LVA: 'Latvia', EST: 'Estonia', LUX: 'Luxembourg',
    MLT: 'Malta', CYP: 'Cyprus', GRC: 'Greece', TUR: 'Turkey', ISR: 'Israel',
    ARE: 'UAE', SAU: 'Saudi Arabia', QAT: 'Qatar', KWT: 'Kuwait', BHR: 'Bahrain',
    OMN: 'Oman', JOR: 'Jordan', LBN: 'Lebanon', EGY: 'Egypt', MAR: 'Morocco',
    TUN: 'Tunisia', ZAF: 'South Africa', KEN: 'Kenya', NGA: 'Nigeria', GHA: 'Ghana',
    TZA: 'Tanzania', UGA: 'Uganda', ETH: 'Ethiopia', SEN: 'Senegal', CMR: 'Cameroon',
    CIV: "Cote d'Ivoire", MOZ: 'Mozambique', AGO: 'Angola', COD: 'DR Congo',
    CHN: 'China', JPN: 'Japan', KOR: 'South Korea', IND: 'India', IDN: 'Indonesia',
    THA: 'Thailand', MYS: 'Malaysia', SGP: 'Singapore', PHL: 'Philippines',
    VNM: 'Vietnam', TWN: 'Taiwan', HKG: 'Hong Kong', MAC: 'Macau', MMR: 'Myanmar',
    KHM: 'Cambodia', LAO: 'Laos', BGD: 'Bangladesh', LKA: 'Sri Lanka', PAK: 'Pakistan',
    AUS: 'Australia', NZL: 'New Zealand', CAN: 'Canada', MEX: 'Mexico',
    BRA: 'Brazil', ARG: 'Argentina', CHL: 'Chile', COL: 'Colombia', PER: 'Peru',
    URY: 'Uruguay', PRY: 'Paraguay', ECU: 'Ecuador', VEN: 'Venezuela',
    CRI: 'Costa Rica', PAN: 'Panama', DOM: 'Dominican Republic', JAM: 'Jamaica',
    TTO: 'Trinidad & Tobago', GTM: 'Guatemala', HND: 'Honduras', SLV: 'El Salvador',
    RUS: 'Russia', UKR: 'Ukraine', BLR: 'Belarus', KAZ: 'Kazakhstan',
    UZB: 'Uzbekistan', GEO: 'Georgia', ARM: 'Armenia', AZE: 'Azerbaijan',
    MDA: 'Moldova', ISL: 'Iceland', ALB: 'Albania', MKD: 'North Macedonia',
    SRB: 'Serbia', MNE: 'Montenegro', BIH: 'Bosnia & Herzegovina',
    AND: 'Andorra', MCO: 'Monaco', LIE: 'Liechtenstein', SMR: 'San Marino',
    MNG: 'Mongolia', NPL: 'Nepal', AFG: 'Afghanistan', IRQ: 'Iraq', IRN: 'Iran',
    SYR: 'Syria', YEM: 'Yemen', LBY: 'Libya', SDN: 'Sudan', SSD: 'South Sudan',
    RWA: 'Rwanda', BDI: 'Burundi', MWI: 'Malawi', ZMB: 'Zambia', ZWE: 'Zimbabwe',
    BWA: 'Botswana', NAM: 'Namibia', SWZ: 'Eswatini', LSO: 'Lesotho',
    MDG: 'Madagascar', MUS: 'Mauritius', REU: 'Reunion', GLP: 'Guadeloupe',
    MTQ: 'Martinique', GUF: 'French Guiana', PYF: 'French Polynesia',
    NCL: 'New Caledonia', FJI: 'Fiji', PNG: 'Papua New Guinea',
    PRI: 'Puerto Rico', BMU: 'Bermuda', CYM: 'Cayman Islands',
    BRB: 'Barbados', BHS: 'Bahamas', CUB: 'Cuba', HTI: 'Haiti',
  },

  /**
   * Convert a TADIG code to a country name.
   * e.g. "GBRCN" -> "United Kingdom", "DEUD1" -> "Germany"
   */
  _tadigShort: {
    GBR: 'UK', USA: 'US', DEU: 'DE', FRA: 'FR', ESP: 'ES', ITA: 'IT',
    NLD: 'NL', BEL: 'BE', PRT: 'PT', IRL: 'IE', CHE: 'CH', AUT: 'AT',
    SWE: 'SE', NOR: 'NO', DNK: 'DK', FIN: 'FI', POL: 'PL', CZE: 'CZ',
    HUN: 'HU', ROU: 'RO', BGR: 'BG', HRV: 'HR', SVK: 'SK', SVN: 'SI',
    LTU: 'LT', LVA: 'LV', EST: 'EE', LUX: 'LU', GRC: 'GR', TUR: 'TR',
    ARE: 'UAE', SAU: 'KSA', ZAF: 'SA', AUS: 'AU', NZL: 'NZ', CAN: 'CA',
    MEX: 'MX', BRA: 'BR', ARG: 'AR', CHN: 'CN', JPN: 'JP', KOR: 'KR',
    IND: 'IN', IDN: 'ID', THA: 'TH', MYS: 'MY', SGP: 'SG', PHL: 'PH',
    VNM: 'VN', TWN: 'TW', HKG: 'HK', RUS: 'RU', UKR: 'UA',
    DOM: 'Dom Rep', TTO: 'T&T', BIH: 'BiH', MKD: 'N. Macedonia',
  },

  tadigToCountry(tadig) {
    if (!tadig || tadig.length < 3) return tadig || 'Unknown';
    var prefix = tadig.substring(0, 3).toUpperCase();
    return this._tadigCountries[prefix] || tadig;
  },

  tadigToCountryShort(tadig) {
    if (!tadig || tadig.length < 3) return tadig || '?';
    var prefix = tadig.substring(0, 3).toUpperCase();
    return this._tadigShort[prefix] || this._tadigCountries[prefix] || tadig;
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
