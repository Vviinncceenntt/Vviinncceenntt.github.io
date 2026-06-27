/**
 * Swiss Round Calculator – React Native (Expo) entry point.
 * Boots fonts, RevenueCat, then renders either Onboarding or Dashboard.
 */
import 'react-native-gesture-handler';      // MUST be first import
import React, { useEffect, useState } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AppProvider, useApp } from './src/context/AppContext';
import { TipOverlayProvider } from './src/components/TipOverlay';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BottomNav from './src/components/BottomNav';
import FunctionsMenu from './src/screens/menus/FunctionsMenu';
import SettingsMenu from './src/screens/menus/SettingsMenu';
import LegalMenu from './src/screens/menus/LegalMenu';
import WongMenu from './src/screens/menus/WongMenu';
import { init as initPurchases } from './src/utils/revenuecat';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { theme, onboarded, hydrated } = useApp();
  const [activeMenu, setActiveMenu] = useState(null);

  if (!hydrated) return null;

  // Apply safe-area to ALL edges so neither the iPhone notch (top +
  // sides in landscape) nor the home indicator (bottom) clips
  // dashboard content, input steppers, table edges, or note paragraphs.
  // The bottom edge sits underneath the BottomNav so the nav itself is
  // treated as the bottom safe-area consumer.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.bg}
      />
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {onboarded ? <DashboardScreen /> : <OnboardingScreen />}
      </View>
      {onboarded && <BottomNav active={activeMenu} onSelect={(k) => setActiveMenu((p) => (p === k ? null : k))} />}
      <FunctionsMenu visible={activeMenu === 'func'} onClose={() => setActiveMenu(null)} />
      <SettingsMenu visible={activeMenu === 'set'} onClose={() => setActiveMenu(null)} />
      <LegalMenu visible={activeMenu === 'legal'} onClose={() => setActiveMenu(null)} />
      <WongMenu visible={activeMenu === 'wong'} onClose={() => setActiveMenu(null)} />
    </SafeAreaView>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // App must start in landscape-left
        if (Platform.OS !== 'web') {
          try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
            await ScreenOrientation.unlockAsync();
          } catch {}
        }
        await Font.loadAsync({
          ChironSungHK: require('./assets/fonts/ChironSungHK.ttf'),
          ChironHeiHK:  require('./assets/fonts/ChironHeiHK.ttf'),
          ChironGoRoundTC: require('./assets/fonts/ChironGoRoundTC.ttf'),
          ThePeakFontPlus: require('./assets/fonts/ThePeakFontPlus.ttf'),
        }).catch(() => {});
        await initPurchases().catch(() => {});
      } finally {
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <TipOverlayProvider>
            <Root />
          </TipOverlayProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
