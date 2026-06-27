/**
 * Swiss Round Calculator - Core mathematics
 * Mirrors the Excel formulae exactly. All inputs are validated and
 * coerced (ROUNDUP, MIN/MAX clamps) inside the helpers so callers may
 * pass raw user input.
 *
 * Formula reference: see README / functions.html.
 */

// ---------- numeric helpers ----------
const roundUp = (x) => (x <= 0 ? Math.ceil(x) : Math.ceil(x - 1e-12));
const roundDown = (x) => Math.floor(x + 1e-12);
const log2 = (x) => Math.log(x) / Math.log(2);

// ---------- input clamps ----------
const clampN = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 4) return 4;
  return roundUp(v);
};
const clampP = (p) => {
  const v = Number(p);
  if (!Number.isFinite(v) || v < 1) return 1;
  return roundUp(v);
};
const clampD = (d) => {
  const v = Number(d);
  if (!Number.isFinite(v) || v < 2) return 2;
  return roundUp(v);
};
const clampR = (r) => {
  const v = Number(r);
  if (!Number.isFinite(v) || v < 3) return 3;
  return roundUp(v);
};
const clampI = (i) => {
  const v = Number(i);
  if (!Number.isFinite(v) || v < 1) return 1;
  return roundUp(v);
};
const pCappedByN = (p, n) => {
  const pp = clampP(p);
  const nn = clampN(n);
  return pp > nn ? nn : pp;
};

// ---------- combinatorics ----------
function logFactorial(n) {
  if (n < 0) return NaN;
  if (n < 2) return 0;
  // Stirling for large n, exact for small n
  if (n < 256) {
    let s = 0;
    for (let i = 2; i <= n; i++) s += Math.log(i);
    return s;
  }
  return (
    n * Math.log(n) -
    n +
    0.5 * Math.log(2 * Math.PI * n) +
    1 / (12 * n) -
    1 / (360 * n * n * n)
  );
}

/** Binomial CDF P(X<=k) for n trials, prob p. Numerically stable via log. */
function binomCdf(k, n, p) {
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  const kk = Math.floor(k);
  const logP = Math.log(p);
  const logQ = Math.log(1 - p);
  let sum = 0;
  for (let i = 0; i <= kk; i++) {
    const logPmf =
      logFactorial(n) - logFactorial(i) - logFactorial(n - i) + i * logP + (n - i) * logQ;
    sum += Math.exp(logPmf);
  }
  if (sum > 1) sum = 1;
  if (sum < 0) sum = 0;
  return sum;
}

/** Excel BINOM.INV(trials, prob, alpha): smallest k s.t. CDF(k) >= alpha. */
function binomInv(n, p, alpha) {
  if (alpha <= 0) return 0;
  if (alpha >= 1) return n;
  // simple linear sweep is fine for n <= a few thousand
  let cum = 0;
  const logP = Math.log(p);
  const logQ = Math.log(1 - p);
  for (let k = 0; k <= n; k++) {
    const logPmf =
      logFactorial(n) - logFactorial(k) - logFactorial(n - k) + k * logP + (n - k) * logQ;
    cum += Math.exp(logPmf);
    if (cum >= alpha - 1e-15) return k;
  }
  return n;
}

// ---------- k, c ----------
function kOf(p) {
  const pp = clampP(p);
  if (pp < 3) return 0;
  return roundUp(log2((pp * 4) / 3)) - 1 - 1;
}
function cOf(d) {
  return clampD(d) - 1;
}

// ---------- Rmin / Rmax ----------
function rMaxByN(n) {
  const nn = clampN(n);
  return nn % 2 === 1 ? nn : nn - 1;
}
function rMin(n, p) {
  const nn = clampN(n);
  const pp = clampP(p);
  const cap = rMaxByN(nn);
  const base = roundUp(log2((nn * 4) / 3)) + kOf(pp);
  return Math.min(cap, base);
}
function rMax(n, p, d) {
  const nn = clampN(n);
  const pp = clampP(p);
  const cap = rMaxByN(nn);
  const lg = roundUp(log2((nn * 4) / 3));
  const candidate = lg + (lg - 1 - 1);
  const rmn = rMin(nn, pp);
  return Math.min(cap, candidate, rmn + cOf(d));
}

