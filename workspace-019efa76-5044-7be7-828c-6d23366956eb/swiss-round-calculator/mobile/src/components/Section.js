/**
 * Container for one dashboard section.
 *
 *  - Title rendered via <BiText> (zh-on-top-of-en).
 *  - When `titleTipZh` / `titleTipEn` are provided, the title becomes
 *    a TipAnchor showing the description as a toggletip (mobile) /
 *    tooltip (web) on hover or tap — used by Section 4 ("Varies with
 *    Top (p=…) Placements") so the description does NOT appear as a
 *    permanent subtitle on screen.
 *  - The older `descZh` / `descEn` props are still supported for
 *    sections that want an explicit subtitle (none use it now).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import BiText from './BiText';
import TipAnchor from './TipAnchor';
import { useApp } from '../context/AppContext';
import { FONT } from '../theme/themes';

export default function Section({
  titleZh, titleEn,
  descZh, descEn,
  titleTipZh, titleTipEn,
  titleAlign = 'center',     // Section 5 (Note) overrides to 'left'.
  children,
}) {
  const { theme } = useApp();

  // Section titles are NOT bold (BiText doesn't set fontWeight, so we
  // pass through the default '400'). Chinese and English at full text
  // colour with near-equal sizes.
  const titleBlock = (
    <BiText
      zh={titleZh}
      en={titleEn}
      fontZh={FONT.goround}
      fontEn={FONT.goround}
      sizeZh={17}
      sizeEn={16}
      color={theme.text}
      align={titleAlign}
      style={{ marginBottom: 6, alignSelf: titleAlign === 'left' ? 'flex-start' : 'center' }}
    />
  );

  return (
    <View style={[styles.box, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {(titleTipZh || titleTipEn) ? (
        <TipAnchor zh={titleTipZh || ''} en={titleTipEn || ''}>
          {titleBlock}
        </TipAnchor>
      ) : titleBlock}
      {(descZh || descEn) ? (
        <BiText zh={descZh || ''} en={descEn || ''} sizeZh={13} sizeEn={13} color={theme.text} style={{ marginBottom: 8 }} />
      ) : null}
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
  },
});
