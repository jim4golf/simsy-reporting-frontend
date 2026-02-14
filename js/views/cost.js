/**
 * Cost Analysis view.
 * Margin analysis, cost-per-MB, top expensive ICCIDs.
 */
(() => {
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
      document.getElementById('cost-kpis').innerHTML = Components.errorState('Failed to load cost data: ' + err.message);
    }
  }

  Router.register('cost', render);
})();
