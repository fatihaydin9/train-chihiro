// World dimensions
export const CHUNK_DEPTH = 40; // meters along Z
export const CHUNK_WIDTH = 80; // meters along X
export const CHUNK_COUNT = 8;
export const WORLD_SPEED = 15; // m/s along +Z toward player
export const TRACK_GAUGE = 1.435; // standard gauge in meters

// Terrain
export const GROUND_Y = -1.5; // ground plane Y position (player at origin)
export const TRACK_Y = GROUND_Y + 0.05;

// Terrain noise
export const TERRAIN_SEGMENTS_X = 40;
export const TERRAIN_SEGMENTS_Z = 20;
export const TERRAIN_AMPLITUDE = 4.0;
export const TERRAIN_FREQUENCY = 0.02;
export const TERRAIN_OCTAVES = 3;
export const TERRAIN_LACUNARITY = 2.0;
export const TERRAIN_PERSISTENCE = 0.5;
export const TERRAIN_NOISE_SEED = 42;
export const TRACK_CLEARANCE = 8.0; // keep hills flat near track

// Voxel terrain
export const VOXEL_BLOCK_SIZE = 1.0;
export const TERRAIN_MAX_HEIGHT = 6;

// Flora bands — forest feeling with layered depth
export const FLORA_NEAR_MIN = 5;  // close trees for immersion (but off the rails)
export const FLORA_NEAR_MAX = 15;
export const FLORA_FAR_MIN = 15;
export const FLORA_FAR_MAX = 38;

// Biome timing — faster transitions for variety
export const BIOME_DURATION = 40; // seconds per biome
export const BIOME_TRANSITION_DURATION = 12; // seconds to crossfade

// Flora density (legacy per-type counts, used by band system)
export const TREES_PER_CHUNK = 12;
export const ROCKS_PER_CHUNK = 6;
export const BUSHES_PER_CHUNK = 8;

// Weather particles
export const MAX_PARTICLES = 8000;

// Train cabin
export const CABIN_WIDTH = 3.0;
export const CABIN_HEIGHT = 3.0;
export const CABIN_DEPTH = 6.0;
export const CABIN_WALL_THICK = 0.12;
export const CABIN_FLOOR_Y = GROUND_Y + 0.25;

// Train cars ahead
export const TRAIN_CAR_COUNT = 3;
export const TRAIN_CAR_GAP = 0.4;
export const TRAIN_CAR_DEPTH = 8.0;

// Rivers and bridges
export const RIVER_PROBABILITY = 0.15;
export const BRIDGE_HEIGHT = 3.0;

// Day/night cycle — faster for more dynamic atmosphere
export const DAY_CYCLE_DURATION = 180; // seconds for full cycle
