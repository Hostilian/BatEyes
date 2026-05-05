import { Peak, findPeaks } from './peaks';

export type CfarOptions = {
  /** Cells on each side used for noise estimate (excluding guard). */
  numTrain: number;
  /** Guard cells each side of CUT (cell under test). */
  numGuard: number;
  /** Threshold multiplier on estimated noise mean (typ. 2–6). */
  alpha: number;
};

const defaultCfar: CfarOptions = {
  numTrain: 12,
  numGuard: 2,
  alpha: 3.5,
};

/**
 * Cell-averaging CFAR: per-index threshold from mean of training cells
 * (symmetric windows, skipping guard band around CUT).
 * Returns per-bin threshold; first/last bins where window is incomplete use a local fallback.
 */
export function caCfarThresholds(x: Float32Array, opts: Partial<CfarOptions> = {}): Float32Array {
  const { numTrain, numGuard, alpha } = { ...defaultCfar, ...opts };
  const n = x.length;
  const thr = new Float32Array(n);
  const mag = new Float32Array(n);
  for (let i = 0; i < n; i++) mag[i] = Math.abs(x[i]!);

  const leftSpan = numGuard + numTrain;
  const rightSpan = numGuard + numTrain;

  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    const lo = i - leftSpan;
    const hi = i - numGuard - 1;
    for (let j = lo; j <= hi; j++) {
      if (j >= 0 && j < n) {
        sum += mag[j]!;
        count++;
      }
    }
    const lo2 = i + numGuard + 1;
    const hi2 = i + rightSpan;
    for (let j = lo2; j <= hi2; j++) {
      if (j >= 0 && j < n) {
        sum += mag[j]!;
        count++;
      }
    }
    if (count === 0) {
      thr[i] = mag[i]! * alpha;
      continue;
    }
    const noise = sum / count;
    thr[i] = alpha * noise;
  }
  return thr;
}

/**
 * Local maxima where |corr[i]| > CFAR threshold[i], then same NMS as `findPeaks`.
 */
export function findPeaksCfar(
  corr: Float32Array,
  cfarOpts: Partial<CfarOptions>,
  minSeparationSamples: number,
  maxPeaks: number
): Peak[] {
  const thr = caCfarThresholds(corr, cfarOpts);
  const mag = new Float32Array(corr.length);
  for (let i = 0; i < corr.length; i++) mag[i] = Math.abs(corr[i]!);

  const sep = Math.max(1, minSeparationSamples);
  const candidates: Peak[] = [];
  for (let i = 1; i < corr.length - 1; i++) {
    const v = mag[i]!;
    if (v < thr[i]!) continue;
    if (v < mag[i - 1]! || v < mag[i + 1]!) continue;
    const sign = corr[i]! >= 0 ? 1 : -1;
    candidates.push({ lagSamples: i, score: sign * v });
  }
  candidates.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

  const picked: Peak[] = [];
  for (const p of candidates) {
    if (picked.length >= maxPeaks) break;
    if (picked.some((q) => Math.abs(q.lagSamples - p.lagSamples) < sep)) continue;
    picked.push({ lagSamples: p.lagSamples, score: Math.abs(p.score) });
  }
  picked.sort((a, b) => a.lagSamples - b.lagSamples);
  return picked;
}

/** Convenience: CFAR peaks using signed correlation scores (positive peaks). */
export function findPeaksCfarOrFallback(
  corr: Float32Array,
  fixedThreshold: number,
  cfarOpts: Partial<CfarOptions> | null,
  minSeparationSamples: number,
  maxPeaks: number
): Peak[] {
  if (cfarOpts !== null) {
    const p = findPeaksCfar(corr, cfarOpts, minSeparationSamples, maxPeaks);
    if (p.length > 0) return p;
  }
  return findPeaks(corr, fixedThreshold, minSeparationSamples, maxPeaks);
}
