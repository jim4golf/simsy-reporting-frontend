/**
 * Admin — Active Sessions view.
 * Lists active JWT sessions with revoke capability.
 */
(() => {
  let state = { page: 1, perPage: 25 };

  function roleBadge(role) {
    const colors = { admin: 'purple', tenant: 'blue', customer: 'green' };
    return Components.badge(role, colors[role] || 'grey');
  }

  async function render(container) {
    container.innerHTML = Components.viewHeader({
      title: 'Active Sessions',
      subtitle: 'Monitor and revoke active user sessions',
      showRefresh: true,
      onRefresh: 'AdminSessionsView.refresh',
    }) + `
      <div class="glass-card rounded-2xl p-5">
        <div id="admin-sessions-table">${Components.loading('Loading sessions...')}</div>
        <div id="admin-sessions-pagination"></div>
      </div>
    `;

    loadPage(state.page);
  }

  async function loadPage(page) {
    const tableEl = document.getElementById('admin-sessions-table');
    const pagEl = document.getElementById('admin-sessions-pagination');
    if (!tableEl) return;

    state.page = page;
    const params = { page, per_page: state.perPage };

    try {
      const data = await API.get('/admin/sessions', params, true);
      const rows = data.data || data.sessions || [];
      const pagination = data.pagination || {};

      if (rows.length === 0) {
        tableEl.innerHTML = Components.emptyState('No active sessions');
        pagEl.innerHTML = '';
        return;
      }

      tableEl.innerHTML = Components.table({
        columns: [
          { label: 'User Email', render: r => `<span class="text-simsy-white">${Utils.escapeHtml(r.email || r.user_email || '-')}</span>` },
          { label: 'Display Name', render: r => Utils.escapeHtml(r.display_name || r.user_display_name || '-') },
          { label: 'Role', render: r => roleBadge(r.role || r.user_role || '-') },
          { label: 'IP Address', render: r => `<span class="font-mono text-xs text-simsy-grey">${Utils.escapeHtml(r.ip_address || r.ip || '-')}</span>` },
          { label: 'Issued At', render: r => Utils.formatDate(r.issued_at || r.created_at) },
          { label: 'Expires At', render: r => Utils.formatDate(r.expires_at) },
          { label: 'Actions', render: r => `
            <button onclick="AdminSessionsView.revoke('${Utils.escapeHtml(r.id)}')" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10 hover:border-red-400/50">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
              Revoke
            </button>
          ` },
        ],
        rows,
      });

      pagEl.innerHTML = Components.pagination({
        page: pagination.page || page,
        totalPages: pagination.total_pages || 1,
        total: pagination.total || rows.length,
        perPage: pagination.per_page || state.perPage,
        onPageChange: 'AdminSessionsView.goToPage',
      });
    } catch (err) {
      tableEl.innerHTML = Components.errorState('Failed to load sessions: ' + err.message, 'AdminSessionsView.refresh');
    }
  }

  async function revoke(sessionId) {
    if (!confirm('Revoke this session? The user will be signed out immediately.')) return;
    try {
      await API.del('/admin/sessions/' + sessionId);
      loadPage(state.page);
    } catch (err) {
      alert('Failed to revoke session: ' + err.message);
    }
  }

  window.AdminSessionsView = {
    refresh()   { render(document.getElementById('view-container')); },
    goToPage(p) { loadPage(p); },
    revoke,
  };

  Router.register('sessions', render);
})();
