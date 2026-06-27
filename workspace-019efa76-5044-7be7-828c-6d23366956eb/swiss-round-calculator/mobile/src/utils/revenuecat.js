/**
 * Thin wrapper around react-native-purchases with price caching.
 *
 * Price-display strategy (per spec — do NOT hard-code HKD30):
 *   1. Live: whenever we successfully fetch the annual package from RC,
 *      we cache its priceString (e.g. "HK$30.00", "US$3.99") in
 *      AsyncStorage. The Paywall reads that cache first.
 *   2. Cached: when offline / RC unavailable, the cached string is used.
 *   3. Last-resort fallback: only when there is no cache AND no live
 *      data, we render `${BASE_PRICE} ${BASE_CURRENCY}` (default
 *      30 HKD). This should only ever fire on a brand-new install
 *      that opens the Paywall while offline before ever having seen
 *      a real price — extremely rare.
 *
 * Subscription-status caching follows the same pattern so the user can
 * still see "active until <date>" copy when offline.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};
const IOS_KEY = extra.revenueCatIosKey || process.env.REVENUECAT_IOS_API_KEY;
const ANDROID_KEY = extra.revenueCatAndroidKey || process.env.REVENUECAT_ANDROID_API_KEY;
const ENTITLEMENT = extra.revenueCatEntitlement || 'swiss_round_calculator_pro';
const OFFERING = extra.revenueCatOffering || 'default';
const BASE_PRICE = extra.basePrice || 30;
const BASE_CURRENCY = extra.baseCurrency || 'HKD';

// Expo Go does NOT bundle the native RevenueCat module. Even if the JS
// require() succeeds, configure() will throw "Invalid API key. The
// native store is not available when running inside Expo Go". We skip
// every Purchases call when running there so the console stays clean.
const IS_EXPO_GO = Constants?.appOwnership === 'expo';

const KEY_PRICE  = '@src/rc/price';     // last-known annual price metadata
const KEY_STATUS = '@src/rc/status';    // last-known subscription status

let Purchases = null;
if (!IS_EXPO_GO) {
  try {
    Purchases = require('react-native-purchases').default;
  } catch (e) {
    Purchases = null;
  }
}

let initialised = false;
export async function init() {
  if (initialised || !Purchases) return;
  try {
    const key = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
    if (!key) return;
    await Purchases.configure({ apiKey: key });
    initialised = true;
  } catch (e) { /* ignore */ }
}

async function loadCache(k) {
  try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; }
}
async function saveCache(k, v) {
  try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch {}
}

/**
 * Returns the localised annual price string with a 3-tier fallback.
 *
 * Async helper — call once at app startup (warm) or each time the
 * Paywall opens. Returns the BEST available source:
 *
 *   {
 *     priceString: "HK$30.00",          // what to render
 *     source: "live" | "cache" | "fallback",
 *     priceAmountMicros, currencyCode,  // optional, when available
 *   }
 */
export async function getAnnualPriceLabel() {
  // 1) try live
  if (Purchases) {
    try {
      await init();
      const pkg = await _getAnnualPackageRaw();
      if (pkg && pkg.product) {
        const data = {
          priceString: pkg.product.priceString,
          priceAmountMicros: pkg.product.priceAmountMicros || null,
          currencyCode: pkg.product.currencyCode || null,
          source: 'live',
          fetchedAt: new Date().toISOString(),
        };
        await saveCache(KEY_PRICE, data);
        return data;
      }
    } catch { /* fall through */ }
  }
  // 2) cached
  const cached = await loadCache(KEY_PRICE);
  if (cached && cached.priceString) return { ...cached, source: 'cache' };
  // 3) last-resort default (HKD 30)
  return {
    priceString: `${BASE_CURRENCY} ${BASE_PRICE}`,
    currencyCode: BASE_CURRENCY,
    source: 'fallback',
  };
}

async function _getAnnualPackageRaw() {
  await init();
  const offerings = await Purchases.getOfferings();
  const offering = offerings?.all?.[OFFERING] || offerings?.current;
  if (!offering) return null;
  return offering.annual || offering.availablePackages?.find((p) => p.packageType === 'ANNUAL');
}

/** Subscription status with offline-cache fallback.
 *  Returns { active, expiry, willRenew, productId, offline, source } */
export async function getSubscriptionStatus() {
  if (!Purchases) {
    const cached = await loadCache(KEY_STATUS);
    if (cached) return { ...cached, offline: true, source: 'cache' };
    return { active: false, expiry: null, willRenew: false, productId: null, offline: true, source: 'fallback' };
  }
  try {
    await init();
    const info = await Purchases.getCustomerInfo();
    const ent = info?.entitlements?.active?.[ENTITLEMENT];
    const live = ent
      ? {
          active: true,
          expiry: ent.expirationDate ? new Date(ent.expirationDate).toISOString() : null,
          willRenew: !!ent.willRenew,
          productId: ent.productIdentifier,
        }
      : { active: false, expiry: null, willRenew: false, productId: null };
    await saveCache(KEY_STATUS, live);
    return { ...live, offline: false, source: 'live', expiry: live.expiry ? new Date(live.expiry) : null };
  } catch (e) {
    const cached = await loadCache(KEY_STATUS);
    if (cached) return { ...cached, expiry: cached.expiry ? new Date(cached.expiry) : null, offline: true, source: 'cache', error: e };
    return { active: false, expiry: null, willRenew: false, productId: null, offline: true, source: 'fallback', error: e };
  }
}

export async function getAnnualPackage() {
  if (!Purchases) return null;
  try { return await _getAnnualPackageRaw(); } catch { return null; }
}

export async function purchaseAnnual() {
  if (!Purchases) throw new Error('Purchases unavailable');
  await init();
  const pkg = await _getAnnualPackageRaw();
  if (!pkg) throw new Error('No annual package');
  const result = await Purchases.purchasePackage(pkg);
  return result;
}

export async function restorePurchases() {
  if (!Purchases) throw new Error('Purchases unavailable');
  await init();
  return Purchases.restorePurchases();
}

/** Warm the price + status caches on app launch (fire-and-forget). */
export function warmRevenueCat() {
  getAnnualPriceLabel().catch(() => {});
  getSubscriptionStatus().catch(() => {});
}

export const config = { BASE_PRICE, BASE_CURRENCY, ENTITLEMENT, OFFERING };
