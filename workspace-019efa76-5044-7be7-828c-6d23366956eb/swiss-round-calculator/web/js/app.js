/* Swiss Round Calculator – static web build (no React Native, no ads).
 *
 * Responsibilities:
 *  - Onboarding gate with "I Agree" checkbox enabling the "I Accept" button.
 *  - Theme persistence (localStorage).
 *  - All 5 sections of the dashboard, the matrix tableau, and the bottom nav.
 *  - Tooltips/toggletips that render in a FIXED-POSITION overlay so they
 *    are never clipped by their parent card / table-wrap / overflow:hidden.
 *  - Template interpolation: <r>, <p>, <n> are substituted with the
 *    *current* user values every time the tooltip opens or values change.
 *  - Throttled re-renders (~100ms) on input.
 *  - 4 modal popups (Functions, Settings, Legal, Wong system).
 *
 * RevenueCat / subscriptions are app-only; the website is free to host on
 * any public server and does not collect users at all.
 */
(function () {
  'use strict';
  const SC = window.SwissCalc;
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

  const DEFAULTS = { n: 193, p: 8, d: 4, rPlaceholder: 12 };

  /* ---------- Persistence ---------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  /* ---------- Theme ---------- */
  function applyTheme(mode) {
    if (mode === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
  }
  applyTheme(LS.get('theme', 'system'));

  /* ---------- Offline clock on onboarding ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
  const offTime = $('#offlineTime');
  let _tt = null;
  function startClock() {
    const tick = () => { if (offTime) offTime.innerHTML = `離線時間（裝置）：${fmt(new Date())}<br>Offline date/time (device): ${fmt(new Date())}`; };
    tick(); _tt = setInterval(tick, 1000);
  }
  function stopClock() { if (_tt) { clearInterval(_tt); _tt = null; } }
  startClock();

  /* ---------- Onboarding ---------- */
  const agree = $('#agree');
  const accept = $('#accept');
  agree.addEventListener('change', () => { accept.disabled = !agree.checked; });
  accept.addEventListener('click', () => {
    if (!agree.checked) return;
    if (navigator.vibrate) navigator.vibrate(10);
    $('#onboard').hidden = true;
    $('#app').hidden = false;
    stopClock();
    LS.set('onboarded', true);
    mount();
  });
  // Already onboarded?
  if (LS.get('onboarded')) {
    $('#onboard').hidden = true;
    $('#app').hidden = false;
    stopClock();
    document.addEventListener('DOMContentLoaded', mount);
    if (document.readyState !== 'loading') mount();
  }

  /* ---------- Clipboard ----------
   * Safari refuses navigator.clipboard.writeText on insecure origins
   * (plain http://192.168.x.x:8765) AND requires the call to happen
   * synchronously inside a user gesture. The execCommand('copy') path
   * works on Safari over HTTP and stays inside the click handler.
   * We try the modern API first (HTTPS / localhost contexts) and fall
   * back to the legacy textarea trick otherwise. */
  function copyToClipboard(text) {
    // Try the modern API only on secure origins (Safari blocks it on http://lan-ip)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
      return;
    }
    legacyCopy(text);
  }
  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    // iOS Safari needs the textarea to be focusable but invisible.
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0'; ta.style.left = '0';
    ta.style.width = '2em'; ta.style.height = '2em';
    ta.style.padding = '0'; ta.style.border = 'none';
    ta.style.outline = 'none'; ta.style.boxShadow = 'none';
    ta.style.background = 'transparent'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    // iOS: must focus, then select via setSelectionRange
    if (/iP(ad|hone|od)/.test(navigator.userAgent)) {
      ta.contentEditable = 'true';
      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      ta.setSelectionRange(0, text.length);
    } else {
      ta.select();
    }
    try { document.execCommand('copy'); } catch (e) { /* swallow */ }
    document.body.removeChild(ta);
  }

  /* ---------- Throttle ---------- */
  function throttle(fn, ms) {
    let t = null, last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn(...args); }
      else { clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn(...args); }, ms - (now - last)); }
    };
  }

  /* ---------- Notation helper (subscripts) ---------- */
  const NOTATION = {
    Rmin: 'R<sub>min</sub>', Rmax: 'R<sub>max</sub>',
    ERmin: 'E<sub>R<sub>min</sub></sub>', ERmax: 'E<sub>R<sub>max</sub></sub>',
    Lmax: 'L<sub>max</sub>',
    LmaxRmin: 'L<sub>max<sub>R<sub>min</sub></sub></sub>',
    LmaxRmax: 'L<sub>max<sub>R<sub>max</sub></sub></sub>',
    LmaxNmin: 'L<sub>max<sub>N<sub>min</sub></sub></sub>',
    LmaxNmax: 'L<sub>max<sub>N<sub>max</sub></sub></sub>',
    Nmin: 'N<sub>min</sub>', Nmax: 'N<sub>max</sub>',
  };
  function notation(s) {
    return s.replace(/\b(LmaxRmin|LmaxRmax|LmaxNmin|LmaxNmax|ERmin|ERmax|Rmin|Rmax|Lmax|Nmin|Nmax)\b/g,
      (_, k) => NOTATION[k] || k);
  }

  /* ---------- Template interpolation for tooltips ---------- */
  // Replace literal <p>, <n>, <r> placeholders with the live values.
  function interp(str, ctx) {
    if (!str) return '';
    return str
      .replace(/&lt;p&gt;/g, ctx.p)
      .replace(/&lt;n&gt;/g, ctx.n)
      .replace(/&lt;r&gt;/g, ctx.r)
      .replace(/<p>/g, ctx.p)
      .replace(/<n>/g, ctx.n)
      .replace(/<r>/g, ctx.r);
  }

  /* ---------- Global tooltip overlay (fixed-position, never clipped) ---------- */
  // Build a single bubble element appended to <body>.
  const bubble = document.createElement('div');
  bubble.className = 'tip-bubble';
  bubble.setAttribute('role', 'tooltip');
  document.body.appendChild(bubble);
  let bubbleOwner = null;

  function showTip(anchor, zh, en) {
    bubble.innerHTML = `<span class="zh">${zh}</span><span class="en">${en}</span>`;
    bubble.classList.add('open');
    bubbleOwner = anchor;
    positionTip(anchor);
  }
  function hideTip() {
    bubble.classList.remove('open');
    bubbleOwner = null;
  }
  function positionTip(anchor) {
    const r = anchor.getBoundingClientRect();
    // Measure bubble after content set
    const bw = bubble.offsetWidth || 240;
    const bh = bubble.offsetHeight || 80;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const navReserve = 84; // bottom nav clearance
    let top = r.bottom + 6;
    if (top + bh > vh - navReserve) {
      // flip above
      top = r.top - 6 - bh;
      if (top < 8) top = 8;
    }
    let left = r.left + r.width / 2 - bw / 2;
    if (left < 8) left = 8;
    if (left + bw > vw - 8) left = vw - bw - 8;
    bubble.style.top = `${Math.max(8, top)}px`;
    bubble.style.left = `${left}px`;
  }
  // Reposition on scroll/resize while open.
  window.addEventListener('scroll', () => { if (bubbleOwner) positionTip(bubbleOwner); }, true);
  window.addEventListener('resize', () => { if (bubbleOwner) positionTip(bubbleOwner); });

  // Each anchor stores its raw template + a `ctx()` function to compute live values.
  function bindTip(anchor, getZh, getEn) {
    let armed = false;
    function open() {
      showTip(anchor, getZh(), getEn());
      armed = true;
    }
    function close() { hideTip(); armed = false; }
    // Toggle on click/tap (toggletip behaviour for touch).
    anchor.addEventListener('click', (e) => {
      if (e.target.closest('input, button, a')) return;
      e.stopPropagation();
      if (armed && bubbleOwner === anchor) close();
      else open();
    });
    // Desktop: hover/focus
    anchor.addEventListener('mouseenter', () => { if (!armed) open(); });
    anchor.addEventListener('mouseleave', () => { if (bubbleOwner === anchor) close(); });
    anchor.addEventListener('focusin', () => open());
    anchor.addEventListener('focusout', () => { if (bubbleOwner === anchor) close(); });
  }
  // Global outside-tap dismiss
  document.addEventListener('click', (e) => {
    if (!bubbleOwner) return;
    if (bubbleOwner.contains(e.target)) return;
    hideTip();
  });

  /* ---------- Field builders ---------- */
  function fieldRow(parent, opts) {
    // opts: {nameZh, nameEn, sym, descZh, descEn, control, dynamic?}
    const row = document.createElement('div');
    row.className = 'label tip-anchor';
    row.tabIndex = 0;
    /* Three stacked lines: Chinese name, English name, then the
     * variable symbol (e.g. "(n)" or "(Rmin - Rmax)") on its OWN
     * line below the English. Same colour for all three. */
    row.innerHTML = `
      <span class="zh">${opts.nameZh}</span>
      <span class="en">${opts.nameEn}</span>
      <span class="sym notation">${notation(opts.sym)}</span>
    `;
    parent.appendChild(row);
    parent.appendChild(opts.control);
    bindTip(
      row,
      () => interp(opts.descZh, lastCtx()),
      () => interp(opts.descEn, lastCtx())
    );
    return row;
  }

  function makeInput(id, value, min, max, placeholder) {
    const w = document.createElement('div');
    w.className = 'input-wrap';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.id = id;
    input.maxLength = String(Math.max(min || 0, max || 0)).length;
    input.value = value == null ? '' : String(value);
    input.placeholder = placeholder == null ? '' : String(placeholder);
    // Sanitise: digits only, strip leading zeros, cap to [min, max].
    // We clamp on every keystroke AND on blur so neither "000000" nor
    // a 6-digit overshoot can land in the model and produce
    // Infinity/NaN outputs.
    function sanitise(commit) {
      let v = input.value.replace(/[^0-9]/g, '');
      v = v.replace(/^0+(?=\d)/, '');       // strip leading zeros: 000007 -> 7
      if (v === '') { onChangeThrottled(); return; }
      let n = parseInt(v, 10);
      if (!Number.isFinite(n)) n = min ?? 0;
      if (max != null && n > max) n = max;
      if (min != null && n < min && commit) n = min;  // only enforce min on commit (blur)
      input.value = String(n);
      onChangeThrottled();
    }
    input.addEventListener('input',  () => sanitise(false));
    input.addEventListener('blur',   () => sanitise(true));
    input.addEventListener('paste',  () => setTimeout(() => sanitise(false), 0));
    const s = document.createElement('div'); s.className = 'stepper';
    const up = document.createElement('button'); up.textContent = '▲'; up.type = 'button';
    const dn = document.createElement('button'); dn.textContent = '▼'; dn.type = 'button';
    function bump(delta) {
      let v = parseInt(input.value || (placeholder ?? '0'), 10);
      if (!Number.isFinite(v)) v = parseInt(placeholder ?? '0', 10) || 0;
      v += delta;
      if (max != null && v > max) v = max; if (min != null && v < min) v = min;
      input.value = String(v); onChange();
    }
    up.addEventListener('click', () => bump(+1));
    dn.addEventListener('click', () => bump(-1));
    s.appendChild(up); s.appendChild(dn);
    w.appendChild(input); w.appendChild(s);
    return w;
  }
  function makeOutput(id) {
    const o = document.createElement('div'); o.className = 'output-wrap'; o.id = id; return o;
  }

  /* ---------- Dashboard mount ---------- */
  let mounted = false;
  function mount() {
    if (mounted) return;
    mounted = true;

    // Section 1
    const s1 = $('#s1');
    s1.innerHTML = '';
    fieldRow(s1, {
      nameZh: '人數', nameEn: 'Number of Players', sym: '(n)',
      descZh: '參賽人數（至少為4且必須是正整數）',
      descEn: 'Total Number of Players (at least 4 and must be positive integer)',
      control: makeInput('inN', DEFAULTS.n, 4, 5001, DEFAULTS.n),
    });
    fieldRow(s1, {
      nameZh: '頂層選手數目', nameEn: 'Placements at the top', sym: '(p)',
      descZh: '頂層需準確地決出名次的人數（至多等於n且必須是正整數）',
      descEn: 'Accurate Ranks to determine (at most equals to n and must be positive integer)',
      control: makeInput('inP', DEFAULTS.p, 1, 5001, DEFAULTS.p),
    });
    fieldRow(s1, {
      nameZh: '積分層距離', nameEn: 'Score Group Distance', sym: '(d)',
      descZh: '自尾二輪開始避免頂層選手遇上積分層距離達d（至少為2且必須是正整數）的對手',
      descEn: 'Score Group Distance (at least 2 and must be positive integer) of the opponents against whom the top p players not to play starting from the second last round',
      control: makeInput('inD', DEFAULTS.d, 2, 9999, DEFAULTS.d),
    });

    // Section 2 (outputs only)
    const s2 = $('#s2'); s2.innerHTML = '';
    fieldRow(s2, {
      nameZh: '輪數', nameEn: 'Rounds', sym: '(Rmin - Rmax)',
      descZh: '準確地決出首<p>名選手所需的最少輪數及建議的最多輪數而超過此數目的輪數將屬多餘',
      descEn: 'Minimum number of rounds required to accurately determine top <p> placements and Maximum number of rounds recommended that more rounds beyond the number are redundant',
      control: makeOutput('outR'),
    });
    fieldRow(s2, {
      nameZh: '淘汰賽輪數', nameEn: 'Elimination Rounds', sym: '(ERmin - ERmax)',
      descZh: '在對應的最少及最多輪數下，建議附加的淘汰賽輪數',
      descEn: 'Suggested numbers of elimination rounds that go beyond the Swiss rounds for the respective minimum and maximum rounds',
      control: makeOutput('outER'),
    });
    fieldRow(s2, {
      nameZh: '能容許的最多負局數', nameEn: 'Tolerable Maximum Losses', sym: '(LmaxRmin - LmaxRmax)',
      descZh: '在對應的最少及最多輪數下，選手為擠身頂層所能容許的最多負局數',
      descEn: 'Maximum number of losses that a player could tolerate to secure a placement in the top <p> for the respective minimum and maximum rounds',
      control: makeOutput('outL'),
    });

    // Section 3
    const s3 = $('#s3'); s3.innerHTML = '';
    fieldRow(s3, {
      nameZh: '輪數', nameEn: 'Rounds', sym: '(r)',
      descZh: '（至少為3且必須是正整數）',
      descEn: '(at least 3 and must be positive integer)',
      control: makeInput('inR', '', 3, 5001, DEFAULTS.rPlaceholder),
    });
    fieldRow(s3, {
      nameZh: '支援人數範圍', nameEn: 'Supported Player Range', sym: '(Nmin - Nmax)',
      descZh: '在對應輸入的<r>輪下，需要準確地決出首<p>名選手，可以接受的最少與最多參賽人數',
      descEn: 'Minimum and Maximum number of players accepted to accurately determine top <p> placements for the respective input <r> rounds',
      control: makeOutput('outRange'),
    });
    fieldRow(s3, {
      nameZh: '能容許的最多負局數', nameEn: 'Tolerable Maximum Losses', sym: '(LmaxNmin - Lmax - LmaxNmax)',
      descZh: '在對應輸入的<n>人或最少或最多支援人數及<r>輪下，選手為擠身頂層所能容許的最多負局數',
      descEn: 'Maximum number of losses that a player could tolerate to secure a placement in the top <p> for the respective input <n> players or minimum or maximum supported players and input <r> rounds',
      control: makeOutput('outL3'),
    });

    // wire inputs (in case any input was added without input-listener)
    ['inN', 'inP', 'inD', 'inR'].forEach((id) => {
      const el = $('#' + id);
      el && el.addEventListener('input', onChangeThrottled);
    });

    // Matrix title tooltip (replaces the explicit "Varies with..." subtitle)
    const matTitleAnchor = $('#matTitleAnchor');
    bindTip(
      matTitleAnchor,
      () => `隨頂層選手數目（p=${lastCtx().p}）變化`,
      () => `Varies with Top (p=${lastCtx().p}) Placements`
    );

    // copy buttons
    $('#copyZh').addEventListener('click', () => {
      const ctx = lastCtx();
      const s = `從${ctx.n}名參賽者中準確地決出首${ctx.pCap}名選手至少需要${ctx.rmin}輪，但不建議多於${ctx.rmax}輪。`;
      copyToClipboard(s);
    });
    $('#copyEn').addEventListener('click', () => {
      const ctx = lastCtx();
      const s = `To accurately determine top ${ctx.pCap} players out of ${ctx.n} participants, it takes at least ${ctx.rmin} rounds, though more than ${ctx.rmax} is not recommended.`;
      copyToClipboard(s);
    });

    // bottom nav: wire icon images + click handlers.
    // Web uses the original p-writing.svg for Legal (89 KB, but browsers
    // handle radial gradients natively). The mobile build falls back to
    // privacy-document-icon if SvgXml can't parse p-writing.
    const navIcons = {
      func:  window.SwissIcons && window.SwissIcons.formulaFxIcon,
      set:   window.SwissIcons && window.SwissIcons.gearIcon72a7cf,
      legal: window.SwissIcons && window.SwissIcons.pWriting,
      wong:  window.SwissIcons && window.SwissIcons.pastedImage20240416184020,
    };
    $$('#botnav button').forEach((b) => {
      const img = $('img.ico', b);
      const src = navIcons[b.dataset.menu];
      if (img && src) img.src = src;
      b.addEventListener('click', () => {
        // Toggle the active class on the bottom nav — gives the
        // selected destination the primary-blue tint on both label and
        // icon (matches the React-Native build's behaviour). If the
        // SAME button is tapped again to close the menu, clear active.
        const wasActive = b.classList.contains('active');
        $$('#botnav button').forEach((x) => x.classList.remove('active'));
        if (!wasActive) b.classList.add('active');
        openMenu(b.dataset.menu);
      });
    });

    onChange();
  }

  /* ---------- Live context (single source of truth) ---------- */
  function lastCtx() {
    const n = SC.clampN($('#inN') && $('#inN').value ? $('#inN').value : DEFAULTS.n);
    const p = SC.clampP($('#inP') && $('#inP').value ? $('#inP').value : DEFAULTS.p);
    const d = SC.clampD($('#inD') && $('#inD').value ? $('#inD').value : DEFAULTS.d);
    const rRaw = $('#inR') ? $('#inR').value : '';
    const r = SC.clampR(rRaw === '' ? DEFAULTS.rPlaceholder : rRaw);
    return {
      n, p, d, r,
      pCap: SC.pCappedByN(p, n),
      rmin: SC.rMin(n, p), rmax: SC.rMax(n, p, d),
      ermin: SC.erMin(n, p), ermax: SC.erMax(n, p, d),
      lminR: SC.lmaxRmin(n, p), lmaxR: SC.lmaxRmax(n, p, d),
      nmn: SC.nMin(p, r, d), nmx: SC.nMax(p, r),
      lForN: SC.lmaxR(n, p, r),
      lNmin: SC.lmaxNmin(p, r, d), lNmax: SC.lmaxNmax(p, r),
    };
  }
  function onChange() {
    if (!mounted) return;
    const v = lastCtx();
    $('#outR').textContent = `${v.rmin} – ${v.rmax}`;
    $('#outER').textContent = `${v.ermin} – ${v.ermax}`;
    $('#outL').textContent = `${v.lminR} – ${v.lmaxR}`;
    $('#outRange').textContent = `${v.nmn} – ${v.nmx}`;
    $('#outL3').textContent = `${v.lNmin} – ${v.lForN} – ${v.lNmax}`;
    renderMatrix(v);
    // If a tooltip is open, refresh its content so live values update.
    if (bubbleOwner) {
      const ev = new Event('refresh');
      // simplest path: trigger a synthetic open on the current owner
      const owner = bubbleOwner;
      const m = owner.__refreshTip;
      if (typeof m === 'function') m();
    }
  }
  const onChangeThrottled = throttle(onChange, 100);

  /* ---------- Matrix render ---------- */
  function renderMatrix(v) {
    const wrap = $('#matrixWrap');
    const cols = SC.buildMatrix(v.p, v.d, 6144);
    const userN = v.n;
    const tbl = document.createElement('table');
    const headers = [
      { zh: '輪數', en: 'Rounds', symHTML: notation('(Rmin - Rmax)'),
        descZh: `準確地決出首<p>名選手所需的最少輪數及建議的最多輪數而超過此數目的輪數將屬多餘`,
        descEn: `Minimum number of rounds required to accurately determine top <p> placements and Maximum number of rounds recommended that more rounds beyond the number are redundant`,
        get: (c) => `${c.rmin}–${c.rmax}` },
      { zh: '淘汰賽輪數', en: 'Elimination Rounds', symHTML: notation('(ERmin - ERmax)'),
        descZh: '在對應的最少及最多輪數下，建議附加的淘汰賽輪數',
        descEn: 'Suggested numbers of elimination rounds that go beyond the Swiss rounds for the respective minimum and maximum rounds',
        get: (c) => `${c.ermin}–${c.ermax}` },
      { zh: '最多負局數', en: 'Maximum Losses', symHTML: notation('(LmaxRmin - LmaxRmax)'),
        descZh: `在對應的最少及最多輪數下，選手為擠身頂層所能容許的最多負局數`,
        descEn: `Maximum number of losses that a player could tolerate to secure a placement in the top <p> for the respective minimum and maximum rounds`,
        get: (c) => `${c.lmin}–${c.lmax}` },
      // Player Range: NO description (self-explanatory; was an improvised description).
      { zh: '人數範圍', en: 'Player Range', symHTML: '',
        descZh: null, descEn: null,
        get: (c) => c.nMin === c.nMax ? `${c.nMin}` : `${c.nMin}–${c.nMax}` },
    ];

    // Construct rows
    for (let r = 0; r < headers.length; r++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      const hdr = headers[r];
      const hasTip = !!(hdr.descZh || hdr.descEn);
      th.className = 'head-col' + (hasTip ? ' tip-anchor' : '');
      if (hasTip) th.tabIndex = 0;
      th.innerHTML = `
        <div class="head-inner">
          <span class="zh">${hdr.zh}</span>
          <span class="en">${hdr.en}</span>
          ${hdr.symHTML ? `<span class="notation">${hdr.symHTML}</span>` : ''}
        </div>`;
      // Bind tooltip ONLY when the header has a description.
      if (hasTip) {
        bindTip(
          th,
          () => interp(hdr.descZh, lastCtx()),
          () => interp(hdr.descEn, lastCtx())
        );
      }
      tr.appendChild(th);

      cols.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = hdr.get(c);
        const playerHi = userN >= c.nMin && userN <= c.nMax;
        const rangeHi = c.nMin >= v.nmn && c.nMax <= v.nmx;
        if (playerHi && rangeHi) td.classList.add('hi-both');
        else if (playerHi) td.classList.add('hi-player');
        else if (rangeHi) td.classList.add('hi-range');
        tr.appendChild(td);
      });
      tbl.appendChild(tr);
    }
    wrap.innerHTML = '';
    wrap.appendChild(tbl);
  }

  /* ---------- Modals ---------- */
  function openMenu(key) {
    const root = $('#modalRoot');
    root.innerHTML = '';
    const scrim = document.createElement('div'); scrim.className = 'modal-scrim';
    const modal = document.createElement('div'); modal.className = 'modal';
    const titles = { func: ['公式', 'Functions'], set: ['設定', 'Settings'], legal: ['法律', 'Legal'], wong: ['黃氏計分法', 'Wong system'] }[key];
    modal.innerHTML = `
      <header>
        <div class="titles"><span class="zh">${titles[0]}</span><span class="en">${titles[1]}</span></div>
        <button class="close-x" aria-label="Close">✕</button>
      </header>
      <div class="body"></div>`;
    const body = $('.body', modal);
    if (key === 'func') {
      body.innerHTML = `<iframe src="https://vviinncceenntt.github.io/swiss-round-calculator/functions.html" title="Functions"></iframe>`;
    } else if (key === 'wong') {
      // Use an iframe so the page's own style.css on GitHub Pages (which
      // declares @font-face for "The Peak Font Plus") supplies the font.
      // We cannot inject styles cross-origin into an iframe — and we do
      // not need to. The source page is self-styled.
      body.innerHTML = `<iframe src="https://vviinncceenntt.github.io/wongssystem.html" title="Wong system"></iframe>`;
    } else if (key === 'legal') {
      body.innerHTML = `
        <div class="tabs">
          <button data-tab="pp" class="active"><span class="zh">私隱權政策</span><span class="en">PP</span></button>
          <button data-tab="eula"><span class="zh">終端使用者授權合約</span><span class="en">EULA</span></button>
          <button data-tab="tc"><span class="zh">條款及細則</span><span class="en">T&amp;C</span></button>
          <button data-tab="disc"><span class="zh">免責聲明</span><span class="en">Disclaimer</span></button>
        </div>
        <p class="en-only">※ 此文件只提供英文版本。<br>* This document is available in English only.</p>
        <iframe id="legalFrame" src="https://vviinncceenntt.github.io/swiss-round-calculator/privacy-policy.html"></iframe>`;
      const urls = {
        pp: 'https://vviinncceenntt.github.io/swiss-round-calculator/privacy-policy.html',
        eula: 'https://vviinncceenntt.github.io/swiss-round-calculator/eula.html',
        tc: 'https://vviinncceenntt.github.io/swiss-round-calculator/terms.html',
        disc: 'https://vviinncceenntt.github.io/swiss-round-calculator/disclaimer.html',
      };
      $$('.tabs button', body).forEach((b) => b.addEventListener('click', () => {
        $$('.tabs button', body).forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        $('#legalFrame', body).src = urls[b.dataset.tab];
      }));
    } else if (key === 'set') {
      renderSettings(body);
    }
    // Closing the modal also clears the active bottom-nav tab so the
    // tint goes back to the inactive colour.
    function closeMenu() {
      root.innerHTML = '';
      $$('#botnav button').forEach((x) => x.classList.remove('active'));
    }
    $('.close-x', modal).addEventListener('click', closeMenu);
    scrim.addEventListener('click', (e) => { if (e.target === scrim) closeMenu(); });
    scrim.appendChild(modal); root.appendChild(scrim);
  }

  /* ---------- Settings (toggle switches) ---------- */
  function renderSettings(body) {
    body.innerHTML = `
      <div class="set-row">
        <div class="label-bi">
          <span class="zh">主題</span>
          <span class="en">Theme</span>
        </div>
        <div class="toggle-block">
          <div class="opt">
            <span class="zh">淺色</span>
            <span class="en">Light</span>
          </div>
          <div class="toggle-switch" id="themeToggle" role="switch" aria-label="Theme">
            <input type="checkbox" id="themeInput">
            <span class="knob"></span>
          </div>
          <div class="opt">
            <span class="zh">深色</span>
            <span class="en">Dark</span>
          </div>
        </div>
      </div>

      <div class="set-row" style="align-items:flex-start">
        <div class="label-bi">
          <span class="zh">畫面方向鎖定</span>
          <span class="en">Orientation Lock</span>
          <div style="font-size:11px;color:var(--text-soft);margin-top:2px">
            <span class="zh">（網頁版不適用）</span>
            <span class="en">(N/A on web)</span>
          </div>
        </div>
        <div class="orient-block">
          <div class="orient-triangle disabled" id="orientTri" role="slider" aria-label="Orientation Lock">
            <svg viewBox="0 0 140 120" preserveAspectRatio="none" aria-hidden="true">
              <polygon points="70,18 18,104 122,104"
                       fill="none" stroke="var(--border)" stroke-width="3" stroke-linejoin="round" />
            </svg>
            <!-- single-knob slider: glyphs are tap targets only -->
            <span class="glyph on"  data-val="auto"      style="left:64px;top:0px"     title="Auto">A</span>
            <span class="glyph"     data-val="landscape" style="left:0px;top:99px"     title="Landscape Left">L</span>
            <span class="glyph"     data-val="portrait"  style="left:130px;top:99px"   title="Portrait">P</span>
            <div class="knob" id="orientKnob" style="left:58px;top:6px"></div>
          </div>
          <div class="legend">
            <div class="row on" data-val="auto"><span class="zh">A&nbsp;＝&nbsp;自動</span><span class="en">A = Auto</span></div>
            <div class="row"    data-val="landscape"><span class="zh">L&nbsp;＝&nbsp;橫向（左）</span><span class="en">L = Landscape Left</span></div>
            <div class="row"    data-val="portrait"><span class="zh">P&nbsp;＝&nbsp;直向</span><span class="en">P = Portrait</span></div>
          </div>
        </div>
      </div>

      <div class="set-row">
        <button class="btn-primary" id="restoreBtn" type="button">
          <span class="zh">恢復購買</span>
          <span class="en">Restore Purchase</span>
        </button>
      </div>
      <div class="set-row">
        <button class="btn-primary" id="resetBtn" type="button">
          <span class="zh">重設參數</span>
          <span class="en">Reset Parameters</span>
        </button>
      </div>
      <div class="set-row" style="flex-direction:column;align-items:stretch">
        <a class="btn-primary" id="manageBtn" target="_blank" rel="noopener" href="#" style="text-align:center;text-decoration:none">
          <span class="zh">管理訂閱</span>
          <span class="en">Manage Subscription</span>
        </a>
        <p style="font-size:11px;color:var(--text-soft);margin:6px 0 0;text-align:left">
          <span class="zh">在裝置設定中管理或取消訂閱項目</span>
          <span class="en">Manage or cancel subscriptions in your device settings</span>
        </p>
      </div>
      <p style="text-align:center;color:var(--text-soft);margin-top:8px">
        <span class="zh">版本：1.0.0</span>
        <span class="en">Version: 1.0.0</span>
      </p>
    `;

    // Theme toggle (rectangular switch)
    const themeSwitch = $('#themeToggle', body);
    const themeInput = $('#themeInput', body);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      || (LS.get('theme', 'system') === 'dark')
      || (LS.get('theme', 'system') === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    themeInput.checked = isDark;
    if (isDark) themeSwitch.classList.add('on');
    themeSwitch.addEventListener('click', () => {
      const next = !themeSwitch.classList.contains('on');
      themeSwitch.classList.toggle('on', next);
      themeInput.checked = next;
      const m = next ? 'dark' : 'light';
      applyTheme(m); LS.set('theme', m);
    });

    // Triangular 3-state slider. The track captures pointer events; the
    // knob just follows (pointer-events:none). On release the knob snaps
    // to the nearest vertex.
    setupOrientSlider(body);

    $('#resetBtn', body).addEventListener('click', () => {
      $('#inN').value = DEFAULTS.n;
      $('#inP').value = DEFAULTS.p;
      $('#inD').value = DEFAULTS.d;
      $('#inR').value = '';
      onChange();
    });
    $('#restoreBtn', body).addEventListener('click', () => {
      // The web build is free (per spec: subscription is mobile-only via
      // RevenueCat). The button stays visible so the UI matches the
      // mobile build; on web it simply reports nothing to restore.
      alert('網頁版本免費，無需恢復購買。\nWeb edition is free of charge; there is no purchase to restore.');
    });
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    $('#manageBtn', body).href = isIOS
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
  }

  /* ---------- Triangular orientation slider ---------- */
  // Vertex coordinates inside the 140x120 SVG viewBox.
  const TRI_VERT = {
    auto:      { x: 70,  y: 18  },
    landscape: { x: 18,  y: 104 },
    portrait:  { x: 122, y: 104 },
  };
  const KNOB_HALF = 12; // 24px knob

  function segDist(x, y, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const px = a.x + t * dx, py = a.y + t * dy;
    return { d: Math.hypot(x - px, y - py), px, py };
  }
  function snapToPerimeter(x, y) {
    const edges = [
      [TRI_VERT.auto, TRI_VERT.landscape],
      [TRI_VERT.auto, TRI_VERT.portrait],
      [TRI_VERT.landscape, TRI_VERT.portrait],
    ];
    let best = { d: Infinity, px: TRI_VERT.auto.x, py: TRI_VERT.auto.y };
    for (const [a, b] of edges) {
      const r = segDist(x, y, a, b);
      if (r.d < best.d) best = r;
    }
    return { x: best.px, y: best.py };
  }
  function nearestVertex(x, y) {
    let best = { key: 'auto', d: Infinity };
    for (const k of ['auto', 'landscape', 'portrait']) {
      const d = Math.hypot(x - TRI_VERT[k].x, y - TRI_VERT[k].y);
      if (d < best.d) best = { key: k, d };
    }
    return best.key;
  }
  function setupOrientSlider(scope) {
    const tri = $('#orientTri', scope);
    const knob = $('#orientKnob', scope);
    if (!tri || !knob) return;

    let current = 'auto';

    function moveKnobTo(vx, vy, animate) {
      // Convert SVG-space (140x120) coords to CSS pixels using the
      // current track bounding box.
      const rect = tri.getBoundingClientRect();
      const px = (vx / 140) * rect.width  - KNOB_HALF;
      const py = (vy / 120) * rect.height - KNOB_HALF;
      tri.classList.toggle('dragging', !animate);
      knob.style.left = px + 'px';
      knob.style.top  = py + 'px';
    }
    function setActive(key) {
      current = key;
      $$('.glyph', tri).forEach((g) => g.classList.toggle('on', g.dataset.val === key));
      const legend = scope.querySelector('.legend');
      if (legend) $$('.row', legend).forEach((r) => r.classList.toggle('on', r.dataset.val === key));
    }
    function snapAndSelect(svgX, svgY) {
      const key = nearestVertex(svgX, svgY);
      const v = TRI_VERT[key];
      moveKnobTo(v.x, v.y, true);
      setActive(key);
    }
    function pointerToSvg(evt) {
      const rect = tri.getBoundingClientRect();
      const cx = (evt.clientX != null ? evt.clientX : evt.touches[0].clientX) - rect.left;
      const cy = (evt.clientY != null ? evt.clientY : evt.touches[0].clientY) - rect.top;
      return { x: (cx / rect.width) * 140, y: (cy / rect.height) * 120 };
    }

    // initial knob position (apex / Auto)
    requestAnimationFrame(() => moveKnobTo(TRI_VERT.auto.x, TRI_VERT.auto.y, true));

    // Tap a vertex glyph -> jump to it
    $$('.glyph', tri).forEach((g) =>
      g.addEventListener('click', (e) => {
        e.preventDefault();
        if (tri.classList.contains('disabled')) return;
        snapAndSelect(TRI_VERT[g.dataset.val].x, TRI_VERT[g.dataset.val].y);
      })
    );

    // Drag the knob along the perimeter
    let dragging = false;
    function onDown(e) {
      if (tri.classList.contains('disabled')) return;
      dragging = true;
      tri.setPointerCapture && e.pointerId != null && tri.setPointerCapture(e.pointerId);
      const p = pointerToSvg(e);
      const s = snapToPerimeter(p.x, p.y);
      moveKnobTo(s.x, s.y, false);
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const p = pointerToSvg(e);
      const s = snapToPerimeter(p.x, p.y);
      moveKnobTo(s.x, s.y, false);
      e.preventDefault();
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      const p = pointerToSvg(e);
      snapAndSelect(p.x, p.y);
    }

    if (window.PointerEvent) {
      tri.addEventListener('pointerdown', onDown);
      tri.addEventListener('pointermove', onMove);
      tri.addEventListener('pointerup',   onUp);
      tri.addEventListener('pointercancel', onUp);
    } else {
      tri.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup',   onUp);
      tri.addEventListener('touchstart', onDown, { passive: false });
      tri.addEventListener('touchmove',  onMove, { passive: false });
      tri.addEventListener('touchend',   onUp);
    }
  }
})();
