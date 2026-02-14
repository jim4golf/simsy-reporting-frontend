/**
 * Dashboard Overview view.
 * KPI cards, usage chart, bundle health doughnut, alerts panel, top endpoints.
 */
(() => {
  let state = { dateRange: '30d' };

  async function render(container) {
    const days = CONFIG.DATE_RANGES[state.dateRange]?.days || 30;
    const from = Utils.daysAgo(days);
    const to = Utils.today();

    container.innerHTML = Components.viewHeader({
      title: 'Dashboard',
      subtitle: 'Overview of your network reporting data',
      showDateRange: true,
      showRefresh: true,
      onRefresh: 'OverviewView.refresh',
      onDateChange: 'OverviewView.changeDateRange',
      currentRange: state.dateRange,
    }) + `
      <!-- KPI Cards -->
      <div id="kpi-cards" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        ${Array.from({length: 4}, () => '<div class="glass-card rounded-2xl p-5"><div class="loading-skeleton h-20 w-full"></div></div>').join('')}
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div class="xl:col-span-2 glass-card rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-display font-semibold text-simsy-white">Data Usage</h3>
              <p class="text-xs text-simsy-grey mt-0.5" id="chart-subtitle">Last ${days} days</p>
            </div>
            <div class="tab-group">
              <button class="tab-btn active" onclick="OverviewView.changeGroupBy('daily')">Daily</button>
              <button class="tab-btn" onclick="OverviewView.changeGroupBy('monthly')">Monthly</button>
              <button class="tab-btn" onclick="OverviewView.changeGroupBy('annual')">Annual</button>
            </div>
          </div>
          <div class="h-64"><canvas id="overview-usage-chart"></canvas></div>
        </div>
        <div class="glass-card rounded-2xl p-5">
          <div class="mb-4">
            <h3 class="font-display font-semibold text-simsy-white">Bundle Health</h3>
            <p class="text-xs text-simsy-grey mt-0.5">Active instance data consumption</p>
          </div>
          <div class="h-48 flex items-center justify-center"><canvas id="overview-bundle-chart"></canvas></div>
          <div id="bundle-legend" class="mt-4 space-y-2"></div>
        </div>
      </div>

      <!-- Alerts Panel -->
      <div id="alerts-panel" class="mb-6"></div>

      <!-- Top Endpoints -->
      <div class="glass-card rounded-2xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display font-semibold text-simsy-white">Top Endpoints by Usage</h3>
            <p class="text-xs text-simsy-grey mt-0.5">28-day rolling period</p>
          </div>
          <a href="#endpoints" class="text-xs text-simsy-blue hover:text-simsy-cyan transition-colors">View All &rarr;</a>
        </div>
        <div id="top-endpoints" class="space-y-3">
          ${Array.from({length: 5}, () => '<div class="loading-skeleton h-10 w-full mb-2"></div>').join('')}
        </div>
      </div>

      <!-- Sync Status -->
      <div class="mt-6 glass-card-static rounded-2xl p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-simsy-green animate-pulse"></div>
          <span class="text-sm text-simsy-grey">Data synced via Cloudflare Workers</span>
        </div>
        <span class="text-xs text-simsy-grey-dark">Powered by Hyperdrive + PostgreSQL</span>
      </div>
    `;

    // Load data in parallel
    loadKPIs(from, to);
    loadUsageChart(from, to, 'daily');
    loadBundleHealth();
    loadAlerts();
    loadTopEndpoints();
  }

  async function loadKPIs(from, to) {
    const container = document.getElementById('kpi-cards');
    if (!container) return;

    try {
      const [usage, bundles, endpoints, expiring] = await Promise.all([
        API.get('/usage/summary', { group_by: 'daily', from, to }),
        API.get('/bundles', { status: 'Active', per_page: 1 }),
        API.get('/endpoints', { per_page: 1 }),
        API.get('/bundle-instances', { status: 'Active', expiring_before: Utils.daysFromNow(30), per_page: 1 }),
      ]);

      const totalBytes = usage?.summary?.total_bytes || 0;
      const activeBundles = bundles?.pagination?.total || 0;
      const activeEndpoints = endpoints?.pagination?.total || 0;
      const expiringSoon = expiring?.pagination?.total || 0;

      container.innerHTML = [
        Components.statCard({
          icon: '<svg class="w-5 h-5 text-simsy-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>',
          value: Utils.formatBytes(totalBytes),
          label: 'Total Data Usage',
          glowColor: 'blue',
        }),
        Components.statCard({
          icon: '<svg class="w-5 h-5 text-simsy-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>',
          value: Utils.formatNumber(activeBundles),
          label: 'Active Bundles',
          glowColor: 'green',
        }),
        Components.statCard({
          icon: '<svg class="w-5 h-5 text-simsy-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>',
          value: Utils.formatNumber(activeEndpoints),
          label: 'Active Endpoints',
          glowColor: 'purple',
        }),
        Components.statCard({
          icon: '<svg class="w-5 h-5 text-simsy-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
          value: Utils.formatNumber(expiringSoon),
          label: 'Expiring in 30 Days',
          glowColor: 'orange',
        }),
      ].join('');
    } catch (err) {
      container.innerHTML = Components.errorState('Failed to load KPIs: ' + err.message, 'OverviewView.refresh');
    }
  }

  async function loadUsageChart(from, to, groupBy) {
    try {
      const data = await API.get('/usage/summary', { group_by: groupBy, from, to });
      const labels = (data.data || []).map(d => Utils.formatChartDate(d.date));
      const values = (data.data || []).map(d => Number(d.total_bytes) / (1024 * 1024 * 1024)); // GB

      Charts.createLineChart('overview-usage-chart', {
        labels,
        datasets: [{ label: 'Data Usage (GB)', data: values, color: 'blue' }],
        yLabel: 'GB',
      });

      // Update toggle active state
      document.querySelectorAll('#view-container .tab-btn').forEach(btn => {
        const btnGroup = btn.textContent.trim().toLowerCase();
        btn.classList.toggle('active', btnGroup === groupBy);
      });
    } catch (err) {
      console.error('Chart load error:', err);
    }
  }

  async function loadBundleHealth() {
    try {
      const data = await API.get('/bundle-instances', { status: 'Active', per_page: 1000 });
      const instances = data.data || [];

      let healthy = 0, low = 0, critical = 0, depleted = 0;
      instances.forEach(inst => {
        const pct = Utils.percentUsed(inst.data_used_mb, inst.data_allowance_mb);
        if (pct >= 100) depleted++;
        else if (pct >= 90) critical++;
        else if (pct >= 50) low++;
        else healthy++;
      });

      Charts.createDoughnutChart('overview-bundle-chart', {
        labels: ['Healthy', 'Moderate', 'Critical', 'Depleted'],
        data: [healthy, low, critical, depleted],
        colors: ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444'],
      });

      const legend = document.getElementById('bundle-legend');
      if (legend) {
        const items = [
          { color: 'bg-simsy-green', label: 'Healthy (<50% used)', count: healthy },
          { color: 'bg-simsy-blue', label: 'Moderate (50-90%)', count: low },
          { color: 'bg-simsy-orange', label: 'Critical (>90%)', count: critical },
          { color: 'bg-red-500', label: 'Depleted (100%)', count: depleted },
        ];
        legend.innerHTML = items.map(i => `
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2"><div class="w-2.5 h-2.5 rounded-full ${i.color}"></div><span class="text-simsy-grey">${i.label}</span></div>
            <span class="text-simsy-white font-medium">${i.count}</span>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Bundle health load error:', err);
    }
  }

  async function loadAlerts() {
    const panel = document.getElementById('alerts-panel');
    if (!panel) return;

    try {
      const data = await API.get('/bundle-instances', { status: 'Active', per_page: 500 });
      const instances = data.data || [];
      const now = Date.now();
      const alerts = [];

      instances.forEach(inst => {
        const pctUsed = Utils.percentUsed(inst.data_used_mb, inst.data_allowance_mb);
        const daysLeft = Utils.daysUntil(inst.end_time);
        const isFinal = inst.sequence != null && inst.sequence_max != null && inst.sequence === inst.sequence_max;

        if (pctUsed >= 100) {
          alerts.push({ severity: 'critical', title: 'Bundle Depleted', message: `ICCID ${Utils.truncateIccid(inst.iccid)} — ${inst.bundle_name || 'Unknown'} has exhausted its data allowance`, details: `${Utils.formatMB(inst.data_used_mb)} used of ${Utils.formatMB(inst.data_allowance_mb)}` });
        } else if (isFinal && daysLeft != null && daysLeft >= 0 && daysLeft < 7) {
          alerts.push({ severity: 'critical', title: 'Final Bundle Expiring', message: `ICCID ${Utils.truncateIccid(inst.iccid)} — Final bundle instance expires in ${daysLeft} days`, details: `${inst.bundle_name} · Sequence ${inst.sequence}/${inst.sequence_max}` });
        } else if (pctUsed > 90) {
          alerts.push({ severity: 'warning', title: 'Data Nearly Depleted', message: `ICCID ${Utils.truncateIccid(inst.iccid)} — ${pctUsed.toFixed(0)}% of data consumed`, details: `${Utils.formatMB(inst.data_used_mb)} of ${Utils.formatMB(inst.data_allowance_mb)} · ${inst.bundle_name}` });
        } else if (daysLeft != null && daysLeft >= 0 && daysLeft < 14) {
          alerts.push({ severity: 'warning', title: 'Bundle Expiring Soon', message: `ICCID ${Utils.truncateIccid(inst.iccid)} — expires in ${daysLeft} days`, details: `${inst.bundle_name} · Ends ${Utils.formatDate(inst.end_time)}` });
        }
      });

      // Show top 10 alerts
      if (alerts.length > 0) {
        const sorted = alerts.sort((a, b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1));
        panel.innerHTML = `
          <div class="glass-card rounded-2xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-display font-semibold text-simsy-white">Alerts</h3>
              <span class="badge badge-${alerts.some(a => a.severity === 'critical') ? 'red' : 'orange'}">${alerts.length} alert${alerts.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              ${sorted.slice(0, 10).map(a => Components.alertCard(a)).join('')}
            </div>
            ${alerts.length > 10 ? `<p class="text-xs text-simsy-grey mt-3">+ ${alerts.length - 10} more alerts. <a href="#instances" class="text-simsy-blue hover:text-simsy-cyan">View all instances &rarr;</a></p>` : ''}
          </div>
        `;
      } else {
        panel.innerHTML = '';
      }
    } catch (err) {
      console.error('Alerts load error:', err);
    }
  }

  async function loadTopEndpoints() {
    const container = document.getElementById('top-endpoints');
    if (!container) return;

    try {
      const data = await API.get('/endpoints', { per_page: 20 });
      const endpoints = (data.data || [])
        .sort((a, b) => (Number(b.usage_rolling_28d) || 0) - (Number(a.usage_rolling_28d) || 0))
        .slice(0, 5);

      if (endpoints.length === 0) {
        container.innerHTML = Components.emptyState('No endpoints found');
        return;
      }

      const maxUsage = Number(endpoints[0]?.usage_rolling_28d) || 1;
      const colors = ['blue', 'cyan', 'green', 'purple', 'orange'];

      container.innerHTML = endpoints.map((ep, i) => {
        const usage = Number(ep.usage_rolling_28d) || 0;
        const pct = (usage / maxUsage) * 100;
        const color = colors[i] || 'blue';
        const gradients = {
          blue: 'from-simsy-blue to-simsy-cyan',
          cyan: 'from-simsy-cyan to-simsy-green',
          green: 'from-simsy-green to-simsy-green',
          purple: 'from-simsy-purple to-simsy-purple',
          orange: 'from-simsy-orange to-simsy-orange',
        };
        return `
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-simsy-${color}/10 flex items-center justify-center text-xs font-bold text-simsy-${color}">${i + 1}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-simsy-white truncate">${Utils.escapeHtml(ep.endpoint_name || ep.endpoint_identifier || 'Unknown')}</span>
                <span class="text-sm font-medium text-simsy-white ml-2">${Utils.formatBytes(usage)}</span>
              </div>
              <div class="w-full bg-simsy-dark/50 rounded-full h-1.5">
                <div class="bg-gradient-to-r ${gradients[color]} h-1.5 rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = Components.errorState('Failed to load endpoints: ' + err.message);
    }
  }

  // Public API
  window.OverviewView = {
    refresh() {
      const container = document.getElementById('view-container');
      if (container) render(container);
    },
    changeDateRange(range) {
      state.dateRange = range;
      OverviewView.refresh();
    },
    changeGroupBy(groupBy) {
      const days = CONFIG.DATE_RANGES[state.dateRange]?.days || 30;
      loadUsageChart(Utils.daysAgo(days), Utils.today(), groupBy);
    },
  };

  Router.register('overview', render);
})();
