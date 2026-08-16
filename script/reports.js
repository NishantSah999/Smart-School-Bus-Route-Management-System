// Legacy page interactions.
// SmartBus — shared UI interactions

document.addEventListener('DOMContentLoaded', () => {

  // Sidebar nav: clicking an item marks it active
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Week / Month / Year toggle (Trip Performance card)
  document.querySelectorAll('.toggle-group').forEach(group => {
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // Sidebar collapse button (visual toggle only)
  const collapseBtn = document.querySelector('.collapse-btn');
  const sidebar = document.querySelector('.sidebar');
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Filter dropdown stubs (Report Filters card)
  document.querySelectorAll('.filter-select').forEach(select => {
    select.addEventListener('click', () => {
      select.classList.toggle('open');
    });
  });

  // Apply / Reset filter buttons
  const applyBtn = document.querySelector('.btn-apply');
  const resetBtn = document.querySelector('.btn-reset');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      console.log('Applying report filters...');
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      console.log('Resetting report filters...');
    });
  }

});
// API-backed report data.
// SmartBus Reports — KPI cards, daily trips chart, route/fleet/safety tables, CSV export.
(() => {
  if (!auth.guard(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TRANSPORT_MANAGER', 'TEACHER'])) return;

  const $ = (id) => document.getElementById(id);
  const user = api.store.user;
  const filters = {};

  async function loadOptions() {
    try {
      const [buses, routes, drivers] = await Promise.all([
        api.get('/buses', { limit: 100 }),
        api.get('/routes', { limit: 100 }),
        api.get('/drivers', { limit: 100 }),
      ]);
      $('f-bus').innerHTML = '<option value="">All buses</option>' + buses.data.data.map((b) => `<option value="${b.id}">${b.bus_number}</option>`).join('');
      $('f-route').innerHTML = '<option value="">All routes</option>' + routes.data.data.map((r) => `<option value="${r.id}">${r.name}</option>`).join('');
      $('f-driver').innerHTML = '<option value="">All drivers</option>' + drivers.data.data.map((d) => `<option value="${d.id}">${d.name}</option>`).join('');
    } catch (e) { /* filters stay empty */ }
  }

  function collectFilters() {
    filters.bus_id = $('f-bus').value || undefined;
    filters.route_id = $('f-route').value || undefined;
    filters.driver_id = $('f-driver').value || undefined;
    filters.from = $('f-from').value || undefined;
    filters.to = $('f-to').value || undefined;
  }

  function qs() {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, v); });
    return p.toString();
  }

  async function loadKpis() {
    const { data } = await api.get('/reports/trips?' + qs());
    $('k-trips').textContent = data.trips;
    $('k-completed').textContent = data.completed;
    $('k-cancelled').textContent = data.cancelled;
    $('k-distance').textContent = Number(data.total_distance).toFixed(1);
    $('k-passengers').textContent = data.passengers_transported;
  }

  async function loadDaily() {
    const { data } = await api.get('/reports/trips/daily?' + qs());
    const max = Math.max(1, ...data.map((d) => d.trips));
    const wrap = $('daily-chart');
    if (!data.length) { wrap.innerHTML = '<div style="color:#6b7280;font-size:14px;">No trips in range.</div>'; return; }
    wrap.innerHTML = data.slice(0, 30).reverse().map((d) => `
      <div style="display:flex;flex-direction:column;flex:1;min-width:0;height:100%;justify-content:flex-end;">
        <div class="bar" style="height:${Math.max(4, (d.trips / max) * 100)}%" title="${d.day}: ${d.trips} trips"><span>${d.trips}</span></div>
        <div class="bar-day">${d.day.slice(5)}</div>
      </div>`).join('');
  }

  async function loadRoutes() {
    const { data } = await api.get('/reports/routes');
    $('route-tbody').innerHTML = data.length ? data.map((r) => `
      <tr>
        <td><strong>${r.name}</strong> <span style="color:#6b7280;font-size:12px;">${r.route_code}</span></td>
        <td>${r.trips}</td>
        <td>${Math.round(r.avg_duration_sec / 60)} min</td>
        <td>${Number(r.avg_distance).toFixed(1)} km</td>
        <td>${r.passengers}</td>
      </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:#6b7280;">No data</td></tr>';
  }

  async function loadUtilization() {
    const { data } = await api.get('/reports/utilization');
    const colors = { ON_ROUTE: '#22c55e', AT_STOP: '#eab308', IDLE: '#9ca3af', MAINTENANCE: '#ef4444', ACTIVE: '#22c55e' };
    const total = data.reduce((a, r) => a + r.c, 0) || 1;
    $('util-wrap').innerHTML = data.length ? data.map((r) => `
      <div class="util-row">
        <span class="lbl">${r.status.replace('_', ' ')}</span>
        <div class="util-track"><div class="util-fill" style="width:${(r.c / total) * 100}%;background:${colors[r.status] || '#16a34a'}"></div></div>
        <span class="cnt">${r.c}</span>
      </div>`).join('') : '<div style="color:#6b7280;font-size:14px;">No data</div>';
  }

  async function loadAlerts() {
    const { data } = await api.get('/reports/alerts');
    $('alert-tbody').innerHTML = data.length ? data.map((r) => `
      <tr>
        <td><strong>${r.type.replace('_', ' ')}</strong></td>
        <td><span class="sev-badge sev-${r.severity}">${r.severity}</span></td>
        <td>${r.c}</td>
      </tr>`).join('') : '<tr><td colspan="3" style="text-align:center;color:#6b7280;">No data</td></tr>';
  }

  async function loadAll() {
    try {
      await Promise.all([loadKpis(), loadDaily(), loadRoutes(), loadUtilization(), loadAlerts()]);
    } catch (e) { toast.error(e.message); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('reports-user').textContent = user?.name || 'User';
    $('btn-apply').addEventListener('click', () => { collectFilters(); loadAll(); });
    document.querySelectorAll('[data-csv]').forEach((a) => {
      a.addEventListener('click', async (e) => {
        e.preventDefault();
        collectFilters();
        const q = qs();
        const res = await fetch(`${api.baseUrl}/reports/export?type=${a.dataset.csv}${q ? '&' + q : ''}`, {
          headers: { Authorization: `Bearer ${api.store.access}` },
        });
        if (!res.ok) return toast.error('Could not export CSV');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `smartbus-${a.dataset.csv}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      });
    });
    loadOptions();
    loadAll();
  });
})();
