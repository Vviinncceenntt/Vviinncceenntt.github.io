/**
 * Wong system popup.
 *
 * Loads the canonical page at https://vviinncceenntt.github.io/wongssystem.html
 * directly when online (so the source's own @font-face declaration in
 * https://vviinncceenntt.github.io/style.css supplies "The Peak Font
 * Plus" — that's how the source renders it, and any divergence we tried
 * in alpha/beta versions caused font bouncing).
 *
 * When offline, falls back to the local cached copy. The cache is
 * refreshed unconditionally on each visit (the page carries no date
 * line).
 */
import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';
import { STR, URLS } from '../../constants/strings';
import { FONT } from '../../theme/themes';
import { INJECTED_DARK, INJECTED_LIGHT, PEAK_FONT_FIX, TEXT_RENDER_FIX } from '../../utils/webviewDarkMode';
import { refreshCache, cachedFileUri } from '../../utils/pageCache';
import { LIPSUM } from '../../constants/lipsum';

const KEY = 'wong';

export default function WongMenu({ visible, onClose }) {
  const { theme } = useApp();
  const [source, setSource] = useState(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const net = await NetInfo.fetch().catch(() => ({ isConnected: true }));
      if (cancelled) return;
      if (net.isConnected) {
        setSource({ uri: URLS.wong });
      } else {
        const cached = await cachedFileUri(KEY);
        if (cached) setSource({ uri: cached });
        else setSource({ html: LIPSUM.wong });
      }
      refreshCache(KEY, URLS.wong, { hasDate: true }).catch(() => {});
    })();
    return () => { cancelled = true; };
  }, [visible]);

  return (
    <Modal visible={visible} onClose={onClose} titleZh={STR.nav.wongZh} titleEn={STR.nav.wongEn} titleFontZh={FONT.hei} titleFontEn={FONT.hei}>
      <View style={{ width: '100%', height: 520 }}>
        {Platform.OS === 'web' ? (
          <iframe
            src={URLS.wong}
            style={{
              border: 0, width: '100%', height: '100%',
              background: '#FFFFFF',
              filter: theme.mode === 'dark' ? 'invert(1) hue-rotate(180deg)' : 'none',
            }}
            title="Wong system"
          />
        ) : source ? (
          <WebView
            source={source}
            originWhitelist={['*']}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            injectedJavaScript={(theme.mode === 'dark' ? INJECTED_DARK : INJECTED_LIGHT) + PEAK_FONT_FIX + TEXT_RENDER_FIX}
            injectedJavaScriptBeforeContentLoaded={(theme.mode === 'dark' ? INJECTED_DARK : INJECTED_LIGHT) + PEAK_FONT_FIX + TEXT_RENDER_FIX}
            onMessage={() => {}}
            style={{ flex: 1, backgroundColor: theme.mode === 'dark' ? '#111' : '#FFFFFF' }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
