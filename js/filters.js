/**
 * Global tenant/customer filter state.
 * Admin users see Tenant + Customer dropdowns that scope all data views.
 * Non-admin users see nothing — their data is already scoped by the backend.
 */
const Filters = (() => {
  let tenants = [];
  let customers = [];
  let selectedTenantId = '';
  let selectedCustomer = '';
  let loaded = false;

  /**
   * Load tenants from the API (called once on dashboard load).
   */
  async function init() {
    if (loaded) return;

    try {
      if (Auth.isAdmin()) {
        const data = await API.get('/filters/tenants', {}, true);
        tenants = data.tenants || [];
      }
      // Load customers for all roles (API scopes by tenant for non-admin)
      await loadCustomers();
      loaded = true;
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  }

  /**
   * Load customers — works for all roles. API scopes automatically.
   */
  async function loadCustomers() {
    try {
      const params = {};
      if (selectedTenantId) params.tenant_id = selectedTenantId;
      const data = await API.get('/filters/customers', params, true);
      customers = data.customers || [];
    } catch (err) {
      console.error('Failed to load customer filters:', err);
      customers = [];
    }
  }

  /**
   * Render the filter bar HTML.
   * Admin: Tenant + Customer dropdowns. Tenant-role: Customer dropdown only.
   */
  function renderBar() {
    if (!loaded) return '';
    // Need either tenants (admin) or customers (any role) to show bar
    if (!Auth.isAdmin() && customers.length === 0) return '';

    const customerOptions = customers.map(c =>
      '<option value="' + Utils.escapeHtml(c) + '" ' + (c === selectedCustomer ? 'selected' : '') + '>' + Utils.escapeHtml(c) + '</option>'
    ).join('');

    var tenantHtml = '';
    if (Auth.isAdmin() && tenants.length > 0) {
      const tenantOptions = tenants.map(t =>
        '<option value="' + Utils.escapeHtml(t.tenant_id) + '" ' + (t.tenant_id === selectedTenantId ? 'selected' : '') + '>' + Utils.escapeHtml(t.tenant_name || t.tenant_id) + '</option>'
      ).join('');
      tenantHtml = '<select id="filter-tenant" class="filter-select text-sm" onchange="Filters.onTenantChange(this.value)"><option value="">All Tenants</option>' + tenantOptions + '</select>';
    }

    return '<div class="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-simsy-surface/50 border border-simsy-grey-dark/30">' +
      '<div class="flex items-center gap-2">' +
        '<svg class="w-4 h-4 text-simsy-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>' +
        '<span class="text-xs font-semibold text-simsy-grey uppercase tracking-wider">Scope</span>' +
      '</div>' +
      tenantHtml +
      '<select id="filter-customer" class="filter-select text-sm" onchange="Filters.onCustomerChange(this.value)">' +
        '<option value="">All Customers</option>' + customerOptions +
      '</select>' +
      ((selectedTenantId || selectedCustomer) ? '<button onclick="Filters.clearAll()" class="text-xs text-simsy-grey hover:text-simsy-white transition-colors">\u2715 Clear</button>' : '') +
    '</div>';
  }

  /**
   * Get the current filter params to merge into API calls.
   * Returns {} if no filters are active.
   */
  function getParams() {
    const p = {};
    if (selectedTenantId) p.tenant_id = selectedTenantId;
    if (selectedCustomer) p.customer = selectedCustomer;
    return p;
  }

  /**
   * Get the selected tenant name for breadcrumb display.
   */
  function getSelectedTenantName() {
    if (!selectedTenantId) return '';
    const t = tenants.find(t => t.tenant_id === selectedTenantId);
    return t ? (t.tenant_name || t.tenant_id) : selectedTenantId;
  }

  /**
   * Get the selected customer name for breadcrumb display.
   */
  function getSelectedCustomerName() {
    return selectedCustomer || '';
  }

  /**
   * Update breadcrumb to show the active scope.
   */
  function updateBreadcrumb() {
    const orgEl = document.getElementById('breadcrumb-org');
    if (!orgEl) return;

    let parts = [Auth.getOrg()];
    if (selectedTenantId) parts.push(getSelectedTenantName());
    if (selectedCustomer) parts.push(selectedCustomer);
    orgEl.textContent = parts.join(' › ');
  }

  /**
   * Refresh the current view after filter change.
   */
  function refreshCurrentView() {
    updateBreadcrumb();
    // Re-render the current view by triggering a hash change
    const currentHash = window.location.hash.replace('#', '') || 'overview';
    Router._renderView(currentHash);
  }

  return {
    init,

    renderBar,
    getParams,
    getSelectedTenantName,
    getSelectedCustomerName,

    async onTenantChange(value) {
      selectedTenantId = value;
      selectedCustomer = ''; // reset customer when tenant changes
      API.clearCache(); // clear cache so new filters take effect
      await loadCustomers();
      refreshCurrentView();
    },

    onCustomerChange(value) {
      selectedCustomer = value;
      API.clearCache();
      refreshCurrentView();
    },

    clearAll() {
      selectedTenantId = '';
      selectedCustomer = '';
      customers = [];
      API.clearCache();
      refreshCurrentView();
    },

    /** Check if filters are loaded and available */
    isActive() {
      return loaded && (tenants.length > 0 || customers.length > 0);
    },
  };
})();
