// Neon Coast Cover Studio — the cover renderer.
// Draws a GTA-style multi-panel poster cover onto a canvas: panels of the user's
// photos, a sunset/neon colour grade, a bold Anton title with a Pacifico subtitle,
// grain, vignette and a white poster frame. Everything is drawn with the 2D canvas
// API; no image leaves the machine.

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUTS = {
  hero: { panels: 4, label: 'Hero + 3' },
  quad: { panels: 4, label: 'Four panels' },
  nine: { panels: 9, label: 'Nine grid' },
  full: { panels: 1, label: 'Full bleed' },
};

export const GRADES = {
  sunset: { top: 'rgba(255,122,61,0.42)', mid: 'rgba(255,46,136,0.34)', bottom: 'rgba(123,47,255,0.30)' },
  neon: { top: 'rgba(255,46,136,0.40)', mid: 'rgba(123,47,255,0.30)', bottom: 'rgba(0,229,204,0.34)' },
  gold: { top: 'rgba(255,190,60,0.44)', mid: 'rgba(255,122,61,0.30)', bottom: 'rgba(120,40,10,0.26)' },
  teal: { top: 'rgba(0,229,204,0.32)', mid: 'rgba(20,90,160,0.34)', bottom: 'rgba(10,20,60,0.36)' },
  none: { top: 'rgba(0,0,0,0)', mid: 'rgba(0,0,0,0)', bottom: 'rgba(0,0,0,0)' },
};

/** Panel rectangles for a layout, as fractions of the cover, plus the title strip. */
export function layoutPanels(layout, w, h) {
  const strip = layout === 'full' ? 0 : 0.16;
  const ph = h * (1 - strip);
  switch (layout) {
    case 'hero':
      return [
        { x: 0, y: 0, w, h: ph * 0.62 },
        { x: 0, y: ph * 0.62, w: w / 3, h: ph * 0.38 },
        { x: w / 3, y: ph * 0.62, w: w / 3, h: ph * 0.38 },
        { x: (2 * w) / 3, y: ph * 0.62, w: w / 3, h: ph * 0.38 },
      ];
    case 'nine':
      return Array.from({ length: 9 }, (_, i) => ({
        x: (i % 3) * (w / 3), y: Math.floor(i / 3) * (ph / 3), w: w / 3, h: ph / 3,
      }));
    case 'full':
      return [{ x: 0, y: 0, w, h }];
    case 'quad':
    default:
      return [
        { x: 0, y: 0, w: w / 2, h: ph / 2 },
        { x: w / 2, y: 0, w: w / 2, h: ph / 2 },
        { x: 0, y: ph / 2, w: w / 2, h: ph / 2 },
        { x: w / 2, y: ph / 2, w: w / 2, h: ph / 2 },
      ];
  }
}

/** A tiny deterministic random generator, so grain looks the same on every export. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo into a panel rect, honouring zoom (1..3) and pan (0..1 each way). */
export function drawPhotoInPanel(ctx, photo, rect, zoom, panX, panY) {
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  const ox = (dw - rect.w) * panX;
  const oy = (dh - rect.h) * panY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(photo, rect.x - ox, rect.y - oy, dw, dh);
  ctx.restore();
}

