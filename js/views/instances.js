/**
 * Bundle Instances view — BUSINESS CRITICAL.
 * Depletion tracking, expiry alerts, final bundle warnings.
 */
(() => {
  let state = { page: 1, perPage: 50, filters: {} };

  async function render(container) {
    const routerParams = Router.getParams() || {};
    // Merge router params — if filters were passed from dashboard navigation, apply them
    if (routerParams.filters) {
      state = { page: 1, perPage: 50, filters: { ...routerParams.filters } };
    } else {
      state = { page: state.page || 1, perPage: 50, filters: state.filters || {}, ...routerParams };
    }

    // Build filter banner if navigated from dashboard with final_only
    const filterBanner = state.filters.final_only ? `
      <div class="filter-banner">
        <p>Showing final bundle instances expiring within 30 days</p>
        <button onclick="InstancesView.clear()" class="btn-secondary text-xs py-1.5 px-3">Clear Filter</button>
      </div>
    ` : '';

    container.innerHTML = Components.viewHeader({
      title: 'Bundle Report',
      subtitle: 'Monitor bundle lifecycle, depletion and expiry',
    }) + Filters.renderBar() + filterBanner + `
      <!-- Summary Cards -->
      <div id="instance-summary" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        ${Array.from({length: 4}, () => '<div class="glass-card rounded-2xl p-4"><div class="loading-skeleton h-16 w-full"></div></div>').join('')}
      </div>

      <!-- Status Tabs -->
      <div class="tab-group mb-4">
        ${['', 'Live', 'Active', 'Depleted', 'Terminated'].map(function(s) {
          var label = s || 'All';
          var cls = (state.filters.status || '') === s ? 'active' : '';
          return '<button class="tab-btn ' + cls + '" onclick="InstancesView.filterStatus(\'' + s + '\')">' + label + '</button>';
        }).join('')}
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <input type="text" id="inst-filter-iccid" class="filter-input" placeholder="Filter by ICCID..." value="${state.filters.iccid || ''}">
        <input type="date" id="inst-filter-expiring" class="filter-input" placeholder="Expiring before...">
        <button onclick="InstancesView.search()" class="btn-primary text-xs py-2 px-4">Search</button>
        <button onclick="InstancesView.clear()" class="btn-secondary text-xs py-2 px-3">Clear</button>
      </div>

      <!-- Table -->
      <div class="glass-card rounded-2xl p-5">
        <div id="instances-table">${Components.loading('Loading bundle instances...')}</div>
        <div id="instances-pagination"></div>
      </div>
    `;

    loadSummary();
    loadPage(state.page);
  }

  async function loadSummary() {
    const container = document.getElementById('instance-summary');
    if (!container) return;

    try {
      const fp = Filters.getParams();
      const [active, expiring7d, allActive] = await Promise.all([
        API.get('/bundle-instances', { status: 'Active', per_page: 1, ...fp }),
        API.get('/bundle-instances', { status: 'Active', expiring_before: Utils.daysFromNow(7), per_page: 1, ...fp }),
        API.get('/bundle-instances', { status: 'Active', per_page: 1000, ...fp }),
      ]);

      const instances = allActive.data || [];
      let depleted = 0, finalExpiring = 0;
      instances.forEach(inst => {
        if (Utils.percentUsed(inst.data_used_mb, inst.data_allowance_mb) >= 100) depleted++;
        const dl = Utils.daysUntil(inst.end_time);
        if (inst.sequence === inst.sequence_max && dl != null && dl >= 0 && dl <= 30) finalExpiring++;
      });

      container.innerHTML = [
        Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>', value: Utils.formatNumber(active?.pagination?.total || 0), label: 'Active Instances', glowColor: 'blue' }),
        Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', value: Utils.formatNumber(expiring7d?.pagination?.total || 0), label: 'Expiring in 7 Days', glowColor: 'orange' }),
        Components.statCard({ icon: '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>', value: Utils.formatNumber(depleted), label: 'Depleted', glowColor: 'red' }),
        Components.statCard({ icon: '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>', value: Utils.formatNumber(finalExpiring), label: 'Final Bundles Expiring', glowColor: 'red' }),
      ].join('');
    } catch (err) {
      container.innerHTML = Components.errorState('Failed to load summary: ' + err.message);
    }
  }

  async function loadPage(page) {
    const tableContainer = document.getElementById('instances-table');
    const paginationContainer = document.getElementById('instances-pagination');
    if (!tableContainer) return;

    state.page = page;
    const params = { page, per_page: state.perPage, ...Filters.getParams() };
    if (state.filters.iccid) params.iccid = state.filters.iccid;
    if (state.filters.status) params.status = state.filters.status;
    if (state.filters.expiring_before) params.expiring_before = state.filters.expiring_before;
    if (state.filters.final_only) params.final_only = 'true';

    try {
      const data = await API.get('/bundle-instances', params, true);
      const rows = data.data || [];
      const pagination = data.pagination || {};

      if (rows.length === 0) {
        tableContainer.innerHTML = Components.emptyState('No bundle instances found');
        paginationContainer.innerHTML = '';
        return;
      }

      tableContainer.innerHTML = Components.table({
        columns: [
          { label: 'ICCID', render: r => `<span class="font-mono text-xs text-simsy-white" title="${Utils.escapeHtml(r.iccid)}">${Utils.truncateIccid(r.iccid)}</span>` },
          { label: 'Endpoint', render: r => Utils.escapeHtml(r.endpoint_name || '-') },
          { label: 'Customer', render: r => Utils.escapeHtml(r.customer_name || '-') },
          { label: 'Bundle', render: r => Utils.escapeHtml(r.bundle_name || '-') },
          { label: 'Seq', render: r => r.sequence != null ? `${r.sequence}/${r.sequence_max || '?'}` : '-' },
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
          { label: 'Days Left', render: r => {
            const d = Utils.daysUntil(r.end_time);
            if (d == null) return '-';
            if (d < 0) return `<span class="text-simsy-grey-dark">${d}d</span>`;
            if (d < 7) return `<span class="text-red-400 font-medium">${d}d</span>`;
            if (d < 14) return `<span class="text-simsy-orange font-medium">${d}d</span>`;
            return `<span class="text-simsy-grey">${d}d</span>`;
          }},
          { label: 'Status', render: r => Components.statusBadge(Utils.computeInstanceStatus(r)) },
        ],
        rows,
        rowClass: (r) => {
          const pctUsed = Utils.percentUsed(r.data_used_mb, r.data_allowance_mb);
          const daysLeft = Utils.daysUntil(r.end_time);
          const isFinal = r.sequence != null && r.sequence === r.sequence_max;

          if (pctUsed >= 100) return 'row-critical';
          if (isFinal && daysLeft != null && daysLeft >= 0 && daysLeft < 7) return 'row-critical';
          if (daysLeft != null && daysLeft >= 0 && daysLeft < 14) return 'row-warning';
          if (pctUsed > 85) return 'row-warning';
          return '';
        },
      });

      paginationContainer.innerHTML = Components.pagination({
        page: pagination.page,
        totalPages: pagination.total_pages,
        total: pagination.total,
        perPage: pagination.per_page,
        onPageChange: 'InstancesView.goToPage',
      });
    } catch (err) {
      tableContainer.innerHTML = Components.errorState('Failed to load instances: ' + err.message, 'InstancesView.refresh');
    }
  }

  window.InstancesView = {
    refresh() { render(document.getElementById('view-container')); },
    filterStatus(s) {
      state.filters.status = s;
      state.page = 1;
      render(document.getElementById('view-container'));
    },
    search() {
      state.filters.iccid = document.getElementById('inst-filter-iccid')?.value || '';
      state.filters.expiring_before = document.getElementById('inst-filter-expiring')?.value || '';
      state.page = 1;
      loadPage(1);
    },
    clear() {
      state.filters = {};
      state.page = 1;
      render(document.getElementById('view-container'));
    },
    goToPage(p) { loadPage(p); },
  };

  Router.register('instances', render);
})();
