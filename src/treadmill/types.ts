import type { BlendedBiomeConfig } from '../biome/types';

export interface ChunkConfig {
  width: number;
  depth: number;
  groundY: number;
  biome: BlendedBiomeConfig | null;
}
