import { generateLinearChirp, normalizePeak } from './chirp';
import { DEFAULT_SAMPLE_RATE } from './constants';
import { normalizedCrossCorrelate } from './correlation';
import { findPeaks } from './peaks';

describe('correlation', () => {
  it('peaks near synthetic echo delay', () => {
    const sr = DEFAULT_SAMPLE_RATE;
    const tmpl = normalizePeak(generateLinearChirp(0.04, 2000, 8000, sr), 0.5);
    const delay = Math.round(sr * 0.08);
    const noise = 0.02;
    const sigLen = tmpl.length + delay + Math.round(sr * 0.2);
    const sig = new Float32Array(sigLen);
    for (let i = 0; i < tmpl.length; i++) sig[i] += tmpl[i]!;
    const atten = 0.65;
    for (let i = 0; i < tmpl.length; i++) sig[i + delay] += atten * tmpl[i]!;
    for (let i = 0; i < sig.length; i++) {
      const u = ((i * 1103515245 + 12345) >>> 0) / 4294967296;
      sig[i] += (u - 0.5) * noise;
    }

    const corr = normalizedCrossCorrelate(sig, tmpl);
    const peaks = findPeaks(corr, 0.3, Math.floor(sr * 0.002), 5);
    expect(peaks.length).toBeGreaterThanOrEqual(1);
    const nearest = peaks.reduce((a, b) =>
      Math.abs(a.lagSamples - delay) < Math.abs(b.lagSamples - delay) ? a : b
    );
    expect(Math.abs(nearest.lagSamples - delay)).toBeLessThan(Math.round(sr * 0.001));
  });
});
