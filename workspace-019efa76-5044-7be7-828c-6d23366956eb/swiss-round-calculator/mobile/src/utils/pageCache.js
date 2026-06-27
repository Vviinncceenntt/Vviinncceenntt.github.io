/**
 * Offline-fallback cache for the remote HTML pages used by the
 *   Functions / Legal (PP, EULA, T&C, Disclaimer) / Wong system menus.
 *
 * Why this exists at all:
 *   - The spec says menus must "Get element from <URL> and store it
 *     locally for offline fallback caching, but mirroring (use iframe
 *     if other options are unsatisfactory) the GitHub page is preferred
 *     as the primary option".
 *   - In production the WebView / iframe ALWAYS hits the live URL when
 *     online. That keeps fonts, layouts and updates exactly faithful
 *     to the GitHub Pages source, with no font bouncing.
 *   - The cache below is only used WHEN OFFLINE. We refresh it
 *     opportunistically in the background so that the user always has
 *     a recent copy of every page should the network be gone.
 *
 * Two refresh policies:
 *   - hasDate=true   (Legal docs): only overwrite the cache when the
 *     remote "last updated on <date>" line is strictly newer than the
 *     cached one. Conservative; keeps the cache stable.
 *   - hasDate=false  (Functions / Wong system): overwrite the cache
 *     after every successful fetch (the pages have no date line; they
 *     change rarely so unconditional overwrite is fine).
 *
 * Cache layout:
 *   FileSystem.documentDirectory + "pageCache/<key>.html"
 *   FileSystem.documentDirectory + "pageCache/<key>.meta.json"
 */
// expo-file-system v54 split into a new File/Directory API and a legacy
// function-based API. We use the legacy API explicitly to silence the
// deprecation warnings and to keep behaviour stable until SDK 56+.
import * as FileSystem from 'expo-file-system/legacy';

const DIR = (FileSystem.documentDirectory || '') + 'pageCache/';

async function ensureDir() {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  } catch {}
}

/**
 * Parse the "last modified on YYYY-MM-DD" HTML comment that the user
 * now appends to every linked GitHub Pages file (PP, EULA, T&C,
 * Disclaimer, Functions, Wong system).
 *
 * Examples that match:
 *   <!-- webpage by Vincent last modified on 2026-06-22 -->
 *   <!-- last modified on 2026-05-25 -->
 *   <!--Last Modified on 2026-05-25-->
 *
 * Older body-text patterns ("Last updated on 25th May, 2026", Chinese
 * "更新日期：2026年5月25日") are still recognised as a fallback for
 * any page that does not yet carry the new comment.
 */
export function parseUpdatedDate(html) {
  if (!html) return null;

  // Primary: HTML comment on (any line, usually the last) of the file.
  const cmt = String(html).match(/<!--[^>]*?last\s+modified(?:\s+on)?\s*[:\-]?\s*(\d{4})-(\d{2})-(\d{2})[^>]*?-->/i);
  if (cmt) {
    const year = parseInt(cmt[1], 10);
    const month = parseInt(cmt[2], 10) - 1;
    const day = parseInt(cmt[3], 10);
    if (Number.isFinite(year) && month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Fallback: body-text patterns from older pages.
  const txt = String(html).replace(/<[^>]+>/g, ' ');
  const patterns = [
    /last\s+updated(?:\s+on)?\s*[:\-]?\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)[,\s]+(\d{4})/i,
    /last\s+updated(?:\s+on)?\s*[:\-]?\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/i,
    /last\s+updated(?:\s+on)?\s*[:\-]?\s*(\d{4})-(\d{2})-(\d{2})/i,
    /(?:最後更新|更新日期)\s*[：:]\s*(\d{4})[\s年\-](\d{1,2})[\s月\-](\d{1,2})/,
  ];
  const MONTHS = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };
  for (const re of patterns) {
    const m = txt.match(re);
    if (!m) continue;
    try {
      if (re === patterns[0]) {
        const day = parseInt(m[1], 10);
        const month = MONTHS[m[2].toLowerCase()];
        const year = parseInt(m[3], 10);
        if (Number.isFinite(year) && month != null) return new Date(Date.UTC(year, month, day));
      } else if (re === patterns[1]) {
        const month = MONTHS[m[1].toLowerCase()];
        const day = parseInt(m[2], 10);
        const year = parseInt(m[3], 10);
        if (Number.isFinite(year) && month != null) return new Date(Date.UTC(year, month, day));
      } else {
        const year = parseInt(m[1], 10);
        const month = parseInt(m[2], 10) - 1;
        const day = parseInt(m[3], 10);
        return new Date(Date.UTC(year, month, day));
      }
    } catch {}
  }
  return null;
}

