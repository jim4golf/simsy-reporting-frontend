/**
 * Export Data view.
 * Form to generate CSV/JSON exports via POST /export.
 */
(() => {
  async function render(container) {
    container.innerHTML = Components.viewHeader({
      title: 'Export Data',
      subtitle: 'Download your reporting data as CSV or JSON',
    }) + `
      <div class="glass-card rounded-2xl p-6 max-w-xl">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-simsy-grey mb-1.5">Report Type</label>
            <select id="export-type" class="filter-select w-full">
              <option value="usage">Usage Records</option>
              <option value="bundles">Active Bundles</option>
              <option value="instances">Bundle Instances</option>
              <option value="endpoints">Endpoints</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-simsy-grey mb-1.5">Format</label>
            <select id="export-format" class="filter-select w-full">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-simsy-grey mb-1.5">From</label>
              <input type="date" id="export-from" class="filter-input w-full" value="${Utils.daysAgo(30)}">
            </div>
            <div>
              <label class="block text-sm font-medium text-simsy-grey mb-1.5">To</label>
              <input type="date" id="export-to" class="filter-input w-full" value="${Utils.today()}">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-simsy-grey mb-1.5">ICCID Filter (optional)</label>
            <input type="text" id="export-iccid" class="filter-input w-full" placeholder="Leave blank for all ICCIDs">
          </div>
          <div id="export-status"></div>
          <button id="export-btn" onclick="ExportView.doExport()" class="btn-primary w-full flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>Export Data</span>
          </button>
        </div>
      </div>
    `;
  }

  window.ExportView = {
    async doExport() {
      const reportType = document.getElementById('export-type').value;
      const format = document.getElementById('export-format').value;
      const from = document.getElementById('export-from').value;
      const to = document.getElementById('export-to').value;
      const iccid = document.getElementById('export-iccid').value;
      const statusDiv = document.getElementById('export-status');
      const btn = document.getElementById('export-btn');

      btn.disabled = true;
      btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> <span>Exporting...</span>';
      statusDiv.innerHTML = '';

      try {
        const body = {
          report_type: reportType,
          format,
          from: from || undefined,
          to: to || undefined,
          filters: iccid ? { iccid } : undefined,
        };

        const response = await API.postRaw('/export', body);
        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition') || '';
        const filenameMatch = disposition.match(/filename="?(.+)"?/);
        const filename = filenameMatch ? filenameMatch[1] : `${reportType}_export.${format}`;

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusDiv.innerHTML = `
          <div class="alert-card alert-info">
            <svg class="w-4 h-4 text-simsy-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span class="text-sm text-simsy-blue">Export downloaded: ${Utils.escapeHtml(filename)}</span>
          </div>
        `;
      } catch (err) {
        statusDiv.innerHTML = Components.errorState('Export failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>Export Data</span>
        `;
      }
    },
  };

  Router.register('export', render);
})();
