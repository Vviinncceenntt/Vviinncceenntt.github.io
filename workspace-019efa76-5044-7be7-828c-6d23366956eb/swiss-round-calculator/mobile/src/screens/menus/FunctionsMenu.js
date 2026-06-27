/**
 * Functions popup.
 *
 * Behaviour:
 *   - Online: load the canonical GitHub Pages URL directly. The remote
 *     stylesheet (https://vviinncceenntt.github.io/.../style.css)
 *     declares every @font-face needed, so layout, fonts and MathJax
 *     scripts render exactly as on the source site.
 *   - Offline: fall back to the local cache (refreshed in the
 *     background each time the user opens the dashboard).
 *   - Web build uses an <iframe>; native uses a <WebView>.
 *
 * We deliberately do NOT inject fonts or inline the page content —
 * earlier alpha/beta versions tried both and produced inconsistent
 * "font bouncing". The iframe / WebView reading directly from the
 * source URL is the proven-stable path.
 */
import React, { useEffect, useState } from 'react';
import { View, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';
import { STR, URLS } from '../../constants/strings';
import { FONT } from '../../theme/themes';
import { INJECTED_DARK, INJECTED_LIGHT, TEXT_RENDER_FIX } from '../../utils/webviewDarkMode';
import { refreshCache, cachedFileUri } from '../../utils/pageCache';
import { LIPSUM } from '../../constants/lipsum';

const KEY = 'functions';

export default function FunctionsMenu({ visible, onClose }) {
  const { theme } = useApp();
  const [source, setSource] = useState(null);   // {uri: ...}
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setReady(false);
    let cancelled = false;

    (async () => {
      // Online-first: pick the live URL whenever we have network.
      // Offline: prefer the cached file:// URI; if the cache also
      // doesn't exist, fall through to the live URL anyway so the
      // WebView shows its native "no internet" page instead of nothing.
      const net = await NetInfo.fetch().catch(() => ({ isConnected: true }));
      if (cancelled) return;
      if (net.isConnected) {
        setSource({ uri: URLS.func });
      } else {
        // Offline: try cache, then last-resort lipsum.
        const cached = await cachedFileUri(KEY);
        if (cached) setSource({ uri: cached });
        else setSource({ html: LIPSUM.functions });
      }

      // Background refresh — unconditional (no date line on this page).
      refreshCache(KEY, URLS.func, { hasDate: true }).catch(() => {});
    })();

    return () => { cancelled = true; };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      titleZh={STR.nav.funcZh}
      titleEn={STR.nav.funcEn}
      titleFontZh={FONT.hei}
      titleFontEn={FONT.hei}
    >
      <View style={{ width: '100%', height: 520 }}>
        {!ready && (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color={theme.primary} />
          </View>
        )}
        {Platform.OS === 'web' ? (
          <iframe
            src={URLS.func}
            style={{
              border: 0, width: '100%', height: '100%',
              background: '#FFFFFF',
              filter: theme.mode === 'dark' ? 'invert(1) hue-rotate(180deg)' : 'none',
            }}
            onLoad={() => setReady(true)}
            title="Functions"
          />
        ) : source ? (
          <WebView
            source={source}
            originWhitelist={['*']}
            onLoad={() => setReady(true)}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            injectedJavaScript={(theme.mode === 'dark' ? INJECTED_DARK : INJECTED_LIGHT) + TEXT_RENDER_FIX}
            injectedJavaScriptBeforeContentLoaded={(theme.mode === 'dark' ? INJECTED_DARK : INJECTED_LIGHT) + TEXT_RENDER_FIX}
            onMessage={() => {}}
            style={{ flex: 1, backgroundColor: theme.mode === 'dark' ? '#111' : '#FFFFFF' }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
