import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LIGHT, DARK } from '../theme/themes';
import { DEFAULTS } from '../constants/strings';

const KEY_THEME = '@src/theme';        // 'light' | 'dark' | 'system'
const KEY_ORIENT = '@src/orient';      // 'auto' | 'landscape' | 'portrait'
const KEY_PARAMS = '@src/params';      // {n,p,d,r}
const KEY_ONBOARDED = '@src/onboarded';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [themeMode, setThemeMode] = useState('system');
  const [orientMode, setOrientMode] = useState('auto');
  const [params, setParams] = useState({
    n: DEFAULTS.n, p: DEFAULTS.p, d: DEFAULTS.d, r: '',
  });
  const [onboarded, setOnboarded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [systemColor, setSystemColor] = useState(Appearance.getColorScheme() || 'light');

  // Hydrate persisted state
  useEffect(() => {
    (async () => {
      try {
        const [t, o, p, ob] = await Promise.all([
          AsyncStorage.getItem(KEY_THEME),
          AsyncStorage.getItem(KEY_ORIENT),
          AsyncStorage.getItem(KEY_PARAMS),
          AsyncStorage.getItem(KEY_ONBOARDED),
        ]);
        if (t) setThemeMode(t);
        if (o) setOrientMode(o);
        if (p) setParams((prev) => ({ ...prev, ...JSON.parse(p) }));
        if (ob === '1') setOnboarded(true);
      } catch (e) { /* ignore */ }
      setHydrated(true);
    })();
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSystemColor(colorScheme || 'light')
    );
    return () => sub.remove();
  }, []);

  // Apply orientation lock whenever it changes (native only).
  // Expo SDK 54 API:
  //   - lockAsync(OrientationLock)
  //   - lockPlatformAsync({ screenOrientationArrayIOS, screenOrientationConstantAndroid, screenOrientationLockWeb })
  //   - screenOrientationArrayIOS expects `Orientation[]` (not WebOrientation)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        if (orientMode === 'landscape') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
        } else if (orientMode === 'portrait') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } else {
          // auto = only LANDSCAPE_LEFT + PORTRAIT_UP (no right, no upside-down).
          // Build a platform-specific allow-set using the modern PlatformOrientationInfo shape.
          await ScreenOrientation.lockPlatformAsync({
            screenOrientationArrayIOS: [
              ScreenOrientation.Orientation.LANDSCAPE_LEFT,
              ScreenOrientation.Orientation.PORTRAIT_UP,
            ],
            // Android: SCREEN_ORIENTATION_USER (-1) = honour the user setting
            // among the orientations we declared in app.json. The Info.plist
            // / AndroidManifest entries in app.json already restrict the
            // allowed set to LANDSCAPE_LEFT + PORTRAIT_UP.
            screenOrientationConstantAndroid: -1,
          }).catch(() => {});
        }
      } catch { /* expo-screen-orientation can throw on simulator */ }
    })();
  }, [orientMode]);

  const persist = useCallback(async (key, value) => {
    try { await AsyncStorage.setItem(key, value); } catch {}
  }, []);

  const setTheme = useCallback((mode) => { setThemeMode(mode); persist(KEY_THEME, mode); }, [persist]);
  const setOrient = useCallback((mode) => { setOrientMode(mode); persist(KEY_ORIENT, mode); }, [persist]);
  const updateParam = useCallback((patch) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      persist(KEY_PARAMS, JSON.stringify(next));
      return next;
    });
  }, [persist]);
  const resetParams = useCallback(() => {
    const fresh = { n: DEFAULTS.n, p: DEFAULTS.p, d: DEFAULTS.d, r: '' };
    setParams(fresh); persist(KEY_PARAMS, JSON.stringify(fresh));
  }, [persist]);
  const completeOnboarding = useCallback(() => {
    setOnboarded(true); persist(KEY_ONBOARDED, '1');
  }, [persist]);

  const effectiveColor =
    themeMode === 'system' ? systemColor : themeMode;
  const theme = useMemo(() => (effectiveColor === 'dark' ? DARK : LIGHT), [effectiveColor]);

  const value = {
    hydrated,
    theme,
    themeMode, setTheme,
    orientMode, setOrient,
    params, updateParam, resetParams,
    onboarded, completeOnboarding,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
};
