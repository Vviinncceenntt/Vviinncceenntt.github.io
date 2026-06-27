/**
 * Main dashboard.
 *
 * Native (iOS/Android): a real PagerView from react-native-pager-view.
 *   - `orientation` is set to 'vertical' in landscape (so the user
 *     swipes up/down through Title → S1 → S2 → S3 → S4 → S5 → Footnote)
 *     and 'horizontal' in portrait (left/right swipe).
 *   - Each page hosts its own ScrollView so slow drag = scroll inside
 *     the page; fast flick across the boundary = page change. The
 *     native PagerView correctly distinguishes these two gestures
 *     (rather than the older FlatList pagingEnabled which sometimes
 *     consumed the scroll gesture itself).
 *   - Current page index is preserved across orientation flips by
 *     re-setting `initialPage` from React state after the axis change.
 *
 * Web: degrade to a single vertical ScrollView (matches your spec:
 * "scrolling through the sections on mobile/desktop browser is just
 * like scrolling…").
 */
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Dimensions, Platform,
  KeyboardAvoidingView, Keyboard,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { STR, DEFAULTS } from '../constants/strings';
import { FONT } from '../theme/themes';
import Constants from 'expo-constants';
import { calc } from '../utils/calculator';
import BiText from '../components/BiText';
import Section from '../components/Section';
import NumberField from '../components/NumberField';
import TipAnchor from '../components/TipAnchor';
import { SymRange } from '../components/SubSym';
import MatrixTable from '../components/MatrixTable';

// PagerView is a native module. It only renders correctly in an EAS
// dev/production build that has the native module compiled in.
// In Expo Go (Constants.appOwnership === 'expo'), the JS import
// "works" but mounting <PagerView/> immediately crashes the bridge.
// We therefore opt out in Expo Go and fall back to a plain vertical
// ScrollView (matches the web build's behaviour).
const IS_EXPO_GO = Constants.appOwnership === 'expo';
let PagerView = null;
if (!IS_EXPO_GO) {
  try {
    PagerView = require('react-native-pager-view').default;
  } catch {
    PagerView = null;
  }
}

function FieldRow({ nameZh, nameEn, sym, descZh, descEn, children, tipTokenList }) {
  const { theme } = useApp();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <TipAnchor zh={descZh} en={descEn}>
          <View>
            {/* Three lines: Chinese name, English name, then the
             * variable symbol (e.g. "(n)" or "(Rmin - Rmax)") on its
             * OWN line below the English. Same colour for all three. */}
            <Text style={[styles.zhLabel, { color: theme.text, fontFamily: FONT.goround }]}>{nameZh}</Text>
            <Text style={[styles.enLabel, { color: theme.text, fontFamily: FONT.goround }]}>{nameEn}</Text>
            {tipTokenList ? (
              <View style={{ marginTop: 2 }}>
                <SymRange tokens={tipTokenList} color={theme.text} size={13} />
              </View>
            ) : (
              <Text style={[styles.symLabel, { color: theme.text, fontFamily: FONT.goround }]}>{sym}</Text>
            )}
          </View>
        </TipAnchor>
      </View>
      <View>{children}</View>
    </View>
  );
}

