/**
 * Admin — User Management view.
 * CRUD for users with role/tenant assignment, status toggle, and password reset.
 */
(() => {
  let state = { page: 1, perPage: 25, search: '', tenants: [] };

  // ── Helpers ──────────────────────────────────────────────────────

  function roleBadge(role) {
    const colors = { admin: 'purple', tenant: 'blue', customer: 'green' };
    return Components.badge(role, colors[role] || 'grey');
  }

  function statusBadge(active) {
    return active ? Components.badge('Active', 'green') : Components.badge('Inactive', 'red');
  }

  function tenantOptions(selectedId) {
    return state.tenants.map(t => {
      const id = t.tenant_id || t.id;
      const name = t.tenant_name || t.name || id;
      return `<option value="${Utils.escapeHtml(id)}" ${id === selectedId ? 'selected' : ''}>${Utils.escapeHtml(name)}</option>`;
    }).join('');
  }

  // ── Main Render ──────────────────────────────────────────────────

  async function render(container) {
    container.innerHTML = Components.viewHeader({
      title: 'User Management',
      subtitle: 'Create, edit and manage portal users',
    }) + `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <input type="text" id="admin-user-search" class="filter-input w-64" placeholder="Search by name or email..." value="${Utils.escapeHtml(state.search)}" onkeydown="if(event.key==='Enter'){AdminUsersView.search()}">
          <button onclick="AdminUsersView.search()" class="btn-primary text-xs py-2 px-4">Search</button>
          <button onclick="AdminUsersView.clearSearch()" class="btn-secondary text-xs py-2 px-3">Clear</button>
        </div>
        <button onclick="AdminUsersView.showCreateForm()" class="btn-primary text-xs py-2 px-4 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
          Invite User
        </button>
      </div>
      <div class="glass-card rounded-2xl p-5">
        <div id="admin-users-table">${Components.loading('Loading users...')}</div>
        <div id="admin-users-pagination"></div>
      </div>
      <div id="admin-users-modal"></div>
    `;

    // Fetch tenants in background for dropdowns
    fetchTenants();
    loadPage(state.page);
  }

  async function fetchTenants() {
    try {
      const data = await API.get('/admin/tenants');
      state.tenants = data.data || data.tenants || data || [];
      if (!Array.isArray(state.tenants)) state.tenants = [];
    } catch (e) {
      console.warn('Failed to fetch tenants:', e);
      state.tenants = [];
    }
  }

  // ── Table Loading ────────────────────────────────────────────────

  async function loadPage(page) {
    const tableEl = document.getElementById('admin-users-table');
    const pagEl = document.getElementById('admin-users-pagination');
    if (!tableEl) return;

    state.page = page;
    const params = { page, per_page: state.perPage };
    if (state.search) params.search = state.search;

    try {
      const data = await API.get('/admin/users', params, true);
      const rows = data.data || data.users || [];
      const pagination = data.pagination || {};

      if (rows.length === 0) {
        tableEl.innerHTML = Components.emptyState('No users found');
        pagEl.innerHTML = '';
        return;
      }

      tableEl.innerHTML = Components.table({
        columns: [
          { label: 'Email', render: r => `<span class="text-simsy-white">${Utils.escapeHtml(r.email)}</span>` },
          { label: 'Display Name', render: r => Utils.escapeHtml(r.display_name || '-') },
          { label: 'Role', render: r => roleBadge(r.role) },
          { label: 'Tenant', render: r => Utils.escapeHtml(r.tenant_name || r.tenant_id || '-') },
          { label: 'Status', render: r => statusBadge(r.is_active !== false) },
          { label: 'Last Login', render: r => r.last_login_at ? Utils.formatDate(r.last_login_at) : '-' },
          { label: 'Actions', render: r => `
            <div class="flex items-center gap-1">
              <button onclick="AdminUsersView.showEditForm('${Utils.escapeHtml(r.id)}')" class="p-1.5 rounded-lg hover:bg-simsy-surface transition-colors text-simsy-grey hover:text-simsy-blue" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              ${!r.last_login_at && !r.is_active ? `<button onclick="AdminUsersView.resendInvite('${Utils.escapeHtml(r.id)}', '${Utils.escapeHtml(r.email)}')" class="p-1.5 rounded-lg hover:bg-simsy-surface transition-colors text-simsy-grey hover:text-simsy-green" title="Resend Invite">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </button>` : ''}
              <button onclick="AdminUsersView.toggleActive('${Utils.escapeHtml(r.id)}', ${!(r.is_active !== false)})" class="p-1.5 rounded-lg hover:bg-simsy-surface transition-colors ${r.is_active !== false ? 'text-simsy-grey hover:text-red-400' : 'text-simsy-grey hover:text-simsy-green'}" title="${r.is_active !== false ? 'Deactivate' : 'Activate'}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${r.is_active !== false ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'}"/></svg>
              </button>
              <button onclick="AdminUsersView.showResetPassword('${Utils.escapeHtml(r.id)}', '${Utils.escapeHtml(r.email)}')" class="p-1.5 rounded-lg hover:bg-simsy-surface transition-colors text-simsy-grey hover:text-simsy-orange" title="Reset Password">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              </button>
              <button onclick="AdminUsersView.confirmDelete('${Utils.escapeHtml(r.id)}', '${Utils.escapeHtml(r.email)}')" class="p-1.5 rounded-lg hover:bg-simsy-surface transition-colors text-simsy-grey hover:text-red-500" title="Delete User">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          ` },
        ],
        rows,
      });

      pagEl.innerHTML = Components.pagination({
        page: pagination.page || page,
        totalPages: pagination.total_pages || 1,
        total: pagination.total || rows.length,
        perPage: pagination.per_page || state.perPage,
        onPageChange: 'AdminUsersView.goToPage',
      });
    } catch (err) {
      tableEl.innerHTML = Components.errorState('Failed to load users: ' + err.message, 'AdminUsersView.refresh');
    }
  }

  // ── Modal Helpers ────────────────────────────────────────────────

  function openModal(title, bodyHtml) {
    const modal = document.getElementById('admin-users-modal');
    if (!modal) return;
    modal.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onclick="if(event.target===this)AdminUsersView.closeModal()">
        <div class="glass-card rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-display text-lg font-bold text-simsy-white">${Utils.escapeHtml(title)}</h2>
            <button onclick="AdminUsersView.closeModal()" class="p-1.5 rounded-lg hover:bg-simsy-surface transition-colors text-simsy-grey hover:text-simsy-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div id="admin-modal-error"></div>
          ${bodyHtml}
        </div>
      </div>
    `;
  }

  function closeModal() {
    const modal = document.getElementById('admin-users-modal');
    if (modal) modal.innerHTML = '';
  }

  function showModalError(msg) {
    const el = document.getElementById('admin-modal-error');
    if (el) el.innerHTML = `<div class="error-banner mb-4"><svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><p class="text-sm text-red-400">${Utils.escapeHtml(msg)}</p></div>`;
  }

  function showModalSuccess(msg) {
    const el = document.getElementById('admin-modal-error');
    if (el) el.innerHTML = `<div class="mb-4 p-3 rounded-xl bg-simsy-green/10 border border-simsy-green/20 text-sm text-simsy-green">${Utils.escapeHtml(msg)}</div>`;
  }

  // ── Create User Form ─────────────────────────────────────────────

  function showCreateForm() {
    openModal('Invite User', `
      <p class="text-sm text-simsy-grey mb-4">An invitation email will be sent to the user to set their own password.</p>
      <form onsubmit="event.preventDefault();AdminUsersView.submitCreate()">
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-simsy-grey mb-1">Email</label>
            <input type="email" id="create-email" class="filter-input w-full" required placeholder="user@example.com">
          </div>
          <div>
            <label class="block text-xs text-simsy-grey mb-1">Display Name</label>
            <input type="text" id="create-display-name" class="filter-input w-full" placeholder="Full name" required>
          </div>
          <div>
            <label class="block text-xs text-simsy-grey mb-1">Role</label>
            <select id="create-role" class="filter-select w-full" onchange="AdminUsersView.onRoleChange('create')">
              <option value="tenant">Tenant</option>
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-simsy-grey mb-1">Tenant</label>
            <select id="create-tenant" class="filter-select w-full">
              <option value="">-- Select Tenant --</option>
              ${tenantOptions('')}
            </select>
          </div>
          <div id="create-customer-name-wrap" class="hidden">
            <label class="block text-xs text-simsy-grey mb-1">Customer Name</label>
            <input type="text" id="create-customer-name" class="filter-input w-full" placeholder="Customer organisation name">
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" onclick="AdminUsersView.closeModal()" class="btn-secondary text-sm">Cancel</button>
            <button type="submit" id="create-submit-btn" class="btn-primary text-sm">Send Invite</button>
          </div>
        </div>
      </form>
    `);
  }

  async function submitCreate() {
    const btn = document.getElementById('create-submit-btn');
    const email = document.getElementById('create-email')?.value?.trim();
    const display_name = document.getElementById('create-display-name')?.value?.trim();
    const role = document.getElementById('create-role')?.value;
    const tenant_id = document.getElementById('create-tenant')?.value;
    const customer_name = document.getElementById('create-customer-name')?.value?.trim();

    if (!email || !display_name || !tenant_id) {
      showModalError('Email, display name, and tenant are required.');
      return;
    }

    const body = { email, display_name, role, tenant_id };
    if (role === 'customer' && customer_name) body.customer_name = customer_name;

    btn.disabled = true;
    btn.textContent = 'Sending invite...';

    try {
      const result = await API.post('/admin/users', body);
      if (result.invite_sent) {
        showModalSuccess('Invitation email sent to ' + email);
      } else {
        showModalSuccess('User created but invitation email failed to send. You may need to resend.');
      }
      setTimeout(() => { closeModal(); loadPage(1); }, 1500);
    } catch (err) {
      showModalError(err.message);
      btn.disabled = false;
      btn.textContent = 'Send Invite';
    }
  }

  // ── Edit User Form ───────────────────────────────────────────────

  async function showEditForm(userId) {
    openModal('Edit User', Components.loading('Loading user...'));
    try {
      const user = await API.get('/admin/users/' + userId, null, true);
      const u = user.data || user;

      const modalBody = document.querySelector('#admin-users-modal .glass-card');
      if (!modalBody) return;

      // Re-render modal content with loaded data
      openModal('Edit User', `
        <form onsubmit="event.preventDefault();AdminUsersView.submitEdit('${Utils.escapeHtml(u.id)}')">
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-simsy-grey mb-1">Email</label>
              <input type="email" id="edit-email" class="filter-input w-full" value="${Utils.escapeHtml(u.email || '')}" required>
            </div>
            <div>
              <label class="block text-xs text-simsy-grey mb-1">Display Name</label>
              <input type="text" id="edit-display-name" class="filter-input w-full" value="${Utils.escapeHtml(u.display_name || '')}">
            </div>
            <div>
              <label class="block text-xs text-simsy-grey mb-1">Role</label>
              <select id="edit-role" class="filter-select w-full" onchange="AdminUsersView.onRoleChange('edit')">
                <option value="tenant" ${u.role === 'tenant' ? 'selected' : ''}>Tenant</option>
                <option value="customer" ${u.role === 'customer' ? 'selected' : ''}>Customer</option>
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-simsy-grey mb-1">Tenant</label>
              <select id="edit-tenant" class="filter-select w-full">
                <option value="">-- Select Tenant --</option>
                ${tenantOptions(u.tenant_id || '')}
              </select>
            </div>
            <div id="edit-customer-name-wrap" class="${u.role === 'customer' ? '' : 'hidden'}">
              <label class="block text-xs text-simsy-grey mb-1">Customer Name</label>
              <input type="text" id="edit-customer-name" class="filter-input w-full" value="${Utils.escapeHtml(u.customer_name || '')}">
            </div>
            <div>
              <label class="flex items-center gap-3 cursor-pointer">
                <div class="relative">
                  <input type="checkbox" id="edit-active" class="sr-only peer" ${u.is_active !== false ? 'checked' : ''}>
                  <div class="w-9 h-5 rounded-full bg-simsy-grey-dark peer-checked:bg-simsy-green transition-colors"></div>
                  <div class="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
                </div>
                <span class="text-sm text-simsy-grey">Active</span>
              </label>
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button type="button" onclick="AdminUsersView.closeModal()" class="btn-secondary text-sm">Cancel</button>
              <button type="submit" id="edit-submit-btn" class="btn-primary text-sm">Save Changes</button>
            </div>
          </div>
        </form>
      `);
    } catch (err) {
      showModalError('Failed to load user: ' + err.message);
    }
  }

  async function submitEdit(userId) {
    const btn = document.getElementById('edit-submit-btn');
    const email = document.getElementById('edit-email')?.value?.trim();
    const display_name = document.getElementById('edit-display-name')?.value?.trim();
    const role = document.getElementById('edit-role')?.value;
    const tenant_id = document.getElementById('edit-tenant')?.value;
    const customer_name = document.getElementById('edit-customer-name')?.value?.trim();
    const is_active = document.getElementById('edit-active')?.checked ?? true;

    if (!email) { showModalError('Email is required.'); return; }

    const body = { email, role, is_active };
    if (display_name) body.display_name = display_name;
    if (tenant_id) body.tenant_id = tenant_id;
    if (role === 'customer' && customer_name) body.customer_name = customer_name;

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      await API.put('/admin/users/' + userId, body);
      showModalSuccess('User updated successfully.');
      setTimeout(() => { closeModal(); loadPage(state.page); }, 800);
    } catch (err) {
      showModalError(err.message);
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  }

  // ── Toggle Active ────────────────────────────────────────────────

  async function toggleActive(userId, newActive) {
    try {
      await API.put('/admin/users/' + userId, { is_active: newActive });
      loadPage(state.page);
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  }

  // ── Reset Password ──────────────────────────────────────────────

  function showResetPassword(userId, email) {
    openModal('Reset Password', `
      <p class="text-sm text-simsy-grey mb-4">Set a new password for <span class="text-simsy-white font-medium">${Utils.escapeHtml(email)}</span></p>
      <form onsubmit="event.preventDefault();AdminUsersView.submitResetPassword('${Utils.escapeHtml(userId)}')">
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-simsy-grey mb-1">New Password</label>
            <input type="password" id="reset-password" class="filter-input w-full" required placeholder="Minimum 12 characters" minlength="12">
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" onclick="AdminUsersView.closeModal()" class="btn-secondary text-sm">Cancel</button>
            <button type="submit" id="reset-submit-btn" class="btn-primary text-sm">Reset Password</button>
          </div>
        </div>
      </form>
    `);
  }

  async function submitResetPassword(userId) {
    const btn = document.getElementById('reset-submit-btn');
    const new_password = document.getElementById('reset-password')?.value;

    if (!new_password || new_password.length < 12) { showModalError('Password must be at least 12 characters.'); return; }

    btn.disabled = true;
    btn.textContent = 'Resetting...';

    try {
      await API.post('/admin/users/' + userId + '/reset-password', { new_password });
      showModalSuccess('Password has been reset.');
      setTimeout(() => closeModal(), 1200);
    } catch (err) {
      showModalError(err.message);
      btn.disabled = false;
      btn.textContent = 'Reset Password';
    }
  }

  // ── Delete User ─────────────────────────────────────────────────

  function confirmDelete(userId, email) {
    openModal('Delete User', `
      <div class="text-center space-y-4">
        <div class="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <p class="text-sm text-simsy-grey">Are you sure you want to permanently delete <span class="text-simsy-white font-medium">${Utils.escapeHtml(email)}</span>?</p>
        <p class="text-xs text-red-400">This action cannot be undone. All sessions and OTP records for this user will also be deleted.</p>
        <div class="flex justify-center gap-3 pt-2">
          <button type="button" onclick="AdminUsersView.closeModal()" class="btn-secondary text-sm">Cancel</button>
          <button type="button" id="delete-confirm-btn" onclick="AdminUsersView.deleteUser('${Utils.escapeHtml(userId)}')" class="text-sm px-4 py-2 rounded-xl font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">Delete Permanently</button>
        </div>
      </div>
    `);
  }

  async function deleteUser(userId) {
    const btn = document.getElementById('delete-confirm-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Deleting...';
    }

    try {
      await API.del('/admin/users/' + userId);
      showModalSuccess('User deleted successfully.');
      setTimeout(() => { closeModal(); loadPage(state.page); }, 800);
    } catch (err) {
      showModalError(err.message);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Delete Permanently';
      }
    }
  }

  // ── Resend Invite ──────────────────────────────────────────────

  async function resendInvite(userId, email) {
    openModal('Resend Invite', `
      <p class="text-sm text-simsy-grey mb-4">Send a new invitation email to <span class="text-simsy-white font-medium">${Utils.escapeHtml(email)}</span>?</p>
      <p class="text-xs text-simsy-grey mb-4">Any previous invite link will be invalidated. The new link expires in 48 hours.</p>
      <div class="flex justify-end gap-3">
        <button type="button" onclick="AdminUsersView.closeModal()" class="btn-secondary text-sm">Cancel</button>
        <button type="button" id="resend-invite-btn" onclick="AdminUsersView.doResendInvite('${Utils.escapeHtml(userId)}')" class="btn-primary text-sm">Send Invite</button>
      </div>
    `);
  }

  async function doResendInvite(userId) {
    const btn = document.getElementById('resend-invite-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    try {
      const result = await API.post('/admin/users/' + userId + '/resend-invite', {});
      if (result.invite_sent) {
        showModalSuccess('Invitation email sent.');
      } else {
        showModalError('Failed to send invite email. Please check Brevo settings.');
      }
      setTimeout(() => closeModal(), 1500);
    } catch (err) {
      showModalError(err.message);
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Send Invite';
      }
    }
  }

  // ── Role Change Handler ─────────────────────────────────────────

  function onRoleChange(prefix) {
    const role = document.getElementById(prefix + '-role')?.value;
    const wrap = document.getElementById(prefix + '-customer-name-wrap');
    if (wrap) {
      wrap.classList.toggle('hidden', role !== 'customer');
    }
  }

  // ── Public API ──────────────────────────────────────────────────

  window.AdminUsersView = {
    refresh()        { render(document.getElementById('view-container')); },
    search()         {
      state.search = document.getElementById('admin-user-search')?.value?.trim() || '';
      state.page = 1;
      loadPage(1);
    },
    clearSearch()    {
      state.search = '';
      const el = document.getElementById('admin-user-search');
      if (el) el.value = '';
      loadPage(1);
    },
    goToPage(p)      { loadPage(p); },
    showCreateForm,
    submitCreate,
    showEditForm,
    submitEdit,
    toggleActive,
    showResetPassword,
    submitResetPassword,
    confirmDelete,
    deleteUser,
    resendInvite,
    doResendInvite,
    closeModal,
    onRoleChange,
  };

  Router.register('users', render);
})();
