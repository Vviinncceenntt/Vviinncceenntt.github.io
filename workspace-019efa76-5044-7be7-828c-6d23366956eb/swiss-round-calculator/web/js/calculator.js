/* Swiss Round Calculator – browser build of the maths module.
 * Mirrors mobile/src/utils/calculator.js byte-for-byte (except module syntax).
 */
(function (global) {
  'use strict';

  const roundUp = (x) => (x <= 0 ? Math.ceil(x) : Math.ceil(x - 1e-12));
  const roundDown = (x) => Math.floor(x + 1e-12);
  const log2 = (x) => Math.log(x) / Math.log(2);

  const clampN = (n) => { const v = Number(n); if (!Number.isFinite(v) || v < 4) return 4; return roundUp(v); };
  const clampP = (p) => { const v = Number(p); if (!Number.isFinite(v) || v < 1) return 1; return roundUp(v); };
  const clampD = (d) => { const v = Number(d); if (!Number.isFinite(v) || v < 2) return 2; return roundUp(v); };
  const clampR = (r) => { const v = Number(r); if (!Number.isFinite(v) || v < 3) return 3; return roundUp(v); };
  const clampI = (i) => { const v = Number(i); if (!Number.isFinite(v) || v < 1) return 1; return roundUp(v); };
  const pCappedByN = (p, n) => { const pp = clampP(p); const nn = clampN(n); return pp > nn ? nn : pp; };

  function logFactorial(n) {
    if (n < 0) return NaN;
    if (n < 2) return 0;
    if (n < 256) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; }
    return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n) - 1 / (360 * n * n * n);
  }
  function binomCdf(k, n, p) {
    if (k < 0) return 0; if (k >= n) return 1; if (p <= 0) return 1; if (p >= 1) return 0;
    const kk = Math.floor(k); const lp = Math.log(p), lq = Math.log(1 - p); let s = 0;
    for (let i = 0; i <= kk; i++) {
      s += Math.exp(logFactorial(n) - logFactorial(i) - logFactorial(n - i) + i * lp + (n - i) * lq);
    }
    return Math.max(0, Math.min(1, s));
  }
  function binomInv(n, p, a) {
    if (a <= 0) return 0; if (a >= 1) return n;
    const lp = Math.log(p), lq = Math.log(1 - p); let c = 0;
    for (let k = 0; k <= n; k++) {
      c += Math.exp(logFactorial(n) - logFactorial(k) - logFactorial(n - k) + k * lp + (n - k) * lq);
      if (c >= a - 1e-15) return k;
    }
    return n;
  }

  function kOf(p) { const pp = clampP(p); if (pp < 3) return 0; return roundUp(log2(pp * 4 / 3)) - 1 - 1; }
  function cOf(d) { return clampD(d) - 1; }
  function rMaxByN(n) { const nn = clampN(n); return nn % 2 === 1 ? nn : nn - 1; }
  function rMin(n, p) { const nn = clampN(n), pp = clampP(p); return Math.min(rMaxByN(nn), roundUp(log2(nn * 4 / 3)) + kOf(pp)); }
  function rMax(n, p, d) {
    const nn = clampN(n), pp = clampP(p);
    const lg = roundUp(log2(nn * 4 / 3));
    return Math.min(rMaxByN(nn), lg + (lg - 1 - 1), rMin(nn, pp) + cOf(d));
  }
  const erMin = (n, p) => roundUp(roundDown(rMin(n, p) / 2) / 2);
  const erMax = (n, p, d) => roundUp(roundDown(rMax(n, p, d) / 2) / 2);

  function lmaxForRounds(n, p, rounds) {
    const nn = clampN(n); const pc = pCappedByN(p, nn);
    const prob = pc / (nn * 4 / 3);
    const k = binomInv(rounds, 0.5, prob);
    const tail = (nn * 4 / 3) * binomCdf(k, rounds, 0.5);
    return tail <= pc ? k : k - 1;
  }
  const lmaxRmin = (n, p) => lmaxForRounds(n, p, rMin(n, p));
  const lmaxRmax = (n, p, d) => lmaxForRounds(n, p, rMax(n, p, d));
  const lmaxR = (n, p, r) => lmaxForRounds(n, p, clampR(r));

  function nMin(p, r, d) {
    const pp = clampP(p), rr = clampR(r);
    const val = roundDown(3 / 4 * Math.pow(2, rr - kOf(pp) - cOf(d) - 1)) + 1;
    return Math.max(4, pp, val);
  }
  function nMax(p, r) {
    const pp = clampP(p), rr = clampR(r);
    const val = roundDown(3 / 4 * Math.pow(2, rr - kOf(pp)));
    return Math.max(4, pp, val);
  }
  function lmaxForNandR(NN, p, r) {
    const pp = clampP(p), rr = clampR(r);
    const prob = pp / (NN * 4 / 3);
    const k = binomInv(rr, 0.5, prob);
    const tail = (NN * 4 / 3) * binomCdf(k, rr, 0.5);
    return tail <= pp ? k : k - 1;
  }
  const lmaxNmin = (p, r, d) => lmaxForNandR(nMin(p, r, d), p, r);
  const lmaxNmax = (p, r) => lmaxForNandR(nMax(p, r), p, r);

  function buildMatrix(p, d, hiCap) {
    hiCap = hiCap || 6144;
    const pp = clampP(p);
    const lo = Math.max(6, pp);
    const hi = Math.min(hiCap, 6144);
    const cols = []; let cur = null;
    for (let n = lo; n <= hi; n++) {
      const sig = {
        rmin: rMin(n, pp), rmax: rMax(n, pp, d),
        ermin: erMin(n, pp), ermax: erMax(n, pp, d),
        lmin: lmaxRmin(n, pp), lmax: lmaxRmax(n, pp, d),
      };
      const key = sig.rmin + '-' + sig.rmax + '-' + sig.ermin + '-' + sig.ermax + '-' + sig.lmin + '-' + sig.lmax;
      if (cur && cur.key === key) cur.nMax = n;
      else { if (cur) cols.push(cur); cur = Object.assign({ key: key, nMin: n, nMax: n }, sig); }
    }
    if (cur) cols.push(cur);
    return cols;
  }

  global.SwissCalc = {
    clampN, clampP, clampD, clampR, pCappedByN,
    kOf, cOf, rMin, rMax, erMin, erMax,
    lmaxRmin, lmaxRmax, lmaxR,
    nMin, nMax, lmaxNmin, lmaxNmax,
    binomCdf, binomInv, buildMatrix,
  };
})(window);
