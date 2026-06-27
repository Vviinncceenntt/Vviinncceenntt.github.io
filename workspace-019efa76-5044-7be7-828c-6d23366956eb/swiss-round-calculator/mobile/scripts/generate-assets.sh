#!/usr/bin/env bash
# Asset generation pipeline:
#
#   SVG (master, sRGB) -> PDF (vector, sRGB) -> PNG (32-bit @ target size)
#
# Detection order (each stage falls through to the next available tool):
#   SVG -> PDF :  inkscape   >>  rsvg-convert
#   PDF -> PNG :  ghostscript (gs / gswin64c)   >>  magick / convert
#   SVG -> PNG :  inkscape   >>  rsvg-convert   >>  magick / convert
#   LAST RESORT:  Node.js + @resvg/resvg-js  (pure WASM, zero system deps)
#
# The downloaded SVG masters are kept in assets/images/svg/ regardless of
# whether rasterisation succeeds, so a designer can finish the job by hand.

set -uo pipefail            # no -e: we want to handle errors per asset
cd "$(dirname "$0")/.."

OUT=assets/images
SVG_DIR="$OUT/svg"          # KEEP the masters here for manual fallback
mkdir -p "$OUT" "$SVG_DIR"

have() { command -v "$1" >/dev/null 2>&1; }

# ----- locate tools -----
INKSCAPE=""
if have inkscape; then INKSCAPE="inkscape"
elif [ -x "/c/Program Files/Inkscape/bin/inkscape.exe" ]; then INKSCAPE="/c/Program Files/Inkscape/bin/inkscape.exe"
elif [ -x "/c/Program Files (x86)/Inkscape/bin/inkscape.exe" ]; then INKSCAPE="/c/Program Files (x86)/Inkscape/bin/inkscape.exe"
fi

RSVG=""
if have rsvg-convert; then RSVG="rsvg-convert"; fi

MAGICK=""
if have magick; then MAGICK="magick"
elif have convert; then MAGICK="convert"
fi

GS=""
if have gs; then GS="gs"
elif have gswin64c; then GS="gswin64c"
elif have gswin32c; then GS="gswin32c"
fi

NODE=""
if have node; then NODE="node"; fi
NPM=""
if have npm; then NPM="npm"; fi

echo "Tool detection:"
echo "  inkscape    : ${INKSCAPE:-NOT FOUND}"
echo "  rsvg-convert: ${RSVG:-NOT FOUND}"
echo "  magick      : ${MAGICK:-NOT FOUND}"
echo "  ghostscript : ${GS:-NOT FOUND}"
echo "  node / npm  : ${NODE:-NOT FOUND} / ${NPM:-NOT FOUND}"
echo

# ----- assets to generate -----
NAMES=(
  app-icon
  splash-landscape-light
  splash-landscape-dark
  splash-portrait-light
  splash-portrait-dark
  splash-android12-light
  splash-android12-dark
)
URLS=(
  https://vviinncceenntt.github.io/swiss-round-calculator/appiconmastersvg.svg
  https://vviinncceenntt.github.io/swiss-round-calculator/splashscreenlandscapelightmastersvg.svg
  https://vviinncceenntt.github.io/swiss-round-calculator/splashscreenlandscapedarkmastersvg.svg
  https://vviinncceenntt.github.io/swiss-round-calculator/splashscreenportraitlightmastersvg.svg
  https://vviinncceenntt.github.io/swiss-round-calculator/splashscreenportraitdarkmastersvg.svg
  https://vviinncceenntt.github.io/swiss-round-calculator/splashscreenandroid12lightmastersvg.svg
  https://vviinncceenntt.github.io/swiss-round-calculator/splashscreenandroid12darkmastersvg.svg
)
SIZES=(1024 2732 2732 2732 2732 2732 2732)

# ----- conversion helpers (stderr captured + shown) -----
log_attempt() { echo "      [$1]"; }

# Trim noisy stderr (e.g. ImageMagick printing the whole base64 data-URI in
# its error message) to a single ~240-character line per record, prefixed
# with "        > ". Locale-safe: forces a byte-oriented locale to avoid
# awk's "Invalid multibyte data detected" warnings on Git Bash for Windows
# when ImageMagick emits Chinese-localised error messages with mojibake.
trim_stderr() {
  LC_ALL=C awk '
    {
      gsub(/\r$/, "");
      if (length($0) > 240) print "        > " substr($0,1,240) "... [truncated]";
      else                  print "        > " $0;
    }'
}

