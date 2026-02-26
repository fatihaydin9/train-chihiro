import * as THREE from 'three';
import type { BlendedBiomeConfig, FloraSpawnRule } from '../biome/types';
import type { InstancedVoxelBatch } from '../voxel/InstancedVoxelBatch';
import type { VoxelRegistry } from '../voxel/VoxelRegistry';
import { VoxelTerrain } from './VoxelTerrain';
import { TunnelOverlay } from './TunnelOverlay';
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  GROUND_Y,
  TRACK_Y,
  TRACK_GAUGE,
  TRACK_CLEARANCE,
  FLORA_NEAR_MIN,
  FLORA_NEAR_MAX,
  FLORA_FAR_MIN,
  FLORA_FAR_MAX,
  BRIDGE_HEIGHT,
} from '../utils/constants';

const FLORA_TRACK_CLEARANCE = TRACK_GAUGE / 2 + 3.0;
import { seededRandom } from '../utils/math';

export class Chunk {
  readonly group = new THREE.Group();
  private terrain: VoxelTerrain;
  private tunnel: TunnelOverlay;
  private trackLeft: THREE.Mesh;
  private trackRight: THREE.Mesh;
  private trackBed: THREE.Mesh;
  private floraBatches: InstancedVoxelBatch[] = [];
  private riverGroup: THREE.Group | null = null;
  private bridgeGroup: THREE.Group | null = null;
  private seed: number;
  private currentAmplitude = 4.0;
  private prevAmplitude?: number;
  private nextAmplitude?: number;

