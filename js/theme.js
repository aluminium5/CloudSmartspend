// ========================================
// CloudSmartSpend — Theme Toggle
// Light / Dark mode switcher with persistence
// ========================================

const ThemeToggle = (() => {
  const STORAGE_KEY = 'css_theme';

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (saved === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      // Auto-detect system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        if (e.matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    });
  }

  function toggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(STORAGE_KEY, 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
    }

    // Re-render charts so they pick up new theme colors
    try { if (typeof Dashboard !== 'undefined') Dashboard.render(); } catch(e) {}
    try { if (typeof Analytics !== 'undefined') Analytics.render(); } catch(e) {}
  }

  function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  return { init, toggle, isDarkMode };
})();

// Initialize theme as early as possible (before DOMContentLoaded)
ThemeToggle.init();
