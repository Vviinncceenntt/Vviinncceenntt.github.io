# TODO

> Current tag: **v1.0.18**. Items below describe what remains.


## Before first release
- [ ] Populate the four TTFs in `mobile/assets/fonts/` and
      `web/assets/fonts/` with the real files (see each folder's
      `README.md` for the curl block).
- [ ] Run `bash mobile/scripts/generate-assets.sh` to produce the
      real app-icon + 6 splash PNGs from the SVG masters listed under
      the `expo._masterAssets` JSON key inside `mobile/app.json`.
      The same script also copies the master `app-icon.svg` into
      `web/assets/icons/` and rebuilds `web/favicon.ico`.
- [ ] Create the RevenueCat dashboard project; copy the iOS/Android
      public SDK keys into `.env` AND into the `expo.extra` JSON key
      inside `mobile/app.json`. Both locations are JSON keys —
      **not** separate files.
- [ ] Configure the annual subscription product (auto-renew, cancel
      24 h before expiry) on App Store Connect and Google Play.
      Base price 30 HKD (region-localised by RevenueCat).
- [ ] Set the real `EAS_PROJECT_ID` in `mobile/app.json.expo.extra.eas`
      and in `.env`.
- [ ] Confirm the six linked GitHub Pages URLs (PP, EULA, T&C,
      Disclaimer, Functions, Wong system) all end with
      `<!-- … last modified on YYYY-MM-DD -->`. The cache refresh
      logic relies on that comment for conditional rewrites.

## Before App Store / Play Store submission
- [ ] `eas build --profile production --platform ios`
- [ ] `eas build --profile production --platform android`
- [ ] App Store screenshots in every required size (Apple's specs).
- [ ] Google Play feature graphic + screenshots.
- [ ] Privacy answers in App Store Connect / Play Console:
      - Personal data collected: **none** (apart from RevenueCat's
        anonymous user-ID and locale used for store routing).
      - Tracking: **off**.

## Nice-to-have
- [ ] True 4-corner bilinear gradient on Section-4 cells (currently
      approximated by a single 3-stop `<LinearGradient>` per column).
- [ ] PWA manifest + service worker for the web build to enable
      offline reading.
- [ ] In-app review prompt (after N successful uses).
- [ ] Localise additional UI strings into ja / ko by adding new
      keys in `mobile/src/constants/strings.js` + `web/index.html`.
- [ ] Unit tests for `mobile/src/utils/calculator.js` (jest).
- [ ] CI workflow: lint, test, `expo-doctor`, `eas build:configure --check`.
- [ ] Wrap each `<PagerView/>` page in a `react-native-gesture-handler`
      `<GestureDetector>` that distinguishes slow pans (let inner
      `ScrollView` win) from fast flicks (let PagerView win) by
      reading the gesture velocity. PagerView already does this on
      iOS natively but Android's behaviour is less consistent.

## Maintenance
- [ ] Bump `react-native-purchases` when v10 lands; verify the wrapper.
- [ ] Re-run `npx expo install --check` after each `expo` patch bump.
- [ ] Audit subscription management deep-links: iOS / Android may change
      the path (`https://apps.apple.com/account/subscriptions` and
      `https://play.google.com/store/account/subscriptions`).
- [ ] Re-run `bash mobile/scripts/generate-assets.sh` whenever the
      master SVGs (icon / splashes) change on
      `https://vviinncceenntt.github.io/swiss-round-calculator/`.
- [ ] Re-run `node mobile/scripts/inline-icons.js` whenever a file in
      `mobile/assets/icons/` is added / replaced.