svg_to_pdf() {
  local svg="$1" pdf="$2"
  if [ -n "$INKSCAPE" ]; then
    log_attempt "Inkscape SVG->PDF"
    "$INKSCAPE" "$svg" --export-type=pdf --export-pdf-version=1.5 \
                       --export-filename="$pdf" 2>&1 | trim_stderr
    [ -s "$pdf" ] && return 0
  fi
  if [ -n "$RSVG" ]; then
    log_attempt "rsvg-convert SVG->PDF"
    "$RSVG" -f pdf -o "$pdf" "$svg" 2>&1 | trim_stderr
    [ -s "$pdf" ] && return 0
  fi
  return 1
}

pdf_to_png() {
  local pdf="$1" png="$2" size="$3"
  if [ -n "$GS" ]; then
    log_attempt "Ghostscript PDF->PNG"
    "$GS" -q -dNOPAUSE -dBATCH -sDEVICE=pngalpha \
          -g"${size}x${size}" -dPDFFitPage \
          -sOutputFile="$png" "$pdf" 2>&1 | trim_stderr
    [ -s "$png" ] && return 0
  fi
  if [ -n "$MAGICK" ]; then
    log_attempt "ImageMagick PDF->PNG"
    "$MAGICK" -density 300 "$pdf" -resize "${size}x${size}" "$png" 2>&1 | trim_stderr
    [ -s "$png" ] && return 0
  fi
  return 1
}

svg_to_png_direct() {
  local svg="$1" png="$2" size="$3"

  if [ -n "$INKSCAPE" ]; then
    log_attempt "Inkscape SVG->PNG direct"
    "$INKSCAPE" "$svg" --export-type=png --export-filename="$png" \
                       -w "$size" -h "$size" 2>&1 | trim_stderr
    [ -s "$png" ] && return 0
  fi

  if [ -n "$RSVG" ]; then
    log_attempt "rsvg-convert SVG->PNG direct"
    "$RSVG" -w "$size" -h "$size" -o "$png" "$svg" 2>&1 | trim_stderr
    [ -s "$png" ] && return 0
  fi

  if [ -n "$MAGICK" ]; then
    # Many ImageMagick Windows builds ship WITHOUT a working SVG delegate.
    # We try a handful of forms and keep the actual stderr visible.
    for pattern_label in "A: flags-before-input" "B: no transparency" "C: explicit svg:/png:" "D: simplest"; do
      log_attempt "ImageMagick $pattern_label"
      case "$pattern_label" in
        "A: flags-before-input")
          "$MAGICK" -density 384 -background transparent "$svg" \
                    -resize "${size}x${size}" "$png" 2>&1 | trim_stderr
          ;;
        "B: no transparency")
          "$MAGICK" -density 384 "$svg" \
                    -resize "${size}x${size}" "$png" 2>&1 | trim_stderr
          ;;
        "C: explicit svg:/png:")
          "$MAGICK" -density 384 "svg:$svg" \
                    -resize "${size}x${size}" "png:$png" 2>&1 | trim_stderr
          ;;
        "D: simplest")
          "$MAGICK" "$svg" "$png" 2>&1 | trim_stderr
          [ -s "$png" ] && "$MAGICK" "$png" -resize "${size}x${size}" "$png" 2>&1 | trim_stderr
          ;;
      esac
      [ -s "$png" ] && return 0
    done
  fi
  return 1
}

# Pure-WASM Node fallback. Bootstraps a tiny package on first run.
# IMPORTANT: directory must NOT start with a dot — npm refuses to init in
# directories whose name begins with "." ("Invalid name").
NODE_HELPER="$OUT/_resvg_helper"
ensure_node_helper() {
  [ -z "$NODE" ] && return 1
  [ -z "$NPM"  ] && return 1
  if [ -d "$NODE_HELPER/node_modules/@resvg/resvg-js" ]; then return 0; fi
  echo "      [Node fallback] bootstrapping @resvg/resvg-js (one-time, ~5 MB)..."
  mkdir -p "$NODE_HELPER"
  # Write a minimal package.json manually so we never depend on `npm init`.
  if [ ! -f "$NODE_HELPER/package.json" ]; then
    cat > "$NODE_HELPER/package.json" <<'PKG'
{
  "name": "swiss-round-calculator-resvg-helper",
  "version": "1.0.0",
  "private": true,
  "description": "Transient helper to rasterise SVG via @resvg/resvg-js"
}
PKG
  fi
  ( cd "$NODE_HELPER" && "$NPM" install --no-audit --no-fund @resvg/resvg-js 2>&1 ) \
    | trim_stderr || true
  [ -d "$NODE_HELPER/node_modules/@resvg/resvg-js" ]
}