// ---------- elimination rounds ----------
const erMin = (n, p) => roundUp(roundDown(rMin(n, p) / 2) / 2);
const erMax = (n, p, d) => roundUp(roundDown(rMax(n, p, d) / 2) / 2);

// ---------- Lmax family ----------
function lmaxForRounds(n, p, rounds) {
  const nn = clampN(n);
  const pCap = pCappedByN(p, nn);
  const trials = rounds;
  const prob = pCap / ((nn * 4) / 3);
  const k = binomInv(trials, 0.5, prob);
  const tail = (nn * 4) / 3 * binomCdf(k, trials, 0.5);
  return tail <= pCap ? k : k - 1;
}
const lmaxRmin = (n, p) => lmaxForRounds(n, p, rMin(n, p));
const lmaxRmax = (n, p, d) => lmaxForRounds(n, p, rMax(n, p, d));
const lmaxR = (n, p, r) => lmaxForRounds(n, p, clampR(r));

// ---------- Reverse lookup: Nmin / Nmax ----------
function nMin(p, r, d) {
  const pp = clampP(p);
  const rr = clampR(r);
  const k = kOf(pp);
  const c = cOf(d);
  const exp = rr - k - c - 1;
  const val = roundDown((3 / 4) * Math.pow(2, exp)) + 1;
  return Math.max(4, pp, val);
}
function nMax(p, r) {
  const pp = clampP(p);
  const rr = clampR(r);
  const k = kOf(pp);
  const val = roundDown((3 / 4) * Math.pow(2, rr - k));
  return Math.max(4, pp, val);
}

function lmaxForNandR(NN, p, r) {
  const pp = clampP(p);
  const rr = clampR(r);
  const trials = rr;
  const prob = pp / ((NN * 4) / 3);
  const k = binomInv(trials, 0.5, prob);
  const tail = (NN * 4) / 3 * binomCdf(k, trials, 0.5);
  return tail <= pp ? k : k - 1;
}
const lmaxNmin = (p, r, d) => lmaxForNandR(nMin(p, r, d), p, r);
const lmaxNmax = (p, r) => lmaxForNandR(nMax(p, r), p, r);

// ---------- tiers ----------
function tierOf(i) {
  const ii = clampI(i);
  if (ii <= 3) return ii;
  return Math.max(4, roundUp(log2(ii / 3)) + 3);
}
const tP = (p, n) => tierOf(pCappedByN(p, n));
const tN = (n) => roundUp(log2(clampN(n) / 3)) + 3;

// ---------- public API ----------
export const calc = {
  clampN, clampP, clampD, clampR, pCappedByN,
  kOf, cOf,
  rMin, rMax, erMin, erMax,
  lmaxRmin, lmaxRmax, lmaxR,
  nMin, nMax, lmaxNmin, lmaxNmax,
  tierOf, tP, tN,
  binomCdf, binomInv,
};

/**
 * Build a matrix row set for the Section-4 tableau over the column
 * range [max(6, p) .. 6144]. Each column key is a "round bracket"
 * (Rmin-Rmax pair) shared by a contiguous range of N. We collapse
 * consecutive N values that have identical (Rmin, Rmax, ERmin, ERmax,
 * LmaxRmin, LmaxRmax) signatures into a single column.
 */
export function buildMatrix(p, d, hiCap = 6144) {
  const pp = clampP(p);
  const lo = Math.max(6, pp);
  const hi = Math.min(hiCap, 6144);
  const cols = [];
  let cur = null;
  for (let n = lo; n <= hi; n++) {
    const sig = {
      rmin: rMin(n, pp),
      rmax: rMax(n, pp, d),
      ermin: erMin(n, pp),
      ermax: erMax(n, pp, d),
      lmin: lmaxRmin(n, pp),
      lmax: lmaxRmax(n, pp, d),
    };
    const key = `${sig.rmin}-${sig.rmax}-${sig.ermin}-${sig.ermax}-${sig.lmin}-${sig.lmax}`;
    if (cur && cur.key === key) {
      cur.nMax = n;
    } else {
      if (cur) cols.push(cur);
      cur = { key, ...sig, nMin: n, nMax: n };
    }
  }
  if (cur) cols.push(cur);
  return cols;
}
