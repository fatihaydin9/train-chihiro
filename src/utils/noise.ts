import { seededRandom } from './math';

/**
 * 2D Simplex-style noise based on a seeded permutation table.
 * Zero dependencies, deterministic output for a given seed.
 */
export class SimplexNoise2D {
  private perm: Uint8Array;
  private grad: [number, number][] = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  constructor(seed: number) {
    const rng = seededRandom(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    // Double the table to avoid index wrapping
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private dot2(gi: number, x: number, y: number): number {
    const g = this.grad[gi & 7];
    return g[0] * x + g[1] * y;
  }

  /**
   * Returns a value in approximately [-1, 1] for the given 2D coordinate.
   */
  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;

    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot2(this.perm[ii + this.perm[jj]], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot2(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot2(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
    }

    // Scale to [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }
}

/**
 * Fractal Brownian Motion — layers of noise at increasing frequency / decreasing amplitude.
 */
export function fbm2D(
  noise: SimplexNoise2D,
  x: number,
  y: number,
  octaves: number,
  lacunarity: number,
  persistence: number,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise.noise2D(x * frequency, y * frequency) * amplitude;
    max += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / max; // normalize to [-1, 1]
}
