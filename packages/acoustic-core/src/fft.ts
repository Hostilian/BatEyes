/** Smallest power of two >= n. */
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function bitReverseIndices(n: number): Uint32Array {
  const bits = Math.round(Math.log2(n));
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let x = i;
    let y = 0;
    for (let b = 0; b < bits; b++) {
      y = (y << 1) | (x & 1);
      x >>= 1;
    }
    rev[i] = y;
  }
  return rev;
}

/**
 * In-place Cooley–Tukey radix-2 FFT. `re`/`im` length must be power of 2.
 * Forward transform; for inverse, run `ifft` helper below.
 */
export function fftComplex(re: Float32Array, im: Float32Array, inverse: boolean): void {
  const n = re.length;
  if (im.length !== n) throw new Error('fft: length mismatch');
  if (n < 2 || (n & (n - 1)) !== 0) throw new Error('fft: length must be power of 2 >= 2');

  const rev = bitReverseIndices(n);
  for (let i = 0; i < n; i++) {
    const r = rev[i]!;
    if (r > i) {
      let t = re[i]!;
      re[i] = re[r]!;
      re[r] = t;
      t = im[i]!;
      im[i] = im[r]!;
      im[r] = t;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >>> 1;
    const ang = ((inverse ? 1 : -1) * 2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j]!;
        const uIm = im[i + j]!;
        const vRe = re[i + j + half]! * wRe - im[i + j + half]! * wIm;
        const vIm = re[i + j + half]! * wIm + im[i + j + half]! * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const nwRe = wRe * wlenRe - wIm * wlenIm;
        const nwIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nwRe;
        wIm = nwIm;
      }
    }
  }

  if (inverse) {
    const invN = 1 / n;
    for (let i = 0; i < n; i++) {
      re[i] *= invN;
      im[i] *= invN;
    }
  }
}
