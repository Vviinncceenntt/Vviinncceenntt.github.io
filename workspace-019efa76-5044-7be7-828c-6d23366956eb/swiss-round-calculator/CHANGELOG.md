# Changelog

All notable changes to this project are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.18] – 2026-06-22

### Changed — text colour & weight consistency
- **English text everywhere is now full text colour, not soft-grey.**
  Web: `.label .en`, `.label .sym`, `.tabs button .en`,
  `.set-row .label-bi .en`, `.toggle-block .opt .en`,
  `.orient-block .legend .row .en`, footnote, en-only banner — all
  switched from `var(--text-soft)` to `var(--text)`.
  Mobile: settings `BiOpt`, `OrientTriangle` legend, `Section.js`
  description prop, dashboard footnote — all switched from
  `theme.textSoft` to `theme.text`.
  Effect: dark-gray English in light mode and light-gray English in
  dark mode are gone; both languages now render at the same intensity.
- **English font sizes raised** to within ~1 px of the Chinese line so
  the two languages read as one bilingual unit, not as a primary +
  secondary caption pair.
- **Sub-symbol notation `(n)`, `(p)`, `(d)`, `(r)`, `(Rmin - Rmax)`,
  `(ERmin - ERmax)`, `(LmaxRmin - LmaxRmax)`, `(Nmin - Nmax)`,
  `(LmaxNmin - Lmax - LmaxNmax)` now sits BELOW the English text**,
  on its own line. Web: removed the inline `<span class="sym">`
  inside `.label .en`; mobile: rewrote `FieldRow` to render the
  symbol in its own `<Text>` / `<SymRange>` row.

### Changed — section title weight
- **No section title is bold any more, except "Swiss Round
  Calculator".** Web `.subtitle` and inner `.zh/.en` now use
  `font-weight: 400`. Modal header titles also at `400`. Mobile:
  added `weight` prop on `<BiText/>` (default `'400'`) and applied
  `weight="700"` only on the app title in `DashboardScreen.js` and
  `OnboardingScreen.js`.

### Changed — matrix highlight cells
- **Numbers in red/blue highlighted columns are NO longer bold.**
  Web `td.hi-player / .hi-range / .hi-both` and mobile
  `MatrixTable.js` body cell text now both use `fontWeight: 400`.
- **Number colour: white in light mode, BEIGE (#F5F5DC) in dark
  mode.** Web `--grad-player-num` / `--grad-range-num` swap colour
  on `[data-theme="dark"]`; mobile `themes.js` DARK palette sets
  `gradPlayerNumber / gradRangeNumber` to `'#F5F5DC'`.

### Changed — buttons
- **Reset Parameters (web + mobile) and Manage Subscription (mobile)
  buttons** now use the same primary blue as Restore Purchase. All
  Settings action buttons line up visually.

### Changed — modal headers
- **Menu titles are now horizontally centred on the FULL modal
  width**, not on "modal width minus close button". Mobile: the
  title block is `width:100%` and the close button is layered on top
  via `position: absolute`. Web: same — `.modal header .titles` is
  `width: 100%; text-align: center;` and the close button overlays.

### Changed — bottom navigation active state on web
- **Web nav buttons now tint to primary blue when their menu is open**
  (label colour + icon colour, matching the React-Native build). The
  active class is toggled in `js/app.js` on tap and cleared when the
  modal closes. Icon tint applied via a multi-stage CSS `filter`
  chain that re-colours a black silhouette to the primary blue
  regardless of the original SVG fill.

### Added — text-render normaliser
- **`TEXT_RENDER_FIX`** injection for every WebView menu (Functions,
  Legal, Wong system). The Functions page on iOS WebView was
  rendering "max", "min", "BinomInv", "prob" with bumpy letters
  because the source page's inline `<sub>` / `<sup>` elements re-
  computed line-box height per-glyph on WebKit. The injection sets a
  consistent `line-height` on `body`, forces `vertical-align:
  baseline` on regular inline elements (leaves true `<sub>/<sup>`
  alone), and disables `font-feature-settings` so MathJax fonts
  don't shift glyphs vertically. Web build is unaffected (Chrome /
  Safari desktop handle this correctly natively).

### Reviewed
- Audited every earlier `textSoft` / `--text-soft` use that was
  carrying primary content (English labels, settings rows, legend
  rows, tabs) and converted them to full `text` colour. Only kept
  `--text-soft` (LIGHT `#444`, DARK `#DDD`) for genuinely secondary
  content: the offline timestamp on onboarding and the small footnote
  on the bottom of the legacy README.

## [1.0.17] – 2026-06-22

