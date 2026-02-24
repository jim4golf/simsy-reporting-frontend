/**
 * Cost Analysis view.
 * Margin analysis, cost-per-MB, top expensive ICCIDs,
 * bundle pricing table, and monthly revenue analysis.
 */
(() => {
  let pricingData = { prices: [] };
  let activeBundles = [];
  let tenantsList = [];
  let revFilterTenant = '';
  let revFilterCustomer = '';
  let revCustomersList = [];

  async function render(container) {
    container.innerHTML = Components.viewHeader({
      title: 'Cost Analysis',
      subtitle: 'Revenue, margin and per-device cost insights',
    }) + `
      <!-- KPI Cards -->
      <div id="cost-kpis" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        ${Array.from({length: 4}, () => '<div class="glass-card rounded-2xl p-5"><div class="loading-skeleton h-20 w-full"></div></div>').join('')}
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <div class="glass-card rounded-2xl p-5">
          <h3 class="font-display font-semibold text-simsy-white mb-1">Buy vs Sell Over Time</h3>
          <p class="text-xs text-simsy-grey mb-4">Last 30 days daily</p>
          <div class="h-64"><canvas id="cost-buysell-chart"></canvas></div>
        </div>
        <div class="glass-card rounded-2xl p-5">
          <h3 class="font-display font-semibold text-simsy-white mb-4">Top 10 Most Expensive ICCIDs</h3>
          <div id="cost-top-iccids">${Components.loading('Analysing costs...')}</div>
        </div>
      </div>

      <!-- Bundle Pricing & Revenue Section -->
      <div class="mt-8" id="pricing-revenue-section">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-display text-xl font-bold text-simsy-white">Bundle Pricing &amp; Revenue</h2>
            <p class="text-sm text-simsy-grey mt-1">Set monthly bundle prices and analyse revenue</p>
          </div>
        </div>

        <!-- Pricing Table (admin only) -->
        <div id="pricing-table-container" class="glass-card rounded-2xl p-5 mb-6" style="display:none">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display font-semibold text-simsy-white">Monthly Price by Bundle &amp; Tenant</h3>
            <div class="flex items-center gap-3">
              <span id="pricing-save-status" class="text-xs text-simsy-grey"></span>
              <button onclick="CostView._savePricing()" class="btn-primary text-xs py-2 px-4" id="save-pricing-btn">
                Save Prices
              </button>
            </div>
          </div>
          <div id="pricing-grid">${Components.loading('Loading pricing...')}</div>
        </div>

        <!-- Revenue Analysis -->
        <div class="glass-card rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-display font-semibold text-simsy-white">Revenue Analysis</h3>
          </div>
          <div id="revenue-filters" class="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-simsy-surface/50 border border-simsy-grey-dark/30">
            <svg class="w-4 h-4 text-simsy-grey flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span class="text-xs text-simsy-grey font-medium">Scope</span>
            <select id="rev-filter-tenant" class="filter-select text-sm" onchange="CostView._onRevTenantChange(this.value)">
              <option value="">All Tenants</option>
            </select>
            <select id="rev-filter-customer" class="filter-select text-sm" onchange="CostView._onRevCustomerChange(this.value)">
              <option value="">All Customers</option>
            </select>
          </div>
          <div id="revenue-table">${Components.loading('Calculating revenue...')}</div>
        </div>

        <!-- Revenue vs Wholesale Cost Chart -->
        <div class="glass-card rounded-2xl p-5 mt-6">
          <h3 class="font-display font-semibold text-simsy-white mb-1">Revenue vs Wholesale Cost</h3>
          <p class="text-xs text-simsy-grey mb-4">Monthly bundle revenue compared to actual data wholesale cost</p>
          <div class="h-80"><canvas id="revenue-cost-chart"></canvas></div>
        </div>
      </div>
    `;

    loadData();
  }

  async function loadData() {
    try {
      const [summary, records] = await Promise.all([
        API.get('/usage/summary', { group_by: 'daily', from: Utils.daysAgo(30) }),
        API.get('/usage/records', { per_page: 1000, from: Utils.daysAgo(30) }),
      ]);

      // KPIs
      const totalBuy = Number(summary.summary?.total_buy) || 0;
      const totalSell = Number(summary.summary?.total_sell) || 0;
      const totalBytes = Number(summary.summary?.total_bytes) || 0;
      const margin = totalSell - totalBuy;
      const marginPct = totalSell > 0 ? (margin / totalSell * 100).toFixed(1) : 0;
      const costPerMB = totalBytes > 0 ? totalBuy / (totalBytes / (1024 * 1024)) : 0;

      const kpiContainer = document.getElementById('cost-kpis');
      if (kpiContainer) {
        kpiContainer.innerHTML = [
          Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>', value: Utils.formatCurrency(totalBuy), label: 'Total Buy Cost', glowColor: 'orange' }),
          Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', value: Utils.formatCurrency(totalSell), label: 'Total Sell Revenue', glowColor: 'green' }),
          Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>', value: Utils.formatCurrency(margin) + ' (' + marginPct + '%)', label: 'Margin', glowColor: margin >= 0 ? 'green' : 'red' }),
          Components.statCard({ icon: '<svg class="w-5 h-5 text-simsy-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>', value: Utils.formatCurrency(costPerMB) + '/MB', label: 'Cost per MB', glowColor: 'purple' }),
        ].join('');
      }

      // Buy vs Sell chart
      const days = summary.data || [];
      Charts.createLineChart('cost-buysell-chart', {
        labels: days.map(d => Utils.formatChartDate(d.date)),
        datasets: [
          { label: 'Buy', data: days.map(d => Number(d.buy_total) || 0), color: 'orange', fill: false },
          { label: 'Sell', data: days.map(d => Number(d.sell_total) || 0), color: 'green', fill: false },
        ],
      });

      // Top expensive ICCIDs
      const byIccid = {};
      (records.data || []).forEach(r => {
        const iccid = r.iccid || 'Unknown';
        if (!byIccid[iccid]) byIccid[iccid] = { buy: 0, bytes: 0 };
        byIccid[iccid].buy += Number(r.buy_charge || 0);
        byIccid[iccid].bytes += Number(r.uplink_bytes || 0) + Number(r.downlink_bytes || 0);
      });

      const topIccids = Object.entries(byIccid)
        .sort((a, b) => b[1].buy - a[1].buy)
        .slice(0, 10)
        .map(([iccid, data]) => ({
          iccid,
          buy: data.buy,
          bytes: data.bytes,
          costPerMB: data.bytes > 0 ? data.buy / (data.bytes / (1024 * 1024)) : 0,
        }));

      const topContainer = document.getElementById('cost-top-iccids');
      if (topContainer) {
        topContainer.innerHTML = Components.table({
          columns: [
            { label: 'ICCID', render: r => `<span class="font-mono text-xs text-simsy-white" title="${Utils.escapeHtml(r.iccid)}">${Utils.truncateIccid(r.iccid)}</span>` },
            { label: 'Total Buy', render: r => Utils.formatCurrency(r.buy) },
            { label: 'Data Used', render: r => Utils.formatBytes(r.bytes) },
            { label: 'Cost/MB', render: r => Utils.formatCurrency(r.costPerMB) },
          ],
          rows: topIccids,
        });
      }
    } catch (err) {
      console.error('Cost analysis error:', err);
      const kpi = document.getElementById('cost-kpis');
      if (kpi) kpi.innerHTML = Components.errorState('Failed to load cost data: ' + err.message);
    }

    // Load pricing and revenue (non-blocking — doesn't affect KPI cards)
    loadPricingAndRevenue();
  }

  // ── Pricing & Revenue ────────────────────────────────────────────

  async function loadPricingAndRevenue() {
    try {
      const [tenantsRes, bundlesRes, customersRes] = await Promise.all([
        API.get('/filters/tenants', {}, true),
        API.getAll('/bundles', { status: 'Active' }),
        API.get('/filters/customers', {}, true),
      ]);

      tenantsList = tenantsRes.tenants || [];
      activeBundles = bundlesRes;
      revCustomersList = customersRes.customers || [];

      // Reset local filters on view render
      revFilterTenant = '';
      revFilterCustomer = '';

      populateRevenueFilters();

      // Show pricing table for admin users
      if (Auth.isAdmin()) {
        const pricingContainer = document.getElementById('pricing-table-container');
        if (pricingContainer) pricingContainer.style.display = 'block';

        try {
          const pricingRes = await API.get('/admin/pricing', {}, true);
          pricingData = pricingRes;
        } catch {
          pricingData = { prices: [] };
        }
        renderPricingTable();
      }

      loadRevenue();
      loadRevenueCostChart();
    } catch (err) {
      console.error('Pricing/revenue load error:', err);
      const container = document.getElementById('revenue-table');
      if (container) container.innerHTML = Components.errorState('Failed to load revenue data: ' + err.message);
    }
  }

  function populateRevenueFilters() {
    const tenantSelect = document.getElementById('rev-filter-tenant');
    if (tenantSelect) {
      tenantSelect.innerHTML = '<option value="">All Tenants</option>' +
        tenantsList.map(t =>
          '<option value="' + Utils.escapeHtml(t.tenant_id) + '"' +
          (t.tenant_id === revFilterTenant ? ' selected' : '') + '>' +
          Utils.escapeHtml(t.tenant_name || t.tenant_id) + '</option>'
        ).join('');
    }
    const customerSelect = document.getElementById('rev-filter-customer');
    if (customerSelect) {
      customerSelect.innerHTML = '<option value="">All Customers</option>' +
        revCustomersList.map(c =>
          '<option value="' + Utils.escapeHtml(c) + '"' +
          (c === revFilterCustomer ? ' selected' : '') + '>' +
          Utils.escapeHtml(c) + '</option>'
        ).join('');
    }
  }

  async function onRevTenantChange(value) {
    revFilterTenant = value;
    revFilterCustomer = '';
    // Reload customers scoped to this tenant
    try {
      const params = value ? { tenant_id: value } : {};
      const res = await API.get('/filters/customers', params, true);
      revCustomersList = res.customers || [];
    } catch { revCustomersList = []; }
    populateRevenueFilters();
    loadRevenue();
    loadRevenueCostChart();
  }

  function onRevCustomerChange(value) {
    revFilterCustomer = value;
    loadRevenue();
    loadRevenueCostChart();
  }

  function renderPricingTable() {
    const container = document.getElementById('pricing-grid');
    if (!container || activeBundles.length === 0) {
      if (container) container.innerHTML = '<p class="text-simsy-grey text-sm">No active bundles found.</p>';
      return;
    }

    // Build lookup: "tenant_id:bundle_moniker" → monthly_price
    const priceLookup = {};
    (pricingData.prices || []).forEach(p => {
      priceLookup[p.tenant_id + ':' + p.bundle_moniker] = p.monthly_price;
    });

    // Header: Bundle | Size | tenant1 | tenant2 | ...
    const headerCells = '<th class="text-left py-2 px-3 text-simsy-grey font-medium">Bundle</th>' +
      '<th class="text-left py-2 px-3 text-simsy-grey font-medium">Size</th>' +
      tenantsList.map(t =>
        '<th class="text-center py-2 px-3 text-simsy-grey font-medium">' + Utils.escapeHtml(t.tenant_name || t.tenant_id) + '</th>'
      ).join('');

    const bodyRows = activeBundles.map(b => {
      const moniker = b.bundle_moniker;
      const allowanceMb = b.allowance || Utils.parseAllowanceFromName(b.bundle_name);
      const sizeGb = allowanceMb > 0 ? (allowanceMb / 1024) : 0;
      const sizeLabel = sizeGb > 0 ? sizeGb + ' GB' : '-';

      const cells = tenantsList.map(t => {
        const key = t.tenant_id + ':' + moniker;
        const val = priceLookup[key] || '';
        return '<td class="text-center py-2 px-3">' +
          '<input type="number" step="0.01" min="0" ' +
          'class="pricing-input w-20 text-center bg-simsy-surface border border-simsy-grey-dark/40 rounded px-2 py-1 text-sm text-simsy-white focus:border-simsy-blue focus:outline-none" ' +
          'data-tenant="' + Utils.escapeHtml(t.tenant_id) + '" ' +
          'data-bundle="' + Utils.escapeHtml(moniker) + '" ' +
          'value="' + (val || '') + '" ' +
          'placeholder="0.00"></td>';
      }).join('');

      return '<tr class="border-b border-simsy-grey-dark/20 hover:bg-simsy-surface/30">' +
        '<td class="py-2 px-3 text-simsy-white font-medium text-sm">' + Utils.escapeHtml(b.bundle_name || '-') + '</td>' +
        '<td class="py-2 px-3 text-simsy-grey text-sm">' + sizeLabel + '</td>' +
        cells +
        '</tr>';
    }).join('');

    container.innerHTML = '<div class="overflow-x-auto">' +
      '<table class="w-full text-sm">' +
      '<thead><tr class="border-b border-simsy-grey-dark/30">' + headerCells + '</tr></thead>' +
      '<tbody>' + bodyRows + '</tbody>' +
      '</table>' +
      '<p class="text-xs text-simsy-grey mt-3">Enter the monthly charge per endpoint for each bundle and tenant combination.</p>' +
      '</div>';
  }

  async function savePricing() {
    const inputs = document.querySelectorAll('.pricing-input');
    const prices = [];
    inputs.forEach(input => {
      const val = parseFloat(input.value);
      if (val > 0) {
        prices.push({
          tenant_id: input.dataset.tenant,
          bundle_moniker: input.dataset.bundle,
          monthly_price: val,
        });
      }
    });

    const btn = document.getElementById('save-pricing-btn');
    const status = document.getElementById('pricing-save-status');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
      await API.put('/admin/pricing', { prices });
      pricingData = { prices };
      if (status) status.textContent = 'Saved ' + prices.length + ' prices';
      if (btn) { btn.textContent = 'Saved!'; btn.classList.add('opacity-70'); }

      // Refresh revenue and chart after pricing change
      API.clearCache();
      loadRevenue();
      loadRevenueCostChart();

      setTimeout(() => {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Prices'; btn.classList.remove('opacity-70'); }
        if (status) status.textContent = '';
      }, 3000);
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Save Prices'; }
      if (status) { status.textContent = 'Error: ' + err.message; status.classList.add('text-red-400'); }
    }
  }

  async function loadRevenue() {
    const container = document.getElementById('revenue-table');
    if (!container) return;
    container.innerHTML = Components.loading('Calculating revenue...');

    try {
      const params = { months: 1 };
      if (revFilterTenant) params.tenant_id = revFilterTenant;
      if (revFilterCustomer) params.customer = revFilterCustomer;
      const result = await API.get('/revenue/monthly', params, true);
      renderRevenueTable(result.data || []);
    } catch (err) {
      container.innerHTML = Components.errorState('Failed to load revenue: ' + err.message);
    }
  }

  async function loadRevenueCostChart() {
    try {
      const params = { months: 8 };
      if (revFilterTenant) params.tenant_id = revFilterTenant;
      if (revFilterCustomer) params.customer = revFilterCustomer;
      const result = await API.get('/revenue/cost-chart', params, true);
      const data = result.data || [];

      if (data.length === 0) return;

      const labels = data.map(d => {
        const dt = new Date(d.month + '-01');
        return dt.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      });

      Charts.createMixedChart('revenue-cost-chart', {
        labels,
        datasets: [
          { label: 'Revenue', data: data.map(d => d.revenue), color: 'green', type: 'bar' },
          { label: 'Wholesale Cost', data: data.map(d => d.wholesale_cost), color: 'orange', type: 'bar' },
          { label: 'Margin', data: data.map(d => d.margin), color: 'cyan', type: 'line' },
        ],
      });
    } catch (err) {
      console.error('Revenue cost chart error:', err);
    }
  }

  function renderRevenueTable(data) {
    const container = document.getElementById('revenue-table');
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = '<div class="text-center py-8">' +
        '<p class="text-simsy-grey">No revenue data available.</p>' +
        '<p class="text-xs text-simsy-grey mt-1">Set prices in the table above and ensure bundle instances exist.</p>' +
        '</div>';
      return;
    }

    // Group by tenant + customer + bundle (single month snapshot)
    const agg = {};
    data.forEach(row => {
      const key = row.tenant_id + ':' + (row.customer_name || 'Unknown') + ':' + row.bundle_moniker;
      if (!agg[key]) {
        agg[key] = {
          tenant_name: row.tenant_name,
          customer_name: row.customer_name || 'Unknown',
          bundle_name: row.bundle_name || row.bundle_moniker,
          bundle_moniker: row.bundle_moniker,
          allowance_gb: row.allowance_gb,
          monthly_price: row.monthly_price,
          endpoint_count: 0,
          revenue: 0,
        };
      }
      // Use max rather than sum to avoid double-counting across months
      agg[key].endpoint_count = Math.max(agg[key].endpoint_count, row.endpoint_count);
      agg[key].revenue = Math.max(agg[key].revenue, row.revenue);
    });

    // Sort: tenant → customer → bundle
    const rows = Object.values(agg).sort((a, b) =>
      (a.tenant_name || '').localeCompare(b.tenant_name || '') ||
      (a.customer_name || '').localeCompare(b.customer_name || '') ||
      (a.bundle_name || '').localeCompare(b.bundle_name || '')
    );

    let grandTotal = 0;
    let grandEndpoints = 0;

    let html = '<div class="overflow-x-auto"><table class="w-full text-sm">';
    html += '<thead><tr class="border-b border-simsy-grey-dark/30">' +
      '<th class="text-left py-2 px-3 text-simsy-grey font-medium">Tenant</th>' +
      '<th class="text-left py-2 px-3 text-simsy-grey font-medium">Customer</th>' +
      '<th class="text-left py-2 px-3 text-simsy-grey font-medium">Bundle</th>' +
      '<th class="text-right py-2 px-3 text-simsy-grey font-medium">Endpoints</th>' +
      '<th class="text-right py-2 px-3 text-simsy-grey font-medium">Size</th>' +
      '<th class="text-right py-2 px-3 text-simsy-grey font-medium">Monthly Price</th>' +
      '<th class="text-right py-2 px-3 text-simsy-grey font-medium">Revenue</th>' +
      '</tr></thead><tbody>';

    rows.forEach(row => {
      grandTotal += row.revenue;
      grandEndpoints += row.endpoint_count;
      html += '<tr class="border-b border-simsy-grey-dark/10 hover:bg-simsy-surface/20">' +
        '<td class="py-2 px-3 text-simsy-white">' + Utils.escapeHtml(row.tenant_name || '-') + '</td>' +
        '<td class="py-2 px-3 text-simsy-grey">' + Utils.escapeHtml(row.customer_name) + '</td>' +
        '<td class="py-2 px-3 text-simsy-grey">' + Utils.escapeHtml(row.bundle_name) + '</td>' +
        '<td class="py-2 px-3 text-right text-simsy-white">' + Utils.formatNumber(row.endpoint_count) + '</td>' +
        '<td class="py-2 px-3 text-right text-simsy-grey">' + row.allowance_gb.toFixed(0) + ' GB</td>' +
        '<td class="py-2 px-3 text-right text-simsy-grey">' + (row.monthly_price > 0 ? Utils.formatCurrency(row.monthly_price) : '<span class="text-simsy-grey/50">not set</span>') + '</td>' +
        '<td class="py-2 px-3 text-right font-medium ' + (row.revenue > 0 ? 'text-simsy-green' : 'text-simsy-grey/50') + '">' +
          (row.revenue > 0 ? Utils.formatCurrency(row.revenue) : '-') + '</td>' +
        '</tr>';
    });

    // Grand total
    html += '<tr class="bg-simsy-orange/10 border-t-2 border-simsy-orange/30">' +
      '<td colspan="3" class="py-3 px-3 text-right text-simsy-white font-bold">Total</td>' +
      '<td class="py-3 px-3 text-right text-simsy-white font-bold">' + Utils.formatNumber(grandEndpoints) + '</td>' +
      '<td class="py-3 px-3"></td>' +
      '<td class="py-3 px-3"></td>' +
      '<td class="py-3 px-3 text-right text-simsy-orange font-bold text-lg">' + Utils.formatCurrency(grandTotal) + '</td>' +
      '</tr>';

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  // Expose for onclick handlers
  window.CostView = {
    _savePricing: savePricing,
    _onRevTenantChange: onRevTenantChange,
    _onRevCustomerChange: onRevCustomerChange,
  };

  Router.register('cost', render);
})();
