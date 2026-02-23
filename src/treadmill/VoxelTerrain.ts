import * as THREE from 'three';
import {
  CHUNK_WIDTH, CHUNK_DEPTH, TRACK_CLEARANCE,
  TERRAIN_FREQUENCY, TERRAIN_OCTAVES, TERRAIN_LACUNARITY,
  TERRAIN_PERSISTENCE, TERRAIN_NOISE_SEED,
  TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Z,
} from '../utils/constants';
import { smoothstep, lerp } from '../utils/math';
import { SimplexNoise2D, fbm2D } from '../utils/noise';

const terrainNoise = new SimplexNoise2D(TERRAIN_NOISE_SEED);
const colorNoise = new SimplexNoise2D(TERRAIN_NOISE_SEED + 7);
const HALF_WIDTH = CHUNK_WIDTH / 2;
const HALF_DEPTH = CHUNK_DEPTH / 2;

/** How far below the surface the skirt drops (in local mesh units). */
const SKIRT_DROP = 108;

/**
 * Height profile along X axis.
 * sin(t * PI) from TRACK_CLEARANCE to HALF_WIDTH → 0 at both ends.
 */
function xProfile(absX: number): number {
  if (absX <= TRACK_CLEARANCE) return 0;
  if (absX >= HALF_WIDTH) return 0;
  const t = (absX - TRACK_CLEARANCE) / (HALF_WIDTH - TRACK_CLEARANCE);
  return Math.sin(t * Math.PI);
}

/**
 * Amplitude blend along Z axis between neighboring chunks.
 * Both sides meet at the midpoint amplitude at the shared edge.
 */
function blendAmplitude(
  localZ: number,
  amplitude: number,
  prevAmplitude: number,
  nextAmplitude: number,
): number {
  const blendZone = 10.0;
  const distFromNegZ = localZ + HALF_DEPTH;
  const distFromPosZ = HALF_DEPTH - localZ;

  if (distFromNegZ < blendZone) {
    const t = smoothstep(0, blendZone, distFromNegZ);
    const mid = (prevAmplitude + amplitude) * 0.5;
    return lerp(mid, amplitude, t);
  }
  if (distFromPosZ < blendZone) {
    const t = smoothstep(0, blendZone, distFromPosZ);
    const mid = (nextAmplitude + amplitude) * 0.5;
    return lerp(mid, amplitude, t);
  }
  return amplitude;
}

/**
 * Compute terrain height at any point.
 * max(0, noise) so terrain only rises above ground.
 */
function computeHeight(
  localX: number,
  localZ: number,
  worldZ: number,
  amplitude: number,
  prevAmplitude: number,
  nextAmplitude: number,
): number {
  const wx = localX * TERRAIN_FREQUENCY;
  const wz = (localZ + worldZ) * TERRAIN_FREQUENCY;
  const noiseVal = fbm2D(
    terrainNoise, wx, wz,
    TERRAIN_OCTAVES, TERRAIN_LACUNARITY, TERRAIN_PERSISTENCE,
  );

  const profile = xProfile(Math.abs(localX));
  const amp = blendAmplitude(localZ, amplitude, prevAmplitude, nextAmplitude);

  return Math.max(0, noiseVal) * profile * amp;
}

/**
 * Smooth terrain with skirt — PlaneGeometry with vertex displacement
 * plus edge skirt geometry to hide the underside of hills.
 */
export class VoxelTerrain {
  readonly mesh: THREE.Mesh;
  readonly skirtMesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshStandardMaterial;
  private skirtGeometry: THREE.BufferGeometry;

