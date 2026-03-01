import * as THREE from "three";

import { GROUND_Y, WORLD_SPEED } from "../utils/constants";

import type { EventBus } from "../core/EventBus";
import type { InstancedVoxelBatch } from "../voxel/InstancedVoxelBatch";
import type { Updatable } from "../core/GameLoop";
import type { VoxelRegistry } from "../voxel/VoxelRegistry";
import { seededRandom } from "../utils/math";

const MID_DISTANCE = 120; // village silhouettes
const FAR_DISTANCE = 200; // mountains
const MID_PARALLAX = 0.7; // moves at 70% of world speed
const FAR_PARALLAX = 0.3; // moves at 30% of world speed
const STRIP_DEPTH = 400; // total Z length of scenery strip
const RECYCLE_Z = 150; // recycle when passed player

interface SceneryLayer {
  group: THREE.Group;
  parallax: number;
  batches: InstancedVoxelBatch[];
}

export class DistantScenery implements Updatable {
  private midLayer: SceneryLayer;
  private farLayer: SceneryLayer;
  private currentDistantModels: string[] = [];
  private speed = WORLD_SPEED * 0.55;

  constructor(
    private scene: THREE.Scene,
    private eventBus: EventBus,
    private registry: VoxelRegistry,
  ) {
    this.midLayer = {
      group: new THREE.Group(),
      parallax: MID_PARALLAX,
      batches: [],
    };
    this.farLayer = {
      group: new THREE.Group(),
      parallax: FAR_PARALLAX,
      batches: [],
    };
    scene.add(this.midLayer.group);
    scene.add(this.farLayer.group);

    // Initial population
    this.populateFarLayer();
    this.populateMidLayer();

    // Rebuild mid-layer scenery when biome changes
    this.eventBus.on("biome:changed", ({ biome }) => {
      // Will be picked up via distantModels on next rebuild
    });

    this.eventBus.on("biome:transition-tick", (config) => {
      const models = config.distantModels;
      if (models !== this.currentDistantModels) {
        this.currentDistantModels = models;
      }
    });

    this.eventBus.on("train:speed-changed", ({ fast }) => {
      this.speed = fast ? WORLD_SPEED * 1.4 : WORLD_SPEED * 0.55;
    });
  }

  update(dt: number, _elapsed: number): void {
    const moveAmount = this.speed * dt;

    // Move layers at parallax-reduced speed
    this.midLayer.group.position.z += moveAmount * this.midLayer.parallax;
    this.farLayer.group.position.z += moveAmount * this.farLayer.parallax;

    // Recycle mid layer
    if (this.midLayer.group.position.z > RECYCLE_Z) {
      this.midLayer.group.position.z -= STRIP_DEPTH;
      this.clearLayer(this.midLayer);
      this.populateMidLayer();
    }

    // Recycle far layer (moves slower, longer cycle)
    if (this.farLayer.group.position.z > RECYCLE_Z * 0.5) {
      this.farLayer.group.position.z -= STRIP_DEPTH;
      this.clearLayer(this.farLayer);
      this.populateFarLayer();
    }
  }

  private clearLayer(layer: SceneryLayer): void {
    for (const batch of layer.batches) {
      layer.group.remove(batch.mesh);
      batch.dispose();
    }
    layer.batches = [];
  }

  /**
   * Far background: mountains on both sides, large scale, sparse.
   */
  private populateFarLayer(): void {
    const rng = seededRandom(Date.now());
    const mountainTypes = ["mountain_snow", "mountain_autumn", "hill_gentle"];

    for (const typeName of mountainTypes) {
      const model = this.registry.getModel(typeName);
      if (!model) continue;

      const count = 4;
      const batch = model.createBatch(count);
      const dummy = new THREE.Object3D();

      for (let i = 0; i < count; i++) {
        const side = rng() > 0.5 ? 1 : -1;
        const x = side * (FAR_DISTANCE + rng() * 80);
        const z = (rng() - 0.5) * STRIP_DEPTH;
        const scale = 8 + rng() * 7; // 8-15x scale
        const rotY = rng() * Math.PI * 2;
        const yJitter = (rng() - 0.5) * 2; // ±1m random jitter

        dummy.position.set(x, GROUND_Y - 3 + yJitter, z);
        dummy.scale.setScalar(scale);
        dummy.rotation.y = rotY;
        dummy.updateMatrix();
        batch.setTransform(i, dummy.matrix);
      }
      batch.flush();

      this.farLayer.group.add(batch.mesh);
      this.farLayer.batches.push(batch);
    }
  }

  /**
   * Mid-distance: village structures, trees — based on current biome's distantModels.
   */
  private populateMidLayer(): void {
    const rng = seededRandom(Date.now() + 9999);

    // Use biome distant models or defaults
    const models =
      this.currentDistantModels.length > 0
        ? this.currentDistantModels
        : ["house_small", "cabin_distant", "pine_snow_tall"];

    for (const typeName of models) {
      const model = this.registry.getModel(typeName);
      if (!model) continue;

      const count =
        typeName.includes("house") ||
        typeName.includes("cabin") ||
        typeName.includes("mosque")
          ? 3 // fewer structures
          : 5; // more trees

      const batch = model.createBatch(count);
      const dummy = new THREE.Object3D();

      const isStructure =
        typeName.includes("house") ||
        typeName.includes("cabin") ||
        typeName.includes("mosque") ||
        typeName.includes("barn") ||
        typeName.includes("windmill") ||
        typeName.includes("igloo");

      for (let i = 0; i < count; i++) {
        const side = rng() > 0.5 ? 1 : -1;
        const x = side * (MID_DISTANCE + rng() * 40);
        const z = (rng() - 0.5) * STRIP_DEPTH;
        const scale = 3 + rng() * 3; // 3-6x scale for mid-distance
        const rotY = rng() * Math.PI * 2;
        const yJitter = (rng() - 0.5) * 2; // ±1m random jitter
        const baseY = isStructure ? GROUND_Y - 1.5 : GROUND_Y - 0.5;

        dummy.position.set(x, baseY + yJitter, z);
        dummy.scale.setScalar(scale);
        dummy.rotation.y = rotY;
        dummy.updateMatrix();
        batch.setTransform(i, dummy.matrix);
      }
      batch.flush();

      this.midLayer.group.add(batch.mesh);
      this.midLayer.batches.push(batch);
    }
  }
}