function OutputBox({ value, width = 110 }) {
  const { theme } = useApp();
  return (
    <View style={[styles.output, { borderColor: theme.border, backgroundColor: theme.inputBg, width }]}>
      <Text style={[styles.outputText, { color: theme.inputText, fontFamily: FONT.goround }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { theme, params, updateParam } = useApp();
  const [orientationIsLandscape, setIsLandscape] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef(null);

  useEffect(() => {
    const update = ({ window }) => setIsLandscape(window.width >= window.height);
    update({ window: Dimensions.get('window') });
    const sub = Dimensions.addEventListener('change', update);
    return () => sub?.remove?.();
  }, []);

  // ---- derived numbers ----
  const n = calc.clampN(params.n);
  const p = calc.clampP(params.p);
  const d = calc.clampD(params.d);
  const rEff = params.r === '' || params.r == null ? DEFAULTS.rPlaceholder : calc.clampR(params.r);

  const rmin = calc.rMin(n, p);
  const rmax = calc.rMax(n, p, d);
  const erMin = calc.erMin(n, p);
  const erMax = calc.erMax(n, p, d);
  const lMinR = calc.lmaxRmin(n, p);
  const lMaxR = calc.lmaxRmax(n, p, d);
  const nMn = calc.nMin(p, rEff, d);
  const nMx = calc.nMax(p, rEff);
  const lNmin = calc.lmaxNmin(p, rEff, d);
  const lNmax = calc.lmaxNmax(p, rEff);
  const lForN = calc.lmaxR(n, p, rEff);

  const copyZh = useCallback(async () => {
    Haptics.selectionAsync().catch(() => {});
    const s = STR.results.copyStringZh(n, calc.pCappedByN(p, n), rmin, rmax);
    await Clipboard.setStringAsync(s);
  }, [n, p, rmin, rmax]);

  const copyEn = useCallback(async () => {
    Haptics.selectionAsync().catch(() => {});
    const s = STR.results.copyStringEn(n, calc.pCappedByN(p, n), rmin, rmax);
    await Clipboard.setStringAsync(s);
  }, [n, p, rmin, rmax]);

  // ---- pages: title, 5 sections, footnote ----
  const pages = useMemo(() => ['title', 's1', 's2', 's3', 's4', 's5', 'foot'], []);
  // Landscape: swipe vertical. Portrait: swipe horizontal.
  const swipeVertical = orientationIsLandscape;

  const renderPage = (item) => {
    return (
      <View key={item} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.bg }}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 8 }}
          keyboardShouldPersistTaps="handled"
          // Inner ScrollView nesting hint: PagerView consumes the
          // cross-axis gesture; the page's own scroll only triggers
          // along its OWN axis.
          nestedScrollEnabled
        >
          {item === 'title' && (
            <BiText
              zh={STR.app.titleZh} en={STR.app.titleEn}
              fontZh={FONT.song} fontEn={FONT.song}
              sizeZh={26} sizeEn={22} color={theme.text}
              align="center" underlineZh={STR.app.titleUnderlineZh}
              weight="700"   /* "Swiss Round Calculator" is the only bold title */
              style={{ marginTop: 18, marginBottom: 8 }}
            />
          )}
          {item === 's1' && (
            <Section titleZh={STR.tournament.sectionZh} titleEn={STR.tournament.sectionEn}>
              <FieldRow nameZh={STR.tournament.nNameZh} nameEn={STR.tournament.nNameEn} sym={STR.tournament.nSym}
                descZh={STR.tournament.nDescZh} descEn={STR.tournament.nDescEn}>
                <NumberField value={params.n} onChange={(v) => updateParam({ n: v === '' ? DEFAULTS.n : v })} min={DEFAULTS.nMin} max={DEFAULTS.nMax} placeholder={DEFAULTS.n} />
              </FieldRow>
              <FieldRow nameZh={STR.tournament.pNameZh} nameEn={STR.tournament.pNameEn} sym={STR.tournament.pSym}
                descZh={STR.tournament.pDescZh} descEn={STR.tournament.pDescEn}>
                <NumberField value={params.p} onChange={(v) => updateParam({ p: v === '' ? DEFAULTS.p : v })} min={DEFAULTS.pMin} max={DEFAULTS.pMaxAbs} placeholder={DEFAULTS.p} />
              </FieldRow>
              <FieldRow nameZh={STR.tournament.dNameZh} nameEn={STR.tournament.dNameEn} sym={STR.tournament.dSym}
                descZh={STR.tournament.dDescZh} descEn={STR.tournament.dDescEn}>
                <NumberField value={params.d} onChange={(v) => updateParam({ d: v === '' ? DEFAULTS.d : v })} min={DEFAULTS.dMin} max={DEFAULTS.dMax} placeholder={DEFAULTS.d} />
              </FieldRow>
            </Section>
          )}
          {item === 's2' && (
            <Section titleZh={STR.results.sectionZh} titleEn={STR.results.sectionEn}>
              <FieldRow nameZh={STR.results.roundsNameZh} nameEn={STR.results.roundsNameEn} sym={STR.results.roundsSym}
                descZh={STR.results.roundsDescZh.replace('<p>', String(calc.pCappedByN(p, n)))}
                descEn={STR.results.roundsDescEn.replace('<p>', String(calc.pCappedByN(p, n)))}
                tipTokenList={['Rmin', '-', 'Rmax']}>
                <OutputBox value={`${rmin} – ${rmax}`} />
              </FieldRow>
              <FieldRow nameZh={STR.results.erNameZh} nameEn={STR.results.erNameEn} sym={STR.results.erSym}
                descZh={STR.results.erDescZh} descEn={STR.results.erDescEn}
                tipTokenList={['ERmin', '-', 'ERmax']}>
                <OutputBox value={`${erMin} – ${erMax}`} />
              </FieldRow>
              <FieldRow nameZh={STR.results.lNameZh} nameEn={STR.results.lNameEn} sym={STR.results.lSym}
                descZh={STR.results.lDescZh.replace('<p>', String(calc.pCappedByN(p, n)))}
                descEn={STR.results.lDescEn.replace('<p>', String(calc.pCappedByN(p, n)))}
                tipTokenList={['LmaxRmin', '-', 'LmaxRmax']}>
                <OutputBox value={`${lMinR} – ${lMaxR}`} />
              </FieldRow>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Pressable onPress={copyZh} style={[styles.btn, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.results.copyZh}</Text>
                </Pressable>
                <Pressable onPress={copyEn} style={[styles.btn, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.results.copyEn}</Text>
                </Pressable>
              </View>
            </Section>
          )}
          {item === 's3' && (
            <Section titleZh={STR.reverse.sectionZh} titleEn={STR.reverse.sectionEn}>
              <FieldRow nameZh={STR.reverse.rNameZh} nameEn={STR.reverse.rNameEn} sym={STR.reverse.rSym}
                descZh={STR.reverse.rDescZh} descEn={STR.reverse.rDescEn}>
                <NumberField value={params.r} onChange={(v) => updateParam({ r: v })} min={DEFAULTS.rMin} max={DEFAULTS.rMax} placeholder={DEFAULTS.rPlaceholder} />
              </FieldRow>
              <FieldRow nameZh={STR.reverse.rangeNameZh} nameEn={STR.reverse.rangeNameEn} sym={STR.reverse.rangeSym}
                descZh={STR.reverse.rangeDescZh.replace('<r>', String(rEff)).replace('<p>', String(p))}
                descEn={STR.reverse.rangeDescEn.replace('<r>', String(rEff)).replace('<p>', String(p))}
                tipTokenList={['Nmin', '-', 'Nmax']}>
                <OutputBox value={`${nMn} – ${nMx}`} />
              </FieldRow>
              <FieldRow nameZh={STR.reverse.lNameZh} nameEn={STR.reverse.lNameEn} sym={STR.reverse.lSym}
                descZh={STR.reverse.lDescZh.replace('<n>', String(n)).replace('<r>', String(rEff)).replace('<p>', String(calc.pCappedByN(p, n)))}
                descEn={STR.reverse.lDescEn.replace('<n>', String(n)).replace('<r>', String(rEff)).replace('<p>', String(calc.pCappedByN(p, n)))}
                tipTokenList={['LmaxNmin', '-', 'Lmax', '-', 'LmaxNmax']}>
                <OutputBox value={`${lNmin} – ${lForN} – ${lNmax}`} width={150} />
              </FieldRow>
            </Section>
          )}
          {item === 's4' && (
            <Section
              titleZh={STR.matrix.sectionZh}
              titleEn={STR.matrix.sectionEn}
              titleTipZh={STR.matrix.sectionDescZh.replace('<p>', String(p))}
              titleTipEn={STR.matrix.sectionDescEn.replace('<p>', String(p))}
            >
              <MatrixTable n={n} p={p} d={d} rRangeMin={nMn} rRangeMax={nMx} />
            </Section>
          )}
          {item === 's5' && (
            <Section titleZh={STR.note.sectionZh} titleEn={STR.note.sectionEn} titleAlign="left">
              <Text style={[styles.para, { color: theme.text, fontFamily: FONT.goround }]}>{STR.note.p1Zh}</Text>
              <Text style={[styles.para, { color: theme.text, fontFamily: FONT.goround, marginBottom: 12 }]}>{STR.note.p1En}</Text>
              <Text style={[styles.para, { color: theme.text, fontFamily: FONT.goround }]}>{STR.note.p2Zh}</Text>
              <Text style={[styles.para, { color: theme.text, fontFamily: FONT.goround, marginBottom: 12 }]}>{STR.note.p2En}</Text>
              <Text style={[styles.para, { color: theme.text, fontFamily: FONT.goround }]}>{STR.note.p3Zh}</Text>
              <Text style={[styles.para, { color: theme.text, fontFamily: FONT.goround }]}>{STR.note.p3En}</Text>
            </Section>
          )}
          {item === 'foot' && (
            <View style={{ marginTop: 24, marginBottom: 24, paddingHorizontal: 16 }}>
              <BiText
                zh={STR.app.footnoteZh} en={STR.app.footnoteEn}
                fontZh={FONT.song} fontEn={FONT.song}
                sizeZh={13} sizeEn={13} color={theme.text}
                align="center" underlineZh={STR.app.footnoteUnderline}
              />
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Web: just scroll vertically through all pages.
  if (Platform.OS === 'web') {
    return (
      <KeyboardAvoidingView behavior={undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          {pages.map((k) => (<View key={k}>{renderPage(k)}</View>))}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Native with PagerView available.
  if (PagerView) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: theme.bg }}
      >
        <PagerView
          ref={pagerRef}
          // Re-create when axis flips so PagerView picks up the new
          // `orientation` prop (it cannot switch in place).
          key={swipeVertical ? 'v' : 'h'}
          style={{ flex: 1 }}
          orientation={swipeVertical ? 'vertical' : 'horizontal'}
          initialPage={currentPage}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
          // Allow PagerView to coexist with inner ScrollViews — slow
          // pan inside a page = inner scroll; fast flick across page
          // boundary = page change.
          overdrag
        >
          {pages.map((k) => renderPage(k))}
        </PagerView>
      </KeyboardAvoidingView>
    );
  }

  // Fallback (Expo Go without dev client): single ScrollView listing every page.
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} onScrollBeginDrag={() => Keyboard.dismiss()}>
        {pages.map((k) => (<View key={k}>{renderPage(k)}</View>))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  // Chinese / English / symbol all at the SAME colour with near-equal
  // sizes; the symbol sits BELOW the English line (not inline).
  zhLabel:  { fontSize: 15, lineHeight: 19 },
  enLabel:  { fontSize: 14, lineHeight: 18 },
  symLabel: { fontSize: 13, lineHeight: 17, marginTop: 2 },
  output: { height: 38, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  outputText: { fontSize: 15 },
  btn: { flex: 1, marginHorizontal: 4, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnT: { fontSize: 14, fontWeight: '600' },
  para: { fontSize: 13, lineHeight: 18, textAlign: 'left' },
});
