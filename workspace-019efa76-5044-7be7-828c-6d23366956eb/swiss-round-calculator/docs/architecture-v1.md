# Swiss Round Calculator — Architecture v1.x

Author: 黃汶聰 / Man Chong Wong
Latest tag: `v1.0.18`
Last update: 2026-06-22

This document tracks the current architecture as it has evolved through
the v1.0.x patch series.

---

## 1. Repository layout

```
swiss-round-calculator/
├── README.md
├── CHANGELOG.md
├── TODO.md
├── .gitignore  .env  .env.example
├── docs/
│   └── architecture-v1.md           ← (this file)
│
├── mobile/                          ← React-Native app (Expo SDK 54, EAS)
│   ├── App.js                       ← GestureHandlerRootView + SafeAreaProvider
│   ├── app.json   eas.json   babel.config.js   package.json   .npmrc
│   ├── scripts/
│   │   ├── README.md
│   │   ├── generate-assets.sh       ← SVG masters → PDF → PNG (icon + 6 splashes)
│   │   │                              also: copies app-icon.svg to web/,
│   │   │                              regenerates web/favicon.ico
│   │   └── inline-icons.js          ← assets/icons/*.svg → src/constants/icons.js
│   ├── assets/
│   │   ├── fonts/                   ← Chiron Sung HK / Hei HK / GoRound TC / Peak
│   │   ├── icons/                   ← 4 bottom-nav SVGs
│   │   └── images/                  ← app-icon + 6 splash PNGs (regen by script)
│   └── src/
│       ├── constants/
│       │   ├── strings.js           ← bilingual dictionary + URL table + DEFAULTS
│       │   ├── icons.js             ← auto-generated nav-icon SVG strings
│       │   └── lipsum.js            ← last-resort offline HTML payloads
│       ├── theme/themes.js          ← LIGHT / DARK palettes + font keys
│       ├── context/AppContext.js    ← theme, orientation, params, onboarded
│       ├── utils/
│       │   ├── calculator.js        ← pure-math binomial / Swiss formulae
│       │   ├── revenuecat.js        ← RC wrapper + 3-tier price cache
│       │   ├── pageCache.js         ← HTML cache w/ comment-date refresh
│       │   └── webviewDarkMode.js   ← inject dark CSS + PEAK_FONT_FIX
│       ├── components/
│       │   ├── BiText.js            ← zh-on-top-of-en + multi-occurrence underline
│       │   ├── BottomNav.js         ← 4 inline-SVG nav icons
│       │   ├── MatrixTable.js       ← truly-frozen first column, column gradients
│       │   ├── Modal.js             ← supportedOrientations + safe-area scrim padding
│       │   ├── NumberField.js       ← stepper w/ hard min/max keyboard clamp
│       │   ├── OrientTriangle.js    ← single-knob slider, knob-wide trough
│       │   ├── Section.js           ← optional title-as-tooltip + titleAlign='left' for Note
│       │   ├── SubSym.js            ← subscript notation helpers
│       │   ├── TipAnchor.js
│       │   └── TipOverlay.js        ← global fixed-position tip bubble
│       └── screens/
│           ├── OnboardingScreen.js  ← I-Agree + I-Accept + warmCache + warmRevenueCat
│           ├── Paywall.js           ← uses cached priceString
│           ├── DashboardScreen.js   ← PagerView swipe in native, ScrollView in web/Expo Go
│           └── menus/
│               ├── FunctionsMenu.js ← live URL → cache → lipsum
│               ├── SettingsMenu.js  ← theme switch + OrientTriangle
│               ├── LegalMenu.js     ← 4 tabs, same 3-tier fallback
│               └── WongMenu.js      ← + PEAK_FONT_FIX injection
│
└── web/                             ← Static HTML/CSS/JS (no ads, no auth)
    ├── index.html                   ← favicon: SVG + ICO fallback
    ├── favicon.ico                  ← multi-resolution PNG container
    ├── serve.py                     ← MIME-safe, IPv4-binding preview server
    ├── FAVICON.md
    ├── css/{fonts.css, styles.css}
    ├── js/
    │   ├── calculator.js            ← mirror of mobile/utils/calculator.js
    │   ├── icons.js                 ← base64 data URIs of 4 nav SVGs
    │   └── app.js                   ← onboarding, dashboard, modals, slider
    └── assets/
        ├── fonts/                   ← same TTFs as mobile (kept in repo)
        └── icons/                   ← 4 nav SVGs + app-icon.svg (favicon source)
```

