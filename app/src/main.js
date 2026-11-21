// Neon Coast Cover Studio — wires the editor: photos, panels, caption, grades and export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCoverArt, renderExport, layoutPanels, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const panelPhoto = document.getElementById('panelPhoto');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panX');
const panYInput = document.getElementById('panY');
const panelHint = document.getElementById('panelHint');

const state = {
  layout: 'hero',
  size: '1080x1080',
  title: 'Neon Coast',
  subtitle: 'chase the sunset',
  titleStyle: 'sunset',
  grade: 'sunset',
  grain: true,
  frame: true,
  photos: [],
  panels: [],
};
let selectedPanel = 0;
let dragging = null;

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function ensurePanels() {
  while (state.panels.length < panelCount()) {
    state.panels.push({ photoIndex: 0, zoom: 1, panX: 0.5, panY: 0.5 });
  }
  state.panels.length = panelCount();
  if (selectedPanel >= panelCount()) selectedPanel = 0;
}

function currentPanel() {
  ensurePanels();
  return state.panels[selectedPanel];
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ensurePanels();
  drawCoverArt(canvas, state);
  syncPanelControls();
}

function syncPanelControls() {
  const panel = currentPanel();
  panelHint.textContent = `Panel ${selectedPanel + 1} of ${panelCount()} selected. Drag the photo in the preview, or use the sliders.`;
  panelPhoto.innerHTML = '';
  if (state.photos.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No photos yet';
    panelPhoto.appendChild(opt);
    panelPhoto.disabled = true;
  } else {
    panelPhoto.disabled = false;
    state.photos.forEach((photo, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = photo.dataset.name || `Photo ${i + 1}`;
      if (i === panel.photoIndex) opt.selected = true;
      panelPhoto.appendChild(opt);
    });
  }
  zoomInput.value = String(Math.round((panel.zoom || 1) * 100));
  document.getElementById('zoomVal').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
  panXInput.value = String(Math.round((panel.panX ?? 0.5) * 100));
  document.getElementById('panXVal').textContent = `${Math.round((panel.panX ?? 0.5) * 100)}%`;
  panYInput.value = String(Math.round((panel.panY ?? 0.5) * 100));
  document.getElementById('panYVal').textContent = `${Math.round((panel.panY ?? 0.5) * 100)}%`;
  renderPhotoList();
}

function renderPhotoList() {
  const list = document.getElementById('photoList');
  list.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const item = document.createElement('div');
    item.className = 'photo-item';
    const thumb = document.createElement('img');
    thumb.className = 'photo-thumb';
    thumb.src = photo.src;
    thumb.alt = photo.dataset.name || `Photo ${i + 1}`;
    if (currentPanel().photoIndex === i) thumb.classList.add('selected');
    thumb.addEventListener('click', () => {
      currentPanel().photoIndex = i;
      redraw();
    });
    const label = document.createElement('span');
    label.className = 'photo-thumb-label';
    label.textContent = photo.dataset.name || `Photo ${i + 1}`;
    item.appendChild(thumb);
    item.appendChild(label);
    list.appendChild(item);
  });
}

async function addPhotoFiles(files) {
  for (const file of files) {
    const img = await loadImage(URL.createObjectURL(file));
    img.dataset.name = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || `Photo ${state.photos.length + 1}`;
    state.photos.push(img);
  }
  redraw();
}

async function addSample(name, label) {
  const img = await loadImage(`samples/${name}.jpg`);
  img.dataset.name = label;
  state.photos.push(img);
  redraw();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function pickPanel(point) {
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const hit = rects.findIndex((r) => point.x >= r.x && point.x < r.x + r.w && point.y >= r.y && point.y < r.y + r.h);
  return hit === -1 ? 0 : hit;
}

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  selectedPanel = pickPanel(point);
  dragging = { x: point.x, y: point.y, panX: currentPanel().panX ?? 0.5, panY: currentPanel().panY ?? 0.5 };
  canvas.setPointerCapture(event.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const point = canvasPoint(event);
  const panel = currentPanel();
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const rect = rects[selectedPanel];
  const spanX = Math.max(1, (panel.zoom || 1) * rect.w - rect.w);
  const spanY = Math.max(1, (panel.zoom || 1) * rect.h - rect.h);
  panel.panX = Math.min(1, Math.max(0, dragging.panX - (point.x - dragging.x) / spanX));
  panel.panY = Math.min(1, Math.max(0, dragging.panY - (point.y - dragging.y) / spanY));
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });

