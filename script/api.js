// SmartBus API client — fetch wrapper with JWT, auto-refresh and centralized errors.
(() => {
  // When pages are opened through VS Code Live Server, it only serves static
  // files on :5500. Send API and Socket.IO traffic to the Express server.
  // In production the frontend is served by Express, so relative URLs remain
  // the correct same-origin default.
  const isLiveServer = window.location.port === '5500';
  const backendOrigin = isLiveServer
    ? `${window.location.protocol}//localhost:8080`
    : window.location.origin;
  const BASE = window.SMARTBUS_API_BASE || (isLiveServer ? `${backendOrigin}/api/v1` : '/api/v1');

  const store = {
    get access() { return localStorage.getItem('sb_access'); },
    set access(v) { v ? localStorage.setItem('sb_access', v) : localStorage.removeItem('sb_access'); },
    get refresh() { return localStorage.getItem('sb_refresh'); },
    set refresh(v) { v ? localStorage.setItem('sb_refresh', v) : localStorage.removeItem('sb_refresh'); },
    get user() { try { return JSON.parse(localStorage.getItem('sb_user')); } catch { return null; } },
    set user(v) { v ? localStorage.setItem('sb_user', JSON.stringify(v)) : localStorage.removeItem('sb_user'); },
  };

  let refreshing = null;

  async function refreshToken() {
    const rt = store.refresh;
    if (!rt) throw new Error('No refresh token');
    if (!refreshing) {
      refreshing = fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (!d.data) throw new Error('Refresh failed');
          store.access = d.data.accessToken;
          store.refresh = d.data.refreshToken;
          return d.data.accessToken;
        })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  function qs(params) {
    if (!params) return '';
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p.set(k, v);
    });
    const s = p.toString();
    return s ? `?${s}` : '';
  }

  async function request(method, path, body, params, retry = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (store.access) headers.Authorization = `Bearer ${store.access}`;

    let res = await fetch(`${BASE}${path}${qs(params)}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && retry && store.refresh) {
      try {
        await refreshToken();
        return request(method, path, body, params, false);
      } catch {
        store.access = null;
        store.refresh = null;
        store.user = null;
        window.location.href = '/pages/login.html';
        throw new Error('Session expired');
      }
    }

    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

    if (!res.ok) {
      const msg = json?.error?.message || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.code = json?.error?.code;
      err.status = res.status;
      throw err;
    }
    return json;
  }

  window.api = {
    baseUrl: BASE,
    socketOrigin: backendOrigin,
    store,
    get: (p, params) => request('GET', p, null, params),
    post: (p, body) => request('POST', p, body),
    put: (p, body) => request('PUT', p, body),
    del: (p) => request('DELETE', p),
    login: async (email, password) => {
      const { data } = await request('POST', '/auth/login', { email, password });
      store.access = data.accessToken;
      store.refresh = data.refreshToken;
      store.user = data.user;
      return data.user;
    },
    logout: async () => {
      try {
        const rt = store.refresh;
        if (rt) await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) });
      } catch { /* ignore */ }
      store.access = null;
      store.refresh = null;
      store.user = null;
    },
    authRequired() {
      if (!store.access || !store.user) {
        window.location.href = '/pages/login.html';
        return false;
      }
      return true;
    },
  };
})();
