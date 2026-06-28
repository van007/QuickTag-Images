// Theme toggle — flips [data-theme] on <html> with a view-transition cross-fade.
// Reduced-motion-safe and persisted to localStorage. The no-flash initial theme
// is set by an inline <head> script before stylesheets load; this only wires the
// toggle button so subsequent flips animate and stick.
(function () {
  'use strict';

  function toggleTheme() {
    var el = document.documentElement;
    var next = el.dataset.theme === 'light' ? 'dark' : 'light';
    var go = function () {
      el.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (_) {}
    };
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) {
      document.startViewTransition(go);
    } else {
      go();
    }
  }

  function wire() {
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
