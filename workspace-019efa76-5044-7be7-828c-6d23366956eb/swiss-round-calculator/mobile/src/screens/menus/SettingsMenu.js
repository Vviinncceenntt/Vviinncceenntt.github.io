/**
 * Settings popup. Real toggle switches for Theme and Orientation Lock.
 * - Theme:   Light <-> Dark toggle (system fallback otherwise)
 * - Orient:  3-way segmented toggle (Auto / Landscape Left / Portrait)
 *            (grayed-out in web; only writes when on native)
 * - Restore Purchase, Reset Parameters, Manage Subscription, Version.
 */
import React from 'react';
import {
  View, Text, Pressable, Switch, Alert, Linking, Platform, StyleSheet,
} from 'react-native';
import Constants from 'expo-constants';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';
import { STR, URLS } from '../../constants/strings';
import { FONT } from '../../theme/themes';
import BiText from '../../components/BiText';
import OrientTriangle from '../../components/OrientTriangle';
import { restorePurchases, getSubscriptionStatus } from '../../utils/revenuecat';

const APP_VERSION = Constants?.expoConfig?.version || '1.0.0';

/** Stacked bilingual label (zh on top of en) at FULL text colour and
 *  near-equal sizes so the English line stays readable in both light
 *  and dark themes. */
function BiOpt({ zh, en, color, small }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color, fontFamily: FONT.goround, fontSize: small ? 12 : 13 }}>{zh}</Text>
      <Text style={{ color, fontFamily: FONT.goround, fontSize: small ? 11 : 12 }}>{en}</Text>
    </View>
  );
}

export default function SettingsMenu({ visible, onClose }) {
  const { theme, themeMode, setTheme, orientMode, setOrient, resetParams } = useApp();
  const [busy, setBusy] = React.useState(false);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && theme.mode === 'dark');

  const handleRestore = async () => {
    setBusy(true);
    try {
      await restorePurchases();
      const s = await getSubscriptionStatus();
      Alert.alert(
        s.active
          ? `${STR.errors.restoreOkZh}\n${STR.errors.restoreOkEn}`
          : `${STR.errors.restoreFailZh}\n${STR.errors.restoreFailEn}`
      );
    } catch {
      Alert.alert(`${STR.errors.restoreFailZh}\n${STR.errors.restoreFailEn}`);
    } finally { setBusy(false); }
  };

  const handleManage = () => {
    const url = Platform.OS === 'ios' ? URLS.iosManage : URLS.androidManage;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      titleZh={STR.nav.setZh}
      titleEn={STR.nav.setEn}
      titleFontZh={FONT.hei}
      titleFontEn={FONT.hei}
    >
      {/* Theme */}
      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        <View style={{ flexShrink: 1 }}>
          <BiText zh={STR.settings.themeZh} en={STR.settings.themeEn} sizeZh={14} sizeEn={12} color={theme.text} align="left" />
        </View>
        <View style={styles.toggleBlock}>
          <BiOpt zh={STR.settings.lightZh} en={STR.settings.lightEn} color={theme.text} />
          <Switch
            value={isDark}
            onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
            thumbColor={Platform.OS === 'android' ? (isDark ? theme.primary : '#FFF') : undefined}
            trackColor={{ false: theme.border, true: theme.primary }}
            ios_backgroundColor={theme.border}
          />
          <BiOpt zh={STR.settings.darkZh} en={STR.settings.darkEn} color={theme.text} />
        </View>
      </View>

      {/* Orientation */}
      <View style={[styles.row, { borderBottomColor: theme.border, alignItems: 'flex-start' }]}>
        <View style={{ flexShrink: 1 }}>
          <BiText zh={STR.settings.orientZh} en={STR.settings.orientEn} sizeZh={14} sizeEn={12} color={theme.text} align="left" />
          {Platform.OS === 'web' && (
            <BiText
              zh={STR.settings.orientWebDisabledZh}
              en={STR.settings.orientWebDisabledEn}
              sizeZh={11} sizeEn={10}
              color={theme.textSoft}
              align="left"
              style={{ marginTop: 2 }}
            />
          )}
        </View>
        <OrientTriangle
          value={orientMode}
          onChange={setOrient}
          theme={theme}
          disabled={Platform.OS === 'web'}
        />
      </View>

      {/* Restore */}
      <Pressable onPress={handleRestore} disabled={busy} style={[styles.btn, { backgroundColor: theme.primary }]}>
        <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.settings.restoreZh}</Text>
        <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.settings.restoreEn}</Text>
      </Pressable>

      {/* Reset — same primary blue as Restore and Manage so all action
       * buttons align visually. */}
      <Pressable onPress={() => { resetParams(); Alert.alert('已重設\nReset done'); }} style={[styles.btn, { backgroundColor: theme.primary }]}>
        <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.settings.resetZh}</Text>
        <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.settings.resetEn}</Text>
      </Pressable>

      {/* Manage subscription — same primary blue. */}
      <Pressable onPress={handleManage} style={[styles.btn, { backgroundColor: theme.primary }]}>
        <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.settings.manageZh}</Text>
        <Text style={[styles.btnT, { color: theme.primaryText, fontFamily: FONT.goround }]}>{STR.settings.manageEn}</Text>
      </Pressable>
      <BiText zh={STR.settings.manageHintZh} en={STR.settings.manageHintEn} sizeZh={11} sizeEn={10} color={theme.textSoft} style={{ marginTop: 6, marginBottom: 16 }} />

      {/* Version */}
      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <Text style={{ color: theme.textSoft, fontFamily: FONT.goround }}>
          {STR.settings.versionZh}：{APP_VERSION}
        </Text>
        <Text style={{ color: theme.textSoft, fontFamily: FONT.goround }}>
          {STR.settings.versionEn}: {APP_VERSION}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  toggleBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  btnT: { fontSize: 14, fontWeight: '600' },
});
