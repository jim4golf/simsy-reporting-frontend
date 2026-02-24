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
      showDateRange: false,
      showRefresh: true,
      onRefresh: 'OverviewView.refresh',
    }) + Filters.renderBar() + `
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
            <p class="text-xs text-simsy-grey mt-0.5">All bundle instances by status and data usage</p>
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
            <p class="text-xs text-simsy-grey mt-0.5">Monthly data consumption over active period</p>
          </div>
          <a href="#endpoints" class="text-xs text-simsy-blue hover:text-simsy-cyan transition-colors">View All &rarr;</a>
        </div>
        <div id="top-endpoints">
          <div class="h-72"><canvas id="top-endpoints-chart"></canvas></div>
          <div id="top-endpoints-legend" class="mt-3 space-y-1"></div>
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
      const fp = Filters.getParams();
      const [usage, bundles, endpoints, expiringInstances] = await Promise.all([
        API.get('/usage/summary', { group_by: 'daily', from, to, ...fp }),
        API.get('/bundles', { status: 'Active', per_page: 1, ...fp }),
        API.get('/endpoints', { per_page: 1, ...fp }),
        API.get('/bundle-instances', { status: 'Active', expiring_before: Utils.daysFromNow(30), per_page: 1000, ...fp }),
      ]);

      // Use charged consumption (billable figure) — falls back to total_bytes if not available
      const totalBytes = usage?.summary?.total_charged || usage?.summary?.total_bytes || 0;
      const activeBundles = bundles?.pagination?.total || 0;
      const activeEndpoints = endpoints?.pagination?.total || 0;

      // Count final instances expiring in the NEXT 30 days (not already expired)
      const allExpiring = expiringInstances?.data || [];
      const lastInstancesExpiring = allExpiring.filter(inst => {
        if (inst.sequence == null || inst.sequence_max == null) return false;
        if (inst.sequence !== inst.sequence_max) return false;
        const daysLeft = Utils.daysUntil(inst.end_time);
        return daysLeft != null && daysLeft >= 0 && daysLeft <= 30;
      }).length;

      // Build date range dropdown options for the Total Data Usage card
      const rangeOptions = Object.entries(CONFIG.DATE_RANGES).map(([key, { label }]) =>
        `<option value="${key}" ${key === state.dateRange ? 'selected' : ''}>${label}</option>`
      ).join('');

      container.innerHTML = [
        // Custom KPI card with embedded date range selector
        `<div class="glass-card rounded-2xl p-5 stat-glow-blue transition-all duration-300">
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-xl bg-simsy-blue/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-simsy-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
            </div>
            <select onchange="OverviewView.changeDateRange(this.value)" class="bg-simsy-surface text-simsy-grey text-xs border border-simsy-grey-dark/40 rounded-lg px-2 py-1 outline-none cursor-pointer">
              ${rangeOptions}
            </select>
          </div>
          <p class="text-2xl font-bold text-simsy-white font-display">${Utils.escapeHtml(Utils.formatBytes(totalBytes))}</p>
          <p class="text-sm text-simsy-grey mt-1">Total Data Usage</p>
        </div>`,
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
          icon: '<svg class="w-5 h-5 text-simsy-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>',
          value: Utils.formatNumber(lastInstancesExpiring),
          label: 'Last Instances Expiring',
          subtitle: 'Within 30 days',
          glowColor: 'orange',
          onClick: 'OverviewView.showLastExpiring()',
        }),
      ].join('');
    } catch (err) {
      container.innerHTML = Components.errorState('Failed to load KPIs: ' + err.message, 'OverviewView.refresh');
    }
  }

  async function loadUsageChart(from, to, groupBy) {
    try {
      // Adjust date range based on groupBy so there's meaningful data
      let adjustedFrom = from;
      let adjustedTo = to;
      let subtitleText = '';

      if (groupBy === 'monthly') {
        // Rolling 12 months: from 11 months ago to current month
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        adjustedFrom = startMonth.toISOString().split('T')[0];
        adjustedTo = Utils.today();
        const startLabel = startMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        const endLabel = now.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        subtitleText = startLabel + ' – ' + endLabel;
      } else if (groupBy === 'annual') {
        // Show 5 years back + current year (6-year window)
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 5;
        adjustedFrom = startYear + '-01-01';
        adjustedTo = currentYear + '-12-31';
        subtitleText = startYear + ' – ' + currentYear + ' — Yearly usage';
      } else {
        const days = CONFIG.DATE_RANGES[state.dateRange]?.days || 30;
        subtitleText = 'Last ' + days + ' days';
      }

      const data = await API.get('/usage/summary', { group_by: groupBy, from: adjustedFrom, to: adjustedTo, ...Filters.getParams() });

      let labels, values;

      if (groupBy === 'monthly') {
        // Build rolling 12 months, filling gaps with zero
        const now = new Date();
        const months = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }) });
        }
        // Map API data by year-month key
        const dataMap = {};
        (data.data || []).forEach(d => {
          const dt = new Date(d.date);
          const key = dt.getFullYear() + '-' + dt.getMonth();
          dataMap[key] = Number(d.total_charged || d.total_bytes) / (1024 * 1024 * 1024);
        });
        labels = months.map(m => m.label);
        values = months.map(m => dataMap[m.year + '-' + m.month] || 0);
      } else if (groupBy === 'annual') {
        // Build 6 years (5 back + current), filling gaps with zero
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 5;
        const dataMap = {};
        (data.data || []).forEach(d => {
          const yr = new Date(d.date).getFullYear();
          dataMap[yr] = Number(d.total_charged || d.total_bytes) / (1024 * 1024 * 1024);
        });
        labels = Array.from({ length: 6 }, (_, i) => (startYear + i).toString());
        values = labels.map(yr => dataMap[Number(yr)] || 0);
      } else {
        labels = (data.data || []).map(d => Utils.formatChartDate(d.date));
        values = (data.data || []).map(d => Number(d.total_charged || d.total_bytes) / (1024 * 1024 * 1024));
      }

      // Use bar chart for monthly/annual, line chart for daily
      if (groupBy === 'monthly' || groupBy === 'annual') {
        Charts.createBarChart('overview-usage-chart', {
          labels,
          datasets: [{ label: 'Data Usage (GB)', data: values, color: 'blue' }],
          yLabel: 'GB',
        });
      } else {
        Charts.createLineChart('overview-usage-chart', {
          labels,
          datasets: [{ label: 'Data Usage (GB)', data: values, color: 'blue' }],
          yLabel: 'GB',
        });
      }

      // Update subtitle
      const subtitle = document.getElementById('chart-subtitle');
      if (subtitle) subtitle.textContent = subtitleText;

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
      const fp = Filters.getParams();
      // Fetch ALL instances (no status filter) so the total matches the Bundle Report
      const allInstances = await API.getAll('/bundle-instances', fp);

      let healthy = 0, moderate = 0, critical = 0, depleted = 0, terminated = 0;

      allInstances.forEach(inst => {
        const status = (inst.status_name || '').toLowerCase();

        if (status === 'terminated') {
          terminated++;
        } else if (status === 'depleted') {
          depleted++;
        } else {
          // Active/Enabled or any other host status — categorise by data usage health
          const allowance = inst.data_allowance_mb || Utils.parseAllowanceFromName(inst.bundle_name);
          const used = inst.data_used_mb || 0;
          const pct = allowance > 0 ? (used / allowance) * 100 : 0;

          if (allowance > 0 && pct >= 90) {
            critical++;
          } else if (allowance > 0 && pct >= 75) {
            moderate++;
          } else {
            healthy++;
          }
        }
      });

      const total = healthy + moderate + critical + depleted + terminated;

      // Only include non-zero segments in the chart
      const segments = [
        { label: 'Healthy', count: healthy, color: '#10b981', css: 'bg-simsy-green', filter: 'healthy' },
        { label: 'Moderate (75-90%)', count: moderate, color: '#0ea5e9', css: 'bg-simsy-blue', filter: 'moderate' },
        { label: 'Critical (>90%)', count: critical, color: '#f59e0b', css: 'bg-simsy-orange', filter: 'critical' },
        { label: 'Depleted', count: depleted, color: '#ef4444', css: 'bg-red-500', filter: 'depleted' },
        { label: 'Terminated', count: terminated, color: '#374151', css: 'bg-gray-700', filter: 'terminated' },
      ];
      const visible = segments.filter(s => s.count > 0);

      Charts.createDoughnutChart('overview-bundle-chart', {
        labels: visible.map(s => s.label.split(' ')[0]),
        data: visible.map(s => s.count),
        colors: visible.map(s => s.color),
      });

      const legend = document.getElementById('bundle-legend');
      if (legend) {
        legend.innerHTML = visible.map(s => `
          <div class="flex items-center justify-between text-sm cursor-pointer hover:bg-simsy-surface/30 rounded px-1 -mx-1" onclick="OverviewView.showByHealth('${s.filter}')">
            <div class="flex items-center gap-2"><div class="w-2.5 h-2.5 rounded-full ${s.css}"></div><span class="text-simsy-grey">${s.label}</span></div>
            <span class="text-simsy-white font-medium">${s.count}</span>
          </div>
        `).join('') + `
          <div class="flex items-center justify-between text-sm pt-1 border-t border-simsy-grey-dark/20 mt-1">
            <span class="text-simsy-grey">Total Instances</span>
            <span class="text-simsy-white font-medium">${total}</span>
          </div>
        `;
      }
    } catch (err) {
      console.error('Bundle health load error:', err);
    }
  }

  async function loadAlerts() {
    const panel = document.getElementById('alerts-panel');
    if (!panel) return;

    try {
      const fp = Filters.getParams();
      // Fetch active instances AND recently expired non-final instances (stalled sequences)
      const [activeInstances, expiredInstances] = await Promise.all([
        API.getAll('/bundle-instances', { status: 'Active', ...fp }),
        API.getAll('/bundle-instances', { expiring_before: Utils.today(), ...fp }),
      ]);
      const alerts = [];

      // Check active instances for depleted, final expiring, nearly depleted, expiring soon
      activeInstances.forEach(inst => {
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

      // Detect stalled sequences: expired instances where sequence != sequence_max
      // (i.e. mid-sequence instances that expired without the next instance activating)
      // Build a set of active ICCIDs to avoid false positives
      const activeIccids = new Set(activeInstances.map(i => (i.iccid || '').trim()));
      const stalledSeen = new Set();

      expiredInstances.forEach(inst => {
        if (inst.sequence == null || inst.sequence_max == null) return;
        if (inst.sequence >= inst.sequence_max) return; // final instance, not stalled
        const endDate = new Date(inst.end_time);
        if (isNaN(endDate.getTime())) return;
        if (endDate > new Date()) return; // not yet expired

        // Check this ICCID doesn't already have a higher-sequence active instance
        // (approximate: if ICCID has any active instance, skip)
        const iccid = (inst.iccid || '').trim();
        if (activeIccids.has(iccid)) return;

        // Deduplicate by ICCID + bundle_moniker
        const key = iccid + '|' + (inst.bundle_moniker || inst.bundle_name || '');
        if (stalledSeen.has(key)) return;
        stalledSeen.add(key);

        const daysSinceExpiry = Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          severity: 'critical',
          title: 'Stalled Sequence',
          message: `ICCID ${Utils.truncateIccid(iccid)} — Sequence ${inst.sequence}/${inst.sequence_max} expired ${daysSinceExpiry}d ago, next instance not activated`,
          details: `${inst.bundle_name || 'Unknown'} · Ended ${Utils.formatDate(inst.end_time)}`,
        });
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
      const data = await API.get('/endpoints/top', { limit: 5, ...Filters.getParams() });
      const endpoints = data.endpoints || [];

      if (endpoints.length === 0) {
        container.innerHTML = Components.emptyState('No endpoint usage data found');
        return;
      }

      // Collect all unique months across all endpoints and sort chronologically
      const allMonths = new Set();
      endpoints.forEach(ep => {
        Object.keys(ep.monthly).forEach(m => allMonths.add(m));
      });
      const sortedMonths = [...allMonths].sort();

      // Format month labels as "Mon YY" (e.g. "Jan 25")
      const labels = sortedMonths.map(m => {
        const d = new Date(m + 'T00:00:00');
        return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      });

      // Build datasets — one line per endpoint, using the same colour palette
      const colors = ['blue', 'cyan', 'green', 'purple', 'orange'];
      const datasets = endpoints.map((ep, i) => ({
        label: ep.endpoint_name || 'Unknown',
        data: sortedMonths.map(m => {
          const bytes = ep.monthly[m] || 0;
          return Math.round(bytes / (1024 * 1024)); // Convert to MB
        }),
        color: colors[i] || 'blue',
        fill: false,
      }));

      Charts.createLineChart('top-endpoints-chart', {
        labels,
        datasets,
        yLabel: 'MB',
      });

      // Legend with avg monthly usage
      const colorHex = { blue: '#0ea5e9', cyan: '#22d3ee', green: '#10b981', purple: '#8b5cf6', orange: '#f59e0b' };
      const legend = document.getElementById('top-endpoints-legend');
      if (legend) {
        legend.innerHTML = endpoints.map((ep, i) => {
          const c = colors[i] || 'blue';
          const avg = ep.avg_monthly_bytes || 0;
          return `
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${colorHex[c]}"></div>
                <span class="text-simsy-grey truncate">${Utils.escapeHtml(ep.endpoint_name || 'Unknown')}</span>
              </div>
              <span class="text-simsy-white font-medium ml-2 whitespace-nowrap">${Utils.formatBytes(avg)}/mo avg</span>
            </div>
          `;
        }).join('');
      }
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
    showLastExpiring() {
      Router.navigate('instances', {
        filters: {
          status: 'Active',
          expiring_before: Utils.daysFromNow(30),
          final_only: true,
        },
      });
    },
    showByHealth(category) {
      // Navigate to instances view filtered by the relevant status
      const statusMap = {
        healthy: 'Active', moderate: 'Active', critical: 'Active',
        depleted: 'Depleted', terminated: 'Terminated',
      };
      Router.navigate('instances', { filters: { status: statusMap[category] || '' } });
    },
  };

  Router.register('overview', render);
})();
