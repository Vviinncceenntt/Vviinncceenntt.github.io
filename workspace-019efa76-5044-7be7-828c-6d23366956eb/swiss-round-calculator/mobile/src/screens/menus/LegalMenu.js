/**
 * Legal popup with 4 tabs (PP, EULA, T&C, Disclaimer).
 *
 * Each tab loads the canonical GitHub Pages URL directly when online,
 * and falls back to a local cached file:// URI when offline. The
 * cache is refreshed conditionally: only when the remote
 * "last updated on <date>" line is strictly newer than the cached one.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';
import { STR, URLS } from '../../constants/strings';
import { FONT } from '../../theme/themes';
import { INJECTED_DARK, INJECTED_LIGHT, TEXT_RENDER_FIX } from '../../utils/webviewDarkMode';
import { refreshCache, cachedFileUri } from '../../utils/pageCache';
import { LIPSUM } from '../../constants/lipsum';

const TABS = [
  { key: 'pp',   zh: STR.legal.ppZh,   en: STR.legal.ppEn,   url: URLS.pp,   cacheKey: 'legal_pp' },
  { key: 'eula', zh: STR.legal.eulaZh, en: STR.legal.eulaEn, url: URLS.eula, cacheKey: 'legal_eula' },
  { key: 'tc',   zh: STR.legal.tcZh,   en: STR.legal.tcEn,   url: URLS.tc,   cacheKey: 'legal_tc' },
  { key: 'disc', zh: STR.legal.discZh, en: STR.legal.discEn, url: URLS.disc, cacheKey: 'legal_disc' },
];

export default function LegalMenu({ visible, onClose }) {
  const { theme } = useApp();
  const [tab, setTab] = useState('pp');
  const [source, setSource] = useState(null);

  const cur = TABS.find((t) => t.key === tab);

  useEffect(() => {
    if (!visible || !cur) return;
    setSource(null);
    let cancelled = false;
    (async () => {
      const net = await NetInfo.fetch().catch(() => ({ isConnected: true }));
      if (cancelled) return;
      if (net.isConnected) {
        setSource({ uri: cur.url });
      } else {
        const cached = await cachedFileUri(cur.cacheKey);
        if (cached) setSource({ uri: cached });
        else setSource({ html: LIPSUM[cur.cacheKey] || LIPSUM.legal_pp });
      }
      // Conditionally refresh by parsed "last updated on …" date.
      refreshCache(cur.cacheKey, cur.url, { hasDate: true }).catch(() => {});
    })();
    return () => { cancelled = true; };
  }, [visible, tab]);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      titleZh={STR.nav.legalZh}
      titleEn={STR.nav.legalEn}
      titleFontZh={FONT.song}
      titleFontEn={FONT.song}
    >
      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[
              styles.tab,
              { borderBottomColor: tab === t.key ? theme.primary : 'transparent' },
            ]}
          >
            <Text style={{ color: tab === t.key ? theme.primary : theme.text, fontFamily: FONT.song, fontSize: 12 }}>{t.zh}</Text>
            <Text style={{ color: tab === t.key ? theme.primary : theme.text, fontFamily: FONT.song, fontSize: 10 }}>{t.en}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.enOnly, { color: theme.textSoft, fontFamily: FONT.song }]}>{STR.legal.enOnlyZh}</Text>
      <Text style={[styles.enOnly, { color: theme.textSoft, fontFamily: FONT.song, marginBottom: 6 }]}>{STR.legal.enOnlyEn}</Text>

      <View style={{ width: '100%', height: 460 }}>
        {Platform.OS === 'web' ? (
          <iframe
            src={cur.url}
            style={{
              border: 0, width: '100%', height: '100%',
              background: '#FFFFFF',
              filter: theme.mode === 'dark' ? 'invert(1) hue-rotate(180deg)' : 'none',
            }}
            title={cur.en}
          />
        ) : source ? (
          <WebView
            source={source}
            originWhitelist={['*']}
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

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 6 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 2 },
  enOnly: { fontSize: 11 },
});
