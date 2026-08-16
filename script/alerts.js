// SmartBus — Alerts page interactions

document.addEventListener('DOMContentLoaded', function () {

  // Status tabs (All Alerts / Unresolved / Resolved)
  const statusTabs = document.querySelectorAll('.status-tab');
  statusTabs.forEach(tab => {
    tab.addEventListener('click', function () {
      statusTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Pagination buttons
  const pageButtons = document.querySelectorAll('.pg-btn');
  pageButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      if (this.querySelector('svg')) return; // skip prev/next arrows
      pageButtons.forEach(b => {
        if (!b.querySelector('svg')) b.classList.remove('active');
      });
      this.classList.add('active');
    });
  });

  // "Select all" header checkbox toggles every row checkbox
  const headerChk = document.querySelector('thead .chk');
  const rowChks = document.querySelectorAll('tbody .chk');
  if (headerChk) {
    headerChk.addEventListener('change', function () {
      rowChks.forEach(c => { c.checked = headerChk.checked; });
    });
  }

  // Row action menu (kebab) — placeholder click handler
  document.querySelectorAll('.row-menu').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      console.log('Row menu clicked');
    });
  });

  // Clear Filters resets dropdown labels and search box
  const clearFilters = document.querySelector('.clear-filters');
  if (clearFilters) {
    clearFilters.addEventListener('click', function () {
      document.querySelectorAll('.search-wrap input').forEach(i => i.value = '');
      statusTabs.forEach(t => t.classList.remove('active'));
      if (statusTabs[0]) statusTabs[0].classList.add('active');
    });
  }

});