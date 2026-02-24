/**
 * Roaming Analytics view.
 * Country/operator distribution (server-side aggregation),
 * home vs roaming split, monthly wholesale cost by customer.
 */
(() => {
  async function render(container) {
    container.innerHTML = Components.viewHeader({
      title: 'Roaming Analytics',
      subtitle: 'Network operator and country distribution analysis',
    }) + Filters.renderBar() + `
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
          <h3 class="font-display font-semibold text-simsy-white mb-1">Wholesale Network Cost</h3>
          <p class="text-xs text-simsy-grey mb-4">Buy-side cost per country (what S-IMSY pays network operators)</p>
          <div id="roaming-cost-table">${Components.loading('Analysing costs...')}</div>
        </div>
      </div>
      <div class="glass-card rounded-2xl p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="font-display font-semibold text-simsy-white">Monthly Wholesale Cost by Customer</h3>
            <p class="text-xs text-simsy-grey mt-0.5">Aggregated buy-side costs — compare against bundle revenue for profitability</p>
          </div>
        </div>
        <div id="cost-by-customer">${Components.loading('Loading cost data...')}</div>
      </div>
    `;

    loadData();
  }

  async function loadData() {
    try {
      const fp = Filters.getParams();

      // Fetch roaming aggregation and cost data in parallel (server-side)
      const [roaming, costs] = await Promise.all([
        API.get('/usage/roaming', { limit: 10, ...fp }),
        API.get('/usage/costs', { months: 6, ...fp }),
      ]);

      // ── Aggregate countries by normalised name (e.g. merge UK variants) ──
      const rawCountries = roaming.countries || [];
      const countryMap = {};
      rawCountries.forEach(c => {
        const name = Utils.tadigToCountry(c.country);
        if (!countryMap[name]) {
          countryMap[name] = { name, total_bytes: 0, total_buy: 0, record_count: 0 };
        }
        countryMap[name].total_bytes += c.total_bytes;
        countryMap[name].total_buy += c.total_buy;
        countryMap[name].record_count += c.record_count;
      });
      const countries = Object.values(countryMap).sort((a, b) => b.total_bytes - a.total_bytes);

      // ── Country Distribution Chart ──
      if (countries.length === 0) {
        document.querySelectorAll('#view-container .glass-card').forEach(el => {
          if (!el.querySelector('#cost-by-customer')) {
            el.innerHTML = Components.emptyState('No usage data available');
          }
        });
      } else {
        Charts.createHorizontalBarChart('roaming-country-chart', {
          labels: countries.map(c => c.name),
          data: countries.map(c => Math.round(c.total_bytes / (1024 * 1024))),
          color: 'cyan',
          xLabel: 'MB',
        });
      }

      // ── Operator Distribution Chart ──
      const operators = roaming.operators || [];
      if (operators.length > 0) {
        Charts.createHorizontalBarChart('roaming-operator-chart', {
          labels: operators.map(o => o.operator),
          data: operators.map(o => Math.round(o.total_bytes / (1024 * 1024))),
          color: 'purple',
          xLabel: 'MB',
        });
      }

      // ── Home vs Roaming Split ──
      const totalBytes = roaming.totals?.total_bytes || 0;
      const homeCountry = countries.length > 0 ? countries[0].name : 'Unknown';
      const homeBytes = countries.length > 0 ? countries[0].total_bytes : 0;
      const roamingBytes = totalBytes - homeBytes;

      if (totalBytes > 0) {
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
      }

      // ── Wholesale Cost by Country Table ──
      const costTable = document.getElementById('roaming-cost-table');
      if (costTable && countries.length > 0) {
        const homeCostPerMB = countries[0].total_bytes > 0
          ? (countries[0].total_buy / (countries[0].total_bytes / (1024 * 1024)))
          : 0;

        const countryRows = countries.map(c => {
          const mb = c.total_bytes / (1024 * 1024);
          const costPerMB = mb > 0 ? c.total_buy / mb : 0;
          const premium = homeCostPerMB > 0 ? ((costPerMB / homeCostPerMB - 1) * 100).toFixed(0) : '-';
          return { name: c.name, bytes: c.total_bytes, cost: c.total_buy, premium, isHome: c.name === homeCountry };
        });

        costTable.innerHTML = Components.table({
          columns: [
            { label: 'Country', render: r => `${Utils.escapeHtml(r.name)} ${r.isHome ? '<span class="badge badge-green ml-1">Home</span>' : ''}` },
            { label: 'Data', render: r => Utils.formatBytes(r.bytes) },
            { label: 'Wholesale Cost', render: r => Utils.formatCurrency(r.cost) },
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
      } else if (costTable) {
        costTable.innerHTML = Components.emptyState('No cost data available');
      }

      // ── Monthly Wholesale Cost by Customer ──
      const costContainer = document.getElementById('cost-by-customer');
      if (costContainer) {
        const monthlyTotals = costs.monthly_totals || [];
        const byCustomer = costs.by_customer || [];

        if (monthlyTotals.length === 0) {
          costContainer.innerHTML = Components.emptyState('No cost data available');
        } else {
          // Build monthly totals table
          const monthRows = monthlyTotals.map(m => {
            const dt = new Date(m.month + 'T00:00:00');
            const label = dt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            // Get customer breakdown for this month
            const monthCustomers = byCustomer
              .filter(c => c.month === m.month)
              .sort((a, b) => b.wholesale_cost - a.wholesale_cost);

            return { month: label, monthKey: m.month, cost: m.wholesale_cost, bytes: m.total_bytes, records: m.record_count, customers: monthCustomers };
          });

          let html = '<div class="space-y-4">';

          monthRows.forEach(m => {
            html += `
              <div class="border border-simsy-grey-dark/20 rounded-xl overflow-hidden">
                <div class="flex items-center justify-between px-4 py-3 bg-simsy-surface/50 cursor-pointer" onclick="RoamingView.toggleMonth(this)">
                  <div class="flex items-center gap-3">
                    <svg class="w-4 h-4 text-simsy-grey transition-transform month-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    <span class="font-display font-semibold text-simsy-white">${Utils.escapeHtml(m.month)}</span>
                  </div>
                  <div class="flex items-center gap-6 text-sm">
                    <span class="text-simsy-grey">${Utils.formatBytes(m.bytes)}</span>
                    <span class="text-simsy-white font-medium">${Utils.formatCurrency(m.cost)}</span>
                  </div>
                </div>
                <div class="month-detail hidden px-4 pb-3">`;

            if (m.customers.length > 0) {
              html += Components.table({
                columns: [
                  { label: 'Customer', render: r => Utils.escapeHtml(r.customer) },
                  { label: 'Data', render: r => Utils.formatBytes(r.total_bytes) },
                  { label: 'Wholesale Cost', render: r => Utils.formatCurrency(r.wholesale_cost) },
                  { label: 'Records', render: r => Utils.formatNumber(r.record_count) },
                  { label: 'Cost/MB', render: r => {
                    const mb = r.total_bytes / (1024 * 1024);
                    return mb > 0 ? Utils.formatCurrency(r.wholesale_cost / mb) : '-';
                  }},
                ],
                rows: m.customers,
              });
            } else {
              html += '<p class="text-sm text-simsy-grey py-2">No customer breakdown available</p>';
            }

            html += '</div></div>';
          });

          html += '</div>';
          costContainer.innerHTML = html;
        }
      }
    } catch (err) {
      console.error('Roaming data error:', err);
    }
  }

  // Public API
  window.RoamingView = {
    refresh() {
      const container = document.getElementById('view-container');
      if (container) render(container);
    },
    toggleMonth(el) {
      const detail = el.parentElement.querySelector('.month-detail');
      const chevron = el.querySelector('.month-chevron');
      if (detail) {
        detail.classList.toggle('hidden');
        if (chevron) chevron.style.transform = detail.classList.contains('hidden') ? '' : 'rotate(90deg)';
      }
    },
  };

  Router.register('roaming', render);
})();
