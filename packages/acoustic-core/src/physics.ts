/**
 * Approximate speed of sound in dry air vs. temperature (°C).
 * Common engineering form: c ≈ 331.3 + 0.606 T  (m/s); adequate for cave-scale ranging.
 */
export function speedOfSoundDryAir(tempCelsius: number): number {
  return 331.3 + 0.606 * tempCelsius;
}
