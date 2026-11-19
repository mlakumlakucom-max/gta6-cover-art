// Neon Coast cover engine — original multi-panel GTA-style cover art.
// Draws any photos into a panel layout, grades each panel with a gradient
// map, then letters the caption in Anton with a Pacifico neon subtitle.
// No network, no library: plain Canvas 2D, all assets under app/.

/** Layouts: each panel is a rect in 0..1 of the cover, plus a title zone. */
export const LAYOUTS = {
  nine: {
    label: 'Nine Grid',
    panels: [
      [0, 0, 1 / 3, 1 / 3], [1 / 3, 0, 1 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 1 / 3],
      [0, 1 / 3, 1 / 3, 1 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3], [2 / 3, 1 / 3, 1 / 3, 1 / 3],
      [0, 2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 1 / 3, 1 / 3],
    ],
    titleZone: 'bottom',
  },
  hero: {
    label: 'Hero + Three',
    panels: [
      [0, 0, 0.64, 1], [0.64, 0, 0.36, 1 / 3], [0.64, 1 / 3, 0.36, 1 / 3], [0.64, 2 / 3, 0.36, 1 / 3],
    ],
    titleZone: 'bottom',
  },
  full: {
    label: 'Full Bleed',
    panels: [[0, 0, 1, 1]],
    titleZone: 'bottom',
  },
  tilted: {
    label: 'Tilted Snapshots',
    panels: [
      [0.03, 0.06, 0.44, 0.52], [0.5, 0.02, 0.47, 0.5], [0.08, 0.52, 0.4, 0.42], [0.52, 0.5, 0.44, 0.44],
    ],
    tilt: [-3, 2.5, 2, -2],
    titleZone: 'top',
  },
  four: {
    label: 'Four Panel',
    panels: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]],
    titleZone: 'bottom',
  },
  six: {
    label: 'Six Panel',
    panels: [
      [0, 0, 1, 0.5],
      [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5],
      // six-panel counts its wide top as two slots; the sixth slot is the title band
    ],
    titleZone: 'bottom',
  },
};

/** Gradient-map grades: dark -> mid -> light colours, applied per panel. */
export const GRADES = {
  vice: { label: 'Vice Sunset', stops: [[26, 11, 46], [255, 94, 58], [255, 210, 63], [255, 247, 214]] },
  neon: { label: 'Neon Pink / Teal', stops: [[5, 5, 16], [255, 46, 136], [0, 229, 255], [255, 255, 255]] },
  golden: { label: 'Golden Hour', stops: [[36, 21, 5], [185, 106, 0], [255, 207, 92], [255, 243, 196]] },
  dusk: { label: 'Dusk Purple', stops: [[18, 10, 36], [123, 47, 247], [255, 110, 199], [255, 233, 246]] },
  noir: { label: 'Noir Teal', stops: [[2, 20, 26], [15, 118, 110], [125, 211, 200], [230, 255, 250]] },
  ember: { label: 'Palm Ember', stops: [[32, 5, 5], [230, 57, 70], [244, 162, 97], [255, 232, 194]] },
};

function hexLerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Builds a 256-entry luminance -> RGB lookup for a grade. */
export function gradeLUT(grade) {
  const stops = GRADES[grade]?.stops || GRADES.vice.stops;
  const lut = new Uint8ClampedArray(256 * 3);
  const n = stops.length - 1;
  for (let i = 0; i < 256; i++) {
    const f = (i / 255) * n;
    const k = Math.min(n - 1, Math.floor(f));
    const c = hexLerp(stops[k], stops[k + 1], f - k);
    lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2];
  }
  return lut;
}

