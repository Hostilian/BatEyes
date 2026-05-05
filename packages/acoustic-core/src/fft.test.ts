import { fftComplex } from './fft';

describe('fftComplex', () => {
  it('round-trips real input (forward + inverse)', () => {
    const n = 64;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let i = 0; i < n; i++) re[i] = (i + 1) * 0.01;
    const orig = Float32Array.from(re);

    fftComplex(re, im, false);
    fftComplex(re, im, true);

    let max = 0;
    for (let i = 0; i < n; i++) {
      max = Math.max(max, Math.abs(re[i]! - orig[i]!));
      expect(Math.abs(im[i]!)).toBeLessThan(1e-5);
    }
    expect(max).toBeLessThan(1e-4);
  });
});
