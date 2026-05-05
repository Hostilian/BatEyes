/**
 * Fixed-size float ring buffer for streaming capture (MVP helper).
 */
export class FloatRingBuffer {
  private readonly buf: Float32Array;
  private writeIdx = 0;
  private count = 0;

  constructor(capacity: number) {
    this.buf = new Float32Array(capacity);
  }

  get capacity(): number {
    return this.buf.length;
  }

  /** Number of samples currently stored. */
  size(): number {
    return this.count;
  }

  pushBlock(data: Float32Array): void {
    for (let i = 0; i < data.length; i++) this.push(data[i]!);
  }

  push(v: number): void {
    this.buf[this.writeIdx] = v;
    this.writeIdx = (this.writeIdx + 1) % this.buf.length;
    this.count = Math.min(this.count + 1, this.buf.length);
  }

  /** Oldest-first contiguous copy (drops overflow order beyond capacity). */
  snapshot(): Float32Array {
    if (this.count === 0) return new Float32Array(0);
    const out = new Float32Array(this.count);
    const start = (this.writeIdx - this.count + this.buf.length) % this.buf.length;
    for (let i = 0; i < this.count; i++) {
      out[i] = this.buf[(start + i) % this.buf.length]!;
    }
    return out;
  }

  clear(): void {
    this.writeIdx = 0;
    this.count = 0;
  }
}
