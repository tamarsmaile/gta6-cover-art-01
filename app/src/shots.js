// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo
// loaded; ?shot=cover shows the cover alone, drawn by the app at export size.
// Query params: photo, photo2, caption, subtitle, layout, size, grade, titleStyle.
// window.__shotReady is set once the scene has painted.
const SCENES = {
  cover: {
    photo: 'boulevard', photo2: 'pier', caption: 'Neon Coast', subtitle: 'chase the sunset',
    layout: 'hero', size: '1920x1080', grade: 'sunset', titleStyle: 'sunset',
  },
  coverSquare: {
    photo: 'pier', caption: 'Pier Pressure', subtitle: 'golden hour heist',
    layout: 'quad', size: '1080x1080', grade: 'gold', titleStyle: 'white',
  },
  coverPortrait: {
    photo: 'boulevard', photo2: 'pier', caption: 'Boulevard Queen', subtitle: 'night drive',
    layout: 'nine', size: '1080x1350', grade: 'neon', titleStyle: 'neon',
  },
  editor: {
    photo: 'boulevard', photo2: 'pier', caption: 'Neon Coast', subtitle: 'chase the sunset',
    layout: 'hero', size: '1080x1080', grade: 'sunset', titleStyle: 'sunset',
  },
};

/** Builds a shot scene from the query, runs `load` with it, then flags readiness. */
export async function runShot(shot, query, load) {
  const base = SCENES[shot] || SCENES.editor;
  const scene = {
    photo: query.get('photo') ?? base.photo,
    photo2: query.get('photo2') ?? base.photo2,
    caption: query.get('caption') ?? base.caption,
    subtitle: query.get('subtitle') ?? base.subtitle,
    layout: query.get('layout') ?? base.layout,
    size: query.get('size') ?? base.size,
    grade: query.get('grade') ?? base.grade,
    titleStyle: query.get('titleStyle') ?? base.titleStyle,
  };
  if (shot === 'cover' || shot === 'coverSquare' || shot === 'coverPortrait') {
    document.body.classList.add('shot-cover');
  }
  await load(scene);
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
