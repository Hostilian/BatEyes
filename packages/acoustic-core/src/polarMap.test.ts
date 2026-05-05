import { CELL_FREE, CELL_OCCUPIED, polarHitsToOccupancy } from './polarMap';

describe('polarHitsToOccupancy', () => {
  it('marks occupied and some free along ray', () => {
    const g = polarHitsToOccupancy([{ yawDeg: 0, rangeM: 2 }], { halfExtentM: 5, cellM: 0.5 });
    expect(g.size).toBeGreaterThan(5);
    const c = (g.size - 1) >> 1;
    const center = g.cells[c * g.size + c]!;
    const northIdx = (c - 4) * g.size + c; // ~2m north at 0.5m cells
    expect(center).toBe(CELL_FREE);
    expect(g.cells[northIdx]!).toBe(CELL_OCCUPIED);
    const hasFree = Array.from(g.cells).some((v) => v === CELL_FREE);
    expect(hasFree).toBe(true);
  });
});