# Inline any remote <image href="https://..."> AND CSS @font-face
# url('https://...') references into the SVG so renderers that refuse
# network fetches (ImageMagick, resvg) can still process them.
INLINE_JS="$OUT/_inline_remote.js"
write_inliner_once() {
  [ -f "$INLINE_JS" ] && return 0
  mkdir -p "$(dirname "$INLINE_JS")"
  cat > "$INLINE_JS" <<'JS'
// Inline all remote resources referenced by an SVG:
//   - <image href="https://..."> / xlink:href
//   - CSS @font-face  src: url("https://...")        (and single quotes)
//   - any other CSS   url("https://...")
// Replaces every remote URL with a base64 data: URI in-place.
const fs = require('fs');
const https = require('https');
const http  = require('http');
const file = process.argv[2];
let src = fs.readFileSync(file, 'utf8');

function fetchOnce(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchOnce(new URL(res.headers.location, url).href));
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const bufs = [];
      res.on('data', (c) => bufs.push(c));
      res.on('end', () => resolve({
        buf: Buffer.concat(bufs),
        type: (res.headers['content-type'] || 'application/octet-stream').split(';')[0].trim(),
      }));
    }).on('error', reject);
  });
}

function mimeFor(url, hdrMime) {
  const u = url.toLowerCase();
  if (u.endsWith('.svg'))                                     return 'image/svg+xml';
  if (u.endsWith('.ttf'))                                     return 'font/ttf';
  if (u.endsWith('.otf'))                                     return 'font/otf';
  if (u.endsWith('.woff2'))                                   return 'font/woff2';
  if (u.endsWith('.woff'))                                    return 'font/woff';
  if (u.endsWith('.png'))                                     return 'image/png';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg'))              return 'image/jpeg';
  if (u.endsWith('.webp'))                                    return 'image/webp';
  return hdrMime || 'application/octet-stream';
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function findRemoteUrls(text) {
  const out = new Set();
  for (const re of [
    /(?:href|xlink:href)\s*=\s*"(https?:\/\/[^"]+)"/g,
    /(?:href|xlink:href)\s*=\s*'(https?:\/\/[^']+)'/g,
    /url\(\s*"(https?:\/\/[^"]+)"\s*\)/g,
    /url\(\s*'(https?:\/\/[^']+)'\s*\)/g,
    /url\(\s*(https?:\/\/[^)\s]+)\s*\)/g,
  ]) {
    let m; while ((m = re.exec(text)) !== null) out.add(m[1]);
  }
  return [...out];
}

// Recursively inline an SVG: if the fetched payload is itself an SVG,
// resolve its own remote refs first, so an icon-in-splash with its own
// @font-face URLs still ends up with the fonts as embedded data URIs.
async function inlineText(text, depth, indent) {
  if (depth > 4) return text; // safety
  const remoteUrls = findRemoteUrls(text);
  for (const url of remoteUrls) {
    try {
      const { buf, type } = await fetchOnce(url);
      let mime = mimeFor(url, type);
      let payload = buf;
      if (mime === 'image/svg+xml') {
        // Recurse: resolve THIS sub-SVG's own remote refs first.
        let subText = buf.toString('utf8');
        subText = await inlineText(subText, depth + 1, indent + '  ');
        payload = Buffer.from(subText, 'utf8');
      }
      const dataUri = 'data:' + mime + ';base64,' + payload.toString('base64');
      text = text.replace(new RegExp(escapeRegex(url), 'g'), dataUri);
      console.error(indent + 'inlined', url, '->', payload.length, 'bytes (' + mime + ')');
    } catch (e) {
      console.error(indent + 'failed to inline', url, e.message);
    }
  }
  return text;
}

