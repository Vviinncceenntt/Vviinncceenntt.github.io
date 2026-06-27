# Favicon

The web build's favicon is produced automatically by the app-icon
master SVG that already drives the iOS/Android app icon and splash
screens. Two files are emitted, declared together in `index.html`:

```html
<link rel="icon" type="image/svg+xml" href="assets/icons/app-icon.svg">
<link rel="icon" type="image/x-icon"  href="favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="assets/icons/app-icon.svg">
```

| File                          | Format         | Used by                                    |
|-------------------------------|----------------|--------------------------------------------|
| `web/assets/icons/app-icon.svg` | SVG (vector) | Every modern browser (Chrome ≥80, Edge ≥80, Firefox ≥41, Safari ≥14, iOS Safari ≥9 as `apple-touch-icon`). Single, tiny, theme-aware. |
| `web/favicon.ico`             | Multi-resolution ICO (16/32/48/64 px PNG) | Legacy fallback for older browsers and Windows shortcut icons. |

## How to regenerate both files

From the repo root:

```bash
bash mobile/scripts/generate-assets.sh
```

The script does, in order:

1. Downloads / refreshes the master SVG from
   `https://vviinncceenntt.github.io/swiss-round-calculator/appiconmastersvg.svg`
   (and the six splash master SVGs).
2. Rasterises each at the required size, inlining remote `<image>` and
   `@font-face` references so fonts and sub-graphics render correctly.
3. **Copies** the same `app-icon.svg` master into
   `web/assets/icons/app-icon.svg` for the modern-browser favicon.
4. **Generates** `web/favicon.ico` from `app-icon-1024.png` at four
   sizes (16/32/48/64) packed into a single `.ico` container.

## Conversion tooling — pick ONE

The script auto-detects whichever you have installed:

### Option A — ImageMagick (recommended; one command does everything)

```bash
# Windows: https://imagemagick.org/script/download.php#windows
# macOS:   brew install imagemagick
# Ubuntu:  sudo apt install imagemagick
```

After install, run `bash mobile/scripts/generate-assets.sh` again. The
script invokes:

```bash
magick app-icon-1024.png -define icon:auto-resize=64,48,32,16 favicon.ico
```

If you saw "magick command not found" earlier, the dependency wasn't
installed yet — install ImageMagick once and re-run.

### Option B — Node.js + pngjs (zero system deps)

Already on your machine if `npx expo` works. One extra package:

```bash
cd mobile/assets/images/_resvg_helper
npm install pngjs
```

Then re-run `bash mobile/scripts/generate-assets.sh`. The script falls
back to a small inline Node helper that uses nearest-neighbour
downscaling — perfectly adequate for tiny favicons.

### Option C — Skip favicon.ico entirely

Modern browsers (Chrome / Firefox / Safari 14+) only use the SVG
favicon (option A above is already declared first in `index.html`).
The `favicon.ico` line is purely a legacy fallback. You may delete
`web/favicon.ico` and the page still works on all current browsers;
older Edge versions will simply show no tab icon.

## Customisation

If you wish to use a different image for the favicon (independent of
the app icon), just drop a file at `web/assets/icons/app-icon.svg`
manually and the script will preserve it (it only overwrites that path
when re-rasterising the app-icon master). The same applies to
`web/favicon.ico`.
