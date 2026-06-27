# Bundled fonts (React Native)

These TTF files **must be present** before `npm install` or
`eas build`, otherwise the `require('./assets/fonts/X.ttf')` calls in
`App.js` will fail to resolve at bundling time.

| File                  | Family in JS         | Source                                                                                                                                       |
|-----------------------|----------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `ChironSungHK.ttf`    | `ChironSungHK`       | https://raw.githubusercontent.com/Vviinncceenntt/swiss-round-calculator/main/chironsunghk-r.ttf                                              |
| `ChironHeiHK.ttf`     | `ChironHeiHK`        | https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/chiron-hei-hk-2609/chironheihk-r.ttf                                             |
| `ChironGoRoundTC.ttf` | `ChironGoRoundTC`    | https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/chiron-go-round-tc-1011/chirongoroundtc-400r.ttf                                 |
| `ThePeakFontPlus.ttf` | `ThePeakFontPlus`    | https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/thepeakfontplus-v1-002/thepeakfontplus-regular.ttf                               |

## Populate the TTFs

```bash
cd mobile/assets/fonts
curl -L -o ChironSungHK.ttf      "https://raw.githubusercontent.com/Vviinncceenntt/swiss-round-calculator/main/chironsunghk-r.ttf"
curl -L -o ChironHeiHK.ttf       "https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/chiron-hei-hk-2609/chironheihk-r.ttf"
curl -L -o ChironGoRoundTC.ttf   "https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/chiron-go-round-tc-1011/chirongoroundtc-400r.ttf"
curl -L -o ThePeakFontPlus.ttf   "https://raw.githubusercontent.com/Vviinncceenntt/fonts/main/thepeakfontplus-v1-002/thepeakfontplus-regular.ttf"
```

React Native bundles the TTFs directly into the app binary at build
time — no runtime download, no network dependency. The same TTFs are
also embedded into the SVG master files used to generate the app icon
and splash screens (see `mobile/scripts/generate-assets.sh`), which is
why TTF is used everywhere instead of WOFF / WOFF2.
