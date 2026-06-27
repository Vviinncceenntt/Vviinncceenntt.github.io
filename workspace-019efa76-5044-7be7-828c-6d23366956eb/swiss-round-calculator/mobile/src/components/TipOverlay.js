/**
 * Global tooltip / toggletip overlay rendered above every other view (incl.
 * subsequent table rows) but below the bottom navigation. Provides a
 * `show(anchorRect, zh, en)` API consumed by <Tip/> anchors.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { FONT } from '../theme/themes';

const Ctx = createContext({ show: () => {}, hide: () => {} });
export const useTip = () => useContext(Ctx);

const BUBBLE_MAX_W = 300;
const BOTTOM_NAV_PAD = 90;

export function TipOverlayProvider({ children }) {
  const { theme } = useApp();
  const [state, setState] = useState(null); // {top,left,zh,en,placement,id}
  const idRef = useRef(0);

  const show = useCallback((anchorRect, zh, en) => {
    const win = Dimensions.get('window');
    const ax = anchorRect.x, ay = anchorRect.y, aw = anchorRect.width, ah = anchorRect.height;
    const placeBelow = ay + ah + 120 < win.height - BOTTOM_NAV_PAD;
    const top = placeBelow
      ? Math.min(win.height - BOTTOM_NAV_PAD - 110, ay + ah + 6)
      : Math.max(8, ay - 120);
    let left = ax + aw / 2 - BUBBLE_MAX_W / 2;
    if (left < 8) left = 8;
    if (left + BUBBLE_MAX_W > win.width - 8) left = win.width - BUBBLE_MAX_W - 8;
    setState({ top, left, zh, en, placement: placeBelow ? 'below' : 'above', id: ++idRef.current });
  }, []);

  const hide = useCallback(() => setState(null), []);

  // Auto-dismiss on orientation change
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', hide);
    return () => sub?.remove?.();
  }, [hide]);

  return (
    <Ctx.Provider value={{ show, hide, current: state?.id }}>
      {children}
      {state && (
        <>
          {/* tap-outside catcher */}
          <Pressable style={StyleSheet.absoluteFill} onPress={hide} />
          <View
            pointerEvents="box-none"
            style={[
              styles.bubble,
              {
                top: state.top,
                left: state.left,
                maxWidth: BUBBLE_MAX_W,
                backgroundColor: theme.tooltipBg,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <Text style={[styles.t, { color: theme.tooltipText, fontFamily: FONT.goround }]}>{state.zh}</Text>
            <Text style={[styles.t, { color: theme.tooltipText, fontFamily: FONT.goround, marginTop: 2 }]}>{state.en}</Text>
          </View>
        </>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 24,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 9999,
  },
  t: { fontSize: 13, lineHeight: 18 },
});
