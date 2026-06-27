# Bundled fonts

These TTF files **must be present** for the page to render with the
intended typography. They are licence-restricted, so check the licence
files distributed alongside the original masters on GitHub before
redistributing.

| File                  | Family in CSS         | Source                                                                                                                                       |
|-----------------------|-----------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `ChironSungHK.ttf`    | `Chiron Sung HK`      | https://raw.githubusercontent.com/Vviinncceenntt/swiss-round-calculator/main/chironsunghk-r.ttf                                              |
| `ChironHeiHK.ttf`     | `Chiron Hei HK`       | https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/chiron-hei-hk-2609/chironheihk-r.ttf                                             |
| `ChironGoRoundTC.ttf` | `Chiron GoRound TC`   | https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/chiron-go-round-tc-1011/chirongoroundtc-400r.ttf                                 |
| `ThePeakFontPlus.ttf` | `The Peak Font Plus`  | https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/thepeakfontplus-v1-002/thepeakfontplus-regular.ttf                               |

## Populate the TTFs

```bash
cd web/assets/fonts
curl -L -o ChironSungHK.ttf      "https://raw.githubusercontent.com/Vviinncceenntt/swiss-round-calculator/main/chironsunghk-r.ttf"
curl -L -o ChironHeiHK.ttf       "https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/chiron-hei-hk-2609/chironheihk-r.ttf"
curl -L -o ChironGoRoundTC.ttf   "https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/chiron-go-round-tc-1011/chirongoroundtc-400r.ttf"
curl -L -o ThePeakFontPlus.ttf   "https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/thepeakfontplus-v1-002/thepeakfontplus-regular.ttf"
```

## Why TTF and not WOFF/WOFF2?

TTF is chosen deliberately so that **the exact same font file** can be:

1. Loaded by browsers via `@font-face` (web build).
2. Bundled into the React Native app via `require('./X.ttf')`.
3. Embedded into SVG masters (app icon, splash screens) for pixel-perfect
   rasterisation by any SVG processor (Inkscape, resvg-js, ImageMagick).

WOFF / WOFF2 are smaller but not universally recognised by SVG
processors, so using them would split the typography pipeline.

## Why `font-display: block`?

`fonts.css` uses `font-display: block` (not `swap`). With `swap`, the
browser paints text in a fallback system font first and then "swaps" to
the custom font when it arrives — which can produce a layout shift and,
on some browsers, occasionally never swap if loading was cancelled.
`block` waits up to ~3 seconds for the TTF to download before painting
text at all. The trade-off: a brief delay on first paint over a slow
LAN, in exchange for **guaranteed correct typography every time**.

This matches the behaviour of the upstream GitHub Pages
(e.g. <https://vviinncceenntt.github.io/wongssystem.html>).

## Serving the site locally with correct MIME types

Python's built-in `http.server` reports `application/octet-stream` for
`.ttf`, which Safari refuses to decode as a font. Use the project's
wrapper:

```bash
cd web
python serve.py             # http://0.0.0.0:8765
# or with a custom port:
python serve.py 9000
```

`serve.py` registers `font/ttf` correctly, forces IPv4 binding
(Python 3.14 defaults to IPv6-only on Windows, which iPhones on the
same Wi-Fi cannot reach via `192.168.x.x`), and adds CORS headers.
