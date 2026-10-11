/* ===== StudyTools Shared JavaScript ===== */

/* --- Theme toggle --- */
(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
  }
});

/* --- HTML escape helper --- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

/* --- Format time as MM:SS --- */
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return m + ':' + s;
}

/* --- Copy text to clipboard with feedback --- */
function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text);
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  }
}

/* --- Show a temporary message in an element --- */
function showMsg(elId, text, color) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  el.style.color = color === 'danger' ? 'var(--danger)'
                 : color === 'warning' ? 'var(--warning)'
                 : 'var(--success)';
  setTimeout(() => { el.style.display = 'none'; }, 2800);
}

/* --- Simple audio beep --- */
function beep(freq) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq || 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  } catch (e) {}
}

/* --- localStorage helpers --- */
function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

/* ===== Result Flow — auto-scroll to steps + floating back-to-top ===== */

(function initScrollTopButton() {
  if (typeof window === 'undefined') return;

  function ensureBtn() {
    let btn = document.getElementById('scrollTopBtn');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'scrollTopBtn';
    btn.className = 'scroll-top-btn';
    btn.setAttribute('aria-label', 'Back to inputs');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 15 12 9 18 15"></polyline></svg>';
    btn.addEventListener('click', hideScrollTopBtn);
    document.body.appendChild(btn);
    return btn;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureBtn);
  } else {
    ensureBtn();
  }
})();

/**
 * Smooth-scroll to the step-by-step card for a given tool.
 * Called by every Solve function on subject pages.
 * @param {string} stepsCardId - the id of the steps card element (e.g. 'a10_steps_card')
 */
function scrollToSteps(stepsCardId) {
  if (typeof document === 'undefined') return;
  const target = document.getElementById(stepsCardId);
  if (!target) return;

  requestAnimationFrame(function () {
    const navHeight = document.querySelector('.nav') ? document.querySelector('.nav').offsetHeight : 60;
    const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  });
}

/**
 * Show the floating back-to-top button, wired to scroll back to a target element.
 * @param {string} targetId - the id of the element to scroll back to (usually the input card)
 */
function showScrollTopBtn(targetId) {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;

  btn.dataset.scrollTarget = targetId || '';

  setTimeout(function () {
    btn.classList.add('visible');
  }, 450);
}

/**
 * Hide the floating back-to-top button.
 */
function hideScrollTopBtn() {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;

  btn.classList.remove('visible');

  const targetId = btn.dataset.scrollTarget;
  if (targetId) {
    const target = document.getElementById(targetId);
    if (target) {
      const navHeight = document.querySelector('.nav') ? document.querySelector('.nav').offsetHeight : 60;
      const targetTop = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  }
  btn.dataset.scrollTarget = '';
}

/* Auto-hide the button when the user scrolls back up manually */
(function initScrollTopAutoHide() {
  if (typeof window === 'undefined') return;

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      const btn = document.getElementById('scrollTopBtn');
      if (!btn || !btn.classList.contains('visible')) { ticking = false; return; }

      const targetId = btn.dataset.scrollTarget;
      if (targetId) {
        const target = document.getElementById(targetId);
        if (target) {
          const rect = target.getBoundingClientRect();
          if (rect.top > -80 && rect.top < window.innerHeight * 0.45) {
            btn.classList.remove('visible');
            btn.dataset.scrollTarget = '';
          }
        }
      }
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();