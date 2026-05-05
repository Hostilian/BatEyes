import { generateLinearChirp, normalizePeak } from './chirp';
import { DEFAULT_SAMPLE_RATE } from './constants';

describe('chirp', () => {
  it('has expected length', () => {
    const sr = DEFAULT_SAMPLE_RATE;
    const x = generateLinearChirp(0.04, 2000, 8000, sr);
    expect(x.length).toBe(Math.round(0.04 * sr));
  });

  it('normalizePeak scales to peak', () => {
    const x = new Float32Array([0, 0.5, -1, 0.25]);
    const y = normalizePeak(x, 0.8);
    let m = 0;
    for (let i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i]!));
    expect(m).toBeCloseTo(0.8, 5);
  });
});