/** Draws one photo, cover-fit with zoom and pan offsets, into a panel canvas. */
export function drawPanelPhoto(ctx, photo, w, h, zoom, ox, oy) {
  if (!photo) {
    ctx.fillStyle = '#241a33';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `bold ${Math.max(14, w * 0.05)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('+ ADD PHOTO', w / 2, h / 2);
    return;
  }
  const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  ctx.drawImage(photo, (w - pw) / 2 + ox * w, (h - ph) / 2 + oy * h, pw, ph);
}

/** Applies a gradient-map LUT in place to a canvas region's pixels. */
export function applyGrade(ctx, w, h, lut, strength) {
  if (strength <= 0) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const j = lum * 3;
    d[i] = d[i] + (lut[j] - d[i]) * strength;
    d[i + 1] = d[i + 1] + (lut[j + 1] - d[i + 1]) * strength;
    d[i + 2] = d[i + 2] + (lut[j + 2] - d[i + 2]) * strength;
  }
  ctx.putImageData(img, 0, 0);
}

let noiseCanvas = null;
function grainPattern(ctx, w, h) {
  if (!noiseCanvas) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 128; noiseCanvas.height = 128;
    const nctx = noiseCanvas.getContext('2d');
    const img = nctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 28;
    }
    nctx.putImageData(img, 0, 0);
  }
  const pat = ctx.createPattern(noiseCanvas, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/**
 * Draws the whole cover.
 * state: { layout, grade, gradeStrength, title, subtitle, photos: Image[],
 *   panels: [{photo, zoom, ox, oy}], grain, vignette, badge, stars }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  const layout = LAYOUTS[state.layout] || LAYOUTS.nine;
  const lut = gradeLUT(state.grade || 'vice');
  const strength = state.gradeStrength ?? 0.55;

  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, W, H);

  const gap = Math.max(3, Math.round(W * 0.006));
  const panelCanvas = document.createElement('canvas');
  const pctx = panelCanvas.getContext('2d');

  layout.panels.forEach((r, i) => {
    const px = Math.round(r[0] * W), py = Math.round(r[1] * H);
    const pw = Math.round(r[2] * W), ph = Math.round(r[3] * H);
    if (pw < 4 || ph < 4) return;
    panelCanvas.width = pw; panelCanvas.height = ph;
    const slot = state.panels?.[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const photo = state.photos?.[slot.photo] ?? null;
    drawPanelPhoto(pctx, photo, pw, ph, slot.zoom || 1, slot.ox || 0, slot.oy || 0);
    applyGrade(pctx, pw, ph, lut, strength);
    // thin inked panel edge
    pctx.strokeStyle = 'rgba(255,255,255,0.85)';
    pctx.lineWidth = Math.max(2, W * 0.004);
    pctx.strokeRect(1, 1, pw - 2, ph - 2);
    ctx.save();
    if (layout.tilt) {
      const cx = px + pw / 2, cy = py + ph / 2;
      ctx.translate(cx, cy);
      ctx.rotate(((layout.tilt[i] || 0) * Math.PI) / 180);
      ctx.drawImage(panelCanvas, -pw / 2, -ph / 2);
    } else {
      ctx.drawImage(panelCanvas, px + gap / 2, py + gap / 2, pw - gap, ph - gap);
    }
    ctx.restore();
  });

  // Title band
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const bandH = Math.round(H * (layout.titleZone === 'top' ? 0.16 : 0.2));
  const bandY = layout.titleZone === 'top' ? 0 : H - bandH;
  const grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  grad.addColorStop(0, 'rgba(10,4,24,0)');
  grad.addColorStop(0.35, 'rgba(10,4,24,0.82)');
  grad.addColorStop(1, 'rgba(10,4,24,0.94)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, bandY, W, bandH);

  if (title) {
    const size = fitFont(ctx, title, W * 0.9, Math.round(H * 0.085), 'Anton, sans-serif');
    // sunset-gradient lettering
    const tg = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    tg.addColorStop(0, '#fff7d6');
    tg.addColorStop(0.5, '#ffd23f');
    tg.addColorStop(1, '#ff5e3a');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeStyle = '#12081f';
    ctx.strokeText(title, W / 2, bandY + bandH * 0.42);
    ctx.fillStyle = tg;
    ctx.fillText(title, W / 2, bandY + bandH * 0.42);
  }
  if (subtitle) {
    const sSize = fitFont(ctx, subtitle, W * 0.7, Math.round(H * 0.038), 'Pacifico, cursive');
    ctx.font = `${sSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = Math.round(sSize * 0.5);
    ctx.fillText(subtitle, W / 2, bandY + bandH * 0.8);
    ctx.shadowBlur = 0;
  }

  // Badge ribbon + stars, top corner
  if (state.badge) {
    const bw = W * 0.3, bh = Math.round(H * 0.045);
    const bx = W - bw - W * 0.03, by = layout.titleZone === 'top' ? bandH + H * 0.02 : H * 0.03;
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw - bh * 0.4, by + bh);
    ctx.lineTo(bx, by + bh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(bh * 0.55)}px Anton, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('★ ORIGINAL ★', bx + bw / 2, by + bh / 2 + 1);
  }
  if (state.stars) {
    ctx.font = `${Math.round(H * 0.032)}px sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd23f';
    ctx.shadowColor = '#ff5e3a'; ctx.shadowBlur = 8;
    // With a top title band the stars sit just below it, not on the title.
    const starsY = layout.titleZone === 'top' ? bandY + bandH + H * 0.03 : H * 0.05;
    ctx.fillText('★★★★★', W * 0.03, starsY);
    ctx.shadowBlur = 0;
  }

  if (state.vignette) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain) grainPattern(ctx, W, H);
}
