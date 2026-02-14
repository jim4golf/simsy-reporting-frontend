/**
 * Active Bundles view.
 * Bundle catalog with expandable detail rows and efficiency scoring.
 */
(() => {
  let state = { page: 1, perPage: 50, statusFilter: '', expandedId: null };

  async function render(container) {
    container.innerHTML = Components.viewHeader({
      title: 'Active Bundles',
      subtitle: 'Bundle catalog and efficiency analysis',
    }) + `
      <div class="tab-group mb-4">
        <button class="tab-btn ${state.statusFilter === '' ? 'active' : ''}" onclick="BundlesView.filterStatus('')">All</button>
        <button class="tab-btn ${state.statusFilter === 'Active' ? 'active' : ''}" onclick="BundlesView.filterStatus('Active')">Active</button>
        <button class="tab-btn ${state.statusFilter === 'Provisioning' ? 'active' : ''}" onclick="BundlesView.filterStatus('Provisioning')">Provisioning</button>
        <button class="tab-btn ${state.statusFilter === 'Expired' ? 'active' : ''}" onclick="BundlesView.filterStatus('Expired')">Expired</button>
      </div>
      <div class="glass-card rounded-2xl p-5">
        <div id="bundles-table">${Components.loading('Loading bundles...')}</div>
        <div id="bundles-pagination"></div>
      </div>
      <div id="bundle-detail" class="mt-4"></div>
    `;

    loadPage(state.page);
  }

  async function loadPage(page) {
    const tableContainer = document.getElementById('bundles-table');
    const paginationContainer = document.getElementById('bundles-pagination');
    if (!tableContainer) return;

    state.page = page;
    const params = { page, per_page: state.perPage };
    if (state.statusFilter) params.status = state.statusFilter;

    try {
      const data = await API.get('/bundles', params, true);
      const rows = data.data || [];
      const pagination = data.pagination || {};

      if (rows.length === 0) {
        tableContainer.innerHTML = Components.emptyState('No bundles found');
        paginationContainer.innerHTML = '';
        return;
      }

      tableContainer.innerHTML = Components.table({
        columns: [
          { label: 'Bundle Name', render: r => `<span class="text-simsy-white font-medium">${Utils.escapeHtml(r.bundle_name || '-')}</span>` },
          { label: 'Moniker', render: r => `<span class="font-mono text-xs text-simsy-grey">${Utils.escapeHtml(r.bundle_moniker || '-')}</span>` },
          { label: 'Type', render: r => Utils.escapeHtml(r.bundle_type_name || '-') },
          { label: 'Offer', render: r => Utils.escapeHtml(r.offer_type_name || '-') },
          { label: 'Status', render: r => Components.statusBadge(r.status_name) },
          { label: 'Price', render: r => Utils.escapeHtml(r.formatted_price || '-') },
          { label: 'Allowance', render: r => r.allowance ? `${Utils.escapeHtml(String(r.allowance))} ${Utils.escapeHtml(r.allowance_moniker || '')}` : '-' },
          { label: 'From', render: r => Utils.formatDate(r.effective_from) },
          { label: 'To', render: r => Utils.formatDate(r.effective_to) },
          { label: '', render: r => `<button onclick="BundlesView.toggleDetail('${Utils.escapeHtml(r.bundle_id || r.id)}');event.stopPropagation();" class="text-simsy-blue hover:text-simsy-cyan text-xs">Details</button>` },
        ],
        rows,
      });

      paginationContainer.innerHTML = Components.pagination({
        page: pagination.page,
        totalPages: pagination.total_pages,
        total: pagination.total,
        perPage: pagination.per_page,
        onPageChange: 'BundlesView.goToPage',
      });
    } catch (err) {
      tableContainer.innerHTML = Components.errorState('Failed to load bundles: ' + err.message, 'BundlesView.refresh');
    }
  }

  async function showDetail(bundleId) {
    const detailContainer = document.getElementById('bundle-detail');
    if (!detailContainer) return;

    if (state.expandedId === bundleId) {
      state.expandedId = null;
      detailContainer.innerHTML = '';
      return;
    }

    state.expandedId = bundleId;
    detailContainer.innerHTML = Components.loading('Loading bundle details...');

    try {
      const data = await API.get(`/bundles/${encodeURIComponent(bundleId)}`);
      const bundle = data.bundle;
      const instances = data.instances || [];

      if (instances.length === 0) {
        detailContainer.innerHTML = `
          <div class="glass-card rounded-2xl p-5">
            <h3 class="font-display font-semibold text-simsy-white mb-2">${Utils.escapeHtml(bundle?.bundle_name || bundleId)}</h3>
            ${Components.emptyState('No instances found for this bundle')}
          </div>
        `;
        return;
      }

      const instanceRows = instances.map(inst => {
        const pctUsed = Utils.percentUsed(inst.data_used_mb, inst.data_allowance_mb);
        let efficiency = '';
        let effColor = '';
        if (inst.data_allowance_mb > 0) {
          if (pctUsed > 80) { efficiency = 'Optimal'; effColor = 'green'; }
          else if (pctUsed > 50) { efficiency = 'Adequate'; effColor = 'blue'; }
          else if (pctUsed > 20) { efficiency = 'Under-utilised'; effColor = 'orange'; }
          else { efficiency = 'Wasted'; effColor = 'red'; }
        }
        return { ...inst, _efficiency: efficiency, _effColor: effColor };
      });

      detailContainer.innerHTML = `
        <div class="glass-card rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display font-semibold text-simsy-white">${Utils.escapeHtml(bundle?.bundle_name || bundleId)} — Instances</h3>
            <span class="text-xs text-simsy-grey">${instances.length} instances</span>
          </div>
          ${Components.table({
            columns: [
              { label: 'ICCID', render: r => `<span class="font-mono text-xs">${Utils.truncateIccid(r.iccid)}</span>` },
              { label: 'Customer', render: r => Utils.escapeHtml(r.customer_name || '-') },
              { label: 'Seq', render: r => r.sequence != null ? `${r.sequence}/${r.sequence_max || '?'}` : '-' },
              { label: 'Data Usage', render: r => r.data_allowance_mb ? Components.dataProgressBar(r.data_used_mb, r.data_allowance_mb) : '-' },
              { label: 'Start', render: r => Utils.formatDate(r.start_time) },
              { label: 'End', render: r => Utils.formatDate(r.end_time) },
              { label: 'Efficiency', render: r => r._efficiency ? Components.badge(r._efficiency, r._effColor) : '-' },
              { label: 'Status', render: r => Components.statusBadge(r.status_name) },
            ],
            rows: instanceRows,
          })}
        </div>
      `;
    } catch (err) {
      detailContainer.innerHTML = Components.errorState('Failed to load bundle details: ' + err.message);
    }
  }

  window.BundlesView = {
    refresh() { render(document.getElementById('view-container')); },
    filterStatus(s) { state.statusFilter = s; state.page = 1; state.expandedId = null; render(document.getElementById('view-container')); },
    goToPage(p) { loadPage(p); },
    toggleDetail(id) { showDetail(id); },
  };

  Router.register('bundles', render);
})();
