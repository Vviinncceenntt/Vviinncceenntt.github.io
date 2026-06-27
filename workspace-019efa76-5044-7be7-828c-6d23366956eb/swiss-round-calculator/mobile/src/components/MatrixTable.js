/**
 * Section 4: Corresponding Matrix Tableau.
 *
 *  - Frozen first column with bilingual labels and proper subscripts.
 *  - Body columns generated from `buildMatrix(p, d)` clipped to [max(6,p), 6144].
 *  - Two highlight gradients:
 *      • the column containing user input N -> blue gradient
 *      • every column whose [Nmin,Nmax] is fully inside the Section-3
 *        computed [Nmin,Nmax] range -> red gradient
 *    Both directions reverse in dark mode (per spec).
 *  - The gradient is drawn ONCE per highlighted column as a single
 *    absolutely-positioned <LinearGradient> spanning all 4 rows, so the
 *    transition from row 1 to row 4 is smooth (previous per-cell
 *    approach made middle rows look more saturated than top/bottom).
 *  - Player Range row has no tooltip description per spec.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { FONT } from '../theme/themes';
import { STR } from '../constants/strings';
import { calc, buildMatrix } from '../utils/calculator';
import TipAnchor from './TipAnchor';
import { SymRange } from './SubSym';

const COL_W = 96;
const ROW_H = 56;
const HEADER_W = 130;
const TOTAL_H = ROW_H * 4;

function HeaderCell({ theme, children }) {
  return (
    <View style={[styles.cell, { width: HEADER_W, backgroundColor: theme.tableBg, borderColor: theme.border, paddingHorizontal: 6 }]}>
      {children}
    </View>
  );
}

/** Player-column gradient stops.
 *  Light: TL #0000FF -> mid #ADD8E6 -> BR #0000FF
 *  Dark : TR #0000FF -> mid #00008B -> BL #0000FF
 *  Drawn as a 3-stop linear gradient over the full 4-row column.
 */
function playerGradient(theme) {
  const colors = [theme.gradPlayerA, theme.gradPlayerMid, theme.gradPlayerA];
  const locations = [0, 0.5, 1];
  // Dark = TR -> BL, Light = TL -> BR
  const start = theme.mode === 'dark' ? { x: 1, y: 0 } : { x: 0, y: 0 };
  const end   = theme.mode === 'dark' ? { x: 0, y: 1 } : { x: 1, y: 1 };
  return { colors, locations, start, end };
}

function rangeGradient(theme) {
  const colors = [theme.gradRangeA, theme.gradRangeMid, theme.gradRangeA];
  const locations = [0, 0.5, 1];
  // Light = TR -> BL, Dark = TL -> BR
  const start = theme.mode === 'dark' ? { x: 0, y: 0 } : { x: 1, y: 0 };
  const end   = theme.mode === 'dark' ? { x: 1, y: 1 } : { x: 0, y: 1 };
  return { colors, locations, start, end };
}