const keyOf = (k) => k.replace(/[^a-z0-9_-]/gi, '_');

async function readMeta(key) {
  try {
    const txt = await FileSystem.readAsStringAsync(`${DIR}${keyOf(key)}.meta.json`);
    return JSON.parse(txt);
  } catch { return null; }
}
async function writeMeta(key, meta) {
  await ensureDir();
  await FileSystem.writeAsStringAsync(
    `${DIR}${keyOf(key)}.meta.json`, JSON.stringify(meta)
  );
}

/** Returns local file:// URI to the cache (or null). */
export async function cachedFileUri(key) {
  const path = `${DIR}${keyOf(key)}.html`;
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists ? info.uri : null;
  } catch { return null; }
}

/**
 * Fetch the remote URL and conditionally update the local cache.
 *
 * @param {string} key       cache key (e.g. 'legal_pp', 'functions')
 * @param {string} url       canonical GitHub Pages URL
 * @param {object} options
 * @param {boolean} options.hasDate  true if the page carries a
 *   "last updated on <date>" line we should compare against. Legal
 *   pages = true; Functions / Wong system = false.
 */
export async function refreshCache(key, url, options = {}) {
  const { hasDate = false } = options;
  await ensureDir();
  let html;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    html = await res.text();
  } catch (e) {
    return { changed: false, error: e.message || String(e) };
  }

  if (hasDate) {
    const remoteDate = parseUpdatedDate(html);
    const oldMeta = await readMeta(key);
    const oldDate = oldMeta && oldMeta.updated ? new Date(oldMeta.updated) : null;
    // Only overwrite when the remote date is strictly newer (or either
    // side has no parseable date — then we play it safe and refresh).
    const isNewer = !oldDate || !remoteDate || remoteDate.getTime() > oldDate.getTime();
    if (!isNewer) {
      return { changed: false, updated: oldDate, fetchedAt: oldMeta.fetchedAt };
    }
    const path = `${DIR}${keyOf(key)}.html`;
    await FileSystem.writeAsStringAsync(path, html);
    await writeMeta(key, {
      updated: remoteDate ? remoteDate.toISOString() : null,
      fetchedAt: new Date().toISOString(),
      url,
    });
    return { changed: true, updated: remoteDate, fetchedAt: new Date().toISOString() };
  } else {
    // No date line on the page (Functions, Wong system). Just refresh
    // unconditionally — these pages change rarely so the cost is low.
    const path = `${DIR}${keyOf(key)}.html`;
    await FileSystem.writeAsStringAsync(path, html);
    await writeMeta(key, {
      updated: null,
      fetchedAt: new Date().toISOString(),
      url,
    });
    return { changed: true, updated: null, fetchedAt: new Date().toISOString() };
  }
}

/** Kick off background refreshes for a batch of {key: {url, hasDate}} pairs. */
export function warmCache(map) {
  Object.entries(map).forEach(([k, v]) => {
    const url = typeof v === 'string' ? v : v.url;
    const hasDate = typeof v === 'object' ? !!v.hasDate : false;
    refreshCache(k, url, { hasDate }).catch(() => {});
  });
}