// After inlining: unwrap every  <image ... href="data:image/svg+xml;base64,...">
// into a real nested  <svg ... > ...inner content... </svg>  so the inner
// SVG's @font-face declarations and text elements become part of the
// outer document tree (resvg-js does not resolve fonts from inside a
// referenced image, but DOES resolve them from nested <svg> blocks).
function unwrapNestedSvgImages(text) {
  // Match the whole self-closing or paired <image .../> element.
  const re = /<image\b([^>]*?)\s(?:href|xlink:href)\s*=\s*"data:image\/svg\+xml;base64,([^"]+)"([^>]*?)\/>/g;
  return text.replace(re, (match, attrsBefore, b64, attrsAfter) => {
    try {
      const inner = Buffer.from(b64, 'base64').toString('utf8');
      // Capture attributes of the inner <svg> root.
      const rootMatch = inner.match(/<svg\b([^>]*)>/i);
      if (!rootMatch) return match;
      const innerAttrs = rootMatch[1];
      // Strip xmlns to avoid duplication, but keep viewBox / preserveAspectRatio.
      const cleanInner = innerAttrs
        .replace(/\sxmlns(:xlink)?\s*=\s*"[^"]*"/g, '')
        .replace(/\swidth\s*=\s*"[^"]*"/g, '')
        .replace(/\sheight\s*=\s*"[^"]*"/g, '');
      // Extract <svg ...>...</svg> body.
      const bodyMatch = inner.match(/<svg\b[^>]*>([\s\S]*)<\/svg>/i);
      if (!bodyMatch) return match;
      const body = bodyMatch[1];
      // Re-emit as an inline <svg> with the outer placement attrs preserved.
      const placement = (attrsBefore + ' ' + attrsAfter).trim();
      return `<svg ${placement} ${cleanInner}>${body}</svg>`;
    } catch (e) {
      console.error('unwrap failed:', e.message);
      return match;
    }
  });
}

(async () => {
  src = await inlineText(src, 0, '');
  const before = src.length;
  src = unwrapNestedSvgImages(src);
  if (src.length !== before) {
    console.error('unwrapped nested SVG <image> elements into inline <svg> blocks');
  }
  fs.writeFileSync(file, src);
})();
JS
}
inline_remote_images() {
  local svg="$1"
  [ -z "$NODE" ] && return 0
  write_inliner_once
  "$NODE" "$INLINE_JS" "$svg" 2>&1
}

# Detect ANY remote URL (image OR font / CSS resource).
has_remote_refs() {
  grep -Eq '(href|xlink:href)\s*=\s*["'\'']https?://|url\(\s*["'\'']?https?://' "$1"
}

svg_to_png_node() {
  local svg="$1" png="$2" size="$3"
  ensure_node_helper || return 1
  log_attempt "Node (@resvg/resvg-js) SVG->PNG"
  # Write the node script to a temp file so heredoc + pipe play nicely.
  local helper_js="$NODE_HELPER/_render.js"
  cat > "$helper_js" <<'JS'
const fs = require('fs');
const [svgPath, pngPath, sizeStr, nm] = process.argv.slice(2);
process.env.NODE_PATH = nm;
require('module').Module._initPaths();
const { Resvg } = require('@resvg/resvg-js');
const svg = fs.readFileSync(svgPath);
const size = parseInt(sizeStr, 10) || 1024;
const r = new Resvg(svg, {
  fitTo: { mode: 'width', value: size },
  background: 'rgba(0,0,0,0)',
  font: { loadSystemFonts: true, defaultFontFamily: 'sans-serif' },
});
const png = r.render().asPng();
fs.writeFileSync(pngPath, png);
console.log('wrote', pngPath, png.length, 'bytes');
JS
  "$NODE" "$helper_js" "$svg" "$png" "$size" "$NODE_HELPER/node_modules" 2>&1 \
    | trim_stderr
  [ -s "$png" ]
}

# ----- main loop -----
OK_COUNT=0
FAIL_COUNT=0
FAILED=()

