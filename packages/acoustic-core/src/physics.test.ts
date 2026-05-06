import { speedOfSoundDryAir } from './physics';

describe('physics', () => {
  it('matches ~343 m/s near 20°C', () => {
    const c = speedOfSoundDryAir(20);
    expect(c).toBeGreaterThan(340);
    expect(c).toBeLessThan(346);
  });

  it('drops in cold air', () => {
    expect(speedOfSoundDryAir(10)).toBeLessThan(speedOfSoundDryAir(20));
  });

  it('increases in warm air', () => {
    expect(speedOfSoundDryAir(35)).toBeGreaterThan(speedOfSoundDryAir(20));
  });

  it('stays finite across extreme but representable temperatures', () => {
    expect(Number.isFinite(speedOfSoundDryAir(-100))).toBe(true);
    expect(Number.isFinite(speedOfSoundDryAir(120))).toBe(true);
  });
});
