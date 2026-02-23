export interface BiomeColorConfig {
  r: number;
  g: number;
  b: number;
}

export interface FloraSpawnRule {
  model: string;      // key into VoxelRegistry
  count: number;
  scaleMin: number;
  scaleMax: number;
}

export interface FloraDistribution {
  near: FloraSpawnRule[];   // 6-20m from track
  far: FloraSpawnRule[];    // 20-38m from track (dense backdrop)
}

export interface BiomeConfig {
  name: string;
  fogColor: BiomeColorConfig;
  fogNear: number;
  fogFar: number;
  skyColor: BiomeColorConfig;
  skyColorHorizon: BiomeColorConfig;
  ambientColor: BiomeColorConfig;
  ambientIntensity: number;
  directionalColor: BiomeColorConfig;
  directionalIntensity: number;
  groundColor: BiomeColorConfig;
  groundColorAlt: BiomeColorConfig;
  trackColor: BiomeColorConfig;
  floraTypes: string[]; // legacy keys into VoxelRegistry
  floraDistribution: FloraDistribution;
  distantModels: string[]; // models for distant scenery layer
  terrainAmplitude: number;
  weatherType: WeatherType;
  weatherIntensity: number;
  windStrength: number;

  // Tunnel biome
  isTunnel: boolean;
  tunnelWallColor: BiomeColorConfig;

  // City neon
  hasNeonLights: boolean;
  neonColors: number[];

  // Per-biome river chance
  riverProbability: number;

  // Structure density
  structureDensity: number;

  // Day/night influence: 0 = ignore (tunnels), 1 = full
  dayNightInfluence: number;
}

export type WeatherType = 'snow' | 'rain' | 'leaves' | 'smog' | 'ash' | 'blizzard' | 'drizzle' | 'petals' | 'hail' | 'storm' | 'frost' | 'bubbles' | 'none';

export interface BlendedBiomeConfig extends BiomeConfig {
  transitionProgress: number; // 0 = fully "from", 1 = fully "to"
  fromBiome: string;
  toBiome: string;
}
