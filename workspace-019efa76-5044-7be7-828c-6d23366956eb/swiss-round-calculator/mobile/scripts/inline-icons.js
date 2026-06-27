#!/usr/bin/env node
/**
 * inline-icons.js — regenerate src/constants/icons.js from assets/icons/*.svg.
 *
 * Run:  node scripts/inline-icons.js
 *
 * Each SVG file in assets/icons/ becomes a named export carrying the raw
 * SVG markup (with the XML prologue and DOCTYPE stripped). Consumers pass
 * the string to `<SvgXml xml={...}/>` from `react-native-svg`.
 *
 * If you replace any of the icon SVG files, run this script and commit
 * both the new SVG and the regenerated icons.js.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'assets', 'icons');
const outFile = path.join(__dirname, '..', 'src', 'constants', 'icons.js');

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.svg'));

const lines = [
  '// Auto-generated from assets/icons/*.svg by scripts/inline-icons.js',
  '// Each export is the raw SVG markup, ready for <SvgXml xml={...} />.',
  '',
];

for (const file of files) {
  const raw = fs
    .readFileSync(path.join(srcDir, file), 'utf8')
    .replace(/<\?xml[^?]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/g, '')
    .trim();
  const base = file.replace(/\.svg$/, '');
  const name = base.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  lines.push(`export const ${name} = ${JSON.stringify(raw)};`);
}

fs.writeFileSync(outFile, lines.join('\n') + '\n');
console.log('wrote', outFile, '(' + files.length + ' icons)');
