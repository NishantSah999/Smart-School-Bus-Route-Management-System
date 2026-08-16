// script.js – SmartBus Alerts Dashboard

document.addEventListener('DOMContentLoaded', () => {
  console.log('SmartBus Alerts Dashboard loaded');

  // Filter tabs
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      // Simulate filtering
      alert(`Filter: ${this.textContent} (simulated)`);
    });
  });

  // Resolve buttons
  const resolveBtns = document.querySelectorAll('.action-resolve');
  resolveBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const card = this.closest('.alert-card');
      const statusBadge = card.querySelector('.alert-status');
      if (statusBadge) {
        statusBadge.textContent = 'Resolved';
        statusBadge.className = 'alert-status resolved';
        // Update meta status if present
        const statusMeta = card.querySelector('.badge-unresolved');
        if (statusMeta) {
          statusMeta.textContent = 'Resolved';
          statusMeta.className = 'meta-value badge-resolved';
        }
        // Replace button with resolved label
        const actionsDiv = this.closest('.meta-item.actions');
        if (actionsDiv) {
          actionsDiv.innerHTML = '<span class="resolved-label">Resolved</span>';
        }
      }
    });
  });

  // Pagination
  const paginationBtns = document.querySelectorAll('.alert-pagination .pagination button');
  paginationBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const txt = this.textContent.trim();
      if (txt === '…' || txt === '←' || txt === '→') return;
      paginationBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Search
  const searchInput = document.querySelector('.search-wrap input');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        alert(`Searching for: "${searchInput.value}" (simulated)`);
      }
    });
  }
});