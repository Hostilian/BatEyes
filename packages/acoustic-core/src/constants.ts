/** Dry air ~20C; tweak only for display — device mic latency dominates. */
export const SPEED_OF_SOUND_MPS = 343;

/** Stock mobile class rates — 48 kHz is typical. */
export const DEFAULT_SAMPLE_RATE = 48000;

/** Audible band: reliable across speakers; near-ultrasonic optional later. */
export const DEFAULT_CHIRP_START_HZ = 2000;
export const DEFAULT_CHIRP_END_HZ = 8000;

export const DEFAULT_CHIRP_DURATION_S = 0.04;
export const DEFAULT_PRE_ROLL_MS = 120;
export const DEFAULT_TAIL_MS = 350;
