/**
 * Onboarding gate. Shows "I Agree" checkbox + 4 linked legal docs. The
 * "I Accept" button is disabled until the checkbox is on. Tapping it:
 *  - fires Haptics.selectionAsync
 *  - detects OS for store-routing copy
 *  - asks RevenueCat for subscription status
 *      • active & expiring in <1 month -> reminder alert (OK / Extend)
 *      • active & expiring in >=1 month -> proceed silently
 *      • inactive / expired -> open Paywall
 *      • offline -> allow into app so the user can restore from Settings
 *
 * Offline fallback date/time appears on THIS screen (per spec).
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, Linking, StyleSheet, ScrollView,
  Platform, ActivityIndicator, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import { useApp } from '../context/AppContext';
import { STR, URLS } from '../constants/strings';
import { FONT } from '../theme/themes';
import BiText from '../components/BiText';
import { getSubscriptionStatus, warmRevenueCat } from '../utils/revenuecat';
import { warmCache } from '../utils/pageCache';
import Paywall from './Paywall';

const fmtDate = (d) => {
  if (!d) return '';
  const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0'); const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

export default function OnboardingScreen({ onComplete }) {
  const { theme, completeOnboarding } = useApp();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const openUrl = (u) => Linking.openURL(u).catch(() => {});

  const showReminder = (expiry) => {
    return new Promise((resolve) => {
      Alert.alert(
        `${STR.reminder.titleZh}\n${STR.reminder.titleEn}`,
        `${STR.reminder.bodyZh(fmtDate(expiry))}\n\n${STR.reminder.bodyEn(fmtDate(expiry))}`,
        [
          { text: `${STR.reminder.okZh} / ${STR.reminder.okEn}`, onPress: () => resolve('ok') },
          { text: `${STR.reminder.extendZh} / ${STR.reminder.extendEn}`, onPress: () => resolve('extend') },
        ],
        { cancelable: true }
      );
    });
  };

  const handleAccept = useCallback(async () => {
    if (!agree || busy) return;
    Haptics.selectionAsync().catch(() => {});
    setBusy(true);

    // Determine OS for store routing (used in Paywall copy)
    const _osIsIOS = Platform.OS === 'ios';

    // Background-refresh every menu's offline cache + the RevenueCat
    // annual price + subscription status while the user is here.
    // Every linked page now carries a
    //     <!-- last modified on YYYY-MM-DD -->
    // HTML comment on its last line, so refresh is conditional for
    // ALL pages — overwrite the local cache only when the remote
    // date is strictly newer than the cached one.
    // The RC price is cached so the Paywall never has to hard-code
    // "HKD 30" unless there is literally no network and no cache
    // (extremely rare).
    warmCache({
      functions:  { url: URLS.func, hasDate: true },
      legal_pp:   { url: URLS.pp,   hasDate: true },
      legal_eula: { url: URLS.eula, hasDate: true },
      legal_tc:   { url: URLS.tc,   hasDate: true },
      legal_disc: { url: URLS.disc, hasDate: true },
      wong:       { url: URLS.wong, hasDate: true },
    });
    warmRevenueCat();

    const status = await getSubscriptionStatus();
    const net = await NetInfo.fetch();

    if (status.offline || !net.isConnected) {
      // Allow into the app so user can use restore from Settings
      completeOnboarding();
      onComplete?.();
      setBusy(false);
      return;
    }

    if (status.active) {
      // expiry within 1 month? (use setMonth as required)
      if (status.expiry) {
        const oneMonthAhead = new Date();
        oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 1);
        if (status.expiry <= oneMonthAhead) {
          const choice = await showReminder(status.expiry);
          if (choice === 'extend') {
            setPaywall(true);
            setBusy(false);
            return;
          }
        }
      }
      completeOnboarding();
      onComplete?.();
      setBusy(false);
      return;
    }

    // not active -> paywall
    setPaywall(true);
    setBusy(false);
  }, [agree, busy, completeOnboarding, onComplete]);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ backgroundColor: theme.bg }}>
      <View style={[styles.wrap, { backgroundColor: theme.bg }]}>
        <BiText
          zh={STR.app.titleZh}
          en={STR.app.titleEn}
          fontZh={FONT.song}
          fontEn={FONT.song}
          sizeZh={24}
          sizeEn={20}
          color={theme.text}
          align="center"
          underlineZh={STR.app.titleUnderlineZh}
          weight="700"   /* "Swiss Round Calculator" is the only bold title */
          style={{ marginBottom: 18 }}
        />

        <BiText zh={STR.onboarding.headerZh} en={STR.onboarding.headerEn} sizeZh={16} sizeEn={14} color={theme.text} style={{ marginBottom: 18 }} />

        {/* Agree checkbox */}
        <Pressable
          onPress={() => setAgree((v) => !v)}
          style={styles.agreeRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agree }}
        >
          <View style={[styles.check, { borderColor: theme.text, backgroundColor: agree ? theme.primary : 'transparent' }]}>
            {agree && <Text style={{ color: theme.primaryText, fontWeight: '700' }}>✓</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.agreeText, { color: theme.text, fontFamily: FONT.song }]}>{STR.onboarding.agreeZh}</Text>
            <Text style={[styles.agreeText, { color: theme.text, fontFamily: FONT.song }]}>{STR.onboarding.agreeEn}</Text>
          </View>
        </Pressable>

        <View style={styles.links}>
          {[
            { zh: STR.onboarding.ppZh, en: STR.onboarding.ppEn, url: URLS.pp },
            { zh: STR.onboarding.eulaZh, en: STR.onboarding.eulaEn, url: URLS.eula },
            { zh: STR.onboarding.tcZh, en: STR.onboarding.tcEn, url: URLS.tc },
            { zh: STR.onboarding.discZh, en: STR.onboarding.discEn, url: URLS.disc },
          ].map((l, i) => (
            <Pressable key={i} onPress={() => openUrl(l.url)} style={styles.link}>
              <Text style={[styles.linkText, { color: theme.primary, fontFamily: FONT.song }]}>{l.zh}</Text>
              <Text style={[styles.linkText, { color: theme.primary, fontFamily: FONT.song }]}>{l.en}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleAccept}
          disabled={!agree || busy}
          style={[
            styles.accept,
            {
              backgroundColor: !agree || busy ? theme.border : theme.primary,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <>
              <Text style={[styles.acceptT, { color: theme.primaryText, fontFamily: FONT.song }]}>{STR.onboarding.acceptZh}</Text>
              <Text style={[styles.acceptT, { color: theme.primaryText, fontFamily: FONT.song }]}>{STR.onboarding.acceptEn}</Text>
            </>
          )}
        </Pressable>

        {busy && (
          <BiText zh={STR.onboarding.checkingZh} en={STR.onboarding.checkingEn} sizeZh={12} sizeEn={11} color={theme.textSoft} style={{ marginTop: 12 }} />
        )}

        {/* Offline fallback date/time at the bottom of the onboarding page */}
        <View style={{ marginTop: 30 }}>
          <Text style={{ color: theme.textSoft, fontFamily: FONT.song, fontSize: 12, textAlign: 'center' }}>
            {STR.onboarding.offlineNoteZh}{fmtDate(now)}
          </Text>
          <Text style={{ color: theme.textSoft, fontFamily: FONT.song, fontSize: 12, textAlign: 'center' }}>
            {STR.onboarding.offlineNoteEn}{fmtDate(now)}
          </Text>
        </View>
      </View>

      <Paywall
        visible={paywall}
        onClose={() => setPaywall(false)}
        onPurchased={() => {
          setPaywall(false);
          completeOnboarding();
          onComplete?.();
        }}
        onFailed={() => {
          setPaywall(false);
          // remain on onboarding (alert handled inside Paywall)
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 36 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  check: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  agreeText: { fontSize: 13 },
  links: { marginBottom: 26 },
  link: { paddingVertical: 6 },
  linkText: { fontSize: 14, textDecorationLine: 'underline', textAlign: 'left' },
  accept: { padding: 14, borderRadius: 10, alignItems: 'center' },
  acceptT: { fontSize: 16, fontWeight: '700' },
});
