/**
 * Endpoints view.
 * Card grid with health indicators and anomaly detection.
 */
(() => {
  let state = { page: 1, perPage: 20, filters: {} };

  function getHealthStatus(ep) {
    const lastActivity = ep.latest_activity ? new Date(ep.latest_activity) : null;
    const hoursSince = lastActivity ? (Date.now() - lastActivity.getTime()) / 3600000 : Infinity;
    const hasRecentUsage = Number(ep.usage_rolling_7d) > 0;
    const hasAnyUsage = Number(ep.usage_rolling_28d) > 0;

    if (hoursSince < 48 && hasRecentUsage) return 'green';
    if (hoursSince < 336 || (!hasRecentUsage && hasAnyUsage)) return 'amber';
    return 'red';
  }

  function getAnomalies(ep) {
    const flags = [];
    const weekly = Number(ep.usage_rolling_7d) || 0;
    const monthly = Number(ep.usage_rolling_28d) || 0;
    const weeklyAvg = monthly / 4;

    if (weeklyAvg > 0 && weekly > 3 * weeklyAvg) {
      flags.push({ type: 'high', label: 'High usage spike' });
    }
    if (weekly === 0 && monthly > 0) {
      flags.push({ type: 'dormant', label: 'Recently dormant' });
    }
    return flags;
  }

  async function render(container) {
    container.innerHTML = Components.viewHeader({
      title: 'Endpoints',
      subtitle: 'SIM endpoint status, health, and usage',
    }) + Filters.renderBar() + `
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <input type="text" id="ep-filter-name" class="filter-input" placeholder="Search endpoint name..." onkeydown="if(event.key==='Enter'){EndpointsView.search()}">
        <select id="ep-filter-status" class="filter-select">
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Deactivated">Deactivated</option>
        </select>
        <button onclick="EndpointsView.search()" class="btn-primary text-xs py-2 px-4">Search</button>
        <button onclick="EndpointsView.clear()" class="btn-secondary text-xs py-2 px-3">Clear</button>
      </div>
      <div id="endpoints-grid" class="endpoint-grid mb-4">${Components.loading('Loading endpoints...')}</div>
      <div id="endpoints-pagination"></div>
    `;

    loadPage(state.page);
  }

  async function loadPage(page) {
    const gridContainer = document.getElementById('endpoints-grid');
    const paginationContainer = document.getElementById('endpoints-pagination');
    if (!gridContainer) return;

    state.page = page;
    const params = { page, per_page: state.perPage, ...Filters.getParams() };
    if (state.filters.status) params.status = state.filters.status;

    try {
      const data = await API.get('/endpoints', params, true);
      let rows = data.data || [];
      const pagination = data.pagination || {};

      // Client-side name filter
      const nameFilter = (document.getElementById('ep-filter-name')?.value || '').toLowerCase();
      if (nameFilter) {
        rows = rows.filter(ep =>
          (ep.endpoint_name || '').toLowerCase().includes(nameFilter) ||
          (ep.endpoint_identifier || '').toLowerCase().includes(nameFilter)
        );
      }

      if (rows.length === 0) {
        gridContainer.innerHTML = Components.emptyState('No endpoints found');
        paginationContainer.innerHTML = '';
        return;
      }

      gridContainer.innerHTML = rows.map(ep => {
        const health = getHealthStatus(ep);
        const anomalies = getAnomalies(ep);
        const anomalyHtml = anomalies.length > 0 ? anomalies.map(a =>
          `<span class="inline-flex items-center gap-1 text-xs ${a.type === 'high' ? 'text-red-400' : 'text-simsy-orange'}">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/></svg>
            ${Utils.escapeHtml(a.label)}
          </span>`
        ).join('') : '';

        return `
          <div class="glass-card rounded-2xl p-5 cursor-pointer" onclick="EndpointsView.showDetail('${Utils.escapeHtml(ep.endpoint_identifier || ep.id)}')">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                ${Components.healthDot(health)}
                <span class="text-sm font-medium text-simsy-white truncate">${Utils.escapeHtml(ep.endpoint_name || ep.endpoint_identifier || 'Unknown')}</span>
              </div>
              ${Components.statusBadge(ep.endpoint_status_name || ep.status)}
            </div>
            ${anomalyHtml ? `<div class="flex flex-wrap gap-2 mb-3">${anomalyHtml}</div>` : ''}
            <div class="grid grid-cols-3 gap-2 mb-3">
              <div>
                <p class="text-xs text-simsy-grey-dark">24h</p>
                <p class="text-sm text-simsy-white">${Utils.formatBytes(ep.usage_rolling_24h)}</p>
              </div>
              <div>
                <p class="text-xs text-simsy-grey-dark">7d</p>
                <p class="text-sm text-simsy-white">${Utils.formatBytes(ep.usage_rolling_7d)}</p>
              </div>
              <div>
                <p class="text-xs text-simsy-grey-dark">28d</p>
                <p class="text-sm text-simsy-white">${Utils.formatBytes(ep.usage_rolling_28d)}</p>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-simsy-grey-dark">${ep.endpoint_type_name || ep.endpoint_type || ''}</span>
              <span class="text-simsy-grey">${ep.latest_activity ? Utils.timeAgo(ep.latest_activity) : 'No activity'}</span>
            </div>
          </div>
        `;
      }).join('');

      paginationContainer.innerHTML = Components.pagination({
        page: pagination.page,
        totalPages: pagination.total_pages,
        total: pagination.total,
        perPage: pagination.per_page,
        onPageChange: 'EndpointsView.goToPage',
      });
    } catch (err) {
      gridContainer.innerHTML = Components.errorState('Failed to load endpoints: ' + err.message, 'EndpointsView.refresh');
    }
  }

  window.EndpointsView = {
    refresh() { render(document.getElementById('view-container')); },
    search() { state.page = 1; state.filters.status = document.getElementById('ep-filter-status')?.value || ''; loadPage(1); },
    clear() { state.filters = {}; const el = document.getElementById('ep-filter-name'); if(el) el.value=''; const el2 = document.getElementById('ep-filter-status'); if(el2) el2.value=''; loadPage(1); },
    goToPage(p) { loadPage(p); },
    async showDetail(id) {
      const container = document.getElementById('view-container');
      container.innerHTML = Components.loading('Loading endpoint usage...');

      try {
        const data = await API.get(`/endpoints/${encodeURIComponent(id)}/usage`, { group_by: 'daily', from: Utils.daysAgo(90), ...Filters.getParams() });
        const labels = (data.data || []).map(d => Utils.formatChartDate(d.date));
        const values = (data.data || []).map(d => Number(d.total_bytes) / (1024 * 1024)); // MB

        container.innerHTML = `
          <div class="mb-6">
            <button onclick="Router.navigate('endpoints')" class="text-sm text-simsy-blue hover:text-simsy-cyan mb-3 inline-flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              Back to Endpoints
            </button>
            <h1 class="font-display text-2xl font-bold text-simsy-white">${Utils.escapeHtml(data.endpoint || id)}</h1>
            <p class="text-simsy-grey text-sm mt-1">90-day usage history</p>
          </div>
          <div class="glass-card rounded-2xl p-5">
            <div class="h-80"><canvas id="endpoint-detail-chart"></canvas></div>
          </div>
        `;

        Charts.createLineChart('endpoint-detail-chart', {
          labels,
          datasets: [{ label: 'Usage (MB)', data: values, color: 'blue' }],
          yLabel: 'MB',
        });
      } catch (err) {
        container.innerHTML = Components.errorState('Failed to load endpoint: ' + err.message);
      }
    },
  };

  Router.register('endpoints', render);
})();
