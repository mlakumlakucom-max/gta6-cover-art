// Fixed scenes for screenshots: ?shot=cover draws one exported cover full
// frame, ?shot=editor shows the editor with photos loaded, ?shot=cover2
// draws a second exported cover in portrait. Params: layout, grade,
// caption, subtitle, w, h.
import { LAYOUTS } from './cover.js';

/** Runs a shot scene, mutating state then redrawing. */
export async function runShot(shot, params, state, redraw) {
  const canvas = document.getElementById('cover');
  const caption = params.get('caption') || state.title;
  const subtitle = params.get('subtitle') || state.subtitle;
  state.title = caption;
  state.subtitle = subtitle;
  if (params.get('layout') && LAYOUTS[params.get('layout')]) {
    state.layout = params.get('layout');
  }
  if (params.get('grade')) state.grade = params.get('grade');

  if (shot === 'cover' || shot === 'cover2') {
    document.body.classList.add('shot-cover');
    const w = Number(params.get('w') || 1920);
    const h = Number(params.get('h') || 1080);
    canvas.width = w;
    canvas.height = h;
  } else {
    document.body.classList.add('shot-editor');
    canvas.width = 1080;
    canvas.height = 1350;
  }
  // Rebuild panels for the chosen layout, cycling the two sample photos.
  const n = LAYOUTS[state.layout].panels.length;
  const count = Math.max(1, state.photos.length);
  state.panels = Array.from({ length: n }, (_, i) => ({
    photo: i % count,
    zoom: 1 + (i % 3) * 0.08,
    ox: 0,
    oy: 0,
  }));
  state.selectedPanel = 0;
  await redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
