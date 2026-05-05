export const CELL_UNKNOWN = 0;
export const CELL_FREE = 1;
export const CELL_OCCUPIED = 2;

export type PolarHit2D = {
  yawDeg: number;
  rangeM: number;
};

export type OccupancyGrid = {
  /** Square side length (odd). */
  size: number;
  cellM: number;
  /** Row-major: index = row * size + col. Row 0 = north (+y), col 0 = west (-x). Center = (c,c). */
  cells: Uint8Array;
};

function setCellMax(grid: Uint8Array, idx: number, v: number): void {
  if (idx < 0 || idx >= grid.length) return;
  const cur = grid[idx]!;
  if (v > cur) grid[idx] = v;
}

/** Bresenham line; calls fn(col,row) for each cell. */
function lineCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fn: (x: number, y: number) => void
): void {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    fn(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Fuse polar range rings into a coarse 2D occupancy grid (robot at center).
 * Yaw 0° = +y (phone “top”); +x = right. Marks FREE along ray, OCCUPIED at endpoint.
 */
export function polarHitsToOccupancy(
  hits: ReadonlyArray<PolarHit2D>,
  opts: { halfExtentM: number; cellM: number }
): OccupancyGrid {
  const { halfExtentM, cellM } = opts;
  const cellsPerHalf = Math.max(1, Math.ceil(halfExtentM / cellM));
  const size = cellsPerHalf * 2 + 1;
  const c = cellsPerHalf;
  const cells = new Uint8Array(size * size);

  const worldToGrid = (xw: number, yw: number): { col: number; row: number } => ({
    col: Math.round(xw / cellM) + c,
    row: c - Math.round(yw / cellM),
  });

  for (const h of hits) {
    const rad = (h.yawDeg * Math.PI) / 180;
    const xw = h.rangeM * Math.sin(rad);
    const yw = h.rangeM * Math.cos(rad);
    const end = worldToGrid(xw, yw);
    const col0 = c;
    const row0 = c;
    let endCol = end.col;
    let endRow = end.row;
    endCol = Math.max(0, Math.min(size - 1, endCol));
    endRow = Math.max(0, Math.min(size - 1, endRow));

    lineCells(col0, row0, endCol, endRow, (col, row) => {
      if (col < 0 || row < 0 || col >= size || row >= size) return;
      const idx = row * size + col;
      if (col === endCol && row === endRow) setCellMax(cells, idx, CELL_OCCUPIED);
      else setCellMax(cells, idx, CELL_FREE);
    });
  }

  return { size, cellM, cells };
}
