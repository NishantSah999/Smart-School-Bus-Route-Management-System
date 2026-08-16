// SmartBus Parent Dashboard — only the signed-in parent's children, live bus + attendance.
(() => {
  if (!auth.guard(['PARENT'])) return;

  const $ = (id) => document.getElementById(id);
  const user = api.store.user;
  const parentId = user?.profile?.id;
  const listEl = $('children-list');

  function statusChip(status) {
    if (status === 'ACTIVE') return '<span class="status-chip good">● Live</span>';
    if (status === 'AT_STOP') return '<span class="status-chip warn">At stop</span>';
    if (status === 'IDLE') return '<span class="status-chip warn">Idle</span>';
    if (status === 'MAINTENANCE' || status === 'OFFLINE') return '<span class="status-chip bad">Offline</span>';
    return '<span class="status-chip warn">' + (status || '—') + '</span>';
  }

  async function load() {
    $('parent-name').textContent = user?.name || 'Parent';
    if (!parentId) {
      listEl.innerHTML = '<div class="card" style="text-align:center;color:#6b7280;">No guardian profile linked.</div>';
      return;
    }
    try {
      const { data: parent } = await api.get(`/parents/${parentId}`);
      if (!parent.students || !parent.students.length) {
        listEl.innerHTML = '<div class="card" style="text-align:center;color:#6b7280;">No children linked to your account yet.</div>';
        return;
      }

      const fleet = (await api.get('/tracking/fleet')).data;
      listEl.innerHTML = parent.students.map((s) => {
        const bus = fleet.find((b) => b.id === s.bus_id);
        const avatar = (s.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
        return `
        <div class="child-card">
          <div class="child-head">
            <div class="child-avatar">${avatar}</div>
            <div>
              <div class="child-name">${s.name}</div>
              <div class="child-grade">${s.grade || '—'}${s.section ? ' · ' + s.section : ''}</div>
            </div>
          </div>
          <div class="child-rows">
            <div class="child-row"><span class="lbl">Bus</span><span class="val">${s.bus_number || '—'}</span></div>
            <div class="child-row"><span class="lbl">Route</span><span class="val">${s.route_name || '—'}</span></div>
            <div class="child-row"><span class="lbl">Pickup</span><span class="val">${s.pickup_stop || '—'}</span></div>
            <div class="child-row"><span class="lbl">Drop-off</span><span class="val">${s.drop_stop || '—'}</span></div>
            ${bus && bus.last_latitude != null ? `
              <div class="child-row"><span class="lbl">Live speed</span><span class="val">${Math.round(bus.last_speed || 0)} km/h</span></div>
              <div class="child-row"><span class="lbl">Last update</span><span class="val">${timeAgo(bus.last_update)}</span></div>` : ''}
          </div>
          <div class="child-status">
            ${bus ? statusChip(bus.status) : '<span class="status-chip warn">No active bus</span>'}
            <button class="btn-live" data-student="${s.id}" data-name="${s.name}" style="float:right;">Track live</button>
          </div>
        </div>`;
      }).join('');

      listEl.querySelectorAll('.btn-live').forEach((b) => {
        b.addEventListener('click', () => {
          const bus = fleet.find((x) => x.id === parent.students.find((s) => s.id === Number(b.dataset.student))?.bus_id);
          if (bus && bus.last_latitude != null) {
            toast.info(`${b.dataset.name} is on ${bus.bus_number} — ${Math.round(bus.last_speed || 0)} km/h, updated ${timeAgo(bus.last_update)}.`);
          } else {
            toast.info(`${b.dataset.name} has no live bus location right now.`);
          }
        });
      });
    } catch (e) {
      listEl.innerHTML = `<div class="card" style="text-align:center;color:#b91c1c;">${e.message}</div>`;
    }
  }

  async function loadNotifications() {
    const box = $('parent-notifications');
    try {
      const { data } = await api.get('/notifications', { limit: 12 });
      const n = data.data;
      box.innerHTML = n.length ? n.map((x) => `
        <div class="notif-item ${x.read ? '' : 'unread'}">
          <span class="notif-dot"></span>
          <div class="notif-body">
            <div class="notif-title">${x.title}</div>
            <div class="notif-time">${new Date(x.created_at).toLocaleString()}</div>
          </div>
        </div>`).join('') : '<div style="color:#6b7280;font-size:14px;">No notifications yet.</div>';
      $('notif-count').textContent = `🔔 ${data.unread || 0} new`;
    } catch (e) { /* ignore */ }
  }

  function timeAgo(ts) {
    if (!ts) return '—';
    const s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.round(m / 60)}h ago`;
  }

  function connectSocket() {
    if (!api.store.access || !window.io) return;
    const socket = io(api.socketOrigin, { auth: { token: api.store.access } });
    socket.on('notification:new', (n) => { toast.info(n.title); loadNotifications(); });
    socket.on('student:boarded', (r) => { toast.success('Your child has boarded the bus.'); load(); });
    socket.on('student:dropped', (r) => { toast.success('Your child was dropped off.'); load(); });
    socket.on('alert:new', () => loadNotifications());
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    loadNotifications();
    connectSocket();
  });
})();
