// script.js – SmartBus Passenger Dashboard

document.addEventListener('DOMContentLoaded', () => {
  console.log('SmartBus Passenger Dashboard loaded');

  // Action buttons (edit)
  const actionBtns = document.querySelectorAll('.action-btn');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      alert('Edit passenger details (simulated)');
    });
  });

  // Pagination
  const paginationBtns = document.querySelectorAll('.pagination button');
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