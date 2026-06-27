/**
 * Bilingual lipsum payloads used as the LAST-RESORT fallback when both
 * the live URL is unreachable AND no local cache exists yet (e.g. the
 * user installed the app offline and has never opened the menu while
 * online). The cache otherwise carries the canonical GitHub Pages copy.
 *
 * Each entry is a complete self-contained HTML document with inline
 * styles so it renders correctly inside a WebView even with no network.
 */
const wrap = (titleZh, titleEn, bodyHtml) => `<!doctype html>
<html lang="zh-Hant-HK"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleEn} / ${titleZh}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, "PingFang HK", "Microsoft JhengHei", system-ui, sans-serif;
         margin: 16px; line-height: 1.55; max-width: 760px; }
  h1 { font-size: 18px; margin: 0 0 12px; }
  h2 { font-size: 14px; margin: 16px 0 6px; }
  p { margin: 6px 0; }
  .warn { background: #FFF8E1; border-left: 4px solid #FFB300; padding: 8px 12px; border-radius: 4px; font-size: 13px; }
  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #EEE; }
    .warn { background: #3a2f10; color: #fff3c4; border-left-color: #FFB300; }
  }
</style></head>
<body>
<h1>${titleZh}<br>${titleEn}</h1>
<div class="warn">
  目前無法連接至遠端伺服器，亦未有此頁面的本機備份。下方為佔位文字（lipsum），實際內容請於有網絡時重新開啟。<br>
  Cannot reach the remote server and no local cache of this page exists yet. The text below is placeholder lipsum; please reopen this menu when online to load the real content.
</div>
${bodyHtml}
</body></html>`;

const lipsumZh = `
<h2>佔位章節一</h2>
<p>本段為臨時佔位文字。正式內容會在裝置連上網絡後自動下載並覆寫此處。所有條款、聲明、政策一概以線上版本為準。</p>
<h2>佔位章節二</h2>
<p>洛勒姆‧伊普索姆，多洛西特‧阿梅特，孔賽科泰圖爾‧阿迪皮西辛‧埃利特。塞德‧多‧欧伊烏斯莫‧泰姆波‧因西迪敦‧烏特‧拉博雷‧多洛雷‧馬尼亞‧阿利夸。</p>
<h2>佔位章節三</h2>
<p>烏特‧埃尼姆‧阿德‧米尼姆‧維尼亞姆，奎斯‧諾斯特魯德‧埃克塞西塔提奧‧烏拉姆科‧拉博利斯‧尼西‧烏特‧阿利奎普‧艾克斯‧伊‧科莫多‧孔塞夸特。</p>
`;
const lipsumEn = `
<h2>Placeholder Section One</h2>
<p>This is temporary placeholder text. The real content downloads automatically once your device is back online and overwrites this page. All terms, declarations and policies are governed by the live online version.</p>
<h2>Placeholder Section Two</h2>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
<h2>Placeholder Section Three</h2>
<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
`;

export const LIPSUM = {
  functions:  wrap('公式',                 'Functions',                 lipsumZh + lipsumEn),
  legal_pp:   wrap('私隱權政策',           'Privacy Policy',            lipsumZh + lipsumEn),
  legal_eula: wrap('終端使用者授權合約',   'End-User License Agreement', lipsumZh + lipsumEn),
  legal_tc:   wrap('條款及細則',           'Terms and Conditions',      lipsumZh + lipsumEn),
  legal_disc: wrap('免責聲明',             'Disclaimer',                lipsumZh + lipsumEn),
  wong:       wrap('黃氏計分法',           'Wong system',               lipsumZh + lipsumEn),
};
