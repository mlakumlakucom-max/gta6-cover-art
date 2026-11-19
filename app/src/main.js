// Neon Coast — wires the editor: photos, layouts, grades, lettering,
// per-panel crop/zoom, undo/redo, and one-click PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot (./shots.js).
import { drawCover, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const $ = (id) => document.getElementById(id);

export const state = {
  layout: 'nine',
  grade: 'vice',
  gradeStrength: 0.55,
  title: 'Neon Coast',
  subtitle: 'night drive',
  photos: [],
  panels: [],
  grain: true,
  vignette: true,
  badge: true,
  stars: true,
  selectedPanel: 0,
};

let undoStack = [];
let redoStack = [];

function snapshot() {
  const { photos, ...rest } = state;
  return JSON.stringify(rest);
}
function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 40) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}
function restore(json) {
  const saved = JSON.parse(json);
  const photos = state.photos;
  Object.assign(state, saved, { photos });
  syncControls();
  redraw();
}
function updateUndoButtons() {
  $('undo').disabled = undoStack.length === 0;
  $('redo').disabled = redoStack.length === 0;
}

export function buildPanels() {
  const n = (LAYOUTS[state.layout] || LAYOUTS.nine).panels.length;
  const count = Math.max(1, state.photos.length);
  state.panels = Array.from({ length: n }, (_, i) => ({
    photo: i % count,
    zoom: 1,
    ox: 0,
    oy: 0,
  }));
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function redraw() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('40px Anton'),
        document.fonts.load('30px Pacifico'),
      ]),
      new Promise((r) => setTimeout(r, 800)),
    ]);
  } catch (_) { /* fonts fall back to sans-serif */ }
  drawCover(canvas, state);
  const sel = state.panels[state.selectedPanel];
  if (sel) {
    $('panelPhoto').value = String(sel.photo);
    $('panelZoom').value = String(sel.zoom);
    $('panelX').value = String(sel.ox);
    $('panelY').value = String(sel.oy);
    $('panelLabel').textContent = `Panel ${state.selectedPanel + 1} of ${state.panels.length}`;
  }
}

function syncControls() {
  $('layout').value = state.layout;
  $('grade').value = state.grade;
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('badge').checked = state.badge;
  $('stars').checked = state.stars;
  $('gradeStrength').value = String(state.gradeStrength);
  buildPanelButtons();
}

function buildPanelButtons() {
  const wrap = $('panelButtons');
  wrap.innerHTML = '';
  state.panels.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(i + 1);
    b.className = i === state.selectedPanel ? 'panel-btn active' : 'panel-btn';
    b.addEventListener('click', () => { state.selectedPanel = i; redraw(); });
    wrap.appendChild(b);
  });
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  state.photos.forEach((_, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `Photo ${i + 1}`;
    sel.appendChild(o);
  });
}

function fillOptions() {
  const layout = $('layout');
  Object.entries(LAYOUTS).forEach(([key, v]) => {
    const o = document.createElement('option');
    o.value = key; o.textContent = v.label;
    layout.appendChild(o);
  });
  const grade = $('grade');
  Object.entries(GRADES).forEach(([key, v]) => {
    const o = document.createElement('option');
    o.value = key; o.textContent = v.label;
    grade.appendChild(o);
  });
}

function bind() {
  fillOptions();
  $('layout').addEventListener('change', (e) => { pushUndo(); state.layout = e.target.value; state.selectedPanel = 0; buildPanels(); buildPanelButtons(); redraw(); });
  $('grade').addEventListener('change', (e) => { pushUndo(); state.grade = e.target.value; redraw(); });
  $('gradeStrength').addEventListener('input', (e) => { state.gradeStrength = Number(e.target.value); redraw(); });
  $('gradeStrength').addEventListener('change', () => pushUndo());
  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('title').addEventListener('change', () => pushUndo());
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('subtitle').addEventListener('change', () => pushUndo());
  $('grain').addEventListener('change', (e) => { pushUndo(); state.grain = e.target.checked; redraw(); });
  $('vignette').addEventListener('change', (e) => { pushUndo(); state.vignette = e.target.checked; redraw(); });
  $('badge').addEventListener('change', (e) => { pushUndo(); state.badge = e.target.checked; redraw(); });
  $('stars').addEventListener('change', (e) => { pushUndo(); state.stars = e.target.checked; redraw(); });

  $('photos').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, 4);
    if (!files.length) return;
    pushUndo();
    for (const f of files) {
      state.photos.push(await loadImage(URL.createObjectURL(f)));
      if (state.photos.length >= 4) break;
    }
    buildPanels();
    buildPanelButtons();
    redraw();
  });
  $('useSamples').addEventListener('click', async () => {
    pushUndo();
    state.photos = [
      await loadImage('./samples/boulevard.jpg'),
      await loadImage('./samples/pier.jpg'),
    ];
    buildPanels(); buildPanelButtons(); redraw();
  });

  $('panelPhoto').addEventListener('change', (e) => {
    pushUndo();
    state.panels[state.selectedPanel].photo = Number(e.target.value);
    redraw();
  });
  $('panelZoom').addEventListener('input', (e) => { state.panels[state.selectedPanel].zoom = Number(e.target.value); redraw(); });
  $('panelZoom').addEventListener('change', () => pushUndo());
  $('panelX').addEventListener('input', (e) => { state.panels[state.selectedPanel].ox = Number(e.target.value); redraw(); });
  $('panelX').addEventListener('change', () => pushUndo());
  $('panelY').addEventListener('input', (e) => { state.panels[state.selectedPanel].oy = Number(e.target.value); redraw(); });
  $('panelY').addEventListener('change', () => pushUndo());

  $('undo').addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    updateUndoButtons();
  });
  $('redo').addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    updateUndoButtons();
  });

  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => exportPNG(btn.dataset.export));
  });
}

/** Renders the cover at an exact size and downloads it as a PNG. */
export function exportPNG(sizeLabel) {
  const [w, h] = sizeLabel.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  drawCover(off, state);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-${w}x${h}.png`;
    a.click();
    $('status').textContent = `Saved neon-coast-${w}x${h}.png`;
  }, 'image/png');
}

async function init() {
  bind();
  state.photos = [
    await loadImage('./samples/boulevard.jpg'),
    await loadImage('./samples/pier.jpg'),
  ];
  buildPanels();
  syncControls();
  updateUndoButtons();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    await runShot(shot, params, state, redraw);
    // runShot changes layout/grade/caption after the controls were first
    // synced, so sync them again or the editor would show stale values.
    syncControls();
    await redraw();
  } else {
    await redraw();
  }
}

init();
