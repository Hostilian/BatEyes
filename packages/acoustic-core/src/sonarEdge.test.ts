import { SonarAnalyzer } from './sonar';

function seededNoise(length: number, seed: number): Float32Array {
  let x = seed >>> 0;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    x = (1664525 * x + 1013904223) >>> 0;
    out[i] = ((x / 0xffffffff) * 2 - 1) * 0.05;
  }
  return out;
}

describe('SonarAnalyzer edge behavior', () => {
  it('keeps finite correlation values in near-silence input', () => {
    const analyzer = new SonarAnalyzer();
    const input = new Float32Array(4096);
    const out = analyzer.analyze(input, { chirpStartSample: 0 });
    expect(out.corr.length).toBeGreaterThan(0);
    for (const value of out.corr) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('detects a known delayed chirp in low-SNR fixture', () => {
    const analyzer = new SonarAnalyzer();
    const sr = analyzer.config.sampleRate;
    const tmpl = analyzer.template;
    const delay = Math.round(sr * 0.085);
    const sig = seededNoise(tmpl.length + delay + Math.round(sr * 0.2), 1234);

    for (let i = 0; i < tmpl.length; i++) {
      sig[i] += tmpl[i] * 0.08;
      sig[i + delay] += tmpl[i] * 0.35;
    }

    const out = analyzer.analyze(sig, {
      chirpStartSample: 0,
      minEchoLagMs: 8,
      useFftCorrelation: true,
      useCfar: true,
    });

    expect(out.distancesM.length).toBeGreaterThan(0);
    expect(out.distancesM[0]).toBeGreaterThan(0);
    expect(out.distancesM[0]).toBeLessThan(20);
  });

  it('handles calibration vector length mismatch safely', () => {
    const analyzer = new SonarAnalyzer();
    analyzer.setCalibrationCorrelation(new Float32Array([0.1, 0.2, 0.3]));
    const out = analyzer.analyze(new Float32Array(4096), { useFftCorrelation: true });
    expect(out.corr.length).toBeGreaterThan(0);
    expect(out.confidence).toBeDefined();
  });

  it('changes estimated range when speed of sound override changes', () => {
    const analyzer = new SonarAnalyzer();
    const sr = analyzer.config.sampleRate;
    const tmpl = analyzer.template;
    const delay = Math.round(sr * 0.06);
    const sig = seededNoise(tmpl.length + delay + Math.round(sr * 0.15), 5678);
    for (let i = 0; i < tmpl.length; i++) {
      sig[i + delay] += tmpl[i] * 0.8;
    }

    const cold = analyzer.analyze(sig, {
      chirpStartSample: 0,
      minEchoLagMs: 8,
      useCfar: true,
      speedOfSoundMps: 320,
    });
    const warm = analyzer.analyze(sig, {
      chirpStartSample: 0,
      minEchoLagMs: 8,
      useCfar: true,
      speedOfSoundMps: 360,
    });

    expect(cold.distancesM.length).toBeGreaterThan(0);
    expect(warm.distancesM.length).toBeGreaterThan(0);
    expect(warm.distancesM[0]).toBeGreaterThan(cold.distancesM[0]);
  });
});
