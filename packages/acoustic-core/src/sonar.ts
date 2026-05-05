import { generateLinearChirp, normalizePeak } from './chirp';
import {
  DEFAULT_CHIRP_DURATION_S,
  DEFAULT_CHIRP_END_HZ,
  DEFAULT_CHIRP_START_HZ,
  DEFAULT_SAMPLE_RATE,
  SPEED_OF_SOUND_MPS,
} from './constants';
import type { CfarOptions } from './cfar';
import { findPeaksCfarOrFallback } from './cfar';
import { normalizedCrossCorrelate, normalizedCrossCorrelateFft, smoothMovingAverage } from './correlation';
import { delaySamplesToMeters, Peak } from './peaks';

export type SonarConfig = {
  sampleRate: number;
  chirpStartHz: number;
  chirpEndHz: number;
  chirpDurationS: number;
  speedOfSoundMps: number;
};

export type SonarResult = {
  peaks: Peak[];
  distancesM: number[];
  envelopeScore: number;
  confidence: 'low' | 'medium' | 'high';
  corr: Float32Array;
};

export type SonarAnalyzeOptions = {
  chirpStartSample?: number;
  peakThreshold?: number;
  minSeparationMs?: number;
  maxPeaks?: number;
  /** Ignore correlation peaks earlier than this (direct-path / leakage). */
  minEchoLagMs?: number;
  /** Use FFT-based matched filter (default true). */
  useFftCorrelation?: boolean;
  /** Use CA-CFAR with fallback to fixed threshold (default true). */
  useCfar?: boolean;
  cfar?: Partial<CfarOptions>;
  /** Override speed of sound (m/s) for this pulse; e.g. from air temperature. */
  speedOfSoundMps?: number;
};

const defaultConfig: SonarConfig = {
  sampleRate: DEFAULT_SAMPLE_RATE,
  chirpStartHz: DEFAULT_CHIRP_START_HZ,
  chirpEndHz: DEFAULT_CHIRP_END_HZ,
  chirpDurationS: DEFAULT_CHIRP_DURATION_S,
  speedOfSoundMps: SPEED_OF_SOUND_MPS,
};

/**
 * Analyze one pulse recording: optional calibration correlation vector (same length as expected corr)
 * is subtracted to reduce fixed leakage bias.
 */
export class SonarAnalyzer {
  readonly template: Float32Array;
  readonly config: SonarConfig;
  private calibrationCorr: Float32Array | null = null;

  constructor(config: Partial<SonarConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    const raw = generateLinearChirp(
      this.config.chirpDurationS,
      this.config.chirpStartHz,
      this.config.chirpEndHz,
      this.config.sampleRate
    );
    this.template = normalizePeak(raw, 0.9);
  }

  setCalibrationCorrelation(corr: Float32Array | null): void {
    this.calibrationCorr = corr && corr.length > 0 ? Float32Array.from(corr) : null;
  }

  analyze(recordedFloat: Float32Array, options?: SonarAnalyzeOptions): SonarResult {
    const sr = this.config.sampleRate;
    const chirpSamples = this.template.length;
    const chirpStart = Math.max(0, Math.floor(options?.chirpStartSample ?? 0));

    const end = Math.min(recordedFloat.length, chirpStart + chirpSamples * 8);
    const segment =
      chirpStart > 0 || end < recordedFloat.length
        ? recordedFloat.subarray(chirpStart, end)
        : recordedFloat;

    const useFft = options?.useFftCorrelation !== false;
    let corr = useFft
      ? normalizedCrossCorrelateFft(segment, this.template)
      : normalizedCrossCorrelate(segment, this.template);
    if (this.calibrationCorr && this.calibrationCorr.length === corr.length) {
      const adjusted = new Float32Array(corr.length);
      for (let i = 0; i < corr.length; i++) {
        adjusted[i] = corr[i]! - this.calibrationCorr[i]!;
      }
      corr = adjusted;
    }

    const smooth = smoothMovingAverage(corr, 5);
    const maxAbs = Math.max(1e-6, ...Array.from(smooth).map((v) => Math.abs(v)));
    const threshold = options?.peakThreshold ?? Math.max(0.25, maxAbs * 0.35);
    const sepSamples = Math.max(
      Math.floor(sr * (options?.minSeparationMs ?? 2.5) * 0.001),
      Math.floor(sr / 4000)
    );
    const maxPeaks = options?.maxPeaks ?? 5;
    const cfarOpts = options?.useCfar === false ? null : (options?.cfar ?? {});
    let peaks = findPeaksCfarOrFallback(smooth, threshold, cfarOpts, sepSamples, maxPeaks);
    const minLag = Math.floor(sr * ((options?.minEchoLagMs ?? 4) * 0.001));
    peaks = peaks.filter((p) => p.lagSamples >= minLag);

    const cSound = options?.speedOfSoundMps ?? this.config.speedOfSoundMps;
    const distancesM = peaks.map((p) => delaySamplesToMeters(p.lagSamples, sr, cSound));

    const pow = new Float32Array(segment.length);
    for (let i = 0; i < segment.length; i++) pow[i] = segment[i]! * segment[i]!;
    const env = smoothMovingAverage(pow, Math.max(32, Math.floor(sr * 0.01)));
    let envScore = 0;
    if (env.length > 0) {
      const tail = env.subarray(Math.floor(env.length * 0.5));
      let sum = 0;
      for (let i = 0; i < tail.length; i++) sum += tail[i]!;
      envScore = sum / tail.length;
    }

    const confidence: SonarResult['confidence'] =
      peaks.length === 0
        ? 'low'
        : peaks[0]!.score > 0.55
          ? 'high'
          : peaks[0]!.score > 0.35
            ? 'medium'
            : 'low';

    return {
      peaks,
      distancesM,
      envelopeScore: envScore,
      confidence,
      corr: smooth,
    };
  }
}
