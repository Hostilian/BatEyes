import { fftComplex, nextPow2 } from './fft';

/** Valid cross-correlation sum(signal[i+j]*template[j]) without normalization. */
export function crossCorrelateRaw(signal: Float32Array, template: Float32Array): Float32Array {
  const n = signal.length;
  const m = template.length;
  if (m === 0 || n < m) return new Float32Array(0);
  const out = new Float32Array(n - m + 1);
  for (let i = 0; i < out.length; i++) {
    let d = 0;
    for (let j = 0; j < m; j++) d += signal[i + j]! * template[j]!;
    out[i] = d;
  }
  return out;
}

/**
 * Normalized cross-correlation (matched filter) of `signal` with `template`.
 * For each lag ℓ, computes sum(signal[ℓ+k]*template[k]) / (||signal_seg||*||template||).
 * Returns array of length signal.length - template.length + 1 (or empty if invalid).
 */
export function normalizedCrossCorrelate(
  signal: Float32Array,
  template: Float32Array
): Float32Array {
  const n = signal.length;
  const m = template.length;
  if (m === 0 || n < m) return new Float32Array(0);

  const outLen = n - m + 1;
  const out = new Float32Array(outLen);

  let tNorm = 0;
  for (let j = 0; j < m; j++) {
    const v = template[j]!;
    tNorm += v * v;
  }
  const tScale = Math.sqrt(tNorm) || 1;

  for (let i = 0; i < outLen; i++) {
    let dot = 0;
    let sNorm = 0;
    for (let j = 0; j < m; j++) {
      const s = signal[i + j]!;
      const t = template[j]!;
      dot += s * t;
      sNorm += s * s;
    }
    const denom = (Math.sqrt(sNorm) || 1) * tScale;
    out[i] = dot / denom;
  }
  return out;
}

/**
 * Same as `normalizedCrossCorrelate` but via FFT convolution (O(n log n)).
 * Suitable for longer segments on device; numerically close to time-domain version.
 */
export function crossCorrelateRawFft(signal: Float32Array, template: Float32Array): Float32Array {
  const n = signal.length;
  const m = template.length;
  if (m === 0 || n < m) return new Float32Array(0);

  const convLen = n + m - 1;
  const L = nextPow2(convLen);
  const reX = new Float32Array(L);
  const imX = new Float32Array(L);
  const reH = new Float32Array(L);
  const imH = new Float32Array(L);

  for (let i = 0; i < n; i++) reX[i] = signal[i]!;
  for (let i = 0; i < m; i++) reH[i] = template[m - 1 - i]!;

  fftComplex(reX, imX, false);
  fftComplex(reH, imH, false);

  for (let i = 0; i < L; i++) {
    const aRe = reX[i]!;
    const aIm = imX[i]!;
    const bRe = reH[i]!;
    const bIm = imH[i]!;
    reX[i] = aRe * bRe - aIm * bIm;
    imX[i] = aRe * bIm + aIm * bRe;
  }

  fftComplex(reX, imX, true);

  const outLen = n - m + 1;
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = reX[i + m - 1]!;
  return out;
}

export function normalizedCrossCorrelateFft(
  signal: Float32Array,
  template: Float32Array
): Float32Array {
  const n = signal.length;
  const m = template.length;
  if (m === 0 || n < m) return new Float32Array(0);

  const raw = crossCorrelateRawFft(signal, template);

  let tNorm = 0;
  for (let j = 0; j < m; j++) {
    const v = template[j]!;
    tNorm += v * v;
  }
  const tScale = Math.sqrt(tNorm) || 1;

  const outLen = n - m + 1;
  const out = new Float32Array(outLen);
  const prefix = new Float32Array(n + 1);
  prefix[0] = 0;
  for (let i = 0; i < n; i++) {
    const s = signal[i]!;
    prefix[i + 1] = prefix[i]! + s * s;
  }
  for (let i = 0; i < outLen; i++) {
    const sNorm = Math.max(prefix[i + m]! - prefix[i]!, 1e-12);
    out[i] = raw[i]! / (Math.sqrt(sNorm) * tScale);
  }
  return out;
}

/** Simple moving-average smoothing (boxcar). */
export function smoothMovingAverage(x: Float32Array, window: number): Float32Array {
  if (window <= 1) return Float32Array.from(x);
  const w = Math.min(window, x.length);
  const out = new Float32Array(x.length);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += x[i]!;
    if (i >= w) sum -= x[i - w]!;
    out[i] = i >= w - 1 ? sum / w : sum / (i + 1);
  }
  return out;
}
