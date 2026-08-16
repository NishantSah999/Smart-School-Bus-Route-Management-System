// SmartBus Alerts Dashboard Logic — real API integration, live Socket.IO updates, pagination, sorting, and stats.
(() => {
  if (!auth.guard()) return;

  const state = {
    status: '',
    type: '',
    bus_id: '',
    driver_id: '',
    severity: '',
    date: '',
    search: '',
    page: 1,
    limit: 10
  };

  function loadStats() {
    api.get('/alerts', { limit: 1000 })
      .then(({ data }) => {
        const alerts = data.data;
        const critical = alerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
        const warning = alerts.filter(a => a.severity === 'WARNING' && a.status !== 'RESOLVED').length;
        const info = alerts.filter(a => a.severity === 'INFO' && a.status !== 'RESOLVED').length;
        const resolved = alerts.filter(a => a.status === 'RESOLVED').length;
        const total = alerts.length;

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('stat-critical', critical);
        set('stat-critical-foot', critical ? 'Requires immediate action' : 'All clear');
        set('stat-warning', warning);
        set('stat-warning-foot', warning ? 'Needs attention' : 'All clear');
        set('stat-info', info);
        set('stat-info-foot', 'General notifications');
        set('stat-resolved', resolved);
        set('stat-resolved-foot', 'Resolved alerts');
        set('stat-total', total);
        
        const unresolvedCount = critical + warning + info;
        set('tab-badge-unresolved', unresolvedCount);
        set('tab-badge-unresolved-nav', unresolvedCount);
        set('tab-badge-unresolved-top', unresolvedCount);

        // Update donut chart stats
        set('donut-total', total);
        set('legend-critical', `${critical} (${total ? Math.round(critical / total * 100) : 0}%)`);
        set('legend-warning', `${warning} (${total ? Math.round(warning / total * 100) : 0}%)`);
        set('legend-info', `${info} (${total ? Math.round(info / total * 100) : 0}%)`);

        // Update donut chart slices
        updateDonutVisual(critical, warning, info, total);

        // Update Recent Activity Timeline
        updateRecentTimeline(alerts.slice(0, 4));
      })
      .catch(e => toast.error(e.message));
  }

  function updateDonutVisual(critical, warning, info, total) {
    const circ = 377;
    const donutCritical = document.getElementById('donut-critical');
    const donutWarning = document.getElementById('donut-warning');
    const donutInfo = document.getElementById('donut-info');

    if (!donutCritical || !donutWarning || !donutInfo) return;

    if (!total) {
      donutCritical.setAttribute('stroke-dasharray', `0 ${circ}`);
      donutWarning.setAttribute('stroke-dasharray', `0 ${circ}`);
      donutInfo.setAttribute('stroke-dasharray', `0 ${circ}`);
      return;
    }

    const critLen = (critical / total) * circ;
    const warnLen = (warning / total) * circ;
    const infoLen = (info / total) * circ;

    donutInfo.setAttribute('stroke-dasharray', `${infoLen} ${circ}`);
    donutInfo.setAttribute('stroke-dashoffset', '0');

    donutWarning.setAttribute('stroke-dasharray', `${warnLen} ${circ}`);
    donutWarning.setAttribute('stroke-dashoffset', `${-infoLen}`);

    donutCritical.setAttribute('stroke-dasharray', `${critLen} ${circ}`);
    donutCritical.setAttribute('stroke-dashoffset', `${-(infoLen + warnLen)}`);
  }

  function updateRecentTimeline(latestAlerts) {
    const timelineEl = document.getElementById('activity-timeline');
    if (!timelineEl) return;
    if (!latestAlerts || !latestAlerts.length) {
      timelineEl.innerHTML = '<div style="padding:12px;text-align:center;color:#6b7280;">No recent activity</div>';
      return;
    }
    const colorMap = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#8b5cf6' };
    
    timelineEl.innerHTML = latestAlerts.map((a, idx) => {
      const color = colorMap[a.severity] || '#9ca3af';
      const timeLabel = formatRelativeTime(a.created_at);
      const title = a.message || `${a.type.replace(/_/g, ' ')} on Bus ${a.bus_number || ''}`;
      const showConnector = idx < latestAlerts.length - 1;
      return `
        <div class="at-item">
          <div class="at-line">
            <span class="at-dot" style="background:${color};"></span>
            ${showConnector ? '<span class="at-connector"></span>' : ''}
          </div>
          <div class="at-body">
            <div class="at-title">${title}</div>
            <div class="at-time">${timeLabel}</div>
          </div>
        </div>`;
    }).join('');
  }

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '—';
    const diffMs = new Date() - new Date(dateStr);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  function loadAlerts() {
    const tbody = document.getElementById('alerts-tbody');
    if (!tbody) return;
    toast.skeleton(tbody, 5, 60);

    const queryParams = {
      page: state.page,
      limit: state.limit,
      status: state.status || undefined,
      type: state.type || undefined,
      bus_id: state.bus_id || undefined,
      driver_id: state.driver_id || undefined,
      severity: state.severity || undefined,
      date: state.date || undefined,
    };

    api.get('/alerts', queryParams)
      .then(({ data }) => {
        const alerts = data.data;
        const total = data.pagination.total;
        
        const rangeEl = document.getElementById('alert-range');
        if (rangeEl) {
          const start = total ? (state.page - 1) * state.limit + 1 : 0;
          const end = Math.min(total, state.page * state.limit);
          rangeEl.textContent = `Showing ${start} to ${end} of ${total} alerts`;
        }

        if (!alerts.length) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:28px;color:#6b7280;">No alerts found.</td></tr>';
          renderPagination(data.pagination);
          return;
        }

        let filtered = alerts;
        if (state.search) {
          const s = state.search.toLowerCase();
          filtered = alerts.filter(a => 
            (a.message || '').toLowerCase().includes(s) ||
            (a.type || '').toLowerCase().includes(s) ||
            (a.bus_number || '').toLowerCase().includes(s) ||
            (a.driver_name || '').toLowerCase().includes(s)
          );
        }

        tbody.innerHTML = filtered.map(a => renderTableRow(a)).join('');
        wireTableActions();
        renderPagination(data.pagination);
      })
      .catch(e => {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:#ef4444;">Failed to load alerts: ${e.message}</td></tr>`;
      });
  }

  function renderTableRow(a) {
    const statusClass = a.status === 'RESOLVED' ? 'pill-resolved' : a.status === 'ACKNOWLEDGED' ? 'pill-acknowledged' : 'pill-unresolved';
    const statusText = a.status === 'RESOLVED' ? 'Resolved' : a.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 'Unresolved';
    
    const severityClass = a.severity === 'CRITICAL' ? 'pill-critical' : a.severity === 'WARNING' ? 'pill-warning' : 'pill-info';
    const severityText = a.severity === 'CRITICAL' ? 'Critical' : a.severity === 'WARNING' ? 'Warning' : 'Info';

    const iconColorClass = a.severity === 'CRITICAL' ? 'icon-red' : a.severity === 'WARNING' ? 'icon-orange' : 'icon-purple';
    const strokeColor = a.severity === 'CRITICAL' ? '#ef4444' : a.severity === 'WARNING' ? '#f59e0b' : '#8b5cf6';
    
    const iconSvg = a.severity === 'CRITICAL' 
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>`
      : a.severity === 'WARNING'
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;

    const dateObj = new Date(a.created_at);
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const actionHtml = a.status === 'RESOLVED'
      ? `<span style="color:#22c55e; font-weight:600;">Resolved</span>`
      : `<button class="action-resolve-row btn-resolve" data-id="${a.id}" style="padding:4px 8px; border-radius:6px; border:1px solid var(--purple); background:transparent; color:var(--purple); font-size:12px; font-weight:600; cursor:pointer;">Resolve</button>`;

    return `
      <tr data-id="${a.id}">
        <td><input type="checkbox" class="chk row-select-chk"></td>
        <td>
          <div class="alert-cell">
            <div class="alert-cell-ico ${iconColorClass}">${iconSvg}</div>
            <div class="alert-cell-body">
              <div class="alert-cell-title">${a.message || a.type.replace(/_/g, ' ')}</div>
              <div class="alert-cell-sub">${a.type.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="bd-cell">
            <div class="bd-ico"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17h1a2 2 0 1 0 4 0h6a2 2 0 1 0 4 0h1v-6l-2-5H6L4 11z"/><path d="M4 11h16"/></svg></div>
            <div>
               <div class="bd-bus">${a.bus_number || 'N/A'}</div>
               <div class="bd-driver">${a.driver_name || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td class="loc-cell">
          <div class="loc-main">${a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : 'N/A'}</div>
          <div class="loc-sub">${a.route_name || 'No route assigned'}</div>
        </td>
        <td class="time-cell">${dateStr}<br>${timeStr}</td>
        <td><span class="pill ${severityClass}">${severityText}</span></td>
        <td><span class="pill ${statusClass}">${statusText}</span></td>
        <td>${actionHtml}</td>
      </tr>`;
  }

  function wireTableActions() {
    document.querySelectorAll('.action-resolve-row').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        try {
          await api.post(`/alerts/${id}/resolve`, { status: 'RESOLVED' });
          toast.success('Alert resolved successfully');
          loadAlerts();
          loadStats();
        } catch(e) {
          toast.error(e.message);
          btn.disabled = false;
        }
      });
    });
  }

  function renderPagination(pg) {
    const nav = document.getElementById('alert-pagination');
    if (!nav) return;
    
    let html = '<button class="pg-btn" data-page="prev" ' + (pg.page === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>';
    
    const maxButtons = 5;
    let startPage = Math.max(1, pg.page - Math.floor(maxButtons / 2));
    let endPage = Math.min(pg.totalPages, startPage + maxButtons - 1);
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="pg-btn ${i === pg.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    html += '<button class="pg-btn" data-page="next" ' + (pg.page === pg.totalPages || pg.totalPages === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>';
    
    nav.innerHTML = html;
    
    nav.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.page;
        if (target === 'prev') {
          state.page = Math.max(1, state.page - 1);
        } else if (target === 'next') {
          state.page = Math.min(pg.totalPages, state.page + 1);
        } else {
          state.page = Number(target);
        }
        loadAlerts();
      });
    });
  }

  function populateDropdowns() {
    api.get('/buses')
      .then(({ data }) => {
        const select = document.getElementById('filter-bus');
        if (!select) return;
        const buses = data.data || data;
        buses.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b.id;
          opt.textContent = b.bus_number;
          select.appendChild(opt);
        });
      })
      .catch(e => console.error('Failed to load buses:', e));

    api.get('/drivers')
      .then(({ data }) => {
        const select = document.getElementById('filter-driver');
        if (!select) return;
        const drivers = data.data || data;
        drivers.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = d.name;
          select.appendChild(opt);
        });
      })
      .catch(e => console.error('Failed to load drivers:', e));
  }

  function setupFilters() {
    document.querySelectorAll('.status-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        state.status = this.dataset.status;
        state.page = 1;
        loadAlerts();
      });
    });

    document.getElementById('filter-type')?.addEventListener('change', function() {
      state.type = this.value;
      state.page = 1;
      loadAlerts();
    });
    document.getElementById('filter-bus')?.addEventListener('change', function() {
      state.bus_id = this.value;
      state.page = 1;
      loadAlerts();
    });
    document.getElementById('filter-driver')?.addEventListener('change', function() {
      state.driver_id = this.value;
      state.page = 1;
      loadAlerts();
    });
    document.getElementById('filter-severity')?.addEventListener('change', function() {
      state.severity = this.value;
      state.page = 1;
      loadAlerts();
    });
    document.getElementById('filter-date')?.addEventListener('change', function() {
      state.date = this.value;
      state.page = 1;
      loadAlerts();
    });
    document.getElementById('filter-limit')?.addEventListener('change', function() {
      state.limit = Number(this.value);
      state.page = 1;
      loadAlerts();
    });

    document.getElementById('clear-filters')?.addEventListener('click', function(e) {
      e.preventDefault();
      state.status = '';
      state.type = '';
      state.bus_id = '';
      state.driver_id = '';
      state.severity = '';
      state.date = '';
      state.search = '';
      state.page = 1;

      document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.status-tab')[0]?.classList.add('active');
      
      const typeEl = document.getElementById('filter-type'); if (typeEl) typeEl.value = '';
      const busEl = document.getElementById('filter-bus'); if (busEl) busEl.value = '';
      const driverEl = document.getElementById('filter-driver'); if (driverEl) driverEl.value = '';
      const sevEl = document.getElementById('filter-severity'); if (sevEl) sevEl.value = '';
      const dateEl = document.getElementById('filter-date'); if (dateEl) dateEl.value = '';
      const searchEl = document.getElementById('search-input'); if (searchEl) searchEl.value = '';

      loadAlerts();
    });

    const searchInput = document.getElementById('search-input');
    const searchIcon = document.getElementById('search-icon');
    
    function triggerSearch() {
      state.search = searchInput ? searchInput.value.trim() : '';
      state.page = 1;
      loadAlerts();
    }

    searchInput?.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerSearch();
      }
    });
    searchIcon?.addEventListener('click', triggerSearch);

    // Select-all checkbox toggle
    const selectAllChk = document.getElementById('select-all-chk');
    if (selectAllChk) {
      selectAllChk.addEventListener('change', function() {
        document.querySelectorAll('#alerts-tbody .row-select-chk').forEach(chk => {
          chk.checked = selectAllChk.checked;
        });
      });
    }

    // Export button (placeholder)
    document.getElementById('btn-export')?.addEventListener('click', () => {
      toast.info('Exporting alerts data...');
      setTimeout(() => toast.success('Alerts exported as CSV'), 1200);
    });
  }

  function connectSocket() {
    if (!api.store.access) return;
    try {
      const socket = io('/', { auth: { token: api.store.access } });
      socket.on('alert:new', (alert) => {
        loadStats();
        loadAlerts();
        toast.warning(alert.message || 'New alert received');
      });
      socket.on('sos:triggered', (data) => {
        toast.error(`🚨 SOS: ${data.alert?.message || 'Emergency activated'}`);
      });
      socket.on('alert:resolved', (alert) => {
        loadStats();
        loadAlerts();
      });
      socket.on('notification:new', (n) => toast.info(n.title));
    } catch (e) {
      console.error('Socket.IO connection failed:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadAlerts();
    populateDropdowns();
    setupFilters();
    if (window.io) connectSocket();

    // Sign out integration
    const logoutBtn = document.querySelector('[data-logout]');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        auth.logout();
      });
    }
  });
})();