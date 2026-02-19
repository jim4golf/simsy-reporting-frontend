/**
 * Roaming Analytics view.
 * Country/operator distribution, home vs roaming, cost premiums.
 */
(() => {
  async function render(container) {
    container.innerHTML = Components.viewHeader({
      title: 'Roaming Analytics',
      subtitle: 'Network operator and country distribution analysis',
    }) + `
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <div class="glass-card rounded-2xl p-5">
          <h3 class="font-display font-semibold text-simsy-white mb-1">Country Distribution</h3>
          <p class="text-xs text-simsy-grey mb-4">Top 10 countries by data consumption</p>
          <div class="h-64"><canvas id="roaming-country-chart"></canvas></div>
        </div>
        <div class="glass-card rounded-2xl p-5">
          <h3 class="font-display font-semibold text-simsy-white mb-1">Operator Distribution</h3>
          <p class="text-xs text-simsy-grey mb-4">Top 10 operators by data consumption</p>
          <div class="h-64"><canvas id="roaming-operator-chart"></canvas></div>
        </div>
      </div>
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div class="glass-card rounded-2xl p-5">
          <h3 class="font-display font-semibold text-simsy-white mb-1">Home vs Roaming</h3>
          <p class="text-xs text-simsy-grey mb-4">Data usage split</p>
          <div class="h-48 flex items-center justify-center"><canvas id="roaming-split-chart"></canvas></div>
          <div id="roaming-split-legend" class="mt-4 space-y-2"></div>
        </div>
        <div class="xl:col-span-2 glass-card rounded-2xl p-5">
          <h3 class="font-display font-semibold text-simsy-white mb-1">Cost by Country</h3>
          <p class="text-xs text-simsy-grey mb-4">Average cost analysis per country</p>
          <div id="roaming-cost-table">${Components.loading('Analysing costs...')}</div>
        </div>
      </div>
    `;

    loadData();
  }

  async function loadData() {
    try {
      // Fetch a large sample of recent usage records
      const data = await API.get('/usage/records', { per_page: 1000, from: Utils.daysAgo(30) });
      const records = data.data || [];

      if (records.length === 0) {
        document.querySelectorAll('#view-container .glass-card').forEach(el => {
          el.innerHTML = Components.emptyState('No usage data available');
        });
        return;
      }

      // Aggregate by country
      const byCountry = {};
      const byOperator = {};
      records.forEach(r => {
        const country = Utils.tadigToCountry(r.serving_country_name);
        const operator = r.serving_operator_name || 'Unknown';
        const bytes = Number(r.uplink_bytes || 0) + Number(r.downlink_bytes || 0);
        const cost = Number(r.buy_charge || 0);

        if (!byCountry[country]) byCountry[country] = { bytes: 0, cost: 0, count: 0 };
        byCountry[country].bytes += bytes;
        byCountry[country].cost += cost;
        byCountry[country].count++;

        if (!byOperator[operator]) byOperator[operator] = { bytes: 0, count: 0 };
        byOperator[operator].bytes += bytes;
        byOperator[operator].count++;
      });

      // Sort and take top 10
      const topCountries = Object.entries(byCountry).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 10);
      const topOperators = Object.entries(byOperator).sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 10);

      // Country bar chart
      Charts.createHorizontalBarChart('roaming-country-chart', {
        labels: topCountries.map(c => c[0]),
        data: topCountries.map(c => Math.round(c[1].bytes / (1024 * 1024))),
        color: 'cyan',
        xLabel: 'MB',
      });

      // Operator bar chart
      Charts.createHorizontalBarChart('roaming-operator-chart', {
        labels: topOperators.map(o => o[0]),
        data: topOperators.map(o => Math.round(o[1].bytes / (1024 * 1024))),
        color: 'purple',
        xLabel: 'MB',
      });

      // Home vs Roaming
      const homeCountry = topCountries[0]?.[0] || 'Unknown';
      const homeBytes = byCountry[homeCountry]?.bytes || 0;
      const totalBytes = Object.values(byCountry).reduce((s, c) => s + c.bytes, 0);
      const roamingBytes = totalBytes - homeBytes;

      Charts.createDoughnutChart('roaming-split-chart', {
        labels: ['Home (' + homeCountry + ')', 'Roaming'],
        data: [homeBytes, roamingBytes],
        colors: ['#10b981', '#f59e0b'],
      });

      const legend = document.getElementById('roaming-split-legend');
      if (legend) {
        legend.innerHTML = `
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2"><div class="w-2.5 h-2.5 rounded-full bg-simsy-green"></div><span class="text-simsy-grey">Home (${Utils.escapeHtml(homeCountry)})</span></div>
            <span class="text-simsy-white font-medium">${Utils.formatBytes(homeBytes)}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2"><div class="w-2.5 h-2.5 rounded-full bg-simsy-orange"></div><span class="text-simsy-grey">Roaming</span></div>
            <span class="text-simsy-white font-medium">${Utils.formatBytes(roamingBytes)}</span>
          </div>
          <div class="flex items-center justify-between text-sm pt-1 border-t border-simsy-grey-dark/20">
            <span class="text-simsy-grey">Roaming %</span>
            <span class="text-simsy-white font-medium">${totalBytes > 0 ? ((roamingBytes / totalBytes) * 100).toFixed(1) : 0}%</span>
          </div>
        `;
      }

      // Cost by country table
      const costTable = document.getElementById('roaming-cost-table');
      if (costTable) {
        const homeCostPerMB = byCountry[homeCountry]?.bytes > 0 ? (byCountry[homeCountry].cost / (byCountry[homeCountry].bytes / (1024 * 1024))) : 0;
        const countryRows = topCountries.map(([name, data]) => {
          const mb = data.bytes / (1024 * 1024);
          const costPerMB = mb > 0 ? data.cost / mb : 0;
          const premium = homeCostPerMB > 0 ? ((costPerMB / homeCostPerMB - 1) * 100).toFixed(0) : '-';
          return { name, bytes: data.bytes, cost: data.cost, costPerMB, premium, isHome: name === homeCountry };
        });

        costTable.innerHTML = Components.table({
          columns: [
            { label: 'Country', render: r => `${Utils.escapeHtml(r.name)} ${r.isHome ? '<span class="badge badge-green ml-1">Home</span>' : ''}` },
            { label: 'Data', render: r => Utils.formatBytes(r.bytes) },
            { label: 'Total Cost', render: r => Utils.formatCurrency(r.cost) },
            { label: 'Cost/MB', render: r => Utils.formatCurrency(r.costPerMB) },
            { label: 'Premium', render: r => {
              if (r.isHome) return Components.badge('Baseline', 'green');
              const p = Number(r.premium);
              if (isNaN(p)) return '-';
              if (p > 100) return Components.badge('+' + r.premium + '%', 'red');
              if (p > 0) return Components.badge('+' + r.premium + '%', 'orange');
              return Components.badge(r.premium + '%', 'green');
            }},
          ],
          rows: countryRows,
        });
      }
    } catch (err) {
      console.error('Roaming data error:', err);
    }
  }

  Router.register('roaming', render);
})();
