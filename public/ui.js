// ui.js — DOM rendering, toasts, animations, loading screen.

const el = (id) => document.getElementById(id);

// ---------- Loading overlay ----------
export function updateProgress(file, percent) {
  const bar = el('progress-bar');
  const fileEl = el('progress-file');
  if (bar) bar.style.width = `${percent}%`;
  if (fileEl) {
    fileEl.textContent = file ? `${file} — ${percent}%` : `${percent}%`;
  }
}

export function hideLoading() {
  const overlay = el('loading-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  // Remove from layout after the fade completes.
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 700);
}

export function showLoadingError(message) {
  const overlay = el('loading-overlay');
  const box = overlay?.querySelector('.loading-box');
  const title = overlay?.querySelector('.loading-title');
  const text = el('loading-text');
  if (box) box.classList.add('error');
  if (title) title.textContent = 'Unable to start';
  if (text) text.textContent = message;
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
  }
}

// ---------- Sidebar ----------
export function renderSidebar(discovered, onDragStart) {
  const list = el('element-list');
  const count = el('discovered-count');
  if (!list) return;

  list.innerHTML = '';
  const names = [...discovered.keys()].sort((a, b) => a.localeCompare(b));

  for (const name of names) {
    const emoji = discovered.get(name);
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.dataset.name = name;
    chip.dataset.emoji = emoji;
    chip.innerHTML = `<span class="chip-emoji">${emoji}</span><span class="chip-label">${name}</span>`;
    chip.addEventListener('pointerdown', (e) => onDragStart(e, name, emoji));
    list.appendChild(chip);
  }

  if (count) {
    count.textContent = `${discovered.size} element${
      discovered.size === 1 ? '' : 's'
    } discovered`;
  }
}

// ---------- Canvas ----------
export function createCanvasChip(item) {
  const chip = document.createElement('div');
  chip.className = 'canvas-chip pop-in';
  chip.dataset.id = item.id;
  chip.dataset.name = item.name;
  chip.dataset.emoji = item.emoji;
  chip.style.left = `${item.x}px`;
  chip.style.top = `${item.y}px`;
  chip.innerHTML = `<span class="chip-emoji">${item.emoji}</span><span class="chip-label">${item.name}</span>`;
  chip.addEventListener('animationend', () => chip.classList.remove('pop-in'), {
    once: true
  });
  return chip;
}

export function getCanvas() {
  return el('canvas');
}

export function updateCanvasHint() {
  const hint = el('canvas-hint');
  const canvas = el('canvas');
  if (!hint || !canvas) return;
  const hasChips = canvas.querySelector('.canvas-chip');
  hint.classList.toggle('hidden', !!hasChips);
}

// ---------- Toasts ----------
export function showToast(message, variant = 'normal') {
  const container = el('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast${variant === 'discovery' ? ' discovery' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove(), {
      once: true
    });
  }, 2500);
}
