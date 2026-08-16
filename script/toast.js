// Toast notifications — replaces alert() everywhere in the UI.
(() => {
  const CONTAINER_ID = 'sb-toast-container';

  function ensureContainer() {
    let el = document.getElementById(CONTAINER_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = CONTAINER_ID;
      el.style.cssText = 'position:fixed;top:18px;right:18px;z-index:9999;display:flex;flex-direction:column;gap:10px;font-family:Inter,system-ui,sans-serif;';
      document.body.appendChild(el);
    }
    return el;
  }

  function show(message, kind = 'info', ms = 4000) {
    const colors = { success: '#16a34a', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const container = ensureContainer();
    const el = document.createElement('div');
    el.style.cssText =
      'background:#fff;border:1px solid #eceef2;border-left:4px solid ' + colors[kind] +
      ';border-radius:10px;padding:12px 16px;box-shadow:0 6px 18px rgba(16,24,40,.12);' +
      'min-width:260px;max-width:360px;font-size:14px;color:#111827;animation:sbToastIn .18s ease-out;';
    el.textContent = message;
    container.appendChild(el);
    const remove = () => { el.style.transition = 'opacity .2s, transform .2s'; el.style.opacity = '0'; el.style.transform = 'translateY(-6px)'; setTimeout(() => el.remove(), 220); };
    setTimeout(remove, ms);
    return { close: remove };
  }

  // Skeleton loader helpers for loading states.
  function skeleton(parent, count = 3, height = 18) {
    if (!parent) return;
    parent.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const s = document.createElement('div');
      s.className = 'sb-skeleton';
      s.style.cssText = `height:${height}px;border-radius:6px;margin-bottom:10px;background:linear-gradient(90deg,#eceef2 25%,#f6f7f9 50%,#eceef2 75%);background-size:200% 100%;animation:sbShimmer 1.2s infinite;`;
      parent.appendChild(s);
    }
  }

  const style = document.createElement('style');
  style.textContent = `@keyframes sbToastIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}@keyframes sbShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
  document.head.appendChild(style);

  window.toast = {
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error', 5000),
    warning: (m) => show(m, 'warning', 5000),
    info: (m) => show(m, 'info'),
    skeleton,
  };
})();