/**
 * Bilingual popup modal.
 *
 *  - Cross-button close ("✕"), accessible in landscape on iPhone.
 *  - supportedOrientations covers portrait + landscape so opening a
 *    menu while the app is locked to landscape-left does not throw
 *    UIApplicationInvalidInterfaceOrientation (an iOS hard crash).
 *  - Card padding uses the actual safe-area insets via
 *    useSafeAreaInsets so the modal header (and close button) clears
 *    the iPhone notch in BOTH portrait AND landscape orientations.
 *    Earlier versions used SafeAreaView { edges:['top'] } only, which
 *    failed in landscape where the notch sits on the LEFT.
 */
import React from 'react';
import { Modal as RNModal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { FONT } from '../theme/themes';

export default function Modal({ visible, onClose, titleZh, titleEn, titleFontZh, titleFontEn, children, fullWidth = true }) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <RNModal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
      hardwareAccelerated
    >
      <View
        style={[
          styles.scrim,
          {
            backgroundColor: 'rgba(0,0,0,0.55)',
            // Offset the scrim by the safe-area insets so the centred
            // card (and especially the close button) never disappears
            // under the iPhone notch or the home indicator.
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              width: fullWidth ? '94%' : 480,
            },
          ]}
        >
          {/* Header: titles centred on the FULL card width. The close
           * button is layered above the header via absolute
           * positioning, so the title text is not pushed off-centre
           * by reserving paddingRight for it. */}
          <View style={[styles.head, { borderBottomColor: theme.border }]}>
            <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
              {titleZh ? (
                <Text style={{ color: theme.text, fontFamily: titleFontZh || FONT.hei, fontSize: 17, fontWeight: '400', textAlign: 'center' }}>{titleZh}</Text>
              ) : null}
              {titleEn ? (
                <Text style={{ color: theme.text, fontFamily: titleFontEn || FONT.hei, fontSize: 15, fontWeight: '400', textAlign: 'center' }}>{titleEn}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.close, { backgroundColor: theme.bg, borderColor: theme.border }]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={{ color: theme.text, fontSize: 18, lineHeight: 18 }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: '100%' }} contentContainerStyle={{ padding: 12 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, maxHeight: '92%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  close: {
    position: 'absolute', right: 8, top: 8,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
