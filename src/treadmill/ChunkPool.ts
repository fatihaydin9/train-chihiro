import { Chunk } from './Chunk';
import type { VoxelRegistry } from '../voxel/VoxelRegistry';
import { CHUNK_COUNT } from '../utils/constants';

export class ChunkPool {
  readonly chunks: Chunk[] = [];

  constructor(registry: VoxelRegistry) {
    for (let i = 0; i < CHUNK_COUNT; i++) {
      this.chunks.push(new Chunk(registry));
    }
  }
}
