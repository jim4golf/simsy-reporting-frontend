/**
 * Usage Reports view.
 * Paginated table with column toggle, ICCID drill-down, and date filters.
 */
(() => {
  let state = { page: 1, perPage: 50, filters: {} };

  // All available columns with default visibility
  const ALL_COLUMNS = [
    { key: 'iccid',    label: 'ICCID',     defaultOn: true,  render: r => '<span class="font-mono text-xs text-simsy-white cursor-pointer hover:text-simsy-cyan" onclick="UsageView.showIccidDetail(\'' + Utils.escapeHtml(r.iccid) + '\');event.stopPropagation();">' + Utils.escapeHtml(r.iccid || '-') + '</span>' },
    { key: 'endpoint', label: 'Endpoint',   defaultOn: true,  render: r => '<span class="text-simsy-white truncate max-w-[140px] inline-block">' + Utils.escapeHtml(r.endpoint_name || '-') + '</span>' },
    { key: 'customer', label: 'Customer',   defaultOn: true,  render: r => Utils.escapeHtml(r.customer_name || '-') },
    { key: 'timestamp',label: 'Timestamp',  defaultOn: true,  render: r => Utils.formatDate(r.timestamp) },
    { key: 'service',  label: 'Service',    defaultOn: true,  render: r => Utils.escapeHtml(r.service_type || '-') },
    { key: 'bundle',   label: 'Bundle',     defaultOn: true,  render: r => Utils.escapeHtml(r.bundle_moniker || r.bundle_name || '-') },
    { key: 'seq',      label: 'Seq',        defaultOn: true,  render: r => r.sequence != null ? r.sequence + '/' + (r.sequence_max || '?') : '-' },
    { key: 'data',     label: 'Data',       defaultOn: true,  render: r => Utils.formatBytes(Number(r.charged_consumption || 0)) },
    { key: 'operator', label: 'Operator',   defaultOn: true,  render: r => '<span class="truncate max-w-[100px] inline-block text-simsy-grey">' + Utils.escapeHtml(r.serving_operator_name || '-') + '</span>' },
    { key: 'country',  label: 'Country',    defaultOn: true,  render: r => Utils.escapeHtml(Utils.tadigToCountryShort(r.serving_country_name)) },
    { key: 'status',   label: 'Status',     defaultOn: true,  render: r => Components.statusBadge(r.status_moniker) },
    { key: 'buy',      label: 'Buy',        defaultOn: false, render: r => Utils.formatCurrency(r.buy_charge, r.buy_currency) },
    { key: 'sell',     label: 'Sell',       defaultOn: false, render: r => Utils.formatCurrency(r.sell_charge, r.sell_currency) },
    { key: 'rawbytes', label: 'Raw Bytes',  defaultOn: false, render: r => Utils.formatBytes(Number(r.uplink_bytes || 0) + Number(r.downlink_bytes || 0)) },
  ];

  const STORAGE_KEY = 'simsy_usage_columns';

  function getVisibleKeys() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return ALL_COLUMNS.filter(c => c.defaultOn).map(c => c.key);
  }

  function saveVisibleKeys(keys) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  }

  function getVisibleColumns() {
    const keys = getVisibleKeys();
    return ALL_COLUMNS.filter(c => keys.includes(c.key));
  }

  function renderColumnToggle() {
    const visible = new Set(getVisibleKeys());
    const checkboxes = ALL_COLUMNS.map(c => {
      const checked = visible.has(c.key) ? 'checked' : '';
      return '<label class="flex items-center gap-2 text-xs text-simsy-grey hover:text-simsy-white cursor-pointer py-0.5">' +
        '<input type="checkbox" ' + checked + ' onchange="UsageView.toggleColumn(\'' + c.key + '\', this.checked)" class="rounded border-simsy-grey-dark">' +
        c.label + '</label>';
    }).join('');

    return '<div class="relative inline-block">' +
      '<button onclick="document.getElementById(\'col-toggle-menu\').classList.toggle(\'hidden\')" class="btn-secondary text-xs py-2 px-3 flex items-center gap-1">' +
        '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>' +
        'Columns</button>' +
      '<div id="col-toggle-menu" class="hidden absolute right-0 top-full mt-1 z-50 glass-card rounded-xl p-3 min-w-[160px] space-y-1 shadow-xl border border-simsy-grey-dark/40">' +
        checkboxes +
      '</div></div>';
  }

  async function render(container) {
    const params = Router.getParams();
    if (params) state.filters = { ...state.filters, ...params };

    container.innerHTML = Components.viewHeader({
      title: 'Usage Reports',
      subtitle: 'Detailed data usage records',
    }) + Filters.renderBar() + `
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <input type="text" id="usage-filter-iccid" class="filter-input" placeholder="Filter by ICCID..." value="${state.filters.iccid || ''}" onkeydown="if(event.key==='Enter'){UsageView.search()}">
        <input type="date" id="usage-filter-from" class="filter-input" value="${state.filters.from || ''}">
        <input type="date" id="usage-filter-to" class="filter-input" value="${state.filters.to || ''}">
        <button onclick="UsageView.search()" class="btn-primary text-xs py-2 px-4">Search</button>
        <button onclick="UsageView.clear()" class="btn-secondary text-xs py-2 px-3">Clear</button>
        <div class="ml-auto">${renderColumnToggle()}</div>
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
    const params = { page, per_page: state.perPage, ...Filters.getParams() };
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
        columns: getVisibleColumns(),
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

  async function showIccidDetail(iccid) {
    const container = document.getElementById('view-container');
    container.innerHTML = Components.loading('Loading ICCID detail...');

    try {
      const fp = Filters.getParams();
      const [usageData, instancesData] = await Promise.all([
        API.get('/usage/records', { iccid, per_page: 200, ...fp }, true),
        API.get('/bundle-instances', { iccid, per_page: 200, ...fp }, true),
      ]);

      const usageRows = usageData.data || [];
      const instances = instancesData.data || [];

      // Compute aggregated stats from usage records
      let totalCharged = 0, totalUplink = 0, totalDownlink = 0, recordCount = usageRows.length;
      usageRows.forEach(r => {
        totalCharged += Number(r.charged_consumption || 0);
        totalUplink += Number(r.uplink_bytes || 0);
        totalDownlink += Number(r.downlink_bytes || 0);
      });

      const endpointName = usageRows.find(r => r.endpoint_name)?.endpoint_name || instances.find(r => r.endpoint_name)?.endpoint_name || '-';
      const customerName = usageRows.find(r => r.customer_name)?.customer_name || instances.find(r => r.customer_name)?.customer_name || '-';

      container.innerHTML = `
        <div class="mb-6">
          <button onclick="Router.navigate('usage')" class="text-sm text-simsy-blue hover:text-simsy-cyan mb-3 inline-flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            Back to Usage
          </button>
          <h1 class="font-display text-2xl font-bold text-simsy-white font-mono">${Utils.escapeHtml(iccid)}</h1>
          <p class="text-simsy-grey text-sm mt-1">${Utils.escapeHtml(endpointName)} &middot; ${Utils.escapeHtml(customerName)}</p>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          ${Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>', value: Utils.formatNumber(recordCount), label: 'Usage Records', glowColor: 'blue' })}
          ${Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>', value: Utils.formatBytes(totalCharged), label: 'Total Charged Data', glowColor: 'cyan' })}
          ${Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>', value: Utils.formatBytes(totalUplink + totalDownlink), label: 'Total Raw Bytes', glowColor: 'green' })}
          ${Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>', value: Utils.formatNumber(instances.length), label: 'Bundle Instances', glowColor: 'purple' })}
        </div>

        <!-- Bundle Instances for this ICCID -->
        ${instances.length > 0 ? `
        <div class="glass-card rounded-2xl p-5 mb-6">
          <h3 class="font-display font-semibold text-simsy-white mb-4">Bundle Instances</h3>
          <div id="iccid-instances"></div>
        </div>` : ''}

        <!-- Usage Records for this ICCID -->
        <div class="glass-card rounded-2xl p-5">
          <h3 class="font-display font-semibold text-simsy-white mb-4">Usage Records</h3>
          <div id="iccid-usage"></div>
        </div>
      `;

      // Render instances table
      if (instances.length > 0) {
        document.getElementById('iccid-instances').innerHTML = Components.table({
          columns: [
            { label: 'Bundle', render: r => Utils.escapeHtml(r.bundle_name || '-') },
            { label: 'Moniker', render: r => '<span class="font-mono text-xs text-simsy-grey">' + Utils.escapeHtml(r.bundle_moniker || '-') + '</span>' },
            { label: 'Seq', render: r => r.sequence != null ? r.sequence + '/' + (r.sequence_max || '?') : '-' },
            { label: 'Data Used', render: r => {
              if (r.data_used_mb != null && r.data_allowance_mb != null && r.data_allowance_mb > 0) {
                return Components.dataProgressBar(r.data_used_mb, r.data_allowance_mb);
              }
              if (r.data_used_mb != null && r.data_used_mb > 0) {
                return '<span class="text-xs text-simsy-white">' + Utils.formatMB(r.data_used_mb) + '</span>';
              }
              return '-';
            }},
            { label: 'Start', render: r => Utils.formatDate(r.start_time) },
            { label: 'End', render: r => Utils.formatDate(r.end_time) },
            { label: 'Days Left', render: r => { const d = Utils.daysUntil(r.end_time); if (d == null) return '-'; if (d < 0) return '<span class="text-simsy-grey-dark">' + d + 'd</span>'; if (d < 7) return '<span class="text-red-400 font-medium">' + d + 'd</span>'; return '<span class="text-simsy-grey">' + d + 'd</span>'; }},
            { label: 'Status', render: r => Components.statusBadge(Utils.computeInstanceStatus(r)) },
          ],
          rows: instances,
        });
      }

      // Render usage records table
      document.getElementById('iccid-usage').innerHTML = usageRows.length > 0 ? Components.table({
        columns: [
          { label: 'Timestamp', render: r => Utils.formatDate(r.timestamp) },
          { label: 'Service', render: r => Utils.escapeHtml(r.service_type || '-') },
          { label: 'Bundle', render: r => Utils.escapeHtml(r.bundle_moniker || r.bundle_name || '-') },
          { label: 'Seq', render: r => r.sequence != null ? r.sequence + '/' + (r.sequence_max || '?') : '-' },
          { label: 'Data', render: r => Utils.formatBytes(Number(r.charged_consumption || 0)) },
          { label: 'Operator', render: r => Utils.escapeHtml(r.serving_operator_name || '-') },
          { label: 'Country', render: r => Utils.escapeHtml(Utils.tadigToCountryShort(r.serving_country_name)) },
          { label: 'Status', render: r => Components.statusBadge(r.status_moniker) },
        ],
        rows: usageRows,
      }) : Components.emptyState('No usage records found for this ICCID');

    } catch (err) {
      container.innerHTML = Components.errorState('Failed to load ICCID detail: ' + err.message, 'UsageView.refresh');
    }
  }

  window.UsageView = {
    refresh() { render(document.getElementById('view-container')); },
    showIccidDetail(iccid) { showIccidDetail(iccid); },
    toggleColumn(key, isOn) {
      const keys = getVisibleKeys();
      if (isOn && !keys.includes(key)) {
        // Insert in original order
        const ordered = ALL_COLUMNS.filter(c => keys.includes(c.key) || c.key === key).map(c => c.key);
        saveVisibleKeys(ordered);
      } else if (!isOn) {
        saveVisibleKeys(keys.filter(k => k !== key));
      }
      loadPage(state.page);
    },
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