export default function MatrixTable({ n, p, d, rRangeMin, rRangeMax }) {
  const { theme } = useApp();
  const cols = useMemo(() => buildMatrix(p, d, 6144), [p, d]);
  const userN = calc.clampN(n);

  // Header column. The Player Range row has no description (per user
  // spec — the label "人數範圍 / Player Range" is self-explanatory).
  const headers = [
    {
      zh: STR.matrix.rowRoundsZh, en: STR.matrix.rowRoundsEn,
      tokens: ['Rmin', '-', 'Rmax'],
      tipZh: STR.results.roundsDescZh.replace('<p>', String(calc.pCappedByN(p, n))),
      tipEn: STR.results.roundsDescEn.replace('<p>', String(calc.pCappedByN(p, n))),
    },
    {
      zh: STR.matrix.rowERZh, en: STR.matrix.rowEREn,
      tokens: ['ERmin', '-', 'ERmax'],
      tipZh: STR.results.erDescZh, tipEn: STR.results.erDescEn,
    },
    {
      zh: STR.matrix.rowLZh, en: STR.matrix.rowLEn,
      tokens: ['LmaxRmin', '-', 'LmaxRmax'],
      tipZh: STR.results.lDescZh.replace('<p>', String(calc.pCappedByN(p, n))),
      tipEn: STR.results.lDescEn.replace('<p>', String(calc.pCappedByN(p, n))),
    },
    // Player Range row: NO tooltip (self-explanatory; was an improvised description).
    { zh: STR.matrix.rowRangeZh, en: STR.matrix.rowRangeEn, tokens: null, tipZh: null, tipEn: null },
  ];

  const renderHeaderRow = (h, i) => {
    const content = (
      <HeaderCell theme={theme}>
        <Text
          style={[
            styles.headZh,
            { color: theme.tableText, fontFamily: FONT.goround },
            Platform.OS === 'web' ? { whiteSpace: 'nowrap' } : null,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {h.zh}
        </Text>
        <Text
          style={[
            styles.headEn,
            { color: theme.tableText, fontFamily: FONT.goround },
            Platform.OS === 'web' ? { whiteSpace: 'nowrap' } : null,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {h.en}
        </Text>
        {h.tokens && (
          <View style={{ marginTop: 1 }}>
            <SymRange tokens={h.tokens} color={theme.tableText} size={11} />
          </View>
        )}
      </HeaderCell>
    );
    // Wrap with TipAnchor only when there IS a description.
    return h.tipZh ? (
      <TipAnchor key={i} zh={h.tipZh} en={h.tipEn}>{content}</TipAnchor>
    ) : (
      <View key={i}>{content}</View>
    );
  };

  // Layout: the header column is OUTSIDE the horizontal scroller so it
  // stays put when the body cells scroll left/right. The body columns
  // scroll horizontally as a single block, and we wrap that block in a
  // vertical ScrollView only if the total height exceeds the screen
  // (currently TOTAL_H = 224 px, well under any phone screen, so we
  // skip the vertical scroller entirely).
  return (
    <View style={{ flexDirection: 'row', height: TOTAL_H }}>
      {/* FROZEN first column — never scrolls */}
      <View style={{ zIndex: 5 }}>{headers.map(renderHeaderRow)}</View>

      {/* Body columns — scroll horizontally only */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        nestedScrollEnabled
        style={{ flex: 1 }}
      >
        <View style={{ height: TOTAL_H }}>
          <View style={{ flexDirection: 'row' }}>
            {cols.map((c, idx) => {
              const playerHi = userN >= c.nMin && userN <= c.nMax;
              const rangeHi =
                rRangeMin != null && rRangeMax != null &&
                c.nMin >= rRangeMin && c.nMax <= rRangeMax;
              const values = [
                `${c.rmin}–${c.rmax}`,
                `${c.ermin}–${c.ermax}`,
                `${c.lmin}–${c.lmax}`,
                c.nMin === c.nMax ? `${c.nMin}` : `${c.nMin}–${c.nMax}`,
              ];
              return (
                <View key={idx} style={{ width: COL_W, height: TOTAL_H, overflow: 'hidden' }}>
                  {/* SINGLE column-spanning gradient layers underneath all 4 cells */}
                  {playerHi && (() => {
                    const g = playerGradient(theme);
                    return (
                      <LinearGradient
                        pointerEvents="none"
                        colors={g.colors}
                        locations={g.locations}
                        start={g.start}
                        end={g.end}
                        style={StyleSheet.absoluteFill}
                      />
                    );
                  })()}
                  {rangeHi && (() => {
                    const g = rangeGradient(theme);
                    return (
                      <LinearGradient
                        pointerEvents="none"
                        colors={g.colors}
                        locations={g.locations}
                        start={g.start}
                        end={g.end}
                        style={[StyleSheet.absoluteFill, { opacity: playerHi ? 0.55 : 1 }]}
                      />
                    );
                  })()}
                  {/* 4 cells, transparent so the gradient shows through */}
                  {values.map((v, ri) => {
                    const numberColor = playerHi
                      ? theme.gradPlayerNumber
                      : rangeHi ? theme.gradRangeNumber
                      : theme.tableText;
                    return (
                      <View
                        key={ri}
                        style={[
                          styles.bodyCell,
                          {
                            backgroundColor: (playerHi || rangeHi) ? 'transparent' : theme.tableBg,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bodyText,
                            {
                              color: numberColor,
                              fontFamily: FONT.goround,
                              // NOT bold per user spec ("numbers of the
                              // highlighted columns are not supposed to be bold").
                              fontWeight: '400',
                              textShadowColor: (playerHi || rangeHi) ? '#000000' : 'transparent',
                              textShadowRadius: (playerHi || rangeHi) ? 1 : 0,
                              textShadowOffset: { width: 0, height: 0 },
                            },
                          ]}
                        >
                          {v}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bodyCell: {
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  // English row uses the same full table-text colour as the Chinese
  // row (it inherits from the inline style); fontSize bumped from 10
  // -> 11 with semibold weight so it stays readable against the
  // buff / beige Section-4 background.
  headZh: { fontSize: 12, textAlign: 'center', fontWeight: '500', lineHeight: 14 },
  headEn: { fontSize: 11, textAlign: 'center', fontWeight: '500', lineHeight: 13 },
  bodyText: { fontSize: 13, textAlign: 'center' },
});