### Fixed
- **Legal nav icon was blank on mobile.** The error-boundary fallback
  added in v1.0.16 could not catch `SvgXml`'s SILENT failure to
  render `p-writing.svg` (89 KB with ~12 radial gradients + alpha
  masks); React only catches thrown render errors, not 0×0 outputs.
  Now mobile uses `privacy-document-icon.svg` deterministically
  (matching the user's "use it as fallback when p-writing cannot
  work" requirement). Web continues to use the original
  `p-writing.svg` since browsers handle the gradients natively.
- **Subscripts mis-aligned on mobile** (last subs looked centred while
  the first floated to the top). The v1.0.16 flex-row + `marginTop`
  layout couldn't enforce a true baseline. Rewrote `SubSym.js` to
  render the WHOLE notation as one outer `<Text>` with nested smaller
  `<Text>` children — React-Native's inline text nesting aligns every
  child on the SAME baseline naturally, so smaller fonts (subs)
  appear lower than the larger base character with no manual
  margins. Matches the web `<sub>…</sub>` nesting one-to-one.
- **Section 5 ("備註：" / "Note:") now left-aligned.** Added a new
  `titleAlign` prop on `<Section/>` (default `'center'`) and a
  matching `.subtitle.note-title` CSS rule on the web build. Restores
  the alignment specified in the original brief.
- **English text in matrix first column is now visible** on both
  builds. Was `color: var(--text-soft)` (too dim on the buff / beige
  table background); now both lines use the full `--table-text`
  colour with `font-weight: 500` and slightly larger English (11 px
  on mobile, up from 10).

### Documentation
- Updated every markdown file: README, TODO, CHANGELOG,
  docs/architecture-v1.md, FAVICON.md, mobile/scripts/README.md and
  the two fonts/README.md files. Now reflects the SDK 54 + worklets
  + PagerView + favicon-automation pipeline accurately, plus the
  v1.0.17 fixes.

## [1.0.16] – 2026-06-22

### Fixed
- **`<p>` placeholder not interpolated in Section-3 Tolerable Maximum
  Losses on mobile.** The English description includes "top &lt;p&gt; for
  the respective input &lt;n&gt; players …" but the dashboard only
  substituted `<n>` and `<r>`. Added the missing `<p>` replacement
  (using `pCappedByN(p, n)` to match Section-2's behaviour). Web was
  unaffected because its `interp()` helper already handles all three.
- **Bottom-nav icons rendered black in dark mode on mobile.** Most of
  the source SVGs (`formula-fx-icon.svg`, `privacy-document-icon.svg`)
  have NO explicit `fill` attribute on their `<path>` elements, so
  SVG falls back to black — but my recolour helper only replaced
  explicit `fill="#000"` strings. Rewritten as `tintIcon()`:
    1. Replaces explicit black fills/strokes with `currentColor`.
    2. Adds `fill="currentColor"` and `color="<themeColor>"` to the
       root `<svg>` so every shape that has no explicit fill inherits
       the active nav text colour (resolved via CSS currentColor).
    3. Leaves non-black explicit fills (e.g. the gear's `#72a7cf`)
       untouched.
  Now the formula `fx` glyph follows the theme and the
  privacy-document-icon's shield faces (white-left, black-right) both
  invert correctly in dark mode.
- **Subscripts disappeared on mobile but worked on web.** The
  earlier `<SubSym>` used `transform: [{ translateY: 4 }]` on inner
  `<Text>` elements — RN's `<Text>` silently rejects `transform`, so
  subs rendered at the baseline (looking like plain "Rmin"). Rewrote
  the renderer to lay everything out in a flex row of independent
  `<Text>` nodes with smaller fontSize + `marginTop` lowering the
  subs. Supports double-subscript chains (`E_{R_{min}}`,
  `L_{max_{R_{min}}}`) and respects `includeFontPadding: false` on
  Android so the rendered glyph metrics match the web build.

### Restored
- **`p-writing.svg` for both web and mobile builds.** Re-downloaded
  the original 89 KB icon to `assets/icons/` and `web/assets/icons/`.
  Web uses it directly. Mobile uses it as the primary Legal icon and
  falls back to `privacy-document-icon.svg` via an `IconBoundary`
  React error boundary if `SvgXml` cannot parse the heavy radial-
  gradient defs.

### Tidied
- **Skip RevenueCat in Expo Go entirely.** `Constants.appOwnership
  === 'expo'` short-circuits the `require('react-native-purchases')`
  so the "Invalid API key. The native store is not available when
  running inside Expo Go" log line no longer appears. The app's
  subscription flow still works in EAS dev / production builds.
- Removed an unused `config` import from `OnboardingScreen.js`.

## [1.0.15] – 2026-06-22

### Fixed
- **`App.js` parse error: "Unexpected token, expected ','" at line 38.**
  The v1.0.13 safe-area block placed a JSX comment `{/* … */}` as the
  FIRST item inside `return ( … )`, BEFORE the `<SafeAreaView>` root.
  JSX requires the return expression to begin with a single JSX
  element; a sibling expression (including `{…}` comments) is a syntax
  error. Moved the explanatory text to ordinary `//` comments **above**
  the `return` and kept the SafeAreaView as the only root expression.
- Audited every JSX/JS file in `mobile/` + `web/` with `@babel/parser`
  (full JSX plugin) — all 28 files now parse cleanly. No other broken
  JSX comments, stray imports, or syntax issues remain.
- Removed an unused `config` import from `OnboardingScreen.js` (left
  behind by v1.0.12 refactor; harmless but tidied).

## [1.0.14] – 2026-06-22

### Fixed
- **iOS bundling failed: "Cannot find module 'react-native-worklets/plugin'".**
  Reanimated 4 moved its babel plugin into the separate
  `react-native-worklets` package (in v3 it was bundled inside
  `react-native-reanimated/plugin`, which still loads but immediately
  requires `react-native-worklets/plugin` at the top of its index).
  Added `"react-native-worklets": "0.5.1"` to `package.json` (the
  version SDK 54 pins in `bundledNativeModules.json`) and changed
  `babel.config.js` to use `react-native-worklets/plugin` directly.
- **Expo Go safety**: `DashboardScreen.js` now detects
  `Constants.appOwnership === 'expo'` and skips loading the native
  `react-native-pager-view` entirely. Earlier code only guarded a
  failing `require()`, but in Expo Go the JS module of PagerView
  loads — only the native view mount crashes. Now Expo Go cleanly
  falls back to the vertical ScrollView; native swipe is restored
  the moment you run an EAS dev/prod build.

### Documentation
- **README.md** rewritten with the SDK 54 dependency matrix, the
  three preview/build paths (web / Expo Go / EAS dev-client), and the
  new feature list (frozen first column, PagerView swipe, knob-wide
  trough, full safe-area padding, …).
- **TODO.md** rewritten — pre-release checklist now reflects the
  comment-date-driven cache, the favicon automation, and the EAS
  dev-client step. Nice-to-have section trimmed to actual outstanding
  items (PagerView itself is no longer outstanding).
- **`docs/architecture-v1.md`** updated to v1.0.14 layout: lists the
  new modules (`lipsum.js`, `OrientTriangle.js` rebuild,
  `webviewDarkMode.js` exports), the SDK 54 dependency matrix
  including `react-native-worklets`, the new HTML-comment date
  format, and the Expo-Go fallback notes.

## [1.0.13] – 2026-06-22

### Added
- **New bottom-nav Legal icon: `privacy-document-icon.svg`** (~2 KB,
  single fill-rule path) replaces the 89 KB `p-writing.svg` which had
  too many radial gradients to render reliably in `<SvgXml/>`. The
  dummy document-+-pencil fallback added in v1.0.12 is gone; the
  Legal nav button now uses the real icon on both web and native.

### Native dependencies added (require an EAS dev build to use)
- **`react-native-pager-view`** `6.9.1` — true native paging widget.
- **`react-native-gesture-handler`** `~2.28.0` — coexists with inner
  ScrollViews so slow drag = inner scroll, fast flick = page change.
- **`react-native-reanimated`** `~4.1.1` — required by gesture-handler
  for worklet-driven animations.
- **`react-native-screens`** `~4.16.0` — required peer.
- `babel.config.js` updated to include the `react-native-reanimated/plugin`.
- `App.js` wrapped in `<GestureHandlerRootView>` and `'react-native-gesture-handler'`
  side-effect import added at the top.

### Fixed — UI
- **PagerView swipe replaces FlatList paging.** Sections now snap
  cleanly via native gesture handling: vertical swipe in landscape
  (up/down through Title → S1 → … → Footnote), horizontal swipe in
  portrait. Inner ScrollViews scroll naturally on slow pan; only a
  fast flick crosses the page boundary. Falls back to a single
  scrolling list inside Expo Go where PagerView's native module is
  unavailable.
- **Matrix Tableau first column is now truly frozen.** The frozen
  header column lives OUTSIDE the horizontal scroll container so it
  stays put while body cells scroll. No nested vertical scroll
  competing with PagerView either.
- **Matrix Tableau subtitle is now a tooltip on the title** (no
  permanent on-screen "Varies with Top (p=…) Placements" text).
  `<Section/>` accepts new `titleTipZh` / `titleTipEn` props that
  wrap the title in a `<TipAnchor/>`.
- **Triangle slider trough is now as wide as the knob.** SVG uses two
  stacked polygons — a wide capsule-shaped fill (knob diameter) plus a
  thin edge outline on top. Matches the rectangular theme toggle's
  trough-with-knob look.
- **Safe-area padding on every edge.** `App.js`'s SafeAreaView now
  uses `edges=['top','left','right']`; `Modal.js` reads
  `useSafeAreaInsets()` and pads the scrim accordingly so menu
  contents never slip under the iPhone notch in either orientation.
  Dashboard pages get horizontal padding inside each ScrollView too.

### Fixed — `generate-assets.sh` favicon route
- **`web/favicon.ico` is now reliably overwritten on every run.** The
  earlier ImageMagick OR Node fallback chain had two bugs:
    1. The Node heredoc redirected stderr BEFORE the heredoc opened,
       so the JS body was consumed by bash rather than fed to Node.
    2. The Node helper required `pngjs` to be installed manually.
  Rewritten so Node auto-installs `pngjs` into the existing
  `_resvg_helper` bootstrap directory the first time it runs, and the
  helper script is written to a real file (`_favicon.js`) before being
  invoked. Verified end-to-end: produces a 32 KB multi-resolution ICO
  containing 16/32/48/64 px PNG images.

### Fixed — caches
- **`parseUpdatedDate()` now recognises the new HTML-comment format.**
  Primary pattern is `<!-- … last modified on YYYY-MM-DD -->` (the
  format you appended to every linked page). Legacy body-text
  patterns ("Last updated on 25th May, 2026", Chinese 更新日期) still
  work as a fallback.
- **All six page caches now use the conditional `hasDate: true`
  refresh** since every linked page (PP, EULA, T&C, Disclaimer,
  Functions, Wong system) carries the comment.

### Removed
- The 89 KB `p-writing.svg` file from both `mobile/assets/icons/`
  and `web/assets/icons/`.
- The dummy `LEGAL_FALLBACK` SVG component from `BottomNav.js` — no
  longer needed now that the real privacy-document icon is small
  enough for `<SvgXml/>`.

## [1.0.12] – 2026-06-18

### Fixed — crashes & deprecations
- **Modal opens in landscape no longer crash the app.** RN's built-in
  `<Modal>` defaults `supportedOrientations` to the launch orientation
  only; opening a menu while locked to landscape-left was throwing
  `UIApplicationInvalidInterfaceOrientation`. Now passes
  `supportedOrientations={['portrait','landscape','landscape-left']}`.
- **`SafeAreaView` import migrated** from `react-native` (deprecated)
  to `react-native-safe-area-context` in `Modal.js`.
- **`expo-file-system` deprecation warnings silenced** by switching
  all imports to the explicit legacy entry point
  `'expo-file-system/legacy'`.

### Fixed — UI / behaviour
- **Triangular orientation slider is now a real single-knob slider.**
  Rewrote `OrientTriangle.js`: white-disc knob (matches the theme
  toggle style) drags along the triangle perimeter via `PanResponder`,
  snaps to nearest vertex on release. Tap any letter (A/L/P) to jump.
- **MatrixTable column gradient.** Replaced per-cell gradients (which
  over-saturated the middle rows) with ONE column-spanning
  `<LinearGradient>` per highlighted column. Player-N and N-range
  gradients now interpolate smoothly from top to bottom across all
  4 rows, faithful to the spec.
- **Player Range header row no longer has an improvised description.**
  Spec says the label is self-explanatory; both web and RN now omit
  the tooltip on that single row only.
- **Footer's second `黃汶聰` is now also underlined on RN.** The
  `withUnderline` helper iterated only the first occurrence; rewritten
  to underline every match.
- **Keyboard input cannot bypass min/max any more.** Both
  `NumberField.js` (RN) and `makeInput` (web) now strip leading
  zeros, clamp to `max` on every keystroke, enforce `min` on blur,
  and cap `maxLength` to `String(max).length` so "999999" past a
  5001 max becomes impossible to type. Prevents Infinity / negative /
  decimal-looking output.
- **Orientation rotation preserves current section.** Dashboard
  captures the page index on `onMomentumScrollEnd` and re-applies it
  via `initialScrollIndex` + `getItemLayout` after the FlatList is
  re-keyed for the new swipe axis.
- **Bottom-nav Legal icon now visible on RN.** The 89 KB
  `p-writing.svg` defeats `react-native-svg`'s `SvgXml` parser; we now
  render a simple document-with-pencil fallback for the Legal slot on
  mobile. Web continues to use the original SVG via `<img>`.
- **Wong system menu now renders in The Peak Font Plus.** Injected a
  corrected `@font-face` declaration into the WebView (the upstream
  `style.css` writes `format('ttf')` instead of `format('truetype')`,
  which some WebView engines reject silently). Adds zero bundle bytes
  — just re-declares the same remote TTF with the spec-compliant hint.

### Added — fallbacks and caching
- **`src/constants/lipsum.js`** — last-resort bilingual placeholder
  HTML for every menu, shown only when **both** the live URL is
  unreachable AND no local cache exists yet (fresh install opened
  offline). The lipsum payload includes a clear warning banner.
- **RevenueCat 3-tier price cache.** New `getAnnualPriceLabel()` in
  `utils/revenuecat.js` returns `{ priceString, source }` where
  `source` is `'live' | 'cache' | 'fallback'`. Live prices are cached
  in AsyncStorage on every successful fetch. The Paywall now reads
  from the helper instead of hard-coding "HKD 30"; the base price is
  used only when there is no cache AND no network (extremely rare).
- **`warmRevenueCat()`** fires during onboarding alongside `warmCache()`
  so the Paywall opens instantly with the latest price.

### Added — tooling / favicon automation
- **`mobile/scripts/generate-assets.sh`** now also:
  - copies the app-icon master SVG to `web/assets/icons/app-icon.svg`
    so modern browsers can use it as the favicon directly;
  - generates `web/favicon.ico` (multi-resolution 16/32/48/64 PNG
    container) from `app-icon-1024.png` using ImageMagick when
    available, else via a built-in Node + `pngjs` fallback.
- **`web/index.html`** declares both the SVG favicon (modern
  browsers, Apple touch icon) and the `.ico` (legacy fallback).
- **`web/FAVICON.md`** rewritten with clearer ImageMagick install
  instructions and a Node-based alternative.

### Documentation
- **`docs/architecture-v1.md`** comprehensively updated to reflect
  every component change made through the v1.0.x patch series.

## [1.0.11] – 2026-06-18

### Changed (after user-reminded design decision)
- **Reverted v1.0.10 font injection.** Earlier alpha/beta versions
  tried both "Get element + restyle" (caused font bouncing — sometimes
  the source font, sometimes the injected one) and base64 font
  injection (made the JS bundle too big to transfer over Expo Go,
  causing tunnel timeouts). The proven-stable approach is to point an
  iframe / WebView at the live URL and let the source page's own
  `style.css` (e.g. https://vviinncceenntt.github.io/style.css)
  supply every `@font-face`. That is now the only approach again.
- **`mobile/src/utils/loadFontBase64.js` removed** — no longer needed.
- **`injectFont()` removed from `webviewDarkMode.js`** — only dark/light
  CSS injection remains.
- **`web/js/app.js` Wong system menu** reverted to a simple `<iframe
  src="...wongssystem.html">`. The page's own CSS supplies The Peak
  Font Plus correctly.

### Refined
- **`pageCache.js`** now distinguishes two refresh policies:
  - `hasDate: true` (Legal docs) — compare the parsed "last updated
    on <date>" line, only overwrite when the remote is strictly newer.
    Conservative; keeps the cache stable.
  - `hasDate: false` (Functions, Wong system) — unconditionally
    overwrite after every successful fetch. These pages have no date
    line and change rarely, so the cost is negligible and we always
    have the latest available offline copy.
- **Menus are online-first, cache-fallback.** Each menu calls
  `NetInfo.fetch()` first; when online the WebView loads the canonical
  GitHub Pages URL directly (so layout, fonts and any embedded scripts
  match the source exactly), and `refreshCache()` runs in the
  background. When offline the WebView loads the local `file://` URI.
  If there is no cache yet AND no network, the WebView shows its
  native "no internet" page (rather than a misleading hand-written
  fallback).

### Acknowledged
- Confirmed the source pages
  https://vviinncceenntt.github.io/swiss-round-calculator/style.css
  and https://vviinncceenntt.github.io/style.css already declare every
  needed `@font-face` (Chiron Sung HK for the calculator/legal pages,
  The Peak Font Plus for the Wong system page), so no app-side font
  manipulation is necessary or desirable.

## [1.0.10] – 2026-06-18

### Removed
- **Deleted `mobile/assets/html/functions.html.js`** and the
  improvised offline-fallback HTML it contained. The spec calls for
  caching the live GitHub Pages content, not for hand-written
  placeholder text in a different writing style. The cache is now the
  fallback.

### Added
- **`mobile/src/utils/pageCache.js`** — online-first HTML cache used by
  Functions / Legal (PP + EULA + T&C + Disclaimer) / Wong system menus.
  - On every menu open we attempt a background refresh of the remote URL.
  - `parseUpdatedDate()` extracts the "last updated on …" line
    (supports `25th May, 2026`, `May 25, 2026`, `2026-05-25`, and
    the Chinese `更新日期：2026年5月25日` variant).
  - If the remote date is strictly newer than the cached date — or
    either date is unparseable — the cache is overwritten.
  - Cache lives in `FileSystem.documentDirectory + "pageCache/"` with
    a sidecar `.meta.json` per entry. WebViews load the cached file
    via a `file://` URI.
- **`mobile/src/utils/loadFontBase64.js`** — reads a bundled TTF asset
  via `expo-asset` + `expo-file-system` and returns it as a base64
  string. Cached per-asset so each font is encoded once per session.
- **`injectFont(family, base64Ttf, selector)`** in
  `webviewDarkMode.js` — returns JS that registers an `@font-face`
  inside a WebView from the bundled TTF, so even a remote source that
  forgets to declare the font (e.g. Wong system page) renders with the
  correct typeface.

### Changed
- **Functions / Legal / Wong system menus** all rewritten:
  - Native WebViews load `file://` cached HTML; refresh runs in the
    background on every open.
  - Web iframes still hit the remote URL directly (browsers cache
    those naturally), with the dark-mode `invert(1)` filter applied
    against a `#FFFFFF` background (fixed in v1.0.8).
- **Wong system menu** now also injects The Peak Font Plus from the
  bundled TTF — fixes the missing custom font reported on iPhone.
- **Web build of Wong system menu** fetches the page and inlines its
  `<body>` content into a styled `<div>` (rather than iframing), so the
  parent stylesheet's `@font-face` for The Peak Font Plus applies. If
  the fetch is blocked by CORS the code falls back to an iframe (same
  behaviour as before).
- **Onboarding screen** warms all six caches as soon as the user taps
  "I Accept", so menus open instantly from local storage.

### Tooling fixes
- **`mobile/.npmrc`**: added `prefer-offline=true` so `npx expo …`
  no longer silently downloads `expo@latest` (currently SDK 56, which
  Expo Go on the user's iPhone — pinned to SDK 54 — cannot load).
- **`mobile/package.json`** new scripts: `start:lan`, `start:tunnel`,
  `login`. Always use these (`npm run start:lan`, `npm run login`, …)
  on Windows — npm invokes the locally installed Expo binary directly
  and never asks to install a newer version from the registry.

### Documentation
- **`mobile/scripts/README.md`** — full walkthrough of
  `inline-icons.js`: what it does, when to run it, how to replace an
  icon, how to add a new one, and what it does NOT do.
- **`web/FAVICON.md`** — explains that the existing `favicon.ico` is a
  1×1 transparent placeholder, lists three ways to replace it (convert
  from `app-icon.png` via ImageMagick, dedicated master, or SVG
  favicon), and confirms nothing in the app depends on it.

## [1.0.9] – 2026-06-18

### Reverted (v1.0.8 → restored full fonts)
- **Removed font subsetting from both builds.** The subsets only
  contained the glyphs present in the project source at the time of
  generation; remote pages (Privacy Policy, EULA, Wong system, etc.)
  on GitHub can grow new glyphs at any time and the subset would not
  cover them. Now the **full master TTFs** are referenced and every
  glyph is preserved.
- **Removed WOFF2 generation and `web/scripts/convert-fonts-to-woff2.py`**.
  The project intentionally standardises on TTF so the **same font
  file** can be reused for browser `@font-face`, React-Native
  `require()`, and SVG-embedded `<style>@font-face</style>` for the
  app-icon / splash-screen generators. WOFF / WOFF2 are smaller but
  not universally recognised by SVG rasterisers (resvg-js, ImageMagick,
  Inkscape), and mixing formats would split the typography pipeline.

### Changed
- **`web/css/fonts.css`**: simplified to **TTF only** with
  **`font-display: block`** (was `swap`). Reasons documented in the
  file header:
  - Matches the upstream GitHub Pages (e.g.
    https://vviinncceenntt.github.io/wongssystem.html) which also use
    `block`.
  - `swap` was producing a flash of fallback system font that
    sometimes never resolved to the custom font on slower networks.
  - `block` waits up to ~3 s for the TTF, then paints text correctly
    every time.
- **Fonts remain committed to the repo** (the user keeps them in
  GitHub alongside their licence files). `.gitignore` no longer
  excludes font files.

### Added
- **`web/serve.py`** — local-preview HTTP server that registers correct
  MIME types for `.ttf` (Safari refuses to decode fonts served as
  `text/plain`, which Python's built-in `http.server` does), forces
  IPv4 binding (Python 3.14 defaults to IPv6-only on Windows, which
  iPhones cannot reach via `192.168.x.x`), and adds CORS headers.

### Documentation
- Both `assets/fonts/README.md` files refreshed with the curl block,
  the rationale for TTF-only, the `font-display: block` choice, and
  how to launch `serve.py`.
- Top-level `README.md` web quick-start simplified to two commands.

## [1.0.8] – 2026-06-18

### Fixed
- **Real custom fonts now ship in both builds.** The placeholder TTFs
  in `mobile/assets/fonts/` and `web/assets/fonts/` were replaced with
  the actual Chiron Sung HK / Chiron Hei HK / Chiron GoRound TC / The
  Peak Font Plus typefaces. Subset to the ~318 CJK + ASCII characters
  the app actually uses so total font weight is **~450 KB WOFF2 / ~960
  KB TTF** instead of the 77 MB raw masters.
  - Web uses WOFF2 first with TTF fallback (Safari 11+, iOS 11+).
  - Mobile bundles the subset TTFs directly.
  - To regenerate after replacing the masters, run the `pyftsubset`
    one-liner documented in `web/css/fonts.css`.
- **Modal close button "✕" is now perfectly centred** on Safari. Switched
  to flex-centering and forced `font-family: 'Helvetica Neue'` so the
  glyph doesn't fall back to Apple Color Emoji (which has a heavy
  right-anchor under Apple's fallback chain) and ends up off-centre.
- **"Copy Output" buttons now work in Safari over plain HTTP.** Safari
  blocks `navigator.clipboard.writeText` on non-secure origins (anything
  except `https://` and `http://localhost`) so the LAN preview at
  `http://192.168.x.x:port` silently failed. Added a legacy fallback
  using `document.execCommand('copy')` inside an off-screen `<textarea>`
  with the iOS-specific focus/range dance required by mobile Safari.
- **Triangular orientation slider now reads as a real (disabled) slider.**
  Knob restyled to match the theme switch (white disc with primary
  border + soft shadow). Track stroke thickened to 6 px and uses the
  same colour palette as the theme switch track. In the web build the
  track switches to a dashed pattern with `cursor: not-allowed` to
  reinforce its "N/A on web" status while still looking like a slider
  (not a button cluster).
- Replaced the Restore Purchase alert text with proper bilingual copy:
  "網頁版本免費，無需恢復購買。 / Web edition is free of charge; there
  is no purchase to restore."
- Added `favicon.ico` to silence Safari's 404 spam.

## [1.0.7] – 2026-06-17

### Fixed
- **Added missing web dependencies** (`react-native-web@~0.21.0` and
  `@expo/metro-runtime@~6.1.2`) so `npx expo start --web` no longer
  fails with "Unable to resolve react-native-web/dist/exports/AppRegistry".

### Documentation
- Recommended workflow for Windows-only developers without a Mac:
  1. Quick UI preview: serve the `web/` build with `python -m http.server`
     and open from iPhone Safari (no Expo Go needed).
  2. Full native testing: `eas build --profile development --platform ios`
     once, then `npx expo start --dev-client` for all future testing.
  Expo Go on iOS is no longer reliable for LAN dev on Windows due to
  manifest-handoff issues; an EAS dev client bypasses the entire problem.
- Reminded that `npx expo login` requires the registered **email**, not
  the username (the CLI silently rejects usernames since 2024).

## [1.0.6] – 2026-06-17

### Changed
- **Bumped `mobile/` to Expo SDK 54** (React Native 0.81.5, React 19.1,
  Node 20.19+). This eliminates ~520 transitive packages and **all the
  npm deprecation warnings** the user was seeing (deprecated `inflight`,
  `rimraf@3`, `glob@7`, `osenv`, `sudo-prompt`, `querystring`, `tar@6`,
  `@xmldom/xmldom@0.7`, `uuid@7/8`, and 8 legacy `@babel/plugin-proposal-*`
  packages).
- Updated all Expo and React Native peer versions to the exact ranges
  pinned in `expo@~54.0.34`'s `bundledNativeModules.json`:
  * `expo` `~54.0.34`, `react-native` `0.81.5`, `react` `19.1.0`
  * `expo-clipboard` `~8.0.8`, `expo-constants` `~18.0.13`,
    `expo-file-system` `~19.0.23`, `expo-font` `~14.0.12`,
    `expo-haptics` `~15.0.8`, `expo-linear-gradient` `~15.0.8`,
    `expo-screen-orientation` `~9.0.9`, `expo-splash-screen` `~31.0.13`,
    `expo-status-bar` `~3.0.9`
  * `react-native-svg` `15.12.1`, `react-native-webview` `13.15.0`,
    `react-native-safe-area-context` `~5.6.0`,
    `@react-native-async-storage/async-storage` `2.2.0`,
    `@react-native-community/netinfo` `11.4.1`
  * `react-native-purchases` bumped to `^9.6.0` (latest stable RC SDK v9
    line; the public surface this app uses — `configure`,
    `getCustomerInfo`, `getOfferings`, `purchasePackage`,
    `restorePurchases` — is unchanged).
- **`src/context/AppContext.js`**: refreshed for the new
  `expo-screen-orientation` 9.x `PlatformOrientationInfo` type:
  * `screenOrientationArrayIOS` now expects `Orientation[]` (not
    `WebOrientation`).
  * Removed the deprecated `defaultOrientationMask` field.
  * Android allow-set is set to `-1` (`SCREEN_ORIENTATION_USER`); the
    actual restriction to LANDSCAPE_LEFT + PORTRAIT_UP is enforced via
    `app.json`'s `infoPlist.UISupportedInterfaceOrientations` and the
    Android manifest.

### Added
- **`.npmrc`** with `fund=false`, `audit=false`, `legacy-peer-deps=true`
  to silence install noise and avoid the misleading `npm audit fix --force`
  prompt (which would break Expo's pinned peer tree).
- **`package.json overrides`** that swap the remaining legacy transitive
  packages (`glob`, `rimraf`, `uuid`, `inflight`, `@xmldom/xmldom`, and
  the 8 legacy `@babel/plugin-proposal-*` packages) for their modern
  replacements. This silences any final deprecation warnings if a
  third-party plugin lags behind.

### Verified
- `npm install` in a clean sandbox: **632 packages, 16 s, no
  deprecation warnings, no vulnerabilities** (down from 1155 packages
  and 34 vulnerabilities on SDK 51).

## [1.0.5] – 2026-06-16

### Fixed
- **Bottom navigation icons.** The four destination icons specified in the
  brief (`formula-fx-icon.svg`, `gear-icon-72a7cf.svg`, `p-writing.svg`,
  `pasted-image-20240416184020.svg`) are now packed in
  `mobile/assets/icons/` and `web/assets/icons/`. They are inlined as raw
  SVG markup (mobile, via `<SvgXml/>` in `src/constants/icons.js`) and as
  base-64 data URIs (web, in `js/icons.js`). No remote fetch at runtime;
  a new `scripts/inline-icons.js` regenerates the inlined exports from
  the raw SVG files.
  - Mobile: any pure-black `fill="#000"` / `stroke="#000"` declarations
    are recoloured at render-time to the active/inactive nav text colour
    so icons follow the light/dark theme automatically while preserving
    multi-colour artwork (e.g. the gear's `#72a7cf` accent).
  - Web: dark-mode applies `filter: invert(1) hue-rotate(180deg)` to the
    `<img class="ico">` so dark icons stay visible on the dark navbar.

### Changed
- **Orientation Lock — true triangular 3-state slider.**
  - Replaced the 3-button cluster with **one sliding knob** that travels
    along the perimeter of a triangle between three vertices (Auto at
    the apex, Landscape Left at bottom-left, Portrait at bottom-right).
  - Mobile: drag-and-drop the knob via `PanResponder`; on release it
    animates with a spring to the nearest vertex.
  - Web: pointer / touch drag captured by the triangular track, knob
    follows the perimeter using a segment-distance snap, releases to the
    nearest vertex. Tapping a vertex glyph also moves the knob there.

### Fixed (continued)
- **Dark-mode iframe mask.** The Functions / Legal / Wong system menu
  iframes were showing a light-grey mask in dark mode because the
  `filter: invert(1)` was inverting the iframe's own `background:#111`
  into `#EEE`. Fix: keep `background: #FFFFFF` in both modes — the same
  invert filter turns it into black, which matches the inverted page
  content. The previous black background is restored only on the
  React-Native WebView path (native CSS injection, no filter).

## [1.0.4] – 2026-06-16

### Fixed
- **`scripts/generate-assets.sh`**:
  * **Locale-safe stderr truncation.** Replaced the awk byte-length filter
    with an `LC_ALL=C` invocation so Git Bash on Windows no longer prints
    `awk: warning: Invalid multibyte data detected` when ImageMagick
    emits localised (Chinese / mojibake) error strings.
  * **Recursive remote-resource inlining.** The Node inliner now follows
    nested `@font-face url('https://...')` CSS references (Lato,
    Parisienne, Cubic 11, Compact, …) — fonts are fetched once and
    embedded as `data:font/ttf;base64,...` so resvg-js renders text in
    the correct typeface instead of stacking glyphs at the origin
    (which previously made "Vincent" look like a pile of letters).
  * **Nested-SVG unwrap.** When an SVG embeds another SVG via
    `<image href="...">`, the inliner now unwraps that base-64 data
    URI into a real inline `<svg>…</svg>` block. resvg-js does not
    resolve `@font-face` declarations from inside a referenced image,
    but does resolve them from sibling/nested `<svg>` elements, so the
    Android-12 splash's centred app-icon now renders its "Vincent"
    label and keypad correctly.
  * Recursion depth-cap of 4 keeps the inliner safe against cyclic
    references.

## [1.0.3] – 2026-06-16

### Fixed
- **`scripts/generate-assets.sh`** now reliably produces 7/7 PNGs on
  systems that only have ImageMagick (e.g. Git Bash on Windows):
  * Pure-WASM **`@resvg/resvg-js` Node.js fallback** that bootstraps a
    tiny local helper package the first time it runs (no system
    dependencies). Directory renamed from `.resvg-helper` to
    `_resvg_helper` because `npm init -y` refuses dot-prefixed names.
  * Auto-inlines remote `<image href="https://...">` references in
    SVGs (e.g. the Android-12 splash that embeds the app icon) into
    base-64 data URIs so offline renderers can see them.
  * When inlining has happened, skips ImageMagick (its `-draw` engine
    cannot parse data URIs) and jumps straight to the Node fallback.
  * **Downloaded SVG masters are now preserved** under
    `assets/images/svg/` regardless of whether rasterisation succeeds
    — so a designer can always finish manually.
  * Verbose stderr (ImageMagick's full base-64 data-URI error dumps)
    is now truncated to 240 chars per line.
  * Clear next-step instructions printed if any asset failed (install
    Inkscape, librsvg, Node.js, or open in an SVG editor).
- **`.gitignore`** now excludes `mobile/assets/images/_resvg_helper/`,
  `mobile/assets/images/_inline_remote.js`, and
  `mobile/assets/images/svg/` (regeneratable artefacts).

## [1.0.2] – 2026-06-16

### Fixed
- **`scripts/generate-assets.sh`**: the ImageMagick `svg_to_png_direct`
  helper now tries four invocation patterns in order (flags-before-input,
  no-transparency, explicit `svg:`/`png:` prefixes, simplest form) so
  Git-Bash builds with only `convert` (ImageMagick 6) no longer crash
  with “參數無效 - none”.
- **Settings → Orientation Lock**: replaced the segmented look with a
  **genuine triangular toggle switch** (apex = Auto, bottom-left =
  Landscape Left, bottom-right = Portrait). A circular knob slides along
  the triangle edges to the chosen vertex. Web stays grayed-out.
- **Functions / Legal / Wong system menus** in dark mode now read clearly:
    - Web: `filter: invert(1) hue-rotate(180deg)` on the `<iframe>` element.
    - React Native: a `injectedJavaScript` payload (`webviewDarkMode.js`)
      injects a `<style>` block that turns the white background black and
      the black text white while preserving custom fonts; the iframe
      fallback inside is also CSS-inverted for cross-origin pages.
- **Docs**: `TODO.md` now clarifies that `app.json._masterAssets` and
  `app.json.extra` are **JSON keys inside `mobile/app.json`**, not
  separate files on disk.

## [1.0.1] – 2026-06-16

### Fixed
- **`scripts/generate-assets.sh`** now auto-detects available tools (Inkscape,
  rsvg-convert, ImageMagick / `magick`, Ghostscript / `gswin64c`) and falls
  back to direct SVG→PNG via ImageMagick if `rsvg-convert` is missing.
  Works on Git Bash for Windows without librsvg installed.
- **Web tooltips** are no longer clipped by parent cards or the matrix-table
  scroll wrapper. They are now mounted in a single fixed-position overlay
  attached to `<body>` and flip above the anchor when within 84 px of the
  bottom navigation.
- **Web descriptions** in Sections 2 and 3 now perform live interpolation of
  `<p>`, `<n>`, `<r>` against the current input values on every render and
  every tooltip open (previously they shipped the literal `&lt;r&gt;` etc.).
- **Section 4 title** is now itself a tooltip anchor. The "Varies with Top
  (p=…) Placements" text is no longer printed below the title; it appears as
  the tooltip on hover / focus / tap.
- **Matrix first column** is bounded (140 px desktop / 120 px mobile) with
  `word-break: keep-all; overflow-wrap: anywhere;` so Chinese stays grouped
  while long English wraps; descriptions can no longer spill across the
  body cells.
- **Settings (web + mobile)** now uses real toggle switches:
  * Theme — a rectangular switch with the **"淺色"/"Light"** option (Chinese
    above English) on the left and **"深色"/"Dark"** on the right.
  * Orientation Lock — a 3-option segmented toggle (Auto / Landscape Left /
    Portrait), grayed-out on web. Each option stacks zh on top of en.

## [1.0.0] – 2026-06-16

### Added
- React Native (Expo) app under `mobile/` with EAS Build configuration.
- Static HTML/CSS/JS website under `web/` (no ads, no auth, no RC).
- Bilingual UI dictionary (`mobile/src/constants/strings.js`) — Traditional
  Chinese (Hong Kong style) on top of British English, line by line.
- Calculator module mirroring the source Excel formulae for `Rmin`,
  `Rmax`, `ERmin`, `ERmax`, `LmaxR…`, `Nmin`, `Nmax`, `LmaxN…`, `Ti`,
  `Tp`, `Tn`. Numerically stable via `logFactorial`.
- Onboarding screen with linked PP / EULA / T&C / Disclaimer, an
  "I Agree" checkbox and a grayed-out "I Accept" button that fires
  Haptics on tap, detects OS, calls RevenueCat, and conditionally
  opens the Paywall or an expiry reminder (uses `setMonth`).
- Paywall using `react-native-purchases` annual package; localised
  price string from the package; never hard-coded.
- Main dashboard with Title, 5 sections, footnote, and swipe paging
  (vertical in landscape-left, horizontal in portrait).
- Section-4 matrix tableau:
  * Frozen first column with proper subscripts (`<SubSym>`).
  * Range `[max(6, p), 6144]` to prevent resource exhaustion.
  * Two diagonal gradient highlights overlapping in shared cells.
- Bottom navigation with 4 destinations and inline SVG icons.
- Settings menu: theme switch, 3-state triangle orientation toggle
  (web-disabled), Restore, Reset, Manage Subscription deep link.
- Legal menu with 4 tabs and offline lipsum fallback.
- Functions menu with WebView + bundled MathJax HTML; backslashes
  double-escaped to survive bundling.
- AsyncStorage persistence for theme, orientation, params, onboarded.
- Asset generation pipeline (`scripts/generate-assets.sh`):
  SVG → vector PDF (sRGB) → 32-bit PNG.
- Documentation: `README.md`, `docs/architecture-v1.md`, `TODO.md`,
  `CHANGELOG.md`, `.env.example`.

### Known Limitations
- Real TTF font files and master SVG/PNG assets must be provided by
  the maintainer before publishing.
- Web build does not implement RevenueCat (per spec; mobile only).
- The matrix view's vertical/horizontal gradient on web uses CSS
  `linear-gradient`; the precise four-corner gradient is approximated.

[1.0.0]: https://example.com/releases/v1.0.0
