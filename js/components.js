/**
 * Reusable UI component generators.
 * Each function returns an HTML string.
 */
const Components = {
  /**
   * Render a KPI stat card.
   */
  statCard({ icon, value, label, subtitle, change, changeColor, glowColor, onClick }) {
    const changeHtml = change != null ? `
      <span class="text-xs font-medium badge-${changeColor || 'green'} px-2 py-1 rounded-full">${change}</span>
    ` : '';
    const subtitleHtml = subtitle ? `<p class="text-xs text-simsy-grey-dark mt-0.5">${Utils.escapeHtml(subtitle)}</p>` : '';
    const clickClass = onClick ? ' stat-card-clickable' : '';
    const clickAttr = onClick ? ` onclick="${onClick}" role="button" tabindex="0"` : '';
    return `
      <div class="glass-card rounded-2xl p-5 stat-glow-${glowColor || 'blue'} transition-all duration-300${clickClass}"${clickAttr}>
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-simsy-${glowColor || 'blue'}/10 flex items-center justify-center">
            ${icon}
          </div>
          ${changeHtml}
        </div>
        <p class="text-2xl font-bold text-simsy-white font-display">${Utils.escapeHtml(value)}</p>
        <p class="text-sm text-simsy-grey mt-1">${Utils.escapeHtml(label)}</p>
        ${subtitleHtml}
      </div>
    `;
  },

  /**
   * Render a data table.
   */
  table({ columns, rows, rowClass }) {
    const ths = columns.map(c => `<th>${Utils.escapeHtml(c.label)}</th>`).join('');
    const trs = rows.map((row, idx) => {
      const cls = rowClass ? rowClass(row, idx) : '';
      const tds = columns.map(c => {
        const val = c.render ? c.render(row) : Utils.escapeHtml(row[c.key] ?? '-');
        return `<td>${val}</td>`;
      }).join('');
      return `<tr class="${cls}" ${row._clickAction ? `onclick="${row._clickAction}" style="cursor:pointer"` : ''}>${tds}</tr>`;
    }).join('');
    return `
      <div class="overflow-x-auto">
        <table class="w-full data-table text-sm">
          <thead><tr class="border-b border-simsy-grey-dark/30">${ths}</tr></thead>
          <tbody class="divide-y divide-simsy-grey-dark/20">${trs}</tbody>
        </table>
      </div>
    `;
  },

  /**
   * Render pagination controls.
   */
  pagination({ page, totalPages, total, perPage, onPageChange }) {
    if (totalPages <= 1) return '';
    const from = (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);

    let buttons = '';
    // First
    buttons += `<button class="pagination-btn" onclick="${onPageChange}(1)" ${page <= 1 ? 'disabled' : ''} title="First page">&laquo;</button>`;
    // Previous
    buttons += `<button class="pagination-btn" onclick="${onPageChange}(${page - 1})" ${page <= 1 ? 'disabled' : ''}>&lsaquo; Prev</button>`;

    // Page numbers (show up to 5)
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) {
      buttons += `<button class="pagination-btn ${i === page ? 'active' : ''}" onclick="${onPageChange}(${i})">${i}</button>`;
    }

    // Next
    buttons += `<button class="pagination-btn" onclick="${onPageChange}(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>Next &rsaquo;</button>`;
    // Last
    buttons += `<button class="pagination-btn" onclick="${onPageChange}(${totalPages})" ${page >= totalPages ? 'disabled' : ''} title="Last page">&raquo;</button>`;

    return `
      <div class="flex items-center justify-between mt-4">
        <span class="text-xs text-simsy-grey">Showing ${from}-${to} of ${Utils.formatNumber(total)}</span>
        <div class="flex items-center gap-1">${buttons}</div>
      </div>
    `;
  },

  /**
   * Render a badge pill.
   */
  badge(text, color) {
    if (!text) return '-';
    return `<span class="badge badge-${color || 'grey'}">${Utils.escapeHtml(text)}</span>`;
  },

  /**
   * Get badge color for status strings.
   */
  statusBadge(status) {
    if (!status) return this.badge('-', 'grey');
    const s = status.toLowerCase();
    if (s === 'live') return this.badge(status, 'live');
    if (s === 'terminated') return this.badge(status, 'grey');
    if (s === 'depleted') return this.badge(status, 'red');
    if (s.includes('active') || s === 'enabled') return this.badge(status, 'green');
    if (s.includes('pending') || s.includes('provisioning')) return this.badge(status, 'blue');
    if (s.includes('expir') || s.includes('suspend')) return this.badge(status, 'orange');
    if (s.includes('deplet') || s.includes('exhaust') || s.includes('deactivat') || s.includes('disabled')) return this.badge(status, 'red');
    if (s.includes('completed') || s.includes('used')) return this.badge(status, 'grey');
    return this.badge(status, 'grey');
  },

  /**
   * Render a progress bar.
   */
  progressBar(percent, color) {
    const p = Math.min(Math.max(percent || 0, 0), 100);
    const gradients = {
      blue: 'from-simsy-blue to-simsy-cyan',
      green: 'from-simsy-green to-simsy-green',
      orange: 'from-simsy-orange to-simsy-orange',
      red: 'from-red-500 to-red-400',
      purple: 'from-simsy-purple to-simsy-purple',
      cyan: 'from-simsy-cyan to-simsy-green',
    };
    const grad = gradients[color] || gradients.blue;
    return `
      <div class="progress-bar-track">
        <div class="progress-bar-fill bg-gradient-to-r ${grad}" style="width: ${p}%"></div>
      </div>
    `;
  },

  /**
   * Render a data usage progress bar with label.
   */
  dataProgressBar(usedMB, totalMB) {
    const pct = Utils.percentUsed(usedMB, totalMB);
    let color = 'green';
    if (pct >= 100) color = 'red';
    else if (pct >= 90) color = 'orange';
    else if (pct >= 75) color = 'blue';

    return `
      <div class="flex items-center gap-2 min-w-[140px]">
        <div class="flex-1">${this.progressBar(pct, color)}</div>
        <span class="text-xs text-simsy-grey whitespace-nowrap">${Utils.formatMB(usedMB)} / ${Utils.formatMB(totalMB)}</span>
      </div>
    `;
  },

  /**
   * Render a health indicator dot.
   */
  healthDot(status) {
    const cls = status === 'green' ? 'health-green' : status === 'amber' ? 'health-amber' : 'health-red';
    return `<span class="health-dot ${cls}"></span>`;
  },

  /**
   * Render an alert card.
   */
  alertCard({ severity, title, message, details }) {
    const cls = severity === 'critical' ? 'alert-critical' : severity === 'warning' ? 'alert-warning' : 'alert-info';
    const iconColor = severity === 'critical' ? 'text-red-400' : severity === 'warning' ? 'text-simsy-orange' : 'text-simsy-blue';
    return `
      <div class="alert-card ${cls}">
        <svg class="w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-simsy-white">${Utils.escapeHtml(title)}</p>
          <p class="text-xs text-simsy-grey mt-0.5">${Utils.escapeHtml(message)}</p>
          ${details ? `<p class="text-xs text-simsy-grey-dark mt-1">${Utils.escapeHtml(details)}</p>` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Render loading spinner.
   */
  loading(message) {
    return `
      <div class="flex flex-col items-center justify-center py-16 gap-4">
        <div class="spinner"></div>
        <p class="text-sm text-simsy-grey">${Utils.escapeHtml(message || 'Loading...')}</p>
      </div>
    `;
  },

  /**
   * Render loading skeleton rows.
   */
  skeletonRows(count, cols) {
    const rows = Array.from({ length: count }, () => {
      const tds = Array.from({ length: cols }, () =>
        `<td class="py-3 px-2"><div class="loading-skeleton h-4 w-full"></div></td>`
      ).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return rows;
  },

  /**
   * Render empty state.
   */
  emptyState(message) {
    return `
      <div class="flex flex-col items-center justify-center py-16 gap-3">
        <svg class="w-12 h-12 text-simsy-grey-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
        </svg>
        <p class="text-sm text-simsy-grey">${Utils.escapeHtml(message || 'No data found')}</p>
      </div>
    `;
  },

  /**
   * Render error state.
   */
  errorState(message, retryFn) {
    return `
      <div class="error-banner">
        <svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div class="flex-1">
          <p class="text-sm text-red-400">${Utils.escapeHtml(message)}</p>
        </div>
        ${retryFn ? `<button onclick="${retryFn}()" class="btn-secondary text-xs">Retry</button>` : ''}
      </div>
    `;
  },

  /**
   * Render a view header with optional date range and refresh.
   */
  viewHeader({ title, subtitle, showDateRange, showRefresh, onRefresh, onDateChange, currentRange }) {
    let dateHtml = '';
    if (showDateRange) {
      const options = Object.entries(CONFIG.DATE_RANGES).map(([key, { label }]) =>
        `<option value="${key}" ${key === currentRange ? 'selected' : ''}>${label}</option>`
      ).join('');
      dateHtml = `
        <div class="flex items-center gap-2 px-4 py-2 rounded-xl bg-simsy-surface border border-simsy-grey-dark/40 text-sm">
          <svg class="w-4 h-4 text-simsy-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <select onchange="${onDateChange}(this.value)" class="bg-transparent text-simsy-grey border-none outline-none cursor-pointer text-sm">
            ${options}
          </select>
        </div>
      `;
    }
    const refreshHtml = showRefresh ? `
      <button onclick="${onRefresh}()" class="p-2.5 rounded-xl bg-simsy-surface border border-simsy-grey-dark/40 text-simsy-grey hover:text-simsy-blue transition-colors" title="Refresh">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      </button>
    ` : '';

    return `
      <div class="mb-6 fade-in">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="font-display text-2xl font-bold text-simsy-white">${Utils.escapeHtml(title)}</h1>
            ${subtitle ? `<p class="text-simsy-grey text-sm mt-1">${Utils.escapeHtml(subtitle)}</p>` : ''}
          </div>
          <div class="flex items-center gap-3">
            ${dateHtml}
            ${refreshHtml}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render a filter bar.
   */
  filterBar(filters) {
    const fields = filters.map(f => {
      if (f.type === 'text') {
        return `<input type="text" id="${f.id}" class="filter-input" placeholder="${f.placeholder || ''}" value="${f.value || ''}" onkeydown="if(event.key==='Enter'){${f.onSubmit}()}">`;
      }
      if (f.type === 'date') {
        return `<input type="date" id="${f.id}" class="filter-input" value="${f.value || ''}">`;
      }
      if (f.type === 'select') {
        const opts = f.options.map(o => `<option value="${o.value}" ${o.value === f.value ? 'selected' : ''}>${o.label}</option>`).join('');
        return `<select id="${f.id}" class="filter-select">${opts}</select>`;
      }
      return '';
    }).join('');

    return `
      <div class="flex flex-wrap items-center gap-3 mb-4">
        ${fields}
        <button onclick="${filters[0]?.onSubmit}()" class="btn-primary text-xs py-2 px-4">Search</button>
        <button onclick="${filters[0]?.onClear}()" class="btn-secondary text-xs py-2 px-3">Clear</button>
      </div>
    `;
  },
};
