/**
 * BiText - Chinese on top, English below, never slash-separated.
 * Optional underline-substring rendering for "瑞士" and "黃汶聰".
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { FONT } from '../theme/themes';

function withUnderline(text, sub, style, underlineStyle) {
  if (!sub || !text.includes(sub)) return <Text style={style}>{text}</Text>;
  // Underline EVERY occurrence of `sub`, not just the first. Earlier
  // version used split() once which left the second 黃汶聰 in the
  // footer un-underlined on React Native.
  const parts = text.split(sub);
  const out = [];
  parts.forEach((p, i) => {
    if (p) out.push(<Text key={'p' + i} style={style}>{p}</Text>);
    if (i < parts.length - 1) {
      out.push(<Text key={'s' + i} style={[style, underlineStyle]}>{sub}</Text>);
    }
  });
  return <Text style={style}>{out}</Text>;
}

export default function BiText({
  zh, en, fontZh, fontEn, sizeZh = 16, sizeEn = 14,
  color, align = 'center', style, underlineZh, underlineEn, gap = 2,
  weight,   // '400' (default) | '700' (used for the app title only)
}) {
  const { theme } = useApp();
  const c = color || theme.text;
  const fw = weight || '400';
  const baseZh = { color: c, fontSize: sizeZh, fontFamily: fontZh || FONT.goround, textAlign: align, fontWeight: fw };
  const baseEn = { color: c, fontSize: sizeEn, fontFamily: fontEn || FONT.goround, textAlign: align, fontWeight: fw };
  const u = { textDecorationLine: 'underline' };
  return (
    <View style={[{ alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }, style]}>
      {withUnderline(zh, underlineZh, baseZh, u)}
      <View style={{ height: gap }} />
      {withUnderline(en, underlineEn, baseEn, u)}
    </View>
  );
}
