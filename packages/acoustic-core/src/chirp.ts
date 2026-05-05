import { DEFAULT_SAMPLE_RATE } from './constants';

/**
 * Linear sine sweep (LFM chirp) from f0 to f1 over duration, Hann window applied.
 */
export function generateLinearChirp(
  durationSeconds: number,
  startHz: number,
  endHz: number,
  sampleRate: number = DEFAULT_SAMPLE_RATE
): Float32Array {
  const n = Math.max(1, Math.round(durationSeconds * sampleRate));
  const out = new Float32Array(n);
  const k = (endHz - startHz) / durationSeconds;
  const twoPi = Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const inst = startHz + 0.5 * k * t;
    const phase = twoPi * (startHz * t + 0.5 * k * t * t);
    const win =
      n <= 1 ? 1 : 0.5 * (1 - Math.cos((twoPi * i) / (n - 1)));
    out[i] = Math.sin(phase) * win;
  }
  return out;
}

/** Peak normalize to [-1, 1] */
export function normalizePeak(x: Float32Array, peak = 0.85): Float32Array {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]!));
  if (m < 1e-9) return x;
  const s = peak / m;
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i]! * s;
  return y;
}
