/**
 * Usage Trends / Monthly Summary view.
 * Monthly usage line chart, cost stacked bars, growth table.
 */
(() => {
  async function render(container) {
    container.innerHTML = Components.viewHeader({
      title: 'Usage Trends',
      subtitle: '12-month usage and cost analysis',
    }) + `
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <div class="glass-card rounded-2xl p-5">
          <h3 class="font-display font-semibold text-simsy-white mb-1">Monthly Data Usage</h3>
          <p class="text-xs text-simsy-grey mb-4">Total data transferred per month</p>
          <div class="h-64"><canvas id="trends-usage-chart"></canvas></div>
        </div>
        <div class="glass-card rounded-2xl p-5">
          <h3 class="font-display font-semibold text-simsy-white mb-1">Monthly Costs</h3>
          <p class="text-xs text-simsy-grey mb-4">Buy vs Sell per month</p>
          <div class="h-64"><canvas id="trends-cost-chart"></canvas></div>
        </div>
      </div>
      <div class="glass-card rounded-2xl p-5">
        <h3 class="font-display font-semibold text-simsy-white mb-4">Monthly Summary</h3>
        <div id="trends-table">${Components.loading('Loading trends...')}</div>
      </div>
    `;

    loadData();
  }

  async function loadData() {
    try {
      const data = await API.get('/usage/summary', { group_by: 'monthly', from: Utils.daysAgo(365) });
      const months = data.data || [];

      if (months.length === 0) {
        document.getElementById('trends-table').innerHTML = Components.emptyState('No monthly data available');
        return;
      }

      const labels = months.map(m => Utils.formatChartDate(m.date));
      const bytesGB = months.map(m => Number(m.total_bytes) / (1024 * 1024 * 1024));

      // Usage line chart
      Charts.createLineChart('trends-usage-chart', {
        labels,
        datasets: [{ label: 'Data (GB)', data: bytesGB, color: 'blue' }],
        yLabel: 'GB',
      });

      // Cost stacked bar chart
      Charts.createStackedBarChart('trends-cost-chart', {
        labels,
        datasets: [
          { label: 'Buy', data: months.map(m => Number(m.buy_total) || 0), color: 'orange' },
          { label: 'Sell', data: months.map(m => Number(m.sell_total) || 0), color: 'green' },
        ],
      });

      // Monthly summary table
      const tableContainer = document.getElementById('trends-table');
      if (tableContainer) {
        const rows = months.map((m, i) => {
          const buy = Number(m.buy_total) || 0;
          const sell = Number(m.sell_total) || 0;
          const margin = sell - buy;
          const prevBytes = i > 0 ? Number(months[i - 1].total_bytes) : 0;
          const curBytes = Number(m.total_bytes);
          const growth = prevBytes > 0 ? ((curBytes - prevBytes) / prevBytes * 100).toFixed(1) : '-';
          return { date: m.date, bytes: curBytes, records: m.records, buy, sell, margin, growth };
        }).reverse(); // Most recent first

        tableContainer.innerHTML = Components.table({
          columns: [
            { label: 'Month', render: r => Utils.formatDate(r.date) },
            { label: 'Total Data', render: r => Utils.formatBytes(r.bytes) },
            { label: 'Records', render: r => Utils.formatNumber(r.records) },
            { label: 'Buy Total', render: r => Utils.formatCurrency(r.buy) },
            { label: 'Sell Total', render: r => Utils.formatCurrency(r.sell) },
            { label: 'Margin', render: r => {
              const m = r.margin;
              const color = m >= 0 ? 'text-simsy-green' : 'text-red-400';
              return `<span class="${color}">${Utils.formatCurrency(m)}</span>`;
            }},
            { label: 'Growth', render: r => {
              if (r.growth === '-') return '-';
              const g = Number(r.growth);
              const color = g >= 0 ? 'text-simsy-green' : 'text-red-400';
              return `<span class="${color}">${g > 0 ? '+' : ''}${r.growth}%</span>`;
            }},
          ],
          rows,
        });
      }
    } catch (err) {
      document.getElementById('trends-table').innerHTML = Components.errorState('Failed to load trends: ' + err.message);
    }
  }

  Router.register('trends', render);
})();
