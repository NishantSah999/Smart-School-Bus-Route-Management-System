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