  constructor() {
    this.geometry = new THREE.PlaneGeometry(
      CHUNK_WIDTH, CHUNK_DEPTH,
      TERRAIN_SEGMENTS_X, TERRAIN_SEGMENTS_Z,
    );
    this.geometry.rotateX(-Math.PI / 2);

    // Replace default index buffer with alternating diagonals
    // to eliminate systematic vertical stripe artifacts on slopes.
    const cols = TERRAIN_SEGMENTS_X + 1;
    const newIndices: number[] = [];
    for (let iz = 0; iz < TERRAIN_SEGMENTS_Z; iz++) {
      for (let ix = 0; ix < TERRAIN_SEGMENTS_X; ix++) {
        const a = ix + cols * iz;             // top-left
        const b = ix + cols * (iz + 1);       // bottom-left
        const c = (ix + 1) + cols * (iz + 1); // bottom-right
        const d = (ix + 1) + cols * iz;       // top-right
        if ((ix + iz) % 2 === 0) {
          newIndices.push(a, b, c, a, c, d);
        } else {
          newIndices.push(a, b, d, b, c, d);
        }
      }
    }
    this.geometry.setIndex(newIndices);

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
      flatShading: false,
    });

    const vertexCount = this.geometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    // Skirt mesh — uses same material; geometry has both-sided faces
    this.skirtGeometry = new THREE.BufferGeometry();
    this.skirtMesh = new THREE.Mesh(this.skirtGeometry, this.material);
    this.skirtMesh.receiveShadow = true;
    this.skirtMesh.castShadow = false;
  }

  generate(
    worldZ: number,
    amplitude: number,
    baseColor: { r: number; g: number; b: number },
    altColor: { r: number; g: number; b: number },
    prevAmplitude?: number,
    nextAmplitude?: number,
  ): void {
    const positions = this.geometry.attributes.position;
    const colors = this.geometry.attributes.color;
    const pAmp = prevAmplitude ?? amplitude;
    const nAmp = nextAmplitude ?? amplitude;

    // Small offset for finite-difference normal computation
    const eps = 0.5;
    const normals = this.geometry.attributes.normal;

    for (let i = 0; i < positions.count; i++) {
      const localX = positions.getX(i);
      const localZ = positions.getZ(i);

      const height = computeHeight(localX, localZ, worldZ, amplitude, pAmp, nAmp);
      positions.setY(i, height);

      // Compute smooth normal via finite differences (triangulation-independent)
      const hL = computeHeight(localX - eps, localZ, worldZ, amplitude, pAmp, nAmp);
      const hR = computeHeight(localX + eps, localZ, worldZ, amplitude, pAmp, nAmp);
      const hB = computeHeight(localX, localZ - eps, worldZ, amplitude, pAmp, nAmp);
      const hF = computeHeight(localX, localZ + eps, worldZ, amplitude, pAmp, nAmp);
      const nx = hL - hR;
      const nz = hB - hF;
      const ny = 2.0 * eps;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normals.setXYZ(i, nx / len, ny / len, nz / len);

      // Vertex color
      const wx = localX * TERRAIN_FREQUENCY;
      const wz = (localZ + worldZ) * TERRAIN_FREQUENCY;
      const noiseVal = fbm2D(
        terrainNoise, wx, wz,
        TERRAIN_OCTAVES, TERRAIN_LACUNARITY, TERRAIN_PERSISTENCE,
      );
      const heightT = Math.max(0, noiseVal) * 0.5 + 0.25;
      const variation = colorNoise.noise2D(localX * 0.15, (localZ + worldZ) * 0.15) * 0.05;
      colors.setXYZ(
        i,
        baseColor.r + (altColor.r - baseColor.r) * heightT + variation,
        baseColor.g + (altColor.g - baseColor.g) * heightT + variation,
        baseColor.b + (altColor.b - baseColor.b) * heightT + variation,
      );
    }

    positions.needsUpdate = true;
    normals.needsUpdate = true;
    colors.needsUpdate = true;

    // Rebuild skirt from updated edge vertices
    this.buildSkirt(baseColor);
  }

  /**
   * Build skirt geometry — vertical strips hanging from each terrain edge
   * down to SKIRT_DROP below surface, hiding the underside of hills.
   */
  private buildSkirt(baseColor: { r: number; g: number; b: number }): void {
    const mainPos = this.geometry.attributes.position;
    const mainCol = this.geometry.attributes.color;
    const cols = TERRAIN_SEGMENTS_X + 1; // vertices per row
    const rows = TERRAIN_SEGMENTS_Z + 1; // vertices per column

    // Collect edge vertex indices for all 4 edges
    // After rotateX(-PI/2): row 0 → z = -HALF_DEPTH (far), row last → z = +HALF_DEPTH (near)
    //                        col 0 → x = -HALF_WIDTH (left), col last → x = +HALF_WIDTH (right)
    const edgeIndices: number[][] = [
      // Left edge (x = -HALF_WIDTH): col 0, all rows
      Array.from({ length: rows }, (_, r) => r * cols),
      // Right edge (x = +HALF_WIDTH): col last, all rows
      Array.from({ length: rows }, (_, r) => r * cols + (cols - 1)),
      // Far edge (z = -HALF_DEPTH): row 0, all cols
      Array.from({ length: cols }, (_, c) => c),
      // Near edge (z = +HALF_DEPTH): row last, all cols
      Array.from({ length: cols }, (_, c) => (rows - 1) * cols + c),
    ];

    // Count totals — each segment emits 4 triangles (2 front + 2 back)
    let totalVerts = 0;
    for (const ei of edgeIndices) totalVerts += ei.length * 2;

    const sPos = new Float32Array(totalVerts * 3);
    const sCol = new Float32Array(totalVerts * 3);
    const sIdx: number[] = [];
    let vi = 0;

    for (const edge of edgeIndices) {
      const baseVi = vi;

      for (const idx of edge) {
        const x = mainPos.getX(idx);
        const y = mainPos.getY(idx);
        const z = mainPos.getZ(idx);
        const cr = mainCol.getX(idx);
        const cg = mainCol.getY(idx);
        const cb = mainCol.getZ(idx);

        // Top vertex — at terrain surface
        sPos[vi * 3] = x;
        sPos[vi * 3 + 1] = y;
        sPos[vi * 3 + 2] = z;
        sCol[vi * 3] = cr;
        sCol[vi * 3 + 1] = cg;
        sCol[vi * 3 + 2] = cb;
        vi++;

        // Bottom vertex — dropped below ground
        sPos[vi * 3] = x;
        sPos[vi * 3 + 1] = -SKIRT_DROP;
        sPos[vi * 3 + 2] = z;
        sCol[vi * 3] = baseColor.r * 0.4;
        sCol[vi * 3 + 1] = baseColor.g * 0.4;
        sCol[vi * 3 + 2] = baseColor.b * 0.4;
        vi++;
      }

      // Emit both windings for each quad so it's visible from either side
      for (let i = 0; i < edge.length - 1; i++) {
        const tl = baseVi + i * 2;
        const bl = baseVi + i * 2 + 1;
        const tr = baseVi + (i + 1) * 2;
        const br = baseVi + (i + 1) * 2 + 1;

        // Winding A
        sIdx.push(tl, tr, bl, bl, tr, br);
        // Winding B (reversed)
        sIdx.push(tl, bl, tr, bl, br, tr);
      }
    }

    // Dispose old and create new
    this.skirtGeometry.dispose();
    this.skirtGeometry = new THREE.BufferGeometry();
    this.skirtGeometry.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    this.skirtGeometry.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
    this.skirtGeometry.setIndex(sIdx);
    this.skirtGeometry.computeVertexNormals();
    this.skirtMesh.geometry = this.skirtGeometry;
  }

  sampleHeight(
    localX: number,
    localZ: number,
    worldZ: number,
    amplitude: number,
    prevAmplitude?: number,
    nextAmplitude?: number,
  ): number {
    return computeHeight(
      localX, localZ, worldZ,
      amplitude,
      prevAmplitude ?? amplitude,
      nextAmplitude ?? amplitude,
    );
  }

  dispose(): void {
    this.geometry.dispose();
    this.skirtGeometry.dispose();
    this.material.dispose();
  }
}
