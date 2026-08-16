// script.js

document.addEventListener('DOMContentLoaded', function() {

    // ─── Lucide Icons ───
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // ─── Donut Chart (Chart.js) ───
    const ctx = document.getElementById('fleetDonut');
    if (ctx && typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Idle', 'Maintenance'],
                datasets: [{
                    data: [9, 2, 1],
                    backgroundColor: ['#5CB85C', '#7067D9', '#E74C3C'],
                    borderWidth: 0,
                    hoverOffset: 2,
                }]
            },
            options: {
                cutout: '78%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = 12;
                                const pct = ((context.parsed / total) * 100).toFixed(0);
                                return context.label + ': ' + context.parsed + ' (' + pct + '%)';
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 600
                }
            }
        });
    }

    // ─── Sidebar Collapse ───
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapseBtn');

    if (collapseBtn) {
        collapseBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            // update icon
            const icon = collapseBtn.querySelector('i');
            if (icon) {
                if (sidebar.classList.contains('collapsed')) {
                    icon.setAttribute('data-lucide', 'chevron-right');
                } else {
                    icon.setAttribute('data-lucide', 'chevron-left');
                }
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        });
    }

    // ─── Mobile Menu ───
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleMobileMenu(open) {
        if (open === undefined) {
            sidebar.classList.toggle('mobile-open');
        } else if (open) {
            sidebar.classList.add('mobile-open');
        } else {
            sidebar.classList.remove('mobile-open');
        }
        if (overlay) {
            overlay.classList.toggle('show', sidebar.classList.contains('mobile-open'));
        }
    }

    if (mobileBtn) {
        mobileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMobileMenu();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', function() {
            toggleMobileMenu(false);
        });
    }

    // Close mobile menu on resize to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 640) {
            toggleMobileMenu(false);
        }
    });

    // ─── Navigation items ───
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item) {
        item.addEventListener('click', function() {
            navItems.forEach(function(n) { n.classList.remove('active'); });
            this.classList.add('active');
            // close mobile
            if (window.innerWidth <= 640) {
                toggleMobileMenu(false);
            }
        });
    });

    // ─── Fullscreen ───
    const fsBtn = document.getElementById('fullscreenBtn');
    if (fsBtn) {
        fsBtn.addEventListener('click', function() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function() {});
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }

    // ─── Search KBD hint ───
    document.addEventListener('keydown', function(e) {
        // ⌘K or Ctrl+K
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.header-search input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        // Escape to blur search
        if (e.key === 'Escape') {
            const searchInput = document.querySelector('.header-search input');
            if (searchInput && document.activeElement === searchInput) {
                searchInput.blur();
            }
        }
    });

    // ─── View All / action clicks ───
    document.querySelectorAll('.section-action').forEach(function(el) {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            // subtle feedback
            this.style.opacity = '0.6';
            setTimeout(() => { this.style.opacity = '1'; }, 150);
        });
    });

    // ─── Quick actions ───
    document.querySelectorAll('.quick-action').forEach(function(el) {
        el.addEventListener('click', function() {
            // subtle haptic-like feedback
            this.style.transform = 'scale(0.96)';
            setTimeout(() => { this.style.transform = ''; }, 120);
        });
    });

    // ─── Header icon buttons ───
    document.querySelectorAll('.header-icon-btn').forEach(function(el) {
        el.addEventListener('click', function() {
            // just a tiny feedback
            this.style.transform = 'scale(0.92)';
            setTimeout(() => { this.style.transform = ''; }, 120);
        });
    });

    // ─── Profile chevron ───
    const profileChevron = document.querySelector('.profile-chevron');
    if (profileChevron) {
        profileChevron.addEventListener('click', function(e) {
            e.stopPropagation();
            // demo: just a small rotation feedback
            this.style.transform = 'rotate(180deg)';
            setTimeout(() => { this.style.transform = ''; }, 300);
        });
    }

    // ─── Map zoom buttons (SVG) ───
    const zoomInEl = document.querySelector('.map-container svg g:last-child rect:first-child');
    const zoomOutEl = document.querySelector('.map-container svg g:last-child rect:last-child');

    if (zoomInEl) {
        zoomInEl.parentElement.addEventListener('click', function(e) {
            // simulate zoom in
            const map = this.closest('.map-container');
            if (map) {
                map.style.transition = 'transform 0.2s ease';
                map.style.transform = 'scale(1.02)';
                setTimeout(() => { map.style.transform = 'scale(1)'; }, 200);
            }
        });
    }
    if (zoomOutEl) {
        zoomOutEl.parentElement.addEventListener('click', function(e) {
            const map = this.closest('.map-container');
            if (map) {
                map.style.transition = 'transform 0.2s ease';
                map.style.transform = 'scale(0.98)';
                setTimeout(() => { map.style.transform = 'scale(1)'; }, 200);
            }
        });
    }

    // ─── Map zoom via the text elements too ───
    document.querySelectorAll('.map-container svg g:last-child text').forEach(function(text) {
        text.parentElement.addEventListener('click', function(e) {
            const map = this.closest('.map-container');
            if (map) {
                map.style.transition = 'transform 0.2s ease';
                map.style.transform = text.textContent === '+' ? 'scale(1.02)' : 'scale(0.98)';
                setTimeout(() => { map.style.transform = 'scale(1)'; }, 200);
            }
        });
    });

    console.log('✅ SmartBus Dashboard ready');
});