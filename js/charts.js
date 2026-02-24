/**
 * Chart.js factory with S-IMSY dark theme styling.
 */
const Charts = {
  instances: {},

  /**
   * Destroy a chart instance by canvas ID.
   */
  destroy(canvasId) {
    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
  },

  /**
   * Destroy all tracked charts.
   */
  destroyAll() {
    Object.keys(this.instances).forEach(id => this.destroy(id));
  },

  /**
   * Common tooltip config.
   */
  _tooltip() {
    return {
      backgroundColor: '#1e293b',
      titleColor: '#f8fafc',
      bodyColor: '#94a3b8',
      borderColor: '#334155',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
    };
  },

  /**
   * Common grid config.
   */
  _grid() {
    return { color: 'rgba(51,65,85,0.2)' };
  },

  /**
   * Common tick config.
   */
  _ticks() {
    return { color: '#94a3b8', font: { size: 10 } };
  },

  /**
   * Create a line chart with gradient fill.
   */
  createLineChart(canvasId, { labels, datasets, yLabel, xMaxTicks }) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const colorMap = {
      blue: '#0ea5e9',
      green: '#10b981',
      orange: '#f59e0b',
      purple: '#8b5cf6',
      cyan: '#22d3ee',
      red: '#ef4444',
    };

    const chartDatasets = datasets.map(ds => {
      const color = colorMap[ds.color] || ds.color || colorMap.blue;
      const gradient = ctx.createLinearGradient(0, 0, 0, 250);
      gradient.addColorStop(0, color.replace(')', ',0.15)').replace('rgb', 'rgba'));
      gradient.addColorStop(1, color.replace(')', ',0)').replace('rgb', 'rgba'));
      // Simpler: just use hex with alpha
      const alphaHigh = color + '26'; // ~15%
      const alphaLow = color + '00';
      const grad = ctx.createLinearGradient(0, 0, 0, 250);
      grad.addColorStop(0, alphaHigh);
      grad.addColorStop(1, alphaLow);

      return {
        label: ds.label,
        data: ds.data,
        borderColor: color,
        backgroundColor: ds.fill !== false ? grad : 'transparent',
        borderWidth: 2,
        fill: ds.fill !== false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      };
    });

    const chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1, labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'circle', padding: 16 } },
          tooltip: this._tooltip(),
        },
        scales: {
          x: {
            grid: this._grid(),
            ticks: { ...this._ticks(), maxRotation: 0, maxTicksLimit: xMaxTicks || 8 },
          },
          y: {
            grid: this._grid(),
            ticks: {
              ...this._ticks(),
              callback: yLabel ? (v) => v + ' ' + yLabel : undefined,
            },
          },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });

    this.instances[canvasId] = chart;
    return chart;
  },

  /**
   * Create a doughnut chart.
   */
  createDoughnutChart(canvasId, { labels, data, colors, centerText }) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const defaultColors = ['#10b981', '#0ea5e9', '#f59e0b', '#334155', '#8b5cf6', '#ef4444', '#22d3ee'];
    const bgColors = colors || defaultColors.slice(0, data.length);

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors,
          borderColor: '#0a0e1a',
          borderWidth: 3,
          hoverBorderColor: '#1e293b',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: this._tooltip(),
        },
      },
    });

    this.instances[canvasId] = chart;
    return chart;
  },

  /**
   * Create a vertical bar chart with gradient fill.
   */
  createBarChart(canvasId, { labels, datasets, yLabel }) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const colorMap = {
      blue: '#0ea5e9', green: '#10b981', orange: '#f59e0b',
      purple: '#8b5cf6', cyan: '#22d3ee', red: '#ef4444',
    };

    const chartDatasets = datasets.map(ds => {
      const color = colorMap[ds.color] || ds.color || colorMap.blue;
      const grad = ctx.createLinearGradient(0, 0, 0, 250);
      grad.addColorStop(0, color + '80');
      grad.addColorStop(1, color + '20');

      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: grad,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      };
    });

    const chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1, labels: { color: '#94a3b8', usePointStyle: true, padding: 16 } },
          tooltip: this._tooltip(),
        },
        scales: {
          x: {
            grid: this._grid(),
            ticks: { ...this._ticks(), maxRotation: 0 },
          },
          y: {
            grid: this._grid(),
            ticks: {
              ...this._ticks(),
              callback: yLabel ? (v) => v + ' ' + yLabel : undefined,
            },
          },
        },
      },
    });

    this.instances[canvasId] = chart;
    return chart;
  },

  /**
   * Create a mixed bar + line chart.
   * Each dataset can specify type: 'bar' (default) or 'line'.
   */
  createMixedChart(canvasId, { labels, datasets, yLabel }) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const colorMap = {
      blue: '#0ea5e9', green: '#10b981', orange: '#f59e0b',
      purple: '#8b5cf6', cyan: '#22d3ee', red: '#ef4444',
    };

    const chartDatasets = datasets.map(ds => {
      const color = colorMap[ds.color] || ds.color || colorMap.blue;

      if (ds.type === 'line') {
        return {
          type: 'line',
          label: ds.label,
          data: ds.data,
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: ds.dash ? [6, 3] : [],
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: color,
          pointBorderColor: '#0a0e1a',
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          order: 0, // draw on top of bars
        };
      }

      const grad = ctx.createLinearGradient(0, 0, 0, 250);
      grad.addColorStop(0, color + '80');
      grad.addColorStop(1, color + '20');

      return {
        type: 'bar',
        label: ds.label,
        data: ds.data,
        backgroundColor: grad,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        order: 1, // draw behind lines
      };
    });

    const chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: '#94a3b8', usePointStyle: true, padding: 16 } },
          tooltip: this._tooltip(),
        },
        scales: {
          x: {
            grid: this._grid(),
            ticks: { ...this._ticks(), maxRotation: 0 },
          },
          y: {
            grid: this._grid(),
            ticks: {
              ...this._ticks(),
              callback: yLabel ? (v) => v + ' ' + yLabel : undefined,
            },
          },
        },
      },
    });

    this.instances[canvasId] = chart;
    return chart;
  },

  /**
   * Create a horizontal bar chart.
   */
  createHorizontalBarChart(canvasId, { labels, data, color, xLabel }) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const colorMap = {
      blue: '#0ea5e9', green: '#10b981', orange: '#f59e0b',
      purple: '#8b5cf6', cyan: '#22d3ee',
    };
    const barColor = colorMap[color] || color || colorMap.blue;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: barColor + '40',
          borderColor: barColor,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: this._tooltip(),
        },
        scales: {
          x: {
            grid: this._grid(),
            ticks: {
              ...this._ticks(),
              callback: xLabel ? (v) => v + ' ' + xLabel : undefined,
            },
          },
          y: {
            grid: { display: false },
            ticks: this._ticks(),
          },
        },
      },
    });

    this.instances[canvasId] = chart;
    return chart;
  },

  /**
   * Create a stacked bar chart.
   */
  createStackedBarChart(canvasId, { labels, datasets }) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const colorMap = {
      blue: '#0ea5e9', green: '#10b981', orange: '#f59e0b',
      purple: '#8b5cf6', cyan: '#22d3ee', red: '#ef4444',
    };

    const chartDatasets = datasets.map(ds => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: (colorMap[ds.color] || ds.color || '#0ea5e9') + '80',
      borderColor: colorMap[ds.color] || ds.color || '#0ea5e9',
      borderWidth: 1,
      borderRadius: 4,
    }));

    const chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', usePointStyle: true, padding: 16 } },
          tooltip: this._tooltip(),
        },
        scales: {
          x: {
            stacked: true,
            grid: this._grid(),
            ticks: { ...this._ticks(), maxRotation: 0 },
          },
          y: {
            stacked: true,
            grid: this._grid(),
            ticks: this._ticks(),
          },
        },
      },
    });

    this.instances[canvasId] = chart;
    return chart;
  },
};