/** Washes a panel with the chosen colour grade. */
export function applyGrade(ctx, rect, grade) {
  if (grade === 'none') return;
  const g = GRADES[grade];
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w * 0.35, rect.y + rect.h);
  grad.addColorStop(0, g.top);
  grad.addColorStop(0.55, g.mid);
  grad.addColorStop(1, g.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Fits the title font size to the strip width. */
export function fitTitleFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Draws the title and subtitle into the bottom strip (or over the photo for full bleed). */
export function drawTitleBlock(ctx, state, w, h) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const stripH = state.layout === 'full' ? 0 : h * 0.16;
  const stripY = h - stripH;
  if (state.layout !== 'full') {
    const bg = ctx.createLinearGradient(0, stripY, 0, h);
    bg.addColorStop(0, '#1c0a2e');
    bg.addColorStop(1, '#3d0f3d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, stripY, w, stripH);
    const line = ctx.createLinearGradient(0, stripY, w, stripY);
    line.addColorStop(0, '#ff7a3d');
    line.addColorStop(0.5, '#ff2e88');
    line.addColorStop(1, '#7b2fff');
    ctx.fillStyle = line;
    ctx.fillRect(0, stripY, w, Math.max(3, h * 0.004));
  } else {
    const scrim = ctx.createLinearGradient(0, h * 0.45, 0, h);
    scrim.addColorStop(0, 'rgba(20,5,35,0)');
    scrim.addColorStop(1, 'rgba(20,5,35,0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);
  }
  if (!title && !subtitle) return;
  const cx = w / 2;
  const baseY = state.layout === 'full' ? h * 0.86 : stripY + stripH * 0.48;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    const size = fitTitleFont(ctx, title, w * 0.88, (state.layout === 'full' ? h * 0.085 : stripH * 0.46), 'Anton, sans-serif');
    ctx.save();
    if (state.titleStyle === 'sunset') {
      const g = ctx.createLinearGradient(0, baseY - size * 0.6, 0, baseY + size * 0.6);
      g.addColorStop(0, '#ffe259');
      g.addColorStop(0.5, '#ff7a3d');
      g.addColorStop(1, '#ff2e88');
      ctx.fillStyle = g;
    } else if (state.titleStyle === 'neon') {
      ctx.fillStyle = '#ff5db1';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.35;
    } else if (state.titleStyle === 'outline') {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, size * 0.045);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = size * 0.18;
      ctx.shadowOffsetY = size * 0.04;
    }
    ctx.font = `${size}px Anton, sans-serif`;
    if (state.titleStyle === 'outline') ctx.strokeText(title, cx, baseY);
    else ctx.fillText(title, cx, baseY);
    ctx.restore();
  }
  if (subtitle) {
    const subSize = state.layout === 'full' ? h * 0.038 : stripH * 0.20;
    const subY = state.layout === 'full' ? h * 0.94 : stripY + stripH * 0.81;
    ctx.save();
    ctx.translate(cx, subY);
    ctx.rotate(-0.02);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffb3d9';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(subtitle, 0, 0);
    ctx.restore();
  }
}

/** Sprinkles deterministic film grain and a vignette over the whole cover. */
export function applyGrainAndVignette(ctx, w, h) {
  const rand = mulberry32(20261121);
  const count = Math.floor((w * h) / 450);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,20,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Draws the whole cover for `state` onto `canvas` at the canvas's own size. */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const gut = Math.max(2, Math.round(w * 0.006));
  ctx.fillStyle = '#2b1838';
  ctx.fillRect(0, 0, w, h);
  const rects = layoutPanels(state.layout, w, h);
  const photos = state.photos || [];
  rects.forEach((rect, i) => {
    const panel = (state.panels || [])[i] || { photoIndex: 0, zoom: 1, panX: 0.5, panY: 0.5 };
    const photo = photos[panel.photoIndex];
    const inner = {
      x: rect.x + (i === 0 ? 0 : 0) + gut / 2,
      y: rect.y + gut / 2,
      w: rect.w - gut,
      h: rect.h - gut,
    };
    if (state.layout === 'full') { inner.x = 0; inner.y = 0; inner.w = w; inner.h = h; }
    if (photo) {
      drawPhotoInPanel(ctx, photo, inner, panel.zoom || 1, panel.panX ?? 0.5, panel.panY ?? 0.5);
    } else {
      const bg = ctx.createLinearGradient(inner.x, inner.y, inner.x + inner.w, inner.y + inner.h);
      bg.addColorStop(0, '#3d1a56');
      bg.addColorStop(1, '#1c0a2e');
      ctx.fillStyle = bg;
      ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `${Math.max(14, w * 0.02)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add a photo', inner.x + inner.w / 2, inner.y + inner.h / 2);
    }
    applyGrade(ctx, inner, state.grade || 'sunset');
    if (state.layout === 'hero' && i === 0) {
      const sun = ctx.createRadialGradient(
        inner.x + inner.w * 0.84, inner.y + inner.h * 0.2, 4,
        inner.x + inner.w * 0.84, inner.y + inner.h * 0.2, inner.w * 0.11,
      );
      sun.addColorStop(0, 'rgba(255,226,89,0.85)');
      sun.addColorStop(0.6, 'rgba(255,122,61,0.5)');
      sun.addColorStop(1, 'rgba(255,46,136,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(inner.x + inner.w * 0.84, inner.y + inner.h * 0.2, inner.w * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  drawTitleBlock(ctx, state, w, h);
  if (state.grain) applyGrainAndVignette(ctx, w, h);
  if (state.frame) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(4, Math.round(w * 0.008));
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  }
}

/** Renders the cover at full export size on a fresh canvas and returns it. */
export function renderExport(state) {
  const [w, h] = SIZES[state.size] || SIZES['1080x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCoverArt(canvas, state);
  return canvas;
}
