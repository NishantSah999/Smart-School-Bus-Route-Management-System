// Sidebar nav active state, collapse and logout are handled by script/auth.js.
// This file keeps dashboard-specific helpers.

// Quick action buttons feedback
document.querySelectorAll('.qa-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    btn.style.opacity = '0.6';
    setTimeout(()=> btn.style.opacity = '1', 150);
  });
});