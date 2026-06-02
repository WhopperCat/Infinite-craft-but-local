// game.js — core game logic, drag/drop, state, worker orchestration.

import { getCached, setCached, loadDiscovered, saveDiscovered } from './cache.js';
import {
  renderSidebar,
  createCanvasChip,
  getCanvas,
  updateCanvasHint,
  showToast,
  updateProgress,
  hideLoading,
  showLoadingError
} from './ui.js';

// ---------- State ----------
const discovered = loadDiscovered(); // Map<name, emoji>
let canvasElements = []; // [{ id, name, emoji, x, y }]
let workerReady = false;

// Pending worker requests keyed by request id.
const pending = new Map();

// ---------- Worker setup ----------
let worker = null;

function initWorker() {
  if (!('gpu' in navigator)) {
    showLoadingError(
      'WebGPU is required. Please use Chrome 113+ on desktop.'
    );
    return;
  }

  worker = new Worker(new URL('./worker.js', import.meta.url), {
    type: 'module'
  });

  worker.addEventListener('message', (event) => {
    const msg = event.data || {};
    switch (msg.type) {
      case 'ready':
        workerReady = true;
        hideLoading();
        break;
      case 'progress':
        updateProgress(msg.file, msg.percent);
        break;
      case 'result': {
        const cb = pending.get(msg.id);
        if (cb) {
          pending.delete(msg.id);
          cb.resolve({ result: msg.result, emoji: msg.emoji });
        }
        break;
      }
      case 'error': {
        if (msg.id && pending.has(msg.id)) {
          const cb = pending.get(msg.id);
          pending.delete(msg.id);
          cb.reject(new Error(msg.message));
        } else {
          showLoadingError(
            'Failed to load the AI model. ' + (msg.message || '')
          );
        }
        break;
      }
    }
  });

  worker.addEventListener('error', (e) => {
    showToast('Something went wrong, try again');
    console.error('Worker error', e);
  });

  worker.postMessage({ type: 'load' });
}

function askWorker(a, b) {
  return new Promise((resolve, reject) => {
    if (!worker || !workerReady) {
      reject(new Error('Model not ready'));
      return;
    }
    const id = crypto.randomUUID();
    pending.set(id, { resolve, reject });
    worker.postMessage({ type: 'combine', a, b, id });
  });
}

// ---------- Discovery ----------
function addDiscovered(name, emoji) {
  if (discovered.has(name)) return false;
  discovered.set(name, emoji);
  saveDiscovered(discovered);
  renderSidebar(discovered, startSidebarDrag);
  return true;
}

// ---------- Canvas element management ----------
function spawnCanvasElement(name, emoji, x, y) {
  const item = { id: crypto.randomUUID(), name, emoji, x, y };
  canvasElements.push(item);
  const chip = createCanvasChip(item);
  attachCanvasDrag(chip);
  getCanvas().appendChild(chip);
  updateCanvasHint();
  return item;
}

function removeCanvasElement(id) {
  canvasElements = canvasElements.filter((c) => c.id !== id);
  const chip = getCanvas().querySelector(`.canvas-chip[data-id="${id}"]`);
  if (chip) chip.remove();
  updateCanvasHint();
}

function clearCanvas() {
  canvasElements = [];
  const canvas = getCanvas();
  canvas.querySelectorAll('.canvas-chip').forEach((c) => c.remove());
  updateCanvasHint();
}

// ---------- Combination ----------
async function combine(itemA, itemB) {
  const a = itemA.name;
  const b = itemB.name;

  // Mark both chips as busy.
  setBusy(itemA.id, true);
  setBusy(itemB.id, true);

  // Midpoint for the result.
  const midX = (itemA.x + itemB.x) / 2;
  const midY = (itemA.y + itemB.y) / 2;

  let outcome = getCached(a, b);

  try {
    if (!outcome) {
      outcome = await askWorker(a, b);
      setCached(a, b, outcome.result, outcome.emoji);
    }
  } catch (e) {
    showToast('Something went wrong, try again');
    setBusy(itemA.id, false);
    setBusy(itemB.id, false);
    return;
  }

  // Remove the two source elements, spawn the result at the midpoint.
  removeCanvasElement(itemA.id);
  removeCanvasElement(itemB.id);
  spawnCanvasElement(outcome.result, outcome.emoji, midX, midY);

  const isNew = addDiscovered(outcome.result, outcome.emoji);
  if (isNew) {
    showToast(`✨ ${outcome.result} discovered!`, 'discovery');
  } else {
    showToast('Already discovered!');
  }
}

