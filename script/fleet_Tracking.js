// Sidebar nav active state toggle
  document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('click', ()=>{
      document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Sidebar collapse toggle (simple width collapse demo)
  const collapseBtn = document.querySelector('.collapse-btn');
  const sidebar = document.querySelector('.sidebar');
  let collapsed = false;
  collapseBtn.addEventListener('click', ()=>{
    collapsed = !collapsed;
    sidebar.style.width = collapsed ? '84px' : '250px';
    sidebar.querySelectorAll('.nav-item, .brand-text, .profile-meta, .chev, .nav-badge')
      .forEach(el=> el.style.display = collapsed ? 'none' : '');
    collapseBtn.querySelector('svg').style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
  });

  // Quick action buttons feedback
  document.querySelectorAll('.qa-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      btn.style.opacity = '0.6';
      setTimeout(()=> btn.style.opacity = '1', 150);
    });
  });