for i in "${!NAMES[@]}"; do
  name="${NAMES[$i]}"
  url="${URLS[$i]}"
  size="${SIZES[$i]}"
  echo "==> $name ($size px)"

  svg="$SVG_DIR/$name.svg"          # PERSISTENT (kept in workspace)
  pdf="$SVG_DIR/$name.pdf"          # PERSISTENT (kept for debugging)
  png="$OUT/$name-${size}.png"

  # Download (always refresh)
  if curl -sSL --fail -o "$svg" "$url"; then
    sz=$(wc -c < "$svg" 2>/dev/null || echo 0)
    echo "   downloaded SVG ($sz bytes) -> $svg"
  else
    echo "   ! download failed for $url"
    FAILED+=("$name (download)")
    FAIL_COUNT=$((FAIL_COUNT+1))
    continue
  fi

  # Inline any remote <image href="https://..."> AND remote font
  # @font-face url('https://...') references so:
  #   - offline / sandboxed renderers can see the embedded sub-assets
  #   - custom fonts (Lato, Parisienne, Cubic 11, Compact, ...) render
  #     correctly via resvg-js instead of falling back to the renderer's
  #     default font (which stacks every glyph at the origin and makes
  #     text like "Vincent" look like a pile of letters).
  HAS_INLINED=0
  if has_remote_refs "$svg"; then
    log_attempt "inlining remote <image href> and @font-face url() references"
    inline_remote_images "$svg" 2>&1 | trim_stderr
    HAS_INLINED=1
  fi

  rm -f "$png" "$pdf"

  # If we inlined data URIs, ImageMagick's draw/CSS engine can't handle
  # them (especially 30+ KB base64 font payloads). Skip straight to the
  # Inkscape / rsvg / Node fallback paths.
  if [ "$HAS_INLINED" = "1" ]; then
    if [ -n "$INKSCAPE" ] && svg_to_pdf "$svg" "$pdf" && pdf_to_png "$pdf" "$png" "$size"; then
      echo "   OK via PDF intermediary (post-inline) -> $png"
    elif [ -n "$RSVG" ] && svg_to_png_direct "$svg" "$png" "$size"; then
      echo "   OK via rsvg-convert direct (post-inline) -> $png"
    elif svg_to_png_node "$svg" "$png" "$size"; then
      echo "   OK via Node WASM fallback (skipped ImageMagick: inlined data URIs) -> $png"
    else
      echo "   ! ALL conversion paths failed for $name"
      FAILED+=("$name")
      FAIL_COUNT=$((FAIL_COUNT+1))
      continue
    fi
  elif svg_to_pdf "$svg" "$pdf" && pdf_to_png "$pdf" "$png" "$size"; then
    echo "   OK via PDF intermediary -> $png"
  elif svg_to_png_direct "$svg" "$png" "$size"; then
    echo "   OK via direct SVG->PNG -> $png"
  elif svg_to_png_node "$svg" "$png" "$size"; then
    echo "   OK via Node WASM fallback -> $png"
  else
    echo "   ! ALL conversion paths failed for $name"
    FAILED+=("$name")
    FAIL_COUNT=$((FAIL_COUNT+1))
    continue
  fi

  cp "$png" "$OUT/$name.png"
  OK_COUNT=$((OK_COUNT+1))
done

# ----- additionally: copy the app-icon master SVG to web/assets/icons/
# and generate web/favicon.ico from the already-rasterised PNG.  The
# web build references the SVG directly when the browser supports
# image/svg+xml favicons (modern Chrome/Firefox/Edge/Safari 14+), and
# falls back to favicon.ico (multi-resolution 16/32/48/64 px PNG inside
# an .ico container) for older browsers. -----
WEB_ICONS="../web/assets/icons"
WEB_ROOT="../web"
mkdir -p "$WEB_ICONS"

if [ -f "$SVG_DIR/app-icon.svg" ]; then
  cp "$SVG_DIR/app-icon.svg" "$WEB_ICONS/app-icon.svg"
  echo "==> copied app-icon.svg -> $WEB_ICONS/app-icon.svg"
fi

# Multi-resolution favicon.ico from the 1024 PNG, if any tool can do it.
if [ -f "$OUT/app-icon-1024.png" ] || [ -f "$OUT/app-icon.png" ]; then
  src_png="$OUT/app-icon-1024.png"
  [ -f "$src_png" ] || src_png="$OUT/app-icon.png"
  ico="$WEB_ROOT/favicon.ico"
  echo "==> generating $ico from $src_png"

  ICO_OK=0

  # Route A — ImageMagick (preferred; one shot does it all).
  if [ -n "$MAGICK" ]; then
    log_attempt "ImageMagick favicon.ico"
    "$MAGICK" "$src_png" -define icon:auto-resize=64,48,32,16 "$ico" 2>&1 | trim_stderr
    if [ -s "$ico" ]; then ICO_OK=1; echo "   OK via ImageMagick"; fi
  fi

  # Route B — Node + pngjs fallback (bootstrap pngjs into the helper
  # directory automatically; no manual `npm install` needed).
  if [ "$ICO_OK" = "0" ] && [ -n "$NODE" ] && [ -n "$NPM" ]; then
    log_attempt "Node + pngjs favicon.ico"
    ensure_node_helper || true
    if [ ! -d "$NODE_HELPER/node_modules/pngjs" ]; then
      ( cd "$NODE_HELPER" && "$NPM" install --no-audit --no-fund --silent pngjs 2>&1 ) \
        | trim_stderr || true
    fi
    if [ -d "$NODE_HELPER/node_modules/pngjs" ]; then
      ico_helper="$NODE_HELPER/_favicon.js"
      cat > "$ico_helper" <<'JS'
