// SmartBus Passengers — API-backed table with server-side pagination and real filtering.
(() => {
  if (!auth.guard()) return;

  const state = { page: 1, limit: 10, search: '', grade: '', route_id: '', bus_id: '', total: 0 };
  const tbody = document.getElementById('student-tbody');
  const rangeEl = document.getElementById('table-range');

  function loadStats() {
    api.get('/students', { limit: 1 })
      .then(({ data }) => {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('stat-total-passengers', data.pagination.total);
        set('stat-passengers-foot', 'Registered students');
      })
      .catch(() => {});
    api.get('/attendance/today/counts')
      .then(({ data }) => {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('stat-on-board', data.BOARDED || 0);
        set('stat-on-board-foot', `${Math.round(((data.BOARDED || 0) / Math.max(1, (data.BOARDED || 0) + (data.ABSENT || 0))) * 100)}% present`);
        set('stat-absent', data.ABSENT || 0);
        set('stat-absent-foot', `${data.ABSENT || 0} absent today`);
      })
      .catch(() => {});
  }

  function loadStudents() {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#6b7280;padding:24px;">Loading passengers…</td></tr>';
    api.get('/students', {
      page: state.page, limit: state.limit,
      search: state.search || undefined, grade: state.grade || undefined,
      route_id: state.route_id || undefined, bus_id: state.bus_id || undefined,
    })
      .then(({ data }) => {
        state.total = data.pagination.total;
        rangeEl.textContent = `Showing ${Math.min(1, (state.page - 1) * state.limit + 1)} to ${Math.min(state.total, state.page * state.limit)} of ${state.total} passengers`;
        if (!data.data.length) {
          tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#6b7280;padding:24px;">No passengers found.</td></tr>';
          return;
        }
        tbody.innerHTML = data.data.map((s) => `
          <tr>
            <td><strong>${s.student_id}</strong></td>
            <td>${s.name}</td>
            <td>${s.grade || '—'}</td>
            <td>${s.route_name || '—'}</td>
            <td>${s.bus_number || '—'}</td>
            <td>${s.pickup_stop || '—'}</td>
            <td><span class="status-badge ${s.status === 'ACTIVE' ? 'onboard' : 'absent'}">${s.status === 'ACTIVE' ? 'Active' : s.status}</span></td>
            <td>${s.parent_name ? s.parent_name + ' · ' + (s.emergency_contact || s.parent_phone || '—') : '—'}</td>
            <td style="text-align:center"><button class="action-btn" data-id="${s.id}" title="View student">👁</button></td>
          </tr>`).join('');
        tbody.querySelectorAll('.action-btn').forEach((btn) => {
          btn.addEventListener('click', () => viewStudent(btn.dataset.id));
        });
        renderPagination(data.pagination);
      })
      .catch((e) => {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#b91c1c;padding:24px;">${e.message}</td></tr>`;
      });
  }

  async function viewStudent(id) {
    try {
      const { data } = await api.get(`/students/${id}`);
      const rows = data.attendance_today || [];
      const board = rows.filter((r) => r.status === 'BOARDED').length;
      const drop = rows.filter((r) => r.status === 'DROPPED_OFF').length;
      toast.info(`${data.name} (${data.student_id}) — ${data.bus_number || 'no bus'}, ${data.route_name || 'no route'}. Boarded today: ${board}, dropped: ${drop}.`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  function renderPagination(pg) {
    const nav = document.querySelector('.table-foot .pagination');
    if (!nav) return;
    let html = '<button data-page="prev">&larr;</button>';
    const pages = Math.min(pg.totalPages, 5);
    for (let i = 1; i <= pages; i++) html += `<button class="${i === pg.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    html += '<button data-page="next">&rarr;</button>';
    nav.innerHTML = html;
    nav.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        const p = b.dataset.page;
        if (p === 'prev') state.page = Math.max(1, state.page - 1);
        else if (p === 'next') state.page = Math.min(pg.totalPages, state.page + 1);
        else state.page = Number(p);
        loadStudents();
      });
    });
  }

  function wireSearch() {
    const input = document.querySelector('.search-wrap input');
    if (!input) return;
    let t;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.search = input.value.trim();
        state.page = 1;
        loadStudents();
      }
    });
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.search = input.value.trim();
        state.page = 1;
        loadStudents();
      }, 400);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadStudents();
    wireSearch();
  });
})();