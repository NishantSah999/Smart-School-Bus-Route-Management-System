// Dashboard — hydrates all KPIs, recent alerts, arrivals and fleet status from the API.
(() => {
  if (!auth.guard()) return;

  const severityClass = { CRITICAL: 'bg-red', WARNING: 'bg-orange', INFO: 'bg-purple' };
  const severityColor = { CRITICAL: '#ef4444', WARNING: '#f59e0b', INFO: '#8b5cf6' };
  const severityIcon = {
    CRITICAL: '<circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/>',
    WARNING: '<path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z"/>',
    INFO: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  };
  const busIcon = '<path d="M4 17h1a2 2 0 1 0 4 0h6a2 2 0 1 0 4 0h1v-6l-2-5H6L4 11z"/><path d="M4 11h16"/>';

  function timeAgo(ts) {
    if (!ts) return '—';
    const s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    return `${h}h ago`;
  }

  async function load() {
    try {
      const { data } = await api.get('/dashboard/summary');
      renderStats(data);
      renderAlerts();
      renderArrivals();
    } catch (e) {
      toast.error(e.message || 'Unable to load dashboard data.');
    }
  }

  function renderStats(d) {
    const buses = d.buses;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    set('stat-total-buses', buses.total);
    set('stat-buses-foot', buses.online ? `${buses.online} online now` : 'Loading fleet…');
    set('stat-active-buses', buses.active);
    set('stat-active-buses-foot', `${Math.round((buses.active / Math.max(1, buses.total)) * 100)}% of total`);
    set('stat-total-passengers', d.students.total);
    set('stat-passengers-foot', `${d.students.active} active`);
    set('stat-active-trips', d.trips.active_now);
    set('stat-trips-foot', `${d.trips.total_today} trips today`);
    set('stat-safety-alerts', d.alerts.critical);
    set('stat-alerts-foot', `${d.alerts.open} open alerts`);

    // Fleet status donut
    set('fleet-total', buses.total);
    const C = 2 * Math.PI * 68;
    const segs = [
      { key: 'active', color: '#22c55e', label: 'Active' },
      { key: 'idle', color: '#8b5cf6', label: 'Idle' },
      { key: 'maintenance', color: '#ef4444', label: 'Maintenance' },
    ];
    let offset = 0;
    const circles = document.querySelectorAll('.donut-wrap svg circle[stroke-dasharray]');
    segs.forEach((seg, i) => {
      const count = seg.key === 'active' ? buses.active : buses[seg.key];
      const pct = count / Math.max(1, buses.total);
      const len = pct * C;
      const c = circles[i];
      if (c) { c.setAttribute('stroke-dasharray', `${len} ${C}`); c.setAttribute('stroke-dashoffset', -offset); c.setAttribute('stroke', seg.color); }
      offset += len;
      const row = document.querySelectorAll('#fleet-legend .donut-legend-row')[i];
      if (row) row.querySelector('.val').textContent = `${count} (${Math.round(pct * 100)}%)`;
    });
  }

  async function renderAlerts() {
    const container = document.getElementById('recent-alerts');
    if (!container) return;
    try {
      const { data } = await api.get('/alerts', { status: 'OPEN', limit: 4 });
      const badge = document.getElementById('nav-alert-badge');
      if (badge) badge.textContent = data.pagination.total;
      if (!data.data.length) {
        container.innerHTML = '<div class="alert-item" style="opacity:.7"><div class="alert-body"><div class="alert-title">All clear</div><div class="alert-meta">No open alerts</div></div></div>';
        return;
      }
      container.innerHTML = data.data.map((a) => `
        <div class="alert-item ${severityClass[a.severity] || 'bg-purple'}">
          <div class="alert-ico"><svg viewBox="0 0 24 24" fill="none" stroke="${severityColor[a.severity] || '#8b5cf6'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${severityIcon[a.severity] || severityIcon.INFO}</svg></div>
          <div class="alert-body">
            <div class="alert-title">${a.message || (a.type || '').replace(/_/g, ' ')}</div>
            <div class="alert-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${busIcon}</svg>
              ${a.bus_number || '—'} &nbsp;&bull;&nbsp; ${a.driver_name || '—'}
            </div>
          </div>
          <div class="alert-time">${timeAgo(a.created_at)}</div>
        </div>`).join('');
    } catch (e) {
      container.innerHTML = '<div class="alert-item"><div class="alert-body"><div class="alert-title">Unable to load alerts</div></div></div>';
    }
  }

  async function renderArrivals() {
    const container = document.getElementById('next-arrivals');
    if (!container) return;
    try {
      const { data } = await api.get('/tracking/fleet');
      const onRoute = data.filter((b) => b.status === 'ON_ROUTE').slice(0, 3);
      container.innerHTML = onRoute.length ? onRoute.map((b) => `
        <div class="arrival-item">
          <div class="arrival-ico icon-green"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${busIcon}</svg></div>
          <div class="arrival-body">
            <div class="arrival-bus">${b.bus_number}</div>
            <div class="arrival-route">${b.route_name || '—'} &nbsp;&bull;&nbsp; ${b.last_speed ? b.last_speed + ' km/h' : 'At stop'}</div>
          </div>
          <div class="arrival-time"><div class="t">${b.last_update ? new Date(b.last_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div><div class="m">${timeAgo(b.last_update)}</div></div>
        </div>`).join('')
        : '<div class="arrival-item"><div class="arrival-body"><div class="arrival-bus">No active trips</div></div></div>';
    } catch (e) {
      container.innerHTML = '<div class="arrival-item"><div class="arrival-body"><div class="arrival-bus">Unable to load arrivals</div></div></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();