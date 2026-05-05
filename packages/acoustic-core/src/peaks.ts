export type Peak = {
  lagSamples: number;
  score: number;
};

/**
 * Find local maxima in `corr` above `threshold`, at least `minSeparationSamples` apart.
 */
export function findPeaks(
  corr: Float32Array,
  threshold: number,
  minSeparationSamples: number,
  maxPeaks: number
): Peak[] {
  const sep = Math.max(1, minSeparationSamples);
  const peaks: Peak[] = [];
  for (let i = 1; i < corr.length - 1; i++) {
    const v = corr[i]!;
    if (v < threshold) continue;
    if (v < corr[i - 1]! || v < corr[i + 1]!) continue;
    peaks.push({ lagSamples: i, score: v });
  }
  peaks.sort((a, b) => b.score - a.score);

  const picked: Peak[] = [];
  for (const p of peaks) {
    if (picked.length >= maxPeaks) break;
    if (picked.some((q) => Math.abs(q.lagSamples - p.lagSamples) < sep)) continue;
    picked.push(p);
  }
  picked.sort((a, b) => a.lagSamples - b.lagSamples);
  return picked;
}

/** Map round-trip delay (samples) to meters (approx). */
export function delaySamplesToMeters(
  lagSamples: number,
  sampleRate: number,
  speedOfSound: number
): number {
  const roundTripS = lagSamples / sampleRate;
  return (roundTripS * speedOfSound) / 2;
}