function setBusy(id, busy) {
  const chip = getCanvas().querySelector(`.canvas-chip[data-id="${id}"]`);
  if (chip) chip.classList.toggle('busy', busy);
}

// ---------- Drag from sidebar onto canvas ----------
function startSidebarDrag(e, name, emoji) {
  e.preventDefault();
  const canvas = getCanvas();
  const rect = canvas.getBoundingClientRect();

  // Create a temporary item that follows the pointer.
  const item = spawnCanvasElement(
    name,
    emoji,
    e.clientX - rect.left - 40,
    e.clientY - rect.top - 20
  );
  const chip = canvas.querySelector(`.canvas-chip[data-id="${item.id}"]`);
  if (!chip) return;
  chip.classList.remove('pop-in');

  beginDrag(chip, item, e);
}

// ---------- Drag existing canvas elements ----------
function attachCanvasDrag(chip) {
  chip.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const id = chip.dataset.id;
    const item = canvasElements.find((c) => c.id === id);
    if (item) beginDrag(chip, item, e);
  });

  chip.addEventListener('dblclick', () => {
    removeCanvasElement(chip.dataset.id);
  });
}

function beginDrag(chip, item, startEvent) {
  const canvas = getCanvas();
  const rect = canvas.getBoundingClientRect();
  const offsetX = startEvent.clientX - rect.left - item.x;
  const offsetY = startEvent.clientY - rect.top - item.y;

  chip.classList.add('dragging');
  chip.setPointerCapture?.(startEvent.pointerId);

  const onMove = (e) => {
    let x = e.clientX - rect.left - offsetX;
    let y = e.clientY - rect.top - offsetY;
    // Keep within canvas bounds.
    x = Math.max(0, Math.min(x, rect.width - chip.offsetWidth));
    y = Math.max(0, Math.min(y, rect.height - chip.offsetHeight));
    item.x = x;
    item.y = y;
    chip.style.left = `${x}px`;
    chip.style.top = `${y}px`;

    highlightOverlap(chip, item);
  };

  const onUp = () => {
    chip.classList.remove('dragging');
    chip.releasePointerCapture?.(startEvent.pointerId);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);

    clearOverlapHighlights();
    const target = findOverlap(chip, item);
    if (target) {
      const targetItem = canvasElements.find((c) => c.id === target.dataset.id);
      if (targetItem) combine(item, targetItem);
    }
  };

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

// ---------- Overlap detection ----------
function rectsOverlap(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function findOverlap(draggedChip, draggedItem) {
  const draggedRect = draggedChip.getBoundingClientRect();
  const chips = getCanvas().querySelectorAll('.canvas-chip');
  for (const other of chips) {
    if (other === draggedChip) continue;
    if (other.classList.contains('busy')) continue;
    if (rectsOverlap(draggedRect, other.getBoundingClientRect())) {
      return other;
    }
  }
  return null;
}

function highlightOverlap(draggedChip, draggedItem) {
  clearOverlapHighlights();
  const target = findOverlap(draggedChip, draggedItem);
  if (target) target.classList.add('overlap-target');
}

function clearOverlapHighlights() {
  getCanvas()
    .querySelectorAll('.overlap-target')
    .forEach((c) => c.classList.remove('overlap-target'));
}

// ---------- Init ----------
function init() {
  renderSidebar(discovered, startSidebarDrag);
  updateCanvasHint();

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', clearCanvas);

  initWorker();
}

init();