const fs = require('fs');
const [srcPath, dst, nm] = process.argv.slice(2);
process.env.NODE_PATH = nm;
require('module').Module._initPaths();
const { PNG } = require('pngjs');
const src = PNG.sync.read(fs.readFileSync(srcPath));
const sizes = [16, 32, 48, 64];
const images = sizes.map((sz) => {
  const out = new PNG({ width: sz, height: sz });
  // Box-filter downscale: sample every src pixel that maps to (x,y)
  // and average. Slow for big sources but only runs once per build.
  const sx = src.width / sz, sy = src.height / sz;
  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      let r=0,g=0,b=0,a=0,n=0;
      const x0 = Math.floor(x*sx), x1 = Math.min(src.width,  Math.ceil((x+1)*sx));
      const y0 = Math.floor(y*sy), y1 = Math.min(src.height, Math.ceil((y+1)*sy));
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const si = (py * src.width + px) * 4;
          r += src.data[si]; g += src.data[si+1]; b += src.data[si+2]; a += src.data[si+3];
          n++;
        }
      }
      const di = (y * sz + x) * 4;
      out.data[di]   = (r/n)|0;
      out.data[di+1] = (g/n)|0;
      out.data[di+2] = (b/n)|0;
      out.data[di+3] = (a/n)|0;
    }
  }
  return { sz, buf: PNG.sync.write(out) };
});
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
const dir = Buffer.alloc(16 * images.length);
let offset = 6 + dir.length;
images.forEach((img, i) => {
  dir.writeUInt8(img.sz === 256 ? 0 : img.sz, i*16 + 0);
  dir.writeUInt8(img.sz === 256 ? 0 : img.sz, i*16 + 1);
  dir.writeUInt8(0, i*16 + 2);
  dir.writeUInt8(0, i*16 + 3);
  dir.writeUInt16LE(1, i*16 + 4);
  dir.writeUInt16LE(32, i*16 + 6);
  dir.writeUInt32LE(img.buf.length, i*16 + 8);
  dir.writeUInt32LE(offset, i*16 + 12);
  offset += img.buf.length;
});
fs.writeFileSync(dst, Buffer.concat([header, dir, ...images.map(i => i.buf)]));
console.log('wrote', dst, fs.statSync(dst).size, 'bytes');
JS
      "$NODE" "$ico_helper" "$src_png" "$ico" "$NODE_HELPER/node_modules" 2>&1 \
        | trim_stderr
      if [ -s "$ico" ]; then ICO_OK=1; echo "   OK via Node + pngjs"; fi
    fi
  fi

  if [ "$ICO_OK" = "1" ]; then
    echo "   $ico ($(wc -c < "$ico") bytes)"
  else
    echo "   ! favicon.ico not regenerated; keeping existing file (if any)."
    echo "     Install ImageMagick:  https://imagemagick.org/script/download.php"
    echo "     (Node fallback failed — pngjs install may have been blocked.)"
  fi
fi

echo
echo "================================================================"
echo "  Generated : $OK_COUNT / ${#NAMES[@]}"
echo "  SVG masters kept in: $SVG_DIR/"
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "  Failed    : $FAIL_COUNT"
  echo "    -> ${FAILED[*]}"
  cat <<EOF

  The SVG masters were downloaded successfully into $SVG_DIR/ even though
  rasterisation failed. To finish the job manually pick ONE of these:

  (a) Install Inkscape (recommended; ~150 MB):
        https://inkscape.org/release/
      Then re-run:   bash mobile/scripts/generate-assets.sh

  (b) Install librsvg / rsvg-convert:
        macOS:    brew install librsvg
        MSYS2:    pacman -S mingw-w64-x86_64-librsvg
      Then re-run:   bash mobile/scripts/generate-assets.sh

  (c) Use Node.js (pure WASM, no system deps):
        Install Node.js: https://nodejs.org/en/download
        Then re-run:   bash mobile/scripts/generate-assets.sh
      The script will npm-install @resvg/resvg-js on first run.

  (d) Open each SVG in $SVG_DIR/ with any SVG editor and Export PNG:
        - app-icon.svg               -> 1024x1024 -> assets/images/app-icon.png
        - splash-*.svg               -> 2732x2732 -> assets/images/<same name>.png
EOF
fi
echo "================================================================"

exit 0