document.getElementById('photos').addEventListener('change', (e) => {
  addPhotoFiles([...e.target.files]).catch(() => { status.textContent = 'Could not read that photo.'; });
});
document.getElementById('sampleBoulevard').addEventListener('click', () => {
  addSample('boulevard', 'Boulevard').catch(() => { status.textContent = 'Could not load the sample.'; });
});
document.getElementById('samplePier').addEventListener('click', () => {
  addSample('pier', 'Pier').catch(() => { status.textContent = 'Could not load the sample.'; });
});
document.getElementById('fillAll').addEventListener('click', () => {
  if (state.photos.length === 0) { status.textContent = 'Add a photo first.'; return; }
  const idx = currentPanel().photoIndex;
  state.panels.forEach((p) => { p.photoIndex = idx; });
  status.textContent = 'Every panel now shows the same photo.';
  redraw();
});

document.getElementById('layoutRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-layout]');
  if (!btn) return;
  document.querySelectorAll('#layoutRow .layout-btn').forEach((b) => b.classList.toggle('active', b === btn));
  state.layout = btn.dataset.layout;
  redraw();
});
document.getElementById('sizeRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-size]');
  if (!btn) return;
  document.querySelectorAll('#sizeRow .size-btn').forEach((b) => b.classList.toggle('active', b === btn));
  state.size = btn.dataset.size;
  redraw();
});
panelPhoto.addEventListener('change', () => {
  currentPanel().photoIndex = Number(panelPhoto.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  currentPanel().zoom = Number(zoomInput.value) / 100;
  redraw();
});
panXInput.addEventListener('input', () => {
  currentPanel().panX = Number(panXInput.value) / 100;
  redraw();
});
panYInput.addEventListener('input', () => {
  currentPanel().panY = Number(panYInput.value) / 100;
  redraw();
});
document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('titleStyle').addEventListener('change', (e) => { state.titleStyle = e.target.value; redraw(); });
document.getElementById('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
document.getElementById('frame').addEventListener('change', (e) => { state.frame = e.target.checked; redraw(); });

document.getElementById('export').addEventListener('click', () => {
  const out = renderExport(state);
  const [w, h] = SIZES[state.size];
  out.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved neon-coast-cover-${w}x${h}.png`;
    window.__exported = { width: w, height: h, bytes: blob.size };
  }, 'image/png');
});

window.__appState = state;
window.__redraw = redraw;

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (scene) => {
    state.layout = scene.layout;
    state.size = scene.size;
    state.title = scene.caption;
    state.subtitle = scene.subtitle;
    state.grade = scene.grade;
    state.titleStyle = scene.titleStyle;
    ensurePanels();
    // Stage the hero panel so the subject's face stays in frame in screenshots.
    if (state.layout === 'hero') state.panels[0].panY = 0.12;
    if (scene.photo2) {
      const second = await loadImage(`samples/${scene.photo2}.jpg`);
      second.dataset.name = scene.photo2;
      state.photos.push(second);
      state.panels = state.panels.map((p, i) => ({ ...p, photoIndex: i % 2 }));
    }
    const img = await loadImage(`samples/${scene.photo}.jpg`);
    img.dataset.name = scene.photo;
    state.photos.unshift(img);
    const titleInput = document.getElementById('title');
    const subtitleInput = document.getElementById('subtitle');
    if (titleInput) titleInput.value = scene.caption;
    if (subtitleInput) subtitleInput.value = scene.subtitle;
    ensurePanels();
    redraw();
  });
} else {
  redraw();
}
