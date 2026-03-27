// ========================================
// CloudSmartSpend — App Router & Init
// Navigation, modals, PWA registration
// ========================================

const App = (() => {
  let currentView = 'dashboard';

  function init() {
    // Register Service Worker
    registerServiceWorker();

    // Initialize Auth (will auto-login if session exists)
    Auth.init();

    // Setup upload listeners (needed even before login for form binding)
    Upload.init();

    // Handle hash navigation
    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);

    // Top bar scroll effect
    setupScrollEffect();

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    // Handle back button for modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
          m.classList.remove('active');
        });
      }
    });

    // PWA install prompt
    setupInstallPrompt();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('[App] Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.log('[App] Service Worker registration failed (normal for local dev):', err.message);
          });
      });
    }
  }

  function handleHashNavigation() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const validViews = ['dashboard', 'upload', 'transactions', 'analytics', 'settings'];

    if (validViews.includes(hash)) {
      navigate(hash, false);
    }
  }

  function navigate(viewName, updateHash = true) {
    currentView = viewName;

    // Update hash
    if (updateHash) {
      window.location.hash = viewName;
    }

    // Hide all views, show selected
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
      // Re-trigger animations
      targetView.querySelectorAll('.animate-in').forEach((el, i) => {
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = `slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${i * 60}ms both`;
      });
    }

    // Update bottom nav
    document.querySelectorAll('#bottom-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update sidebar
    document.querySelectorAll('#sidebar .sidebar-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update top bar title
    const titles = {
      dashboard: 'Dashboard',
      upload: 'Upload Bill',
      transactions: 'Transactions',
      analytics: 'Analytics',
      settings: 'Settings'
    };
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = titles[viewName] || 'CloudSmartSpend';

    // Show/hide FAB
    const fab = document.getElementById('fab-add');
    if (fab) {
      fab.style.display = (viewName === 'upload' || viewName === 'settings') ? 'none' : '';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Render view if needed
    if (viewName === 'analytics' && typeof Analytics !== 'undefined') {
      setTimeout(() => Analytics.render(), 100);
    }
  }

  function setupScrollEffect() {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const topBar = document.getElementById('top-bar');
      if (topBar) {
        topBar.classList.toggle('scrolled', window.scrollY > 10);
      }
    }, { passive: true });
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  let deferredPrompt = null;

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show install banner after a delay
      setTimeout(() => {
        if (deferredPrompt) {
          showInstallBanner();
        }
      }, 5000);
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      Utils.showToast('App installed! 🎉', 'success');
    });
  }

  function showInstallBanner() {
    Utils.showToast('Install CloudSmartSpend for the best experience!', 'info', 6000);
  }

  async function promptInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
  }

  return {
    init,
    navigate,
    openModal,
    closeModal,
    promptInstall
  };
})();

// ---- Bootstrap ----
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
