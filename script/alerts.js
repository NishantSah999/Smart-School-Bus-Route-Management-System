// SmartBus Alerts — real API data, persistent resolve/acknowledge, live updates via Socket.IO.
(() => {
  if (!auth.guard()) return;

  const state = { status: '', page: 1, limit: 6, total: 0 };

  const $ = (id) => document.getElementById(id);
  const listEl = $('alert-list');
  const rangeEl = $('alert-range');

  const sevBadge = { CRITICAL: 'badge-critical', WARNING: 'badge-warning', INFO: 'badge-info' };
  const sevClass = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' };

  function loadStats() {
    api.get('/alerts', { limit: 1 })
      .then(({ data }) => {
        const alerts = data.data;
        const critical = alerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
        const warning = alerts.filter((a) => a.severity === 'WARNING' && a.status !== 'RESOLVED').length;
        const info = alerts.filter((a) => a.severity === 'INFO' && a.status !== 'RESOLVED').length;
        const resolved = alerts.filter((a) => a.status === 'RESOLVED').length;
        const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
        set('stat-critical', critical);
        set('stat-critical-foot', critical ? 'Requires immediate action' : 'All clear');
        set('stat-warning', warning);
        set('stat-warning-foot', warning ? 'Needs attention' : 'All clear');
        set('stat-info', info);
        set('stat-info-foot', 'General notifications');
        set('stat-resolved', resolved);
        set('stat-resolved-foot', 'Resolved alerts');
        set('stat-total', data.pagination.total);
        set('donut-total', data.pagination.total);
      })
      .catch((e) => toast.error(e.message));
  }

  function loadAlerts() {
    toast.skeleton(listEl, 3, 96);
    api.get('/alerts', { status: state.status || undefined, page: state.page, limit: state.limit })
      .then(({ data }) => {
        state.total = data.pagination.total;
        rangeEl.textContent = `Showing ${Math.min(1, (state.page - 1) * state.limit + 1)} to ${Math.min(state.total, state.page * state.limit)} of ${state.total} alerts`;
        if (!data.data.length) {
          listEl.innerHTML = '<div class="alert-card" style="padding:28px;text-align:center;color:#6b7280;">No alerts found.</div>';
          return;
        }
        listEl.innerHTML = data.data.map((a) => renderCard(a)).join('');
        wireResolveButtons();
        renderPagination(data.pagination);
      })
      .catch((e) => { listEl.innerHTML = '<div class="alert-card" style="padding:28px;text-align:center;color:#b91c1c;">Unable to load alerts. ' + e.message + '</div>'; });
  }

  function renderCard(a) {
    const type = (a.type || '').replace(/_/g, ' ');
    const statusLabel = a.status === 'RESOLVED' ? 'Resolved' : a.status === 'ACKNOWLEDGED' ? 'Acknowledged' : 'Unresolved';
    const statusClass = a.status === 'RESOLVED' ? 'resolved' : 'unresolved';
    const action = a.status === 'RESOLVED'
      ? '<span class="resolved-label">Resolved</span>'
      : `<button class="action-resolve" data-id="${a.id}">${a.status === 'ACKNOWLEDGED' ? 'Resolve' : 'Resolve'}</button>`;
    const time = a.created_at ? new Date(a.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    return `
      <div class="alert-card ${sevClass[a.severity] || 'info'}">
        <div class="alert-header">
          <span class="alert-type ${(a.severity || 'info').toLowerCase()}">${a.severity || 'Info'}</span>
          <span class="alert-status ${statusClass}">${statusLabel}</span>
        </div>
        <div class="alert-title">${a.message || type}</div>
        <div class="alert-desc">${type}</div>
        <div class="alert-meta-grid">
          <div class="meta-item"><span class="meta-label">Bus & Driver</span><span class="meta-value">${a.bus_number || '—'} · ${a.driver_name || '—'}</span></div>
          <div class="meta-item"><span class="meta-label">Route</span><span class="meta-value">${a.route_name || '—'}</span></div>
          <div class="meta-item"><span class="meta-label">Time</span><span class="meta-value">${time}</span></div>
          <div class="meta-item"><span class="meta-label">Severity</span><span class="meta-value ${sevBadge[a.severity] || 'badge-info'}">${a.severity || 'Info'}</span></div>
          <div class="meta-item"><span class="meta-label">Status</span><span class="meta-value badge-${a.status === 'RESOLVED' ? 'resolved' : 'unresolved'}">${statusLabel}</span></div>
          <div class="meta-item actions">${action}</div>
        </div>
      </div>`;
  }

  function wireResolveButtons() {
    listEl.querySelectorAll('.action-resolve').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        try {
          await api.post(`/alerts/${id}/resolve`, { status: 'RESOLVED' });
          toast.success('Alert resolved');
          loadAlerts();
          loadStats();
        } catch (e) {
          toast.error(e.message);
          btn.disabled = false;
        }
      });
    });
  }

  function renderPagination(pg) {
    const nav = document.querySelector('.alert-pagination .pagination');
    if (!nav) return;
    let html = '<button data-page="prev">&larr;</button>';
    for (let i = 1; i <= Math.min(pg.totalPages, 5); i++) html += `<button class="${i === pg.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    html += '<button data-page="next">&rarr;</button>';
    nav.innerHTML = html;
    nav.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        const p = b.dataset.page;
        if (p === 'prev') state.page = Math.max(1, state.page - 1);
        else if (p === 'next') state.page = Math.min(pg.totalPages, state.page + 1);
        else state.page = Number(p);
        loadAlerts();
      });
    });
  }

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.status = btn.textContent === 'Unresolved' ? 'OPEN' : btn.textContent === 'Resolved' ? 'RESOLVED' : '';
      state.page = 1;
      loadAlerts();
    });
  });

  // Real-time: prepend new alerts as they arrive.
  function connectSocket() {
    if (!api.store.access) return;
    try {
      const socket = io('/', { auth: { token: api.store.access } });
      socket.on('alert:new', (alert) => {
        if (!state.status || state.status === 'OPEN') {
          const card = document.createElement('div');
          card.innerHTML = renderCard(alert);
          listEl.prepend(card.firstElementChild);
          wireResolveButtons();
        }
        loadStats();
        toast.warning(alert.message || 'New alert');
      });
      socket.on('sos:triggered', (data) => {
        toast.error(`🚨 SOS: ${data.alert?.message || 'Emergency activated'}`);
      });
      socket.on('notification:new', (n) => toast.info(n.title));
    } catch (e) { /* socket optional */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadAlerts();
    if (window.io) connectSocket();
  });
})();