import { generateLinearChirp, normalizePeak } from './chirp';
import { DEFAULT_SAMPLE_RATE } from './constants';
import {
  crossCorrelateRaw,
  crossCorrelateRawFft,
  normalizedCrossCorrelate,
  normalizedCrossCorrelateFft,
} from './correlation';

describe('fft correlation', () => {
  it('raw FFT matches time-domain correlation', () => {
    const sr = DEFAULT_SAMPLE_RATE;
    const tmpl = normalizePeak(generateLinearChirp(0.04, 2000, 8000, sr), 0.5);
    const n = tmpl.length + Math.round(sr * 0.35);
    const sig = new Float32Array(n);
    for (let i = 0; i < tmpl.length; i++) sig[Math.floor(sr * 0.02) + i] += 0.4 * tmpl[i]!;
    const delay = Math.round(sr * 0.11);
    for (let i = 0; i < tmpl.length; i++) sig[delay + i] += 0.55 * tmpl[i]!;

    const a = crossCorrelateRaw(sig, tmpl);
    const b = crossCorrelateRawFft(sig, tmpl);
    expect(a.length).toBe(b.length);
    let maxDiff = 0;
    for (let i = 0; i < a.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(a[i]! - b[i]!));
    }
    expect(maxDiff).toBeLessThan(1e-2);
  });

  it('matches time-domain normalized correlation within tolerance', () => {
    const sr = DEFAULT_SAMPLE_RATE;
    const tmpl = normalizePeak(generateLinearChirp(0.04, 2000, 8000, sr), 0.5);
    const n = tmpl.length + Math.round(sr * 0.35);
    const sig = new Float32Array(n);
    for (let i = 0; i < tmpl.length; i++) sig[Math.floor(sr * 0.02) + i] += 0.4 * tmpl[i]!;
    const delay = Math.round(sr * 0.11);
    for (let i = 0; i < tmpl.length; i++) sig[delay + i] += 0.55 * tmpl[i]!;

    const a = normalizedCrossCorrelate(sig, tmpl);
    const b = normalizedCrossCorrelateFft(sig, tmpl);
    expect(a.length).toBe(b.length);
    let maxDiff = 0;
    for (let i = 0; i < a.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(a[i]! - b[i]!));
    }
    // Time-domain uses double-precision accumulators; FFT path is float32-heavy — allow small gap.
    expect(maxDiff).toBeLessThan(0.12);
  });
});
