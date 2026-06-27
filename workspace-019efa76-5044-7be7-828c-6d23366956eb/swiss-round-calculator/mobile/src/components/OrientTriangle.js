/**
 * Triangular 3-state toggle SWITCH SLIDER (single sliding knob).
 *
 *           ▲  (apex = Auto)
 *          / \
 *         /   \
 *        /     \
 *       /       \
 *      /         \
 *     ◯───────────◯
 *  (Landscape L)  (Portrait)
 *
 * Single circular knob travels along the triangle's edges between the
 * three vertices. Visually matches the theme toggle's knob style
 * (white disc, primary-coloured border, soft shadow).
 *  - Tap a vertex letter to jump the knob to it.
 *  - Drag the knob along the perimeter; on release it snaps to the
 *    closest vertex.
 *  - Web: disabled (orientation lock is mobile-only per spec).
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, PanResponder } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { FONT } from '../theme/themes';

const W = 140, H = 120;
const VERT = {
  auto:      { x: 70,  y: 18  },
  landscape: { x: 18,  y: 104 },
  portrait:  { x: 122, y: 104 },
};
const KNOB_R = 13;

function segNearest(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const px = a.x + t * dx, py = a.y + t * dy;
  return { d: Math.hypot(x - px, y - py), px, py };
}
function snapToPerimeter(x, y) {
  const edges = [
    [VERT.auto, VERT.landscape], [VERT.auto, VERT.portrait], [VERT.landscape, VERT.portrait],
  ];
  let best = { d: Infinity, px: VERT.auto.x, py: VERT.auto.y };
  for (const [a, b] of edges) {
    const r = segNearest(x, y, a, b);
    if (r.d < best.d) best = r;
  }
  return { x: best.px, y: best.py };
}
function nearestVertex(x, y) {
  let bk = 'auto', bd = Infinity;
  for (const k of ['auto', 'landscape', 'portrait']) {
    const d = Math.hypot(x - VERT[k].x, y - VERT[k].y);
    if (d < bd) { bd = d; bk = k; }
  }
  return bk;
}

export default function OrientTriangle({ value, onChange, theme, disabled }) {
  const v = VERT[value] || VERT.auto;
  const xVal = useRef(new Animated.Value(v.x)).current;
  const yVal = useRef(new Animated.Value(v.y)).current;
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);
  const layoutRef = useRef({ x: 0, y: 0, w: W, h: H });

  // External value change → animate to the new vertex.
  useEffect(() => {
    if (dragging) return;
    Animated.spring(xVal, { toValue: v.x, useNativeDriver: false, bounciness: 6, speed: 18 }).start();
    Animated.spring(yVal, { toValue: v.y, useNativeDriver: false, bounciness: 6, speed: 18 }).start();
  }, [v.x, v.y, dragging, xVal, yVal]);

  const onLayout = useCallback(() => {
    containerRef.current?.measureInWindow?.((x, y, w, h) => {
      layoutRef.current = { x, y, w, h };
    });
  }, []);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (e) => {
        setDragging(true);
        const lx = e.nativeEvent.pageX - layoutRef.current.x;
        const ly = e.nativeEvent.pageY - layoutRef.current.y;
        const sx = (lx / layoutRef.current.w) * W;
        const sy = (ly / layoutRef.current.h) * H;
        const s = snapToPerimeter(sx, sy);
        xVal.setValue(s.x); yVal.setValue(s.y);
      },
      onPanResponderMove: (e) => {
        const lx = e.nativeEvent.pageX - layoutRef.current.x;
        const ly = e.nativeEvent.pageY - layoutRef.current.y;
        const sx = (lx / layoutRef.current.w) * W;
        const sy = (ly / layoutRef.current.h) * H;
        const s = snapToPerimeter(sx, sy);
        xVal.setValue(s.x); yVal.setValue(s.y);
      },
      onPanResponderRelease: (e) => {
        const lx = e.nativeEvent.pageX - layoutRef.current.x;
        const ly = e.nativeEvent.pageY - layoutRef.current.y;
        const sx = (lx / layoutRef.current.w) * W;
        const sy = (ly / layoutRef.current.h) * H;
        const key = nearestVertex(sx, sy);
        setDragging(false);
        if (key !== value) onChange(key);
      },
      onPanResponderTerminate: () => setDragging(false),
    })
  ).current;

  // Trough width matches the knob diameter so the slider reads like
  // the rectangular theme toggle's trough (the knob fits *inside* the
  // track, not on top of a thin rail). We draw two stacked polygons:
  // an outer "wide" stroke acting as the trough fill, and an inner
  // hairline stroke acting as the trough border / outline.
  const TROUGH = KNOB_R * 2;     // trough width = knob diameter
  const troughFill = disabled ? theme.border : theme.primary + '33'; // 20 % alpha
  const troughEdge = disabled ? theme.border : theme.primary;

  const knobStyle = {
    position: 'absolute',
    width: KNOB_R * 2, height: KNOB_R * 2, borderRadius: KNOB_R,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: theme.primary,
    shadowColor: '#000',
    shadowOpacity: disabled ? 0 : 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: disabled ? 0 : 4,
    transform: [
      { translateX: Animated.subtract(xVal, KNOB_R) },
      { translateY: Animated.subtract(yVal, KNOB_R) },
    ],
  };

  const tap = (key) => {
    if (disabled) return;
    onChange(key);
  };

  return (
    <View style={[styles.wrap, { opacity: disabled ? 0.5 : 1 }]}>
      <View
        ref={containerRef}
        onLayout={onLayout}
        style={styles.tri}
        {...responder.panHandlers}
      >
        <Svg width={W} height={H}>
          {/* Wide trough fill (capsule-shaped, knob fits inside) */}
          <Polygon
            points={`${VERT.auto.x},${VERT.auto.y} ${VERT.landscape.x},${VERT.landscape.y} ${VERT.portrait.x},${VERT.portrait.y}`}
            fill="none"
            stroke={troughFill}
            strokeWidth={TROUGH}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Thin edge outline on top of the trough fill */}
          <Polygon
            points={`${VERT.auto.x},${VERT.auto.y} ${VERT.landscape.x},${VERT.landscape.y} ${VERT.portrait.x},${VERT.portrait.y}`}
            fill="none"
            stroke={troughEdge}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeDasharray={disabled ? '6 4' : undefined}
          />
        </Svg>
        {/* Tap targets at each vertex */}
        <Pressable onPress={() => tap('auto')} hitSlop={10}
          style={[styles.tapTarget, { left: VERT.auto.x - 13, top: VERT.auto.y - 22 }]}>
          <Text style={{ color: value === 'auto' ? theme.primary : theme.textSoft, fontFamily: FONT.goround, fontSize: 12, fontWeight: '700' }}>A</Text>
        </Pressable>
        <Pressable onPress={() => tap('landscape')} hitSlop={10}
          style={[styles.tapTarget, { left: VERT.landscape.x - 22, top: VERT.landscape.y - 6 }]}>
          <Text style={{ color: value === 'landscape' ? theme.primary : theme.textSoft, fontFamily: FONT.goround, fontSize: 12, fontWeight: '700' }}>L</Text>
        </Pressable>
        <Pressable onPress={() => tap('portrait')} hitSlop={10}
          style={[styles.tapTarget, { left: VERT.portrait.x + 8, top: VERT.portrait.y - 6 }]}>
          <Text style={{ color: value === 'portrait' ? theme.primary : theme.textSoft, fontFamily: FONT.goround, fontSize: 12, fontWeight: '700' }}>P</Text>
        </Pressable>
        {/* The single sliding knob */}
        <Animated.View pointerEvents="none" style={knobStyle} />
      </View>
      <View style={styles.legend}>
        <LegendRow zh="A ＝ 自動"       en="A = Auto"           theme={theme} on={value === 'auto'} />
        <LegendRow zh="L ＝ 橫向（左）" en="L = Landscape Left" theme={theme} on={value === 'landscape'} />
        <LegendRow zh="P ＝ 直向"       en="P = Portrait"       theme={theme} on={value === 'portrait'} />
      </View>
    </View>
  );
}

function LegendRow({ zh, en, theme, on }) {
  // Both lines at FULL text colour and near-equal sizes so the
  // English caption stays as readable as the Chinese caption (was
  // theme.textSoft + smaller font, which looked greyed-out).
  const color = on ? theme.primary : theme.text;
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={{ color, fontSize: 12, fontFamily: FONT.goround, fontWeight: on ? '700' : '400' }}>{zh}</Text>
      <Text style={{ color, fontSize: 11, fontFamily: FONT.goround }}>{en}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tri:  { width: W, height: H, position: 'relative' },
  tapTarget: { position: 'absolute', minWidth: 16, minHeight: 16, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'column' },
});
