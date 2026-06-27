/**
 * Anchor that wraps any element and triggers the global tip overlay.
 * Supports hover/focus on desktop (RN-web) and tap on mobile.
 */
import React, { useRef } from 'react';
import { Pressable, Platform } from 'react-native';
import { useTip } from './TipOverlay';

export default function TipAnchor({ zh, en, children, style }) {
  const { show, hide, current } = useTip();
  const ref = useRef(null);
  const myIdRef = useRef(null);

  const trigger = () => {
    if (!ref.current) return;
    ref.current.measureInWindow((x, y, w, h) => {
      // toggle off when re-tapped
      if (myIdRef.current && myIdRef.current === current) { hide(); myIdRef.current = null; return; }
      show({ x, y, width: w, height: h }, zh, en);
      myIdRef.current = (current || 0) + 1;
    });
  };

  return (
    <Pressable
      ref={ref}
      style={style}
      onPress={trigger}
      onLongPress={trigger}
      onHoverIn={Platform.OS === 'web' ? trigger : undefined}
      onHoverOut={Platform.OS === 'web' ? hide : undefined}
      onFocus={trigger}
      onBlur={hide}
      accessibilityRole="button"
      accessibilityLabel={`${zh} / ${en}`}
    >
      {children}
    </Pressable>
  );
}
