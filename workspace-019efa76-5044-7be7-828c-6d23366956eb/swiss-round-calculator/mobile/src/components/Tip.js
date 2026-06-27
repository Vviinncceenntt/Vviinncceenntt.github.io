/**
 * Bilingual tooltip / toggletip.
 *
 *   <Tip zh="…" en="…">  <Anchor/>  </Tip>
 *
 * Behaviour:
 *  - Long-press / tap on the anchor toggles a bubble.
 *  - The bubble flips above / below based on measured space so it never
 *    spills off-screen.
 *  - Tap-outside / tap-again dismisses (handled by the parent OutsideTap).
 *  - z-index is elevated so the bubble floats above subsequent rows of
 *    the matrix table (including following rows).
 */
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { useApp } from '../context/AppContext';
import { FONT } from '../theme/themes';

let openSetter = null;          // global single-open coordinator
export function dismissAllTips() { if (openSetter) openSetter(null); }

let tipId = 0;
export default function Tip({ zh, en, children, maxWidth = 280, style }) {
  const id = useRef(++tipId).current;
  const { theme } = useApp();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'below' });
  const anchorRef = useRef(null);

  const measure = useCallback(() => {
    if (!anchorRef.current) return;
    anchorRef.current.measureInWindow((x, y, w, h) => {
      const win = Dimensions.get('window');
      const placeBelow = y + h + 120 < win.height - 90; // keep clear of bottom nav (~70-90)
      const top = placeBelow ? y + h + 6 : Math.max(8, y - 120);
      let left = x + w / 2 - maxWidth / 2;
      if (left < 8) left = 8;
      if (left + maxWidth > win.width - 8) left = win.width - maxWidth - 8;
      setPos({ top, left, placement: placeBelow ? 'below' : 'above' });
    });
  }, [maxWidth]);

  const toggle = useCallback(() => {
    if (open) { setOpen(false); openSetter = null; return; }
    if (openSetter && openSetter !== setOpen) openSetter(null);
    openSetter = setOpen;
    measure();
    setOpen(true);
  }, [open, measure]);

  return (
    <View ref={anchorRef} style={[{ position: 'relative' }, style]}>
      <Pressable
        onPress={toggle}
        onLongPress={toggle}
        // desktop / RN web hover
        onHoverIn={() => { if (Platform.OS === 'web') { measure(); setOpen(true); } }}
        onHoverOut={() => { if (Platform.OS === 'web') setOpen(false); }}
        onFocus={() => { measure(); setOpen(true); }}
        onBlur={() => setOpen(false)}
        accessibilityRole="button"
        accessibilityLabel={`${zh} / ${en}`}
      >
        {children}
      </Pressable>
      {open && (
        <View
          pointerEvents="box-none"
          style={[
            styles.bubble,
            {
              top: pos.top,
              left: pos.left,
              maxWidth,
              backgroundColor: theme.tooltipBg,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <Text style={[styles.tipText, { color: theme.tooltipText, fontFamily: FONT.goround }]}>{zh}</Text>
          <Text style={[styles.tipText, { color: theme.tooltipText, fontFamily: FONT.goround }]}>{en}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 9999,
    elevation: 24,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    // RN doesn't render `position: 'fixed'`; we measure in window coords and
    // mount the bubble inside the anchor's parent. For the matrix table where
    // tips must clear later rows, anchor inside an overflow:'visible' container.
  },
  tipText: { fontSize: 13, lineHeight: 18 },
});
