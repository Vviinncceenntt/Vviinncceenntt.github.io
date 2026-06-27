/**
 * Stepper input with up/down buttons.
 *  - Digits only.
 *  - Strips leading zeros so "000005" becomes "5".
 *  - Caps to `max` on every keystroke (typing past the max is impossible).
 *  - Enforces `min` on blur (so a partially-typed "1" can become "12"
 *    without snapping up to a higher min while you are mid-edit).
 *  - Throttles onChange propagation to ~100 ms.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { FONT } from '../theme/themes';

const digitsOnly = (s) => (s || '').toString().replace(/[^0-9]/g, '');

export default function NumberField({ value, onChange, min, max, placeholder, step = 1, width = 110 }) {
  const { theme } = useApp();
  const [local, setLocal] = useState(value === '' || value == null ? '' : String(value));
  const t = useRef(null);
  // maxLength chosen so even a max=9999 input cannot accept a 5th digit.
  const maxLen = String(Math.max(min || 0, max || 0)).length || 6;

  useEffect(() => {
    setLocal(value === '' || value == null ? '' : String(value));
  }, [value]);

  const propagate = (s) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => { onChange(s); }, 100);
  };

  // commit=true on blur (enforce min); commit=false during typing.
  const sanitise = (txt, commit) => {
    let v = digitsOnly(txt).replace(/^0+(?=\d)/, '');
    if (v === '') { setLocal(''); propagate(''); return; }
    let n = parseInt(v, 10);
    if (!Number.isFinite(n)) n = min ?? 0;
    if (max != null && n > max) n = max;
    if (commit && min != null && n < min) n = min;
    const s = String(n);
    setLocal(s);
    propagate(s);
  };

  const handle = (txt) => sanitise(txt, false);
  const handleBlur = () => sanitise(local, true);

  const bump = (delta) => {
    const cur = parseInt(local || '0', 10) || (placeholder ?? 0);
    let next = cur + delta * step;
    if (min != null && next < min) next = min;
    if (max != null && next > max) next = max;
    const s = String(next);
    setLocal(s);
    propagate(s);
  };

  return (
    <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.inputBg, width }]}>
      <TextInput
        value={local}
        onChangeText={handle}
        onBlur={handleBlur}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder={placeholder != null ? String(placeholder) : ''}
        placeholderTextColor={theme.textSoft}
        style={[styles.input, { color: theme.inputText, fontFamily: FONT.goround }]}
        maxLength={maxLen}
      />
      <View style={styles.btns}>
        <Pressable onPress={() => bump(+1)} hitSlop={6} style={styles.btn}>
          <Text style={[styles.btnT, { color: theme.text }]}>▲</Text>
        </Pressable>
        <Pressable onPress={() => bump(-1)} hitSlop={6} style={styles.btn}>
          <Text style={[styles.btnT, { color: theme.text }]}>▼</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, paddingLeft: 8, height: 38 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  btns: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#888', justifyContent: 'space-between', height: '100%' },
  btn: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  btnT: { fontSize: 9, lineHeight: 10 },
});