---

## 2. Key components

### Calculator core
Pure functions in `mobile/src/utils/calculator.js` and the
identical-behaviour `web/js/calculator.js`. All input clamps applied
inside the helpers; numerically stable up to n = 5001 via
`logFactorial` + Stirling.

### Inputs (NumberField / makeInput)
Both web and RN hardened against bypassing the limits via keyboard:
- digits only (paste handled too),
- leading zeros stripped (`000007` → `7`),
- clamped to `max` on every keystroke,
- enforced to `min` only on **blur**,
- `maxLength` capped to `String(max).length`.

### Bottom navigation icons
Five SVGs (`formula-fx-icon`, `gear-icon-72a7cf`, `p-writing`,
`privacy-document-icon`, `pasted-image-20240416184020`) live in
`mobile/assets/icons/` and are inlined into
`mobile/src/constants/icons.js` by `mobile/scripts/inline-icons.js`.
`BottomNav.js` renders them via `<SvgXml/>` from `react-native-svg`.

`tintIcon(xml, color)` recolours each icon at render time:

  1. Replace explicit black fills / strokes with `currentColor`.
  2. Add `fill="currentColor"` + `color="<themeColor>"` to the
     `<svg>` root so every shape without an explicit fill inherits
     the active nav text colour (resolved via CSS currentColor).
  3. Leave non-black explicit fills (e.g. the gear's `#72a7cf`)
     untouched.

The **Legal** slot uses `privacy-document-icon.svg` on mobile and
`p-writing.svg` on web. The web build can render `p-writing`'s ~12
radial gradients + alpha masks natively; `react-native-svg`'s
`<SvgXml/>` silently produces 0×0 output for that file (it doesn't
throw — the React error boundary added in v1.0.16 could not catch
it), so the mobile build uses the smaller `privacy-document-icon`
deterministically. Both icons live in the repo for parity.

### Subscript notation (`SubSym.js`)
Renders inline tokens like `Rmin`, `ERmax`, `LmaxNmin`, `LmaxRmax`
with real subscripts. The whole notation is rendered as ONE outer
`<Text>` containing nested smaller `<Text>` children (one level
deeper for each subscript depth, font shrinking by 0.65×). React
Native's inline text nesting aligns every glyph on the SAME
baseline, so smaller font subs naturally sit visually lower than
the larger base character — the same effect HTML `<sub>` produces
on the web, without any transform / margin / line-height tricks.

### MatrixTable
- **Frozen first column** lives OUTSIDE the horizontal scroller so it
  never scrolls.
- Body columns scroll horizontally as one block.
- For highlighted columns, ONE 3-stop `<LinearGradient>` spans all 4
  cells so the saturation curve is smooth from top to bottom.
- The Player Range row carries no tooltip (the label is
  self-explanatory).
- Both the Chinese AND English text in the header column use the
  full `--table-text` colour (was `--text-soft` before v1.0.17,
  unreadable on the buff/beige background).

### Orientation triangle slider
- Single sliding white-disc knob (matches the theme toggle).
- Trough is as wide as the knob (two stacked SVG polygons — a wide
  capsule fill + a thin edge outline).
- Drag-and-snap via `PanResponder`; tap any vertex letter (A/L/P)
  to jump.
- Disabled on web with dashed outline + `not-allowed` cursor.

### Modal
- `supportedOrientations` covers portrait + landscape so opening a
  menu while locked to landscape-left does not crash iOS.
- Scrim padded by the actual `useSafeAreaInsets()` on every edge so
  the close button never disappears under the iPhone notch in either
  orientation.

### Offline-fallback HTML cache
`mobile/src/utils/pageCache.js` keeps a local copy of every
Functions / Legal / Wong page in `FileSystem.documentDirectory +
"pageCache/<key>.html"`. The WebView always loads the **live URL when
online** (so layout + fonts come straight from the canonical GitHub
Pages source); the cache is only consulted when offline.

Date-based refresh — `parseUpdatedDate()` looks for, in order:
1. **HTML comment**: `<!-- … last modified on YYYY-MM-DD -->`
   (the current format on every linked page).
2. Body text: "Last updated on 25th May, 2026", "May 25, 2026",
   ISO `2026-05-25`, Chinese 更新日期：2026年5月25日 — fallbacks for
   pages that don't yet carry the comment.

If both cache AND network are missing on first launch, the menu falls
back to inline lipsum from `mobile/src/constants/lipsum.js`.

### Wong system font fix
The upstream `https://vviinncceenntt.github.io/style.css` writes
`format('ttf')` (invalid per W3C) where the spec wants
`format('truetype')`. Some WebView engines silently drop the rule and
the page renders with the system font. `webviewDarkMode.js` exports
`PEAK_FONT_FIX` — a tiny IIFE that re-declares the same remote TTF
with the spec-compliant hint. Zero bundle bloat; safe to inject into
any page.

### RevenueCat 3-tier price cache
`getAnnualPriceLabel()` returns `{ priceString, source }` where
`source` ∈ `'live' | 'cache' | 'fallback'`. Successful fetches cache
the priceString in AsyncStorage. The Paywall reads from this helper;
the base-price-and-currency (`30 HKD`) is used **only** when both
network and cache are empty (extremely rare).

### Swipe paging (PagerView)
Native dashboard uses `react-native-pager-view` 6.9.1.
- Vertical orientation in landscape (up/down swipe through Title →
  S1 → … → Footnote).
- Horizontal in portrait.
- Inner `ScrollView` per page (`nestedScrollEnabled`) — slow drag =
  inner scroll, fast flick = page change. PagerView natively
  distinguishes the two on iOS.
- Re-keyed on orientation flip; `initialPage` restores `currentPage`
  so the user lands on the same section after rotation.
- **Falls back** to a single vertical `ScrollView` when
  `Constants.appOwnership === 'expo'` (Expo Go) because PagerView is
  a native module not bundled into Expo Go. To test the real swipe,
  produce an EAS dev-client build (`eas build --profile development`).

### `babel.config.js`
Loads `react-native-worklets/plugin` (was
`react-native-reanimated/plugin` in Reanimated 3; v4 moved the plugin
into the standalone `react-native-worklets` package). MUST be listed
last. Required at build-time even when Reanimated isn't actually used,
because `react-native-pager-view` + `react-native-gesture-handler`
peer-depend on worklets.

---

## 3. Data flows

```
                  ┌─────────────────┐
                  │ Input fields    │ ─── 100 ms throttle ──┐
                  │ (clamped to     │                       │
                  │  [min, max])    │                       ▼
                  └─────────────────┘            ┌────────────────────┐
                                                 │ AppContext.params  │
                  ┌────────────────────┐         └────────┬───────────┘
                  │ Orientation        │                  │  useMemo
                  │ → PagerView axis   │                  ▼
                  └────────────────────┘         ┌────────────────────┐
                                                 │ calculator.js      │
                                                 │ buildMatrix(p,d)   │
                                                 └────────┬───────────┘
                                                          │
                          ┌───────────────┬───────────────┴───────────┐
                          ▼               ▼                           ▼
                    Section-2 outputs  Section-3 outputs       MatrixTable
                                                               (frozen header
                                                                + column gradients)

  Onboarding "I Accept":                           Menu open:
  ─────────────────────                            ─────────
   • Haptics + NetInfo                              • online?
   • warmCache() (6 pages, all hasDate)              -> live URL
   • warmRevenueCat() (price + status)              • offline + cache?
   • getSubscriptionStatus()                          -> file://
   • active >1mo -> Dashboard                       • neither?
   • active <1mo -> reminder                          -> lipsum
   • inactive   -> Paywall (cached price)           • refreshCache(.. {hasDate:true})
                                                      in bg → overwrites cache
                                                      only when remote
                                                      comment-date is newer
```

---

## 4. Mobile dependency matrix (SDK 54)

| Package                                    | Version    | Why                                          |
|--------------------------------------------|------------|----------------------------------------------|
| `expo`                                     | ~54.0.34   | SDK 54 (matches Expo Go on iPhone)           |
| `react`                                    | 19.1.0     | SDK 54 peer                                  |
| `react-native`                             | 0.81.5     | SDK 54 peer                                  |
| `react-native-pager-view`                  | 6.9.1      | Native swipe paging (EAS dev/prod build)     |
| `react-native-gesture-handler`             | ~2.28.0    | Required by PagerView                        |
| `react-native-reanimated`                  | ~4.1.1     | Worklet-driven animations                    |
| `react-native-worklets`                    | 0.5.1      | Hosts Reanimated 4's babel plugin            |
| `react-native-screens`                     | ~4.16.0    | Peer of gesture-handler / pager-view         |
| `react-native-safe-area-context`           | ~5.6.0     | `useSafeAreaInsets()` for notch padding      |
| `react-native-svg`                         | 15.12.1    | `<SvgXml/>` for nav icons                    |
| `react-native-webview`                     | 13.15.0    | Menu page rendering                          |
| `react-native-purchases`                   | ^9.6.0     | RevenueCat (EAS dev/prod build only)         |
| `expo-clipboard`                           | ~8.0.8     | Copy Output buttons                          |
| `expo-haptics`                             | ~15.0.8    | I-Accept tap feedback                        |
| `expo-screen-orientation`                  | ~9.0.9     | Orientation lock                             |
| `expo-linear-gradient`                     | ~15.0.8    | Matrix gradients                             |
| `expo-file-system`                         | ~19.0.23   | Page cache (use `'expo-file-system/legacy'`) |
| `expo-font`                                | ~14.0.12   | Custom font loading                          |
| `expo-constants`                           | ~18.0.13   | `Constants.appOwnership` for Expo-Go detect  |
| `expo-splash-screen`, `expo-status-bar`    | pinned     | Standard Expo plumbing                       |
| `@react-native-async-storage/async-storage`| 2.2.0      | Theme + params + RC + onboarded persistence  |
| `@react-native-community/netinfo`          | 11.4.1     | Online/offline detection                     |

---

## 5. Upgrade hooks

* **Subscription packages** — register in RC dashboard, expose via
  `_getAnnualPackageRaw()` in `utils/revenuecat.js`; the Paywall reads
  `priceString` automatically.
* **New menu destination** — append to `ITEMS` in `BottomNav.js`,
  add branch in `App.js`, register URL in `warmCache()` and the menu
  component, and add a lipsum entry in `src/constants/lipsum.js`.
* **New page-cache entry** — `refreshCache(key, url, { hasDate: true })`.
  Make sure the page carries `<!-- last modified on YYYY-MM-DD -->`.
* **Matrix column cap** — change the `hiCap` argument of `buildMatrix`
  in both `MatrixTable.js` and `web/js/app.js`. Calculator API itself
  is unrestricted.
* **Replacing a bottom-nav icon** — see `mobile/scripts/README.md`.
* **Replacing the app icon / favicon** — re-publish the master SVG at
  `https://vviinncceenntt.github.io/swiss-round-calculator/appiconmastersvg.svg`
  and run `bash mobile/scripts/generate-assets.sh`. Both
  `web/favicon.ico` and `web/assets/icons/app-icon.svg` are
  regenerated.

---

## 6. Migration guide (v1.0 → v1.0.18)

```bash
# 1. Pull the latest tag
git fetch --tags
git checkout v1.0.18

# 2. Mobile dependency refresh
cd mobile
rm -rf node_modules package-lock.json
npm install                 # ~50-60 s, ~664 packages, no deprecation warnings

# 3. Refresh assets (icons, splashes, favicon.ico, web app-icon.svg)
bash scripts/generate-assets.sh

# 4. Mobile preview in Expo Go
npm run login               # ONCE: log into Expo with your registered EMAIL
npm run start               # uses the local SDK-54 binary

# 5. (Optional) EAS dev-client build for native swipe + RevenueCat
eas init                    # ONCE per project
eas build --profile development --platform ios

# 6. Web preview
cd ../web
python serve.py             # http://0.0.0.0:8765
```

If something does not appear right after pulling, delete
`mobile/node_modules` + `mobile/package-lock.json` and re-`npm install`.
The local `expo` binary must be present (otherwise `npx expo …` will
prompt to install `expo@latest`, currently SDK 56, which breaks Expo
Go pinned to SDK 54).

---

## 7. Known limitations and future work

| Concern | Status |
|---|---|
| `PagerView` not available in Expo Go (native module). | `Constants.appOwnership` detects Expo Go and falls back to a single vertical ScrollView. Use an EAS dev build to test real swipe. |
| `react-native-purchases` not available in Expo Go. | `require()` is wrapped in try/catch; `getSubscriptionStatus()` returns `{ offline: true }`. Real purchase flow requires EAS dev/prod build. |
| Wong system page's upstream `style.css` uses `format('ttf')` and a multi-name `font-family` in `@font-face`. | App injects `PEAK_FONT_FIX`. Fixing the upstream is recommended too — one-character change in `style.css`. |
| Page-cache eviction is unbounded. | Acceptable for the 6 small HTML pages (<200 KB total). Add LRU eviction only if more pages are added. |
| iframes can't auto-flip to dark mode (cross-origin). | `filter: invert(1) hue-rotate(180deg)` on the iframe element. Works well for white-background plain-text pages. |
