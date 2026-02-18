/**
 * Simple hash-based router for sidebar navigation.
 */
const Router = {
  currentView: null,
  views: {},
  viewTitles: {
    overview: 'Dashboard',
    usage: 'Usage Reports',
    bundles: 'Active Bundles',
    instances: 'Bundle Instances',
    endpoints: 'Endpoints',
    roaming: 'Roaming Analytics',
    trends: 'Usage Trends',
    cost: 'Cost Analysis',
    export: 'Export Data',
  },

  /**
   * Register a view.
   */
  register(name, renderFn) {
    this.views[name] = renderFn;
  },

  /**
   * Initialize the router.
   */
  init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this._onHashChange());

    // Setup sidebar click handlers
    document.querySelectorAll('[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        window.location.hash = '#' + view;
      });
    });

    // Navigate to current hash or default
    this._onHashChange();
  },

  /**
   * Navigate to a view programmatically with optional params.
   * Forces re-render even if the hash hasn't changed (e.g. back buttons).
   */
  navigate(viewName, params) {
    if (params) {
      this._pendingParams = params;
    }
    const currentHash = window.location.hash.replace('#', '') || 'overview';
    if (currentHash === viewName) {
      // Hash didn't change so hashchange won't fire — render manually
      this._renderView(viewName);
    } else {
      window.location.hash = '#' + viewName;
    }
  },

  /**
   * Get and clear pending navigation params.
   */
  getParams() {
    const p = this._pendingParams;
    this._pendingParams = null;
    return p;
  },

  _onHashChange() {
    const hash = window.location.hash.replace('#', '') || 'overview';
    this._renderView(hash);
  },

  _renderView(viewName) {
    // Destroy any existing charts
    Charts.destroyAll();

    // Update sidebar active state
    document.querySelectorAll('[data-view]').forEach(link => {
      const isActive = link.getAttribute('data-view') === viewName;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.classList.remove('text-simsy-grey');
      } else {
        link.classList.add('text-simsy-grey');
      }
    });

    // Update breadcrumb
    const breadcrumbView = document.getElementById('breadcrumb-view');
    if (breadcrumbView) {
      breadcrumbView.textContent = this.viewTitles[viewName] || viewName;
    }

    // Render view
    const container = document.getElementById('view-container');
    if (!container) return;

    const renderFn = this.views[viewName];
    if (renderFn) {
      this.currentView = viewName;
      container.innerHTML = Components.loading('Loading ' + (this.viewTitles[viewName] || '') + '...');
      try {
        renderFn(container);
      } catch (err) {
        console.error('View render error:', err);
        container.innerHTML = Components.errorState('Failed to load view: ' + err.message);
      }
    } else {
      container.innerHTML = Components.emptyState('View "' + viewName + '" not found');
    }

    // Close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth < 1024) {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('block');
    }
  },
};
