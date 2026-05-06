import { SonarAnalyzer } from './sonar';

describe('benchmark thresholds', () => {
  it('keeps delay estimation within tolerance for synthetic fixture', () => {
    const analyzer = new SonarAnalyzer();
    const sr = analyzer.config.sampleRate;
    const tmpl = analyzer.template;
    const trueDelay = Math.round(sr * 0.12);
    const sig = new Float32Array(tmpl.length + trueDelay + Math.round(sr * 0.2));

    for (let i = 0; i < tmpl.length; i++) sig[i] += 0.12 * tmpl[i];
    for (let i = 0; i < tmpl.length; i++) sig[i + trueDelay] += 0.58 * tmpl[i];

    const out = analyzer.analyze(sig, { chirpStartSample: 0, minEchoLagMs: 8, useCfar: false });
    expect(out.peaks.length).toBeGreaterThan(0);
    const hasNearExpectedPeak = out.peaks.some((p) => Math.abs(p.lagSamples - trueDelay) <= 12);
    expect(hasNearExpectedPeak).toBe(true);
  });
});
