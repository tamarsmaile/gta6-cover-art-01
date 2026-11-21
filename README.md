# Neon Coast Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/tamarsmaile/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/tamarsmaile/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An offline web app that turns any photo and caption into GTA 6-style poster cover art — multi-panel layouts, a Vice City sunset or neon colour grade, bold Anton title lettering with a Pacifico subtitle — and exports it as a PNG to share. Built for the [gta6-cover-art-01 competition](https://make.fun/c/gta6-cover-art-01) on make.fun.

## How it works

1. Add up to four photos from your machine (or try a built-in sample).
2. Pick a layout (Hero + 3, Four panels, Nine grid, Full bleed) and an export size (1080 × 1080, 1080 × 1350, 1920 × 1080).
3. Click a panel to select it, drag its photo to reposition it, and tune zoom and pan with the sliders. "Fill all panels" puts one photo across every panel.
4. Type the title and subtitle, choose a title style and a colour grade, then hit **Export PNG**.

Photos are read on your own machine and never uploaded. The app is static files with no build step and no network requests.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

To hand the entry in (writes `out/` with `app/`, `screenshots/` and `dossier.json`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Credits

- Title font Anton and subtitle font Pacifico, both under the SIL Open Font License — see `app/fonts/OFL-Anton.txt` and `app/fonts/OFL-Pacifico.txt`.
- The two sample photos in `app/samples/` were made with an image model for make.fun and are free to use.
- No Rockstar Games logos, artwork, characters or fonts are used anywhere in this app.

## Referral

Made with make.fun — try it yourself: https://make.fun/r/jad7ba0e
