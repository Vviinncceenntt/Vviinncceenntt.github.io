/**
 * Helpers for embedded WebView pages.
 *
 *  - INJECTED_DARK / INJECTED_LIGHT: tiny <style> tag for dark / light
 *    theme. We do NOT touch font-family — the page's own style.css
 *    declares the family and applies it to <body>.
 *  - PEAK_FONT_FIX: a corrected @font-face declaration for
 *    "The Peak Font Plus", added because the upstream
 *    https://vviinncceenntt.github.io/style.css uses
 *      src: url('thepeakfontplus-regular.ttf') format('ttf');
 *    where the W3C spec requires format('truetype'). Some WebView
 *    engines silently drop the @font-face when the format hint is
 *    unknown. Re-declaring the rule with the correct hint pointing at
 *    the SAME remote file means we add ~0 KB to the JS bundle and the
 *    font loads. (Best fix is also to correct the upstream style.css —
 *    but the app stays robust either way.)
 */
export const INJECTED_DARK = `
(function () {
  try {
    var id = '__src_dark__';
    if (document.getElementById(id)) return true;
    var s = document.createElement('style');
    s.id = id;
    s.textContent = [
      'html, body { background:#111 !important; color:#EEE !important; }',
      'a { color:#9CC7FF !important; }',
      'h1,h2,h3,h4,h5,h6, p, li, td, th, span, div, em, strong { color:#EEE !important; }',
      'code, pre { background:#222 !important; color:#EEE !important; }',
      'table, th, td { border-color:#444 !important; }',
      'blockquote { color:#CCC !important; border-color:#444 !important; }',
      'iframe { background:#111 !important; filter: invert(1) hue-rotate(180deg); }'
    ].join('\\n');
    (document.head || document.documentElement).appendChild(s);
    return true;
  } catch (e) { return false; }
})();
true;
`;

export const INJECTED_LIGHT = `
(function () {
  var s = document.getElementById('__src_dark__');
  if (s && s.parentNode) s.parentNode.removeChild(s);
  return true;
})();
true;
`;

/**
 * Text-rendering normaliser for embedded pages.
 *
 * The mobile WebView (especially on iOS) sometimes renders inline
 * <sub> / <sup> / vertical-align'd inline elements with an uneven
 * baseline — letters of words like "max", "min", "BinomInv", "prob"
 * appear at different heights ("bumpy"). The root cause is that the
 * page's CSS often uses `vertical-align: super/sub` plus a smaller
 * `font-size` on inline children, and WebKit on iOS recalculates the
 * line-box height per-glyph instead of per-line.
 *
 * The fix below forces:
 *   1. A consistent `line-height` on the body so the line box is
 *      determined by the largest element on the line, not per-glyph.
 *   2. `vertical-align: baseline` on plain inline <span>s that
 *      shouldn't be raised (we still leave true <sub>/<sup> alone).
 *   3. Disables font-feature-settings that some MathJax fonts use to
 *      shift glyphs vertically.
 */
export const TEXT_RENDER_FIX = `
(function () {
  try {
    var id = '__src_text_render__';
    if (document.getElementById(id)) return true;
    var s = document.createElement('style');
    s.id = id;
    s.textContent = [
      'html, body { -webkit-text-size-adjust: 100% !important; }',
      'body { line-height: 1.55 !important; }',
      /* Normalise inline text — letters share the same baseline. */
      'p, li, td, th, div, span, em, strong, b, i { vertical-align: baseline; }',
      /* MathJax / pseudo-formula spans sometimes use font-feature-settings
       * for vertical positioning; disable that. */
      'span, em, strong, b, i, code { font-feature-settings: normal !important; font-variant-position: normal !important; }',
      /* Preserve genuine sub/sup but render them as proper subscripts
       * with stable positions. */
      'sub { vertical-align: sub; font-size: 0.75em; line-height: 0; }',
      'sup { vertical-align: super; font-size: 0.75em; line-height: 0; }',
    ].join('\\n');
    (document.head || document.documentElement).appendChild(s);
    return true;
  } catch (e) { return false; }
})();
true;
`;

/**
 * Re-declare "The Peak Font Plus" with a spec-compliant format hint.
 * Safe to inject into any page (only adds a single <style> tag) and
 * harmless on pages that don't use the family.
 */
export const PEAK_FONT_FIX = `
(function () {
  try {
    var id = '__src_peak_font__';
    if (document.getElementById(id)) return true;
    var s = document.createElement('style');
    s.id = id;
    s.textContent =
      "@font-face{font-family:'The Peak Font Plus';" +
      "src:url('https://vviinncceenntt.github.io/thepeakfontplus-regular.ttf') format('truetype');" +
      "font-display:block;}";
    (document.head || document.documentElement).appendChild(s);
    return true;
  } catch (e) { return false; }
})();
true;
`;


