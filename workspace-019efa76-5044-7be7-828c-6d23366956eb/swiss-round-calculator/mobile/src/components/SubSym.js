/**
 * Renders inline notation like Rmin, ERmax, LmaxNmin with real
 * subscripts.
 *
 * Strategy
 * ────────
 * React-Native <Text> supports nested <Text> children that inherit
 * baseline alignment naturally (the inner text sits on the SAME
 * baseline as the outer text — exactly what subscripts need, just at
 * a smaller font). We render the whole notation as ONE outer <Text>
 * containing nested <Text> chains, each subscript level at ~0.65×
 * the parent font size.
 *
 * Because every glyph sits on the same baseline, subscripts naturally
 * appear LOWER than the bigger base glyph (a smaller font's baseline
 * passes through what would visually be the lower portion of the
 * base font's glyph). This matches the LaTeX / typographic
 * convention and aligns identically across depths.
 *
 * The web build's HTML uses <sub><sub>…</sub></sub> nesting; RN's
 * nested <Text> with shrinking fontSize is the direct analogue.
 */
import React from 'react';
import { Text, Platform } from 'react-native';
import { FONT } from '../theme/themes';

// Subscript size ratio (~65 % is the typographic norm).
const SUB_RATIO = 0.65;

/** Token map: { base, sub?: [...] }.
 *  Each `sub` entry is either a string (terminal subscript) or
 *  another `{ base, sub? }` (nested subscript chain). */
const TOKENS = {
  Rmin:     { base: 'R', sub: ['min'] },
  Rmax:     { base: 'R', sub: ['max'] },
  ERmin:    { base: 'E', sub: [{ base: 'R', sub: ['min'] }] },
  ERmax:    { base: 'E', sub: [{ base: 'R', sub: ['max'] }] },
  Lmax:     { base: 'L', sub: ['max'] },
  LmaxRmin: { base: 'L', sub: ['max', { base: 'R', sub: ['min'] }] },
  LmaxRmax: { base: 'L', sub: ['max', { base: 'R', sub: ['max'] }] },
  LmaxNmin: { base: 'L', sub: ['max', { base: 'N', sub: ['min'] }] },
  LmaxNmax: { base: 'L', sub: ['max', { base: 'N', sub: ['max'] }] },
  Nmin:     { base: 'N', sub: ['min'] },
  Nmax:     { base: 'N', sub: ['max'] },
  Ti:       { base: 'T', sub: ['i'] },
  Tp:       { base: 'T', sub: ['p'] },
  Tn:       { base: 'T', sub: ['n'] },
};

const monoStyle = (color, size) => ({
  color,
  fontSize: size,
  fontFamily: FONT.goround,
  // Disable Android's default top padding so nested Text sits on a
  // true baseline.
  includeFontPadding: false,
});

/** Render a {base, sub:[…]} tree as a nested <Text> chain.
 *  `size` shrinks by SUB_RATIO every time we descend into a sub. */
function renderTree(node, color, size, key = 0) {
  // Build the sub chain as nested <Text> elements, each ratio'd
  // smaller. The chain is appended INSIDE the base <Text> so RN
  // treats subs as inline children — they sit on the same baseline
  // and naturally appear "lower" than the larger parent glyph.
  const children = [node.base];
  if (node.sub && node.sub.length) {
    const subSize = size * SUB_RATIO;
    node.sub.forEach((piece, i) => {
      if (typeof piece === 'string') {
        children.push(
          <Text key={`s${key}-${i}`} style={monoStyle(color, subSize)}>{piece}</Text>
        );
      } else {
        // Recurse into a sub-of-sub chain.
        children.push(renderTree(piece, color, subSize, `${key}-${i}`));
      }
    });
  }
  return (
    <Text key={`b${key}`} style={monoStyle(color, size)}>
      {children}
    </Text>
  );
}

/** Render one token by name. */
function renderToken(token, color, size, key) {
  const t = TOKENS[token];
  if (!t) return <Text key={key} style={monoStyle(color, size)}>{token}</Text>;
  return renderTree(t, color, size, key);
}

/** Render a list of tokens (and separators) as ONE <Text> line, e.g.
 *  "(Rmin – Rmax)". Web fallback adds whiteSpace:nowrap. */
export function SymRange({ tokens, color = '#222', size = 13 }) {
  const children = [];
  children.push(<Text key="lp" style={monoStyle(color, size)}>(</Text>);
  tokens.forEach((t, i) => {
    if (t === '-' || t === ' - ') {
      children.push(<Text key={`sep${i}`} style={monoStyle(color, size)}> – </Text>);
    } else {
      children.push(renderToken(t, color, size, `t${i}`));
    }
  });
  children.push(<Text key="rp" style={monoStyle(color, size)}>)</Text>);
  return (
    <Text style={Platform.OS === 'web' ? { whiteSpace: 'nowrap' } : undefined}>
      {children}
    </Text>
  );
}

/** Render a single symbol token (e.g. <SubSym token="Rmin" />). */
export default function SubSym({ token, color = '#222', size = 13 }) {
  return renderToken(token, color, size, 'one');
}