  constructor(private registry: VoxelRegistry) {
    this.seed = Math.random() * 100000;

    // Voxel terrain (replaces PlaneGeometry ground)
    this.terrain = new VoxelTerrain();
    this.terrain.mesh.position.y = GROUND_Y;
    this.terrain.skirtMesh.position.y = GROUND_Y;
    this.group.add(this.terrain.mesh);
    this.group.add(this.terrain.skirtMesh);

    // Tunnel overlay (activated conditionally)
    this.tunnel = new TunnelOverlay();
    this.group.add(this.tunnel.group);

    // Track bed (gravel strip)
    const bedGeo = new THREE.PlaneGeometry(TRACK_GAUGE + 1.0, CHUNK_DEPTH);
    bedGeo.rotateX(-Math.PI / 2);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95, metalness: 0.0 });
    this.trackBed = new THREE.Mesh(bedGeo, bedMat);
    this.trackBed.position.y = TRACK_Y;
    this.group.add(this.trackBed);

    // Rails
    const railGeo = new THREE.BoxGeometry(0.07, 0.1, CHUNK_DEPTH);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.8 });

    this.trackLeft = new THREE.Mesh(railGeo, railMat);
    this.trackLeft.position.set(-TRACK_GAUGE / 2, TRACK_Y + 0.05, 0);
    this.group.add(this.trackLeft);

    this.trackRight = new THREE.Mesh(railGeo, railMat);
    this.trackRight.position.set(TRACK_GAUGE / 2, TRACK_Y + 0.05, 0);
    this.group.add(this.trackRight);
  }

  getAmplitude(): number {
    return this.currentAmplitude;
  }

  reconfigure(biome: BlendedBiomeConfig, prevAmplitude?: number, nextAmplitude?: number): void {
    // Update track color
    const tc = biome.trackColor;
    (this.trackBed.material as THREE.MeshStandardMaterial).color.setRGB(tc.r, tc.g, tc.b);

    // Generate voxel terrain
    this.currentAmplitude = biome.isTunnel ? 0.5 : biome.terrainAmplitude;
    const worldZ = this.group.position.z;
    this.prevAmplitude = prevAmplitude;
    this.nextAmplitude = nextAmplitude;
    this.terrain.generate(worldZ, this.currentAmplitude, biome.groundColor, biome.groundColorAlt, prevAmplitude, nextAmplitude);

    // Tunnel overlay
    if (biome.isTunnel) {
      this.tunnel.setActive(true);
      this.tunnel.reconfigure(biome.tunnelWallColor);
    } else {
      this.tunnel.setActive(false);
    }

    // Remove old flora
    for (const batch of this.floraBatches) {
      this.group.remove(batch.mesh);
      batch.dispose();
    }
    this.floraBatches = [];

    // Remove old river/bridge
    if (this.riverGroup) {
      this.group.remove(this.riverGroup);
      this.riverGroup = null;
    }
    if (this.bridgeGroup) {
      this.group.remove(this.bridgeGroup);
      this.bridgeGroup = null;
    }

    // Spawn new flora using band system
    this.seed = Math.random() * 100000;
    const rng = seededRandom(this.seed);

    // Spawn flora in all biomes (including cave tunnels for stalactites etc.)
    this.spawnFloraByBand(biome.floraDistribution.near, rng, FLORA_NEAR_MIN, FLORA_NEAR_MAX);
    this.spawnFloraByBand(biome.floraDistribution.far, rng, FLORA_FAR_MIN, FLORA_FAR_MAX);

    if (!biome.isTunnel) {
      // Maybe generate river (not inside tunnels)
      this.maybeGenerateRiver(biome, rng);
    }
  }

  /**
   * Sample terrain height at a local position (for placing flora on hills).
   */
  private sampleTerrainHeight(localX: number, localZ: number): number {
    const worldZ = this.group.position.z;
    return GROUND_Y + this.terrain.sampleHeight(localX, localZ, worldZ, this.currentAmplitude, this.prevAmplitude, this.nextAmplitude);
  }

  /**
   * Spawn flora instances within a distance band from the track.
   */
  private spawnFloraByBand(
    rules: FloraSpawnRule[],
    rng: () => number,
    bandMin: number,
    bandMax: number,
  ): void {
    for (const rule of rules) {
      const model = this.registry.getModel(rule.model);
      if (!model) continue;

      const batch = model.createBatch(rule.count);
      const dummy = new THREE.Object3D();

      for (let i = 0; i < rule.count; i++) {
        const rawDist = bandMin + rng() * (bandMax - bandMin);
        const dist = Math.max(rawDist, FLORA_TRACK_CLEARANCE);
        const side = rng() > 0.5 ? 1 : -1;
        const x = side * dist;
        const z = (rng() - 0.5) * CHUNK_DEPTH;
        const scale = rule.scaleMin + rng() * (rule.scaleMax - rule.scaleMin);
        const rotY = rng() * Math.PI * 2;

        const y = this.sampleTerrainHeight(x, z);

        dummy.position.set(x, y, z);
        dummy.scale.setScalar(scale);
        dummy.rotation.y = rotY;
        dummy.updateMatrix();
        batch.setTransform(i, dummy.matrix);
      }

      batch.mesh.position.set(0, 0, 0);
      batch.mesh.castShadow = true;
      this.group.add(batch.mesh);
      this.floraBatches.push(batch);
    }
  }

  /**
   * Maybe generate a river crossing with a bridge over the track.
   */
  private maybeGenerateRiver(biome: BlendedBiomeConfig, rng: () => number): void {
    if (rng() > biome.riverProbability) return;

    const riverZ = (rng() - 0.5) * CHUNK_DEPTH * 0.6;
    const riverWidth = 3 + rng() * 4;
    const halfW = CHUNK_WIDTH / 2;

    // River: blue voxel blocks at depressed Y, crossing perpendicular to track
    this.riverGroup = new THREE.Group();
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x3366aa, transparent: true, opacity: 0.7, roughness: 0.2, metalness: 0.1 });

    // River on both sides of the track
    for (const side of [-1, 1]) {
      const riverMesh = new THREE.Mesh(
        new THREE.BoxGeometry(halfW - TRACK_CLEARANCE, 0.3, riverWidth),
        waterMat,
      );
      riverMesh.position.set(
        side * (TRACK_CLEARANCE + (halfW - TRACK_CLEARANCE) / 2),
        GROUND_Y - 0.5,
        riverZ,
      );
      this.riverGroup.add(riverMesh);
    }
    this.group.add(this.riverGroup);

    // Bridge over track zone
    this.bridgeGroup = new THREE.Group();
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x6b5030, roughness: 0.9, metalness: 0.0 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.9, metalness: 0.0 });

    // Deck
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK_GAUGE + 2.0, 0.15, riverWidth + 1.0),
      bridgeMat,
    );
    deck.position.set(0, TRACK_Y - 0.1, riverZ);
    this.bridgeGroup.add(deck);

    // 4 posts
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, BRIDGE_HEIGHT, 0.15),
          postMat,
        );
        post.position.set(
          sx * (TRACK_GAUGE / 2 + 0.8),
          GROUND_Y - 0.5 + BRIDGE_HEIGHT / 2,
          riverZ + sz * (riverWidth / 2 + 0.3),
        );
        this.bridgeGroup.add(post);
      }
    }

    // Railings
    for (const sx of [-1, 1]) {
      const railing = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, riverWidth + 1.5),
        postMat,
      );
      railing.position.set(
        sx * (TRACK_GAUGE / 2 + 0.8),
        TRACK_Y + 0.5,
        riverZ,
      );
      this.bridgeGroup.add(railing);
    }

    this.group.add(this.bridgeGroup);
  }

  dispose(): void {
    for (const batch of this.floraBatches) {
      batch.dispose();
    }
    this.terrain.dispose();
    this.tunnel.dispose();
  }
}
