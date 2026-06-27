# `mobile/scripts/`

Helpers that turn external assets into in-bundle JavaScript / PNG
resources for React Native.

| Script                     | What it does                                          | When to run                                                  |
|----------------------------|-------------------------------------------------------|--------------------------------------------------------------|
| `inline-icons.js`          | SVGs → JS exports for `<SvgXml/>`                     | Whenever you add or replace an icon                          |
| `generate-assets.sh`       | SVG masters → 32-bit PNGs (icon + splashes)           | Whenever you change a master SVG                             |

---

## `inline-icons.js`

### What problem it solves

`react-native-svg` can render SVG markup at runtime via `<SvgXml xml={...}/>`
but it needs a JS string, not a file path. Reading a `.svg` file from
disk at runtime (`expo-file-system` or `fetch`) costs an asynchronous
hop and a re-parse on every render. Instead, we **inline** the SVG
markup as a JS string at build time, so the icons load synchronously
the moment the JS bundle is parsed.

### What it does step by step

1. Reads every `.svg` file under `mobile/assets/icons/`.
2. For each file:
   - Strips the `<?xml ...?>` prologue and `<!DOCTYPE ...>` if present
     (they would otherwise confuse `<SvgXml/>`).
   - Trims leading / trailing whitespace.
   - Converts the kebab-case file name to camelCase
     (`gear-icon-72a7cf.svg` → `gearIcon72a7cf`).
   - JSON-stringifies the raw SVG markup so it survives JS quoting
     (escapes `"`, `\`, control chars).
3. Writes a single auto-generated file at
   `mobile/src/constants/icons.js` containing one
   `export const <name> = "<raw svg>";` per icon.
4. Prints the count.

### How to run

From the `mobile/` folder:

```bash
node scripts/inline-icons.js
```

Or, if you prefer the npm script (works on any OS regardless of
PowerShell execution policy):

```bash
npm run inline-icons
```

### When to run

Run the script whenever any of these changes:

- You added a new `.svg` file to `mobile/assets/icons/`.
- You replaced the contents of an existing `.svg` (e.g. updated the
  gear icon's stroke width).
- You renamed an icon file.

### What gets regenerated

Only `mobile/src/constants/icons.js`. The script is **idempotent** and
safe to commit. The icons.js file is auto-generated — do not edit it
by hand; your changes would be wiped on the next run.

### Replacing the bottom-nav icons (worked example)

Say you want to swap the gear icon for a new design:

1. Save the new SVG as `mobile/assets/icons/gear-icon-72a7cf.svg`
   (keep the same file name so existing imports continue to work).
2. From the `mobile/` folder, run:
   ```bash
   npm run inline-icons
   ```
3. Verify `mobile/src/constants/icons.js` now contains the new SVG
   inside the `gearIcon72a7cf` export.
4. Commit both files together:
   ```bash
   git add assets/icons/gear-icon-72a7cf.svg src/constants/icons.js
   git commit -m "Replace settings gear icon"
   ```

### Adding a brand-new icon

1. Save the SVG as e.g. `mobile/assets/icons/new-thing.svg`.
2. Run `npm run inline-icons`.
3. The new export `newThing` is now available in
   `src/constants/icons.js`. Import and use it:
   ```js
   import { SvgXml } from 'react-native-svg';
   import { newThing } from '../constants/icons';
   // ...
   <SvgXml xml={newThing} width={24} height={24} />
   ```

### Per-icon notes

- **`formula-fx-icon.svg`**, **`privacy-document-icon.svg`**: no
  explicit `fill` attribute on their `<path>` elements (they rely on
  SVG's default fill of black). `BottomNav.js`'s `tintIcon(xml, color)`
  injects `fill="currentColor"` + `color="<themeColor>"` on the root
  `<svg>` at render time so these icons follow the active nav text
  colour in both light and dark themes.
- **`gear-icon-72a7cf.svg`**: keeps its explicit `fill="#72a7cf"`
  accent — `tintIcon()` does not touch non-black explicit fills.
- **`p-writing.svg`**: shipped in the repo so the web build can use
  it (browsers handle its ~12 radial-gradient defs + alpha masks
  natively). `react-native-svg`'s `<SvgXml/>` silently produces 0×0
  output for that file on RN, so `BottomNav.js` uses
  `privacy-document-icon.svg` for the Legal slot on mobile instead.

### What the script does NOT do

- It does **not** validate the SVG (malformed SVG will silently render
  as nothing inside `<SvgXml/>`).
- It does **not** recolour or restyle the SVG.
  `BottomNav.js` has its own `recolour()` helper that rewrites
  hard-coded `fill="#000"` / `stroke="#000"` to the active nav text
  colour at render time, so multi-colour artwork (e.g. the gear's
  `#72a7cf` accent) is preserved while pure black follows the theme.

---

## `generate-assets.sh`

Generates the app icon and all splash screens (light + dark, portrait
+ landscape + Android 12) from the SVG masters referenced in
`mobile/app.json`'s `expo._masterAssets` JSON key. See the comments at
the top of the file for the full SVG→PDF→PNG (or SVG→PNG via Node's
`@resvg/resvg-js` fallback) pipeline and the Windows-friendly
ImageMagick paths.

Run from anywhere:

```bash
bash mobile/scripts/generate-assets.sh
```

Or from inside `mobile/`:

```bash
bash scripts/generate-assets.sh
```
