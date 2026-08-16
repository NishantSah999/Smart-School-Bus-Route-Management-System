// Shared auth helpers: guard pages, render the current user in the sidebar, logout.
(() => {
  function guard(roles) {
    if (!api.authRequired()) return false;
    const user = api.store.user;
    const allowed = roles || window.SB_ROLE_REQUIRED || [];
    if (user && !['SUPER_ADMIN', ...allowed].includes(user.role) && user.role !== 'SUPER_ADMIN') {
      window.location.href = '/pages/dashboard.html';
      return false;
    }
    return true;
  }

  function renderUser() {
    const user = api.store.user;
    if (!user) return;
    const pname = document.querySelector('.profile-card .pname');
    const prole = document.querySelector('.profile-card .prole');
    const pimg = document.querySelector('.profile-card img');
    if (pname) pname.textContent = user.name;
    if (prole) prole.textContent = (user.role || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    if (pimg) pimg.src = user.profile_image || 'https://i.pravatar.cc/80?img=13';
    document.querySelectorAll('[data-page]').forEach((el) => {
      const page = el.dataset.page;
      const match = window.location.pathname.includes(page);
      el.classList.toggle('active', match);
    });
  }

  function wireLogout() {
    document.querySelectorAll('[data-logout]').forEach((el) => {
      el.addEventListener('click', async (e) => {
        e.preventDefault();
        await api.logout();
        window.location.href = '/pages/login.html';
      });
    });
  }

  function wireNav() {
    document.querySelectorAll('.collapse-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        const collapsed = sidebar.classList.toggle('collapsed');
        sidebar.style.width = collapsed ? '84px' : '250px';
        sidebar.querySelectorAll('.nav-item span, .brand-text, .profile-meta, .chev, .nav-badge')
          .forEach((el) => { el.style.display = collapsed ? 'none' : ''; });
        btn.querySelector('svg').style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderUser();
    wireNav();
    wireLogout();
  });

  window.auth = { guard, renderUser, wireLogout };
})();