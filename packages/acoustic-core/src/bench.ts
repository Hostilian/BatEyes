/**
 * Synthetic bench: print expected vs estimated delay (stdout).
 * Run: npm run build && npm run bench -w @bateyes/acoustic-core
 */
import { DEFAULT_SAMPLE_RATE } from './constants';
import { delaySamplesToMeters } from './peaks';
import { SonarAnalyzer } from './sonar';

function main(): void {
  const sr = DEFAULT_SAMPLE_RATE;
  const analyzer = new SonarAnalyzer();
  const tmpl = analyzer.template;
  const trueDelay = Math.round(sr * 0.12);
  const sigLen = tmpl.length + trueDelay + Math.round(sr * 0.25);
  const sig = new Float32Array(sigLen);
  for (let i = 0; i < tmpl.length; i++) sig[i] += 0.15 * tmpl[i]!;
  for (let i = 0; i < tmpl.length; i++) sig[i + trueDelay] += 0.55 * tmpl[i]!;

  const res = analyzer.analyze(sig, { chirpStartSample: 0 });
  const best = res.peaks[0];
  const estDelay = best?.lagSamples ?? -1;
  const trueM = delaySamplesToMeters(trueDelay, sr, 343);
  const estM = best ? delaySamplesToMeters(estDelay, sr, 343) : NaN;

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ trueDelay, estDelay, trueM, estM, confidence: res.confidence }, null, 2));
}

main();
