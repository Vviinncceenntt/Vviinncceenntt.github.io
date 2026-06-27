# Swiss Round Calculator / 瑞士制輪數計算機

> Latest tag: **v1.0.18** · Expo SDK **54** · React Native **0.81.5** · React **19.1.0**

A fully mobile-responsive, bilingual (Traditional Chinese Hong Kong style on top of British English) calculator that computes the minimum and maximum rounds of a Swiss tournament and, reversely, the range of player numbers a specific number of rounds supports.

This repository contains **two independent deliverables**:

| Folder    | Target                                  | Build / Deploy                                                   |
|-----------|-----------------------------------------|------------------------------------------------------------------|
| `mobile/` | iOS / Android app (React Native + Expo) | `eas build --platform all` (App Store + Google Play submission)  |
| `web/`    | Public website (static HTML/CSS/JS)     | Upload contents of `web/` to any static host (GitHub Pages, S3…) |

Both versions are **ad-free**. The mobile app is sold via an auto-renewing **annual subscription** (base price 30 HKD, region-localised by RevenueCat).

## Quick start

### Web preview from your PC

```bash
cd web
# 1. Populate the four TTFs (one-time, see web/assets/fonts/README.md
#    for the curl block).
# 2. Start the local preview (correct MIME types + IPv4 wildcard):
python serve.py            # http://0.0.0.0:8765
```

Open `http://<your-PC-LAN-IP>:8765` on any device on the same Wi-Fi.

### Mobile preview in Expo Go (no Mac needed)

```bash
cd mobile
npm install                 # SDK 54 pinned; ~650 packages, no warnings
npm run login               # ONCE: enter your registered EMAIL
npm run start               # uses the local expo binary (avoids SDK 56 prompt)
```

In Expo Go on iPhone (free, App Store), tap the discovered dev server.

- ✅ All UI, calculator maths, themes, tooltips, settings, menus.
- ✅ Cached pages with HTML-comment date refresh.
- ⚠️ Swipe between sections falls back to a single vertical scroll
  (native `PagerView` is not bundled into Expo Go — see below).
- ⚠️ Subscription purchases (RevenueCat is mobile-native-only).

### Mobile dev-client build for the FULL feature set (incl. native swipe + RevenueCat)

```bash
cd mobile
npm install -g eas-cli
npm run login                                # if not already
eas init                                     # one-time per project
eas build --profile development --platform ios
```

EAS builds it on Apple's cloud (no Mac needed); install the resulting
`.ipa` on iPhone, then `npm run start -- --dev-client`. Subsequent
JS-only changes don't need a rebuild.

### Ship to App Store / Google Play

```bash
eas build --profile production --platform ios
eas submit --platform ios
eas build --profile production --platform android
eas submit --platform android
```

## Features

- **Bilingual UI** (zh-HK on top of en-GB, line-by-line, never slash-separated)
- **Light / Dark themes** (auto + manual, persisted via AsyncStorage)
- **Orientation lock** — triangular 3-state slider (auto / landscape-left / portrait)
  with a knob fitted inside a knob-wide trough
- **Bottom navigation** with 4 destinations:
  - Functions (MathJax-rendered formulae)
  - Settings (theme + orientation + restore + reset + manage subscription)
  - Legal (PP / EULA / T&C / Disclaimer tabs)
  - Wong system
- **Onboarding** with linked legal docs + "I Agree" gating
- **RevenueCat annual subscription** with expiry reminder (<1 month) and
  3-tier price cache (live → cache → "HKD 30" last-resort)
- **Online-first, offline-fallback HTML cache** with HTML-comment date
  refresh — `<!-- last modified on YYYY-MM-DD -->`
- **Lipsum fallback** when neither cache nor network is available
- **PagerView swipe** between sections in native builds (up/down in
  landscape-left, left/right in portrait); plain scroll in Expo Go / web
- **Tooltips** (hover/focus desktop) + toggletips (tap mobile), flip-aware
- **Frozen first column** in the Section-4 matrix tableau with two
  column-spanning diagonal gradients (player-N highlight + N-range highlight)
- **Full safe-area padding** on every edge so dashboard content and menus
  clear the iPhone notch in either orientation

See `docs/architecture-v1.md` for full architecture, data flows,
upgrade hooks, and migration guide.

## Author

Written and designed by **黃汶聰 / Man Chong Wong**. Copyright © 2026. All rights reserved.
