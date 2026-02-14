/**
 * Usage Reports view.
 * Paginated table of usage records with ICCID and date filters.
 */
(() => {
  let state = { page: 1, perPage: 50, filters: {} };

  async function render(container) {
    const params = Router.getParams();
    if (params) state.filters = { ...state.filters, ...params };

    container.innerHTML = Components.viewHeader({
      title: 'Usage Reports',
      subtitle: 'Detailed data usage records',
    }) + `
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <input type="text" id="usage-filter-iccid" class="filter-input" placeholder="Filter by ICCID..." value="${state.filters.iccid || ''}" onkeydown="if(event.key==='Enter'){UsageView.search()}">
        <input type="date" id="usage-filter-from" class="filter-input" value="${state.filters.from || ''}">
        <input type="date" id="usage-filter-to" class="filter-input" value="${state.filters.to || ''}">
        <button onclick="UsageView.search()" class="btn-primary text-xs py-2 px-4">Search</button>
        <button onclick="UsageView.clear()" class="btn-secondary text-xs py-2 px-3">Clear</button>
      </div>
      <div class="glass-card rounded-2xl p-5">
        <div id="usage-table">${Components.loading('Loading usage records...')}</div>
        <div id="usage-pagination"></div>
      </div>
    `;

    loadPage(state.page);
  }

  async function loadPage(page) {
    const tableContainer = document.getElementById('usage-table');
    const paginationContainer = document.getElementById('usage-pagination');
    if (!tableContainer) return;

    state.page = page;
    const params = { page, per_page: state.perPage };
    if (state.filters.iccid) params.iccid = state.filters.iccid;
    if (state.filters.from) params.from = state.filters.from;
    if (state.filters.to) params.to = state.filters.to;

    try {
      const data = await API.get('/usage/records', params, true);
      const rows = data.data || [];
      const pagination = data.pagination || {};

      if (rows.length === 0) {
        tableContainer.innerHTML = Components.emptyState('No usage records found');
        paginationContainer.innerHTML = '';
        return;
      }

      tableContainer.innerHTML = Components.table({
        columns: [
          { label: 'ICCID', render: r => `<span class="font-mono text-xs text-simsy-white cursor-pointer hover:text-simsy-cyan" onclick="Router.navigate('instances',{iccid:'${Utils.escapeHtml(r.iccid)}'});event.stopPropagation();" title="${Utils.escapeHtml(r.iccid)}">${Utils.truncateIccid(r.iccid)}</span>` },
          { label: 'Endpoint', render: r => `<span class="text-simsy-white truncate max-w-[120px] inline-block">${Utils.escapeHtml(r.endpoint_name || '-')}</span>` },
          { label: 'Customer', render: r => Utils.escapeHtml(r.customer_name || '-') },
          { label: 'Timestamp', render: r => Utils.formatDate(r.timestamp) },
          { label: 'Service', render: r => Utils.escapeHtml(r.service_type || '-') },
          { label: 'Data', render: r => Utils.formatBytes(Number(r.uplink_bytes || 0) + Number(r.downlink_bytes || 0)) },
          { label: 'Buy', render: r => Utils.formatCurrency(r.buy_charge, r.buy_currency) },
          { label: 'Sell', render: r => Utils.formatCurrency(r.sell_charge, r.sell_currency) },
          { label: 'Operator', render: r => `<span class="truncate max-w-[100px] inline-block text-simsy-grey">${Utils.escapeHtml(r.serving_operator_name || '-')}</span>` },
          { label: 'Country', render: r => Utils.escapeHtml(r.serving_country_name || '-') },
          { label: 'Status', render: r => Components.statusBadge(r.status_moniker) },
        ],
        rows,
      });

      paginationContainer.innerHTML = Components.pagination({
        page: pagination.page,
        totalPages: pagination.total_pages,
        total: pagination.total,
        perPage: pagination.per_page,
        onPageChange: 'UsageView.goToPage',
      });
    } catch (err) {
      tableContainer.innerHTML = Components.errorState('Failed to load records: ' + err.message, 'UsageView.refresh');
    }
  }

  window.UsageView = {
    refresh() { render(document.getElementById('view-container')); },
    search() {
      state.filters.iccid = document.getElementById('usage-filter-iccid')?.value || '';
      state.filters.from = document.getElementById('usage-filter-from')?.value || '';
      state.filters.to = document.getElementById('usage-filter-to')?.value || '';
      state.page = 1;
      loadPage(1);
    },
    clear() {
      state.filters = {};
      ['usage-filter-iccid', 'usage-filter-from', 'usage-filter-to'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      loadPage(1);
    },
    goToPage(p) { loadPage(p); },
  };

  Router.register('usage', render);
})();
