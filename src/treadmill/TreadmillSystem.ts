import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { ChunkPool } from './ChunkPool';
import type { VoxelRegistry } from '../voxel/VoxelRegistry';
import type { BlendedBiomeConfig } from '../biome/types';
import { CHUNK_DEPTH, CHUNK_COUNT, WORLD_SPEED } from '../utils/constants';

export class TreadmillSystem implements Updatable {
  private pool: ChunkPool;
  private currentBiome: BlendedBiomeConfig | null = null;

  constructor(
    private scene: THREE.Scene,
    private eventBus: EventBus,
    registry: VoxelRegistry,
  ) {
    this.pool = new ChunkPool(registry);

    // Lay out chunks in a line behind the player
    const totalDepth = CHUNK_COUNT * CHUNK_DEPTH;
    for (let i = 0; i < this.pool.chunks.length; i++) {
      const chunk = this.pool.chunks[i];
      chunk.group.position.z = -(i * CHUNK_DEPTH) - CHUNK_DEPTH / 2;
      this.scene.add(chunk.group);
    }

    // Subscribe to biome transitions
    this.eventBus.on('biome:transition-tick', (config) => {
      this.currentBiome = config;
    });
  }

  update(dt: number, _elapsed: number): void {
    const moveAmount = WORLD_SPEED * dt;

    for (const chunk of this.pool.chunks) {
      chunk.group.position.z += moveAmount;

      // If chunk has passed the player, recycle it to the back
      if (chunk.group.position.z > CHUNK_DEPTH) {
        this.recycleChunk(chunk);
      }
    }
  }

  private recycleChunk(chunk: { group: THREE.Group } & import('./Chunk').Chunk): void {
    // Find the furthest-back chunk (will become the +Z neighbor of the recycled chunk)
    let minZ = Infinity;
    let backChunk: import('./Chunk').Chunk | null = null;
    for (const c of this.pool.chunks) {
      if (c !== chunk && c.group.position.z < minZ) {
        minZ = c.group.position.z;
        backChunk = c;
      }
    }

    const newZ = minZ - CHUNK_DEPTH;
    chunk.group.position.z = newZ;

    // Find the prev neighbor (-Z direction, further from player)
    // After repositioning, find the chunk that sits at newZ - CHUNK_DEPTH
    let prevChunk: import('./Chunk').Chunk | null = null;
    let nextChunk: import('./Chunk').Chunk | null = backChunk; // backChunk is at minZ = newZ + CHUNK_DEPTH
    const tolerance = CHUNK_DEPTH * 0.5;
    for (const c of this.pool.chunks) {
      if (c !== chunk && Math.abs(c.group.position.z - (newZ - CHUNK_DEPTH)) < tolerance) {
        prevChunk = c;
        break;
      }
    }

    // Reconfigure with current biome, blending terrain amplitude with both neighbors
    if (this.currentBiome) {
      const prevAmp = prevChunk ? prevChunk.getAmplitude() : undefined;
      const nextAmp = nextChunk ? nextChunk.getAmplitude() : undefined;
      chunk.reconfigure(this.currentBiome, prevAmp, nextAmp);
    }
  }
}
