// SmartBus Fleet Tracking — live map driven by GPS API + Socket.IO.
(() => {
  if (!auth.guard()) return;

  const $ = (id) => document.getElementById(id);
  const markerBox = $('map-markers');
  const busList = $('bus-list');
  const markers = new Map(); // bus_id -> element
  let buses = [];
  let selectedBusId = null;

  const STATUS_COLOR = { ON_ROUTE: '#22c55e', AT_STOP: '#8b5cf6', IDLE: '#9ca3af', MAINTENANCE: '#ef4444', ACTIVE: '#22c55e', OFFLINE: '#6b7280' };
  const SCHOOL = { lat: 26.729, lng: 85.922, span: 0.07 };

  // Project GPS to percentage coordinates inside the map box.
  function project(lat, lng) {
    const x = ((lng - (SCHOOL.lng - SCHOOL.span / 2)) / SCHOOL.span) * 100;
    const y = ((SCHOOL.lat + SCHOOL.span / 2) - lat) / SCHOOL.span * 100;
    return { x: Math.max(2, Math.min(96, x)), y: Math.max(4, Math.min(92, y)) };
  }

  function busIcon(color) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 17h1a2 2 0 1 0 4 0h6a2 2 0 1 0 4 0h1v-6l-2-5H6L4 11z"/><path d="M4 11h16"/>
      <circle cx="7.5" cy="17.5" r="1.2"/><circle cx="16.5" cy="17.5" r="1.2"/></svg>`;
  }

  function loadStats() {
    api.get('/dashboard/summary')
      .then(({ data }) => {
        const b = data.buses;
        const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
        set('stat-total-buses', b.total);
        set('stat-total-buses-foot', b.online ? `${b.online} online now` : 'All buses');
        set('stat-active-buses', b.active);
        set('stat-active-buses-foot', `${Math.round((b.active / Math.max(1, b.total)) * 100)}% of total`);
        set('stat-on-route', b.on_route);
        set('stat-on-route-foot', 'Buses on route');
        set('stat-at-stop', b.idle);
        set('stat-at-stop-foot', 'Idle / at stop');
        set('stat-maintenance', b.maintenance);
        set('stat-maintenance-foot', 'In workshop');
      })
      .catch((e) => toast.error(e.message));
  }

  async function loadFleet() {
    try {
      const { data } = await api.get('/tracking/fleet');
      buses = data;
      renderMarkers();
      renderBusList();
      if (!selectedBusId && data.length) selectBus(data[0].id);
    } catch (e) {
      markerBox.innerHTML = `<div style="text-align:center;color:#b91c1c;padding-top:120px;font-size:13px;">${e.message}</div>`;
      toast.error(e.message);
    }
  }

  function renderMarkers() {
    markerBox.innerHTML = '';
    markers.clear();
    buses.forEach((b) => {
      if (b.last_latitude == null) return;
      const pos = project(b.last_latitude, b.last_longitude);
      const color = STATUS_COLOR[b.status] || '#22c55e';
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.cssText = `top:${pos.y}%;left:${pos.x}%;cursor:pointer;position:absolute;transform:translate(-50%,-50%);`;
      el.innerHTML = busIcon(color);
      el.title = `${b.bus_number} — ${b.driver_name || ''} (${(b.last_speed || 0).toFixed(0)} km/h)`;
      el.addEventListener('click', () => selectBus(b.id));
      markerBox.appendChild(el);
      markers.set(b.id, el);
    });
  }

  function statusTag(b) {
    const cls = b.status === 'ON_ROUTE' ? 'on-route' : b.status === 'AT_STOP' ? 'at-stop' : b.status === 'MAINTENANCE' ? 'maint' : 'idle';
    return `<span class="status-tag ${cls}">${(b.status || '—').replace(/_/g, ' ')}</span>`;
  }

  function renderBusList() {
    if (!busList) return;
    busList.innerHTML = buses.map((b) => `
      <div class="bus-row" data-id="${b.id}" style="cursor:pointer;">
        <div class="bus-row-ico icon-green">${busIcon('#16a34a')}</div>
        <div class="bus-row-body">
          <div class="bus-row-name">${b.bus_number}</div>
          <div class="bus-row-route">${b.route_name || '—'} · ${b.driver_name || 'no driver'}</div>
        </div>
        <div class="bus-row-status">
          ${statusTag(b)}
          <span class="bus-row-speed">${b.last_speed ? Math.round(b.last_speed) + ' km/h' : '—'}</span>
          <span class="bus-row-loc">${b.passenger_count || 0} passengers</span>
        </div>
      </div>`).join('');
    busList.querySelectorAll('.bus-row').forEach((row) => {
      row.addEventListener('click', () => selectBus(Number(row.dataset.id)));
    });
  }

  async function selectBus(id) {
    selectedBusId = id;
    try {
      const { data } = await api.get(`/buses/${id}`);
      $('sel-bus-name').textContent = data.bus_number;
      $('sel-bus-route').textContent = `${data.route_name || '—'}${data.last_latitude ? ` · ${Math.round(data.last_speed || 0)} km/h` : ''}`;
      $('sel-bus-status').textContent = (data.status || '—').replace(/_/g, ' ');
      $('sel-driver').textContent = data.driver_name || '—';
      $('sel-speed').textContent = `${Math.round(data.last_speed || 0)} km/h`;
      $('sel-passengers').textContent = `${data.passenger_count} / ${data.capacity || '—'}`;
      $('sel-distance').textContent = data.active_trip?.distance ? `${data.active_trip.distance} km` : '—';
      $('sel-eta').textContent = data.active_trip?.end_time ? new Date(data.active_trip.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
      $('sel-last-update').textContent = data.last_update ? timeAgo(data.last_update) : '—';
      busList.querySelectorAll('.bus-row').forEach((r) => r.style.background = r.dataset.id === String(id) ? '#f0fdf4' : '');
      markers.forEach((el, busId) => el.style.opacity = busId === id ? '1' : '0.55');
    } catch (e) {
      toast.error(e.message);
    }
  }

  function timeAgo(ts) {
    if (!ts) return '—';
    const s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
    if (s < 60) return `${s} seconds ago`;
    return `${Math.round(s / 60)} minutes ago`;
  }

  function updateBusLocation(payload) {
    const bus = buses.find((b) => b.id === payload.bus_id);
    if (bus) {
      bus.last_latitude = payload.latitude;
      bus.last_longitude = payload.longitude;
      bus.last_speed = payload.speed;
      bus.status = payload.status || bus.status;
    }
    const el = markers.get(payload.bus_id);
    if (el && payload.latitude != null) {
      const pos = project(payload.latitude, payload.longitude);
      el.style.top = `${pos.y}%`;
      el.style.left = `${pos.x}%`;
      el.title = `${payload.bus_number || 'Bus'} — ${Math.round(payload.speed || 0)} km/h`;
    }
    if (selectedBusId === payload.bus_id) selectBus(payload.bus_id);
  }

  function connectSocket() {
    if (!api.store.access || !window.io) return;
    const socket = io(api.socketOrigin, { auth: { token: api.store.access } });
    socket.on('bus:location', updateBusLocation);
    socket.on('trip:started', () => loadFleet());
    socket.on('trip:ended', () => loadFleet());
    socket.on('alert:new', (a) => toast.warning(a.message || 'New alert'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadFleet();
    connectSocket();
    setInterval(loadFleet, 30000); // periodic refresh fallback
  });
})();
