/**
 * Bottom navigation: 4 destinations, each renders Chinese on top of
 * English with the user-supplied SVG icon from assets/icons/ (inlined
 * as XML by scripts/inline-icons.js).
 *
 * Recolouring strategy
 * ────────────────────
 * Most of the icon SVGs have NO explicit fill attribute on their
 * <path> elements (which means SVG defaults to fill="#000000"). A
 * naive `xml.replace(/fill="#000"/g, themeColor)` therefore has
 * nothing to match and the icons stay black even in dark mode.
 *
 * `tintIcon(xml, color)` injects `fill="currentColor"` on every
 * shape that lacks an explicit `fill` AND lacks `fill-rule` only as
 * its sole class-driven fill, then sets `color="<themeColor>"` on
 * the root <svg> so currentColor resolves to the active nav text
 * colour. Multi-colour artwork (e.g. the gear's `#72a7cf` accent)
 * keeps its explicit fills.
 *
 * Legal icon fallback
 * ───────────────────
 * The Legal slot uses `p-writing.svg` (~89 KB with many radial
 * gradients) as the primary icon to match the web build. On RN,
 * <SvgXml/> sometimes fails to parse the gradient defs; an error
 * boundary swaps in the smaller `privacy-document-icon.svg` if the
 * primary render throws.
 */
import React from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { FONT } from '../theme/themes';
import { STR } from '../constants/strings';
import {
  formulaFxIcon,
  gearIcon72a7cf,
  pWriting,
  privacyDocumentIcon,
  pastedImage20240416184020,
} from '../constants/icons';

const ICON_SIZE = 26;

/**
 * Make an SVG follow `currentColor`:
 *   1. Replace explicit black fills with currentColor.
 *   2. Inject `fill="currentColor"` on the first shape that has no
 *      explicit fill (handles the common "default-black path" case).
 *   3. Set `color="<themeColor>"` on the root <svg> so currentColor
 *      resolves there.
 *
 * Leaves any explicit non-black fill (e.g. `#72a7cf`) untouched.
 */
function tintIcon(xml, color) {
  if (!xml) return xml;
  let out = xml;
  // Step 1: explicit black -> currentColor (covers icons that did set fill).
  out = out
    .replace(/fill\s*=\s*"#000000"/gi, 'fill="currentColor"')
    .replace(/fill\s*=\s*"#000"/gi,    'fill="currentColor"')
    .replace(/fill\s*=\s*"black"/gi,   'fill="currentColor"')
    .replace(/stroke\s*=\s*"#000000"/gi, 'stroke="currentColor"')
    .replace(/stroke\s*=\s*"#000"/gi,    'stroke="currentColor"')
    .replace(/stroke\s*=\s*"black"/gi,   'stroke="currentColor"');
  // Step 2: inject a group wrapper that defaults all unset fills to
  // currentColor. We do this by adding `fill="currentColor"` to the
  // root <svg> element — every child that doesn't override it
  // inherits via CSS.
  out = out.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    // Only inject if no explicit fill is already on the svg root.
    if (/\sfill\s*=/i.test(attrs)) return `<svg${attrs} color="${color}">`;
    return `<svg${attrs} fill="currentColor" color="${color}">`;
  });
  return out;
}

/** Error boundary so a malformed SVG falls back to a simpler one. */
class IconBoundary extends React.Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* swallow */ }
  render() {
    if (this.state.failed && this.props.fallback) return this.props.fallback;
    return this.props.children;
  }
}

function NavIcon({ xml, fallbackXml, color }) {
  return (
    <View style={{ width: ICON_SIZE, height: ICON_SIZE }}>
      <IconBoundary fallback={fallbackXml ? <SvgXml xml={tintIcon(fallbackXml, color)} width="100%" height="100%" /> : null}>
        <SvgXml xml={tintIcon(xml, color)} width="100%" height="100%" />
      </IconBoundary>
    </View>
  );
}

const ITEMS = [
  { key: 'func',  xml: formulaFxIcon,             fallback: null,                 zh: STR.nav.funcZh,  en: STR.nav.funcEn  },
  { key: 'set',   xml: gearIcon72a7cf,            fallback: null,                 zh: STR.nav.setZh,   en: STR.nav.setEn   },
  // Legal: the web build uses the original p-writing.svg (89 KB with
  // ~12 radial-gradient defs, two large alpha masks, multiple
  // <clipPath>s). react-native-svg's <SvgXml/> silently renders
  // NOTHING for that file because its `mask` + nested `radialGradient
  // gradientTransform="matrix(...)"` patterns aren't supported. The
  // error boundary cannot catch this — there is no thrown exception,
  // just a 0×0 output. So on native we deterministically use the
  // smaller privacy-document-icon (which renders correctly). The
  // web build, where browsers handle the full p-writing.svg natively,
  // is unaffected.
  { key: 'legal', xml: privacyDocumentIcon,       fallback: null,                 zh: STR.nav.legalZh, en: STR.nav.legalEn },
  { key: 'wong',  xml: pastedImage20240416184020, fallback: null,                 zh: STR.nav.wongZh,  en: STR.nav.wongEn  },
];

export default function BottomNav({ active, onSelect }) {
  const { theme } = useApp();
  return (
    <View style={[styles.bar, { backgroundColor: theme.navBg, borderTopColor: theme.border }]}>
      {ITEMS.map((it) => {
        const isActive = active === it.key;
        const labelColor = isActive ? theme.navActive : theme.navText;
        const iconColor  = isActive ? theme.navActive : theme.navText;
        return (
          <Pressable
            key={it.key}
            onPress={() => onSelect(it.key)}
            style={styles.cell}
            accessibilityRole="button"
            accessibilityLabel={`${it.zh} ${it.en}`}
          >
            <NavIcon xml={it.xml} fallbackXml={it.fallback} color={iconColor} />
            <Text style={[styles.zh, { color: labelColor, fontFamily: FONT.hei }]} numberOfLines={1}>{it.zh}</Text>
            <Text style={[styles.en, { color: labelColor, fontFamily: FONT.hei }]} numberOfLines={1}>{it.en}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    paddingHorizontal: 4,
  },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zh: { fontSize: 11, marginTop: 2 },
  en: { fontSize: 10 },
});
