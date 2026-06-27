/**
 * Paywall - shown only after RevenueCat reports inactive subscription.
 * Price is read from the actual annual package (never hard-coded display);
 * a fallback "30 HKD" string is used only if RC is offline.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { STR } from '../constants/strings';
import { FONT } from '../theme/themes';
import { purchaseAnnual, restorePurchases, getSubscriptionStatus, getAnnualPriceLabel } from '../utils/revenuecat';

export default function Paywall({ visible, onClose, onPurchased, onFailed }) {
  const { theme } = useApp();
  // priceInfo: { priceString, source: 'live'|'cache'|'fallback' }
  const [priceInfo, setPriceInfo] = useState({ priceString: '', source: 'fallback' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      // Pull the latest price label — tries live first, falls back to
      // AsyncStorage cache, finally to BASE_PRICE/CURRENCY only if no
      // network and no cache exist yet. NO hard-coded HKD30 unless we
      // truly have nothing.
      const info = await getAnnualPriceLabel();
      setPriceInfo(info);
    })();
  }, [visible]);

  const priceLabel = priceInfo.priceString || '';

  const handleBuy = async () => {
    setBusy(true);
    Haptics.selectionAsync().catch(() => {});
    try {
      await purchaseAnnual();
      // re-check status after purchase
      const status = await getSubscriptionStatus();
      if (status.active) {
        onPurchased?.();
      } else {
        Alert.alert(
          `${STR.errors.failedZh}\n${STR.errors.failedEn}`,
          undefined,
          [{ text: 'OK' }],
        );
        onFailed?.();
      }
    } catch (e) {
      const msg = (e?.userCancelled || /cancel/i.test(e?.message || ''))
        ? `${STR.errors.cancelledZh}\n${STR.errors.cancelledEn}`
        : `${STR.errors.failedZh}\n${STR.errors.failedEn}`;
      Alert.alert(msg, undefined, [{ text: 'OK' }]);
      onFailed?.();
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      await restorePurchases();
      const status = await getSubscriptionStatus();
      if (status.active) onPurchased?.();
      else Alert.alert(`${STR.errors.restoreFailZh}\n${STR.errors.restoreFailEn}`);
    } catch {
      Alert.alert(`${STR.errors.restoreFailZh}\n${STR.errors.restoreFailEn}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      titleZh={STR.paywall.titleZh}
      titleEn={STR.paywall.titleEn}
    >
      <View style={{ padding: 8 }}>
        <Text style={[styles.body, { color: theme.text, fontFamily: FONT.goround }]}>{STR.paywall.bodyZh}</Text>
        <Text style={[styles.body, { color: theme.text, fontFamily: FONT.goround, marginTop: 8 }]}>{STR.paywall.bodyEn}</Text>

        <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 18 }}>
          <Text style={{ color: theme.text, fontFamily: FONT.goround, fontSize: 18, fontWeight: '700' }}>
            {STR.paywall.pricePrefixZh}{priceLabel}{STR.paywall.pricePerYearZh}
          </Text>
          <Text style={{ color: theme.text, fontFamily: FONT.goround, fontSize: 14 }}>
            {STR.paywall.pricePrefixEn}{priceLabel}{STR.paywall.pricePerYearEn}
          </Text>
        </View>

        <Pressable
          onPress={handleBuy}
          disabled={busy}
          style={[styles.btn, { backgroundColor: theme.primary, opacity: busy ? 0.6 : 1 }]}
        >
          {busy ? <ActivityIndicator color={theme.primaryText} /> : (
            <>
              <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.paywall.subscribeZh}</Text>
              <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.paywall.subscribeEn}</Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={handleRestore} disabled={busy} style={[styles.btnAlt, { borderColor: theme.primary }]}>
          <Text style={[styles.btnT, { color: theme.primary, fontFamily: FONT.goround }]}>{STR.paywall.restoreZh}</Text>
          <Text style={[styles.btnT, { color: theme.primary, fontFamily: FONT.goround }]}>{STR.paywall.restoreEn}</Text>
        </Pressable>

        <Text style={[styles.fine, { color: theme.textSoft, fontFamily: FONT.goround }]}>
          {Platform.OS === 'ios'
            ? '訂閱會於到期前 24 小時自動續期，可於 App Store 設定中取消。'
            : '訂閱會於到期前 24 小時自動續期，可於 Google Play 設定中取消。'}
        </Text>
        <Text style={[styles.fine, { color: theme.textSoft, fontFamily: FONT.goround }]}>
          {Platform.OS === 'ios'
            ? 'Subscription auto-renews 24 hours before expiry unless cancelled. Cancel anytime in App Store settings.'
            : 'Subscription auto-renews 24 hours before expiry unless cancelled. Cancel anytime in Google Play settings.'}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 20, textAlign: 'left' },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  btnAlt: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10, borderWidth: 1 },
  btnT: { fontSize: 14, fontWeight: '700' },
  fine: { fontSize: 11, marginTop: 14, textAlign: 'left' },
});
