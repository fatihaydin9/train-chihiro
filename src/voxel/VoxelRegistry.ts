import type { VoxelDefinition, SmoothModelDefinition } from './types';
import { VoxelBuilder } from './VoxelBuilder';
import { InstancedVoxelBatch } from './InstancedVoxelBatch';
import * as THREE from 'three';

interface VoxelModel {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  createBatch(count: number): InstancedVoxelBatch;
}

export class VoxelRegistry {
  private models = new Map<string, VoxelModel>();

  constructor() {
    this.registerAll();
  }

  private register(def: VoxelDefinition): void {
    const { geometry, material } = VoxelBuilder.build(def);
    this.models.set(def.name, {
      geometry,
      material,
      createBatch(count: number) {
        return new InstancedVoxelBatch(geometry, material, count);
      },
    });
  }

  private registerSmooth(def: SmoothModelDefinition): void {
    const { geometry, material } = VoxelBuilder.buildSmooth(def);
    this.models.set(def.name, {
      geometry,
      material,
      createBatch(count: number) {
        return new InstancedVoxelBatch(geometry, material, count);
      },
    });
  }

  getModel(name: string): VoxelModel | undefined {
    return this.models.get(name);
  }

  private registerAll(): void {
    // =====================================================
    // === WINTER FLORA — smooth low-poly conifers ===
    // =====================================================
    this.registerSmooth({
      name: 'pine_snow',
      parts: [
        // Trunk
        { type: 'cylinder', x: 0, y: 0.5, z: 0, params: [0.08, 1.0, 8], color: 0x4a2e16 },
        // Tiered cones — green layers
        { type: 'cone', x: 0, y: 1.3, z: 0, params: [0, 0.7, 0.7, 8], color: 0x2a5530 },
        { type: 'cone', x: 0, y: 1.75, z: 0, params: [0, 0.55, 0.6, 8], color: 0x3a6640 },
        { type: 'cone', x: 0, y: 2.15, z: 0, params: [0, 0.35, 0.5, 8], color: 0x2a5530 },
        // Flattened dodecahedron snow caps — organic blob shapes
        { type: 'dodecahedron', x: 0, y: 1.55, z: 0, params: [0.55, 0], color: 0xddeeff, scaleY: 0.35 },
        { type: 'dodecahedron', x: 0, y: 2.0, z: 0, params: [0.4, 0], color: 0xccddee, scaleY: 0.3 },
        { type: 'dodecahedron', x: 0, y: 2.4, z: 0, params: [0.22, 0], color: 0xeef5ff, scaleY: 0.35 },
      ],
    });

    this.registerSmooth({
      name: 'pine_snow_tall',
      parts: [
        // Tall trunk
        { type: 'cylinder', x: 0, y: 0.75, z: 0, params: [0.07, 1.5, 8], color: 0x4a2e16 },
        // Dense tiered cones
        { type: 'cone', x: 0, y: 1.8, z: 0, params: [0, 0.8, 0.8, 8], color: 0x2a5530 },
        { type: 'cone', x: 0, y: 2.3, z: 0, params: [0, 0.6, 0.7, 8], color: 0x3a6640 },
        { type: 'cone', x: 0, y: 2.8, z: 0, params: [0, 0.4, 0.6, 8], color: 0x2a5530 },
        { type: 'cone', x: 0, y: 3.2, z: 0, params: [0, 0.12, 0.25, 8], color: 0x2a5530 },
        // Flattened dodecahedron snow caps
        { type: 'dodecahedron', x: 0, y: 2.05, z: 0, params: [0.65, 0], color: 0xddeeff, scaleY: 0.3 },
        { type: 'dodecahedron', x: 0, y: 2.6, z: 0, params: [0.48, 0], color: 0xccddee, scaleY: 0.3 },
        { type: 'dodecahedron', x: 0, y: 3.05, z: 0, params: [0.28, 0], color: 0xeef5ff, scaleY: 0.35 },
      ],
    });

    this.register({
      name: 'rock_snow',
      cubes: [
        { x: 0, y: 0.15, z: 0, w: 0.55, h: 0.3, d: 0.45, color: 0x6a6a78 },
        { x: 0.12, y: 0.25, z: 0.08, w: 0.3, h: 0.25, d: 0.28, color: 0x7a7a88 },
        { x: -0.08, y: 0.35, z: -0.05, w: 0.2, h: 0.12, d: 0.22, color: 0xddeeff },
      ],
    });

    this.register({
      name: 'rock_snow_large',
      cubes: [
        { x: 0, y: 0.25, z: 0, w: 0.9, h: 0.5, d: 0.7, color: 0x5a5a68 },
        { x: 0.15, y: 0.5, z: 0.1, w: 0.5, h: 0.35, d: 0.45, color: 0x6a6a78 },
        { x: -0.2, y: 0.4, z: -0.15, w: 0.35, h: 0.3, d: 0.3, color: 0x7a7a88 },
        { x: 0.05, y: 0.7, z: 0, w: 0.6, h: 0.1, d: 0.5, color: 0xddeeff },
      ],
    });

    this.register({
      name: 'bush_snow',
      cubes: [
        { x: 0, y: 0.12, z: 0, w: 0.45, h: 0.25, d: 0.4, color: 0x3a5535 },
        { x: 0.1, y: 0.2, z: 0.08, w: 0.3, h: 0.2, d: 0.25, color: 0x455e40 },
        { x: -0.05, y: 0.3, z: -0.03, w: 0.35, h: 0.08, d: 0.3, color: 0xddeeff },
        { x: 0.15, y: 0.15, z: -0.1, w: 0.15, h: 0.18, d: 0.12, color: 0x4a6845 },
      ],
    });

    this.register({
      name: 'dead_shrub',
      cubes: [
        // Gnarled bare branches
        { x: 0, y: 0.0, z: 0, w: 0.06, h: 0.5, d: 0.06, color: 0x5a4030 },
        { x: 0.12, y: 0.35, z: 0.05, w: 0.04, h: 0.35, d: 0.04, color: 0x6b5040 },
        { x: -0.1, y: 0.3, z: -0.06, w: 0.04, h: 0.3, d: 0.04, color: 0x5a4030 },
        { x: 0.06, y: 0.5, z: -0.08, w: 0.03, h: 0.25, d: 0.03, color: 0x7a5c48 },
        { x: -0.15, y: 0.45, z: 0.1, w: 0.04, h: 0.2, d: 0.04, color: 0x6b5040 },
        { x: 0.2, y: 0.5, z: 0.08, w: 0.03, h: 0.15, d: 0.03, color: 0x7a5c48 },
      ],
    });

    // Undergrowth — low ground cover
    this.register({
      name: 'undergrowth_snow',
      cubes: [
        { x: 0, y: 0.05, z: 0, w: 0.6, h: 0.1, d: 0.5, color: 0x3a4a35 },
        { x: 0.15, y: 0.08, z: 0.1, w: 0.25, h: 0.08, d: 0.2, color: 0xddeeff },
        { x: -0.2, y: 0.06, z: -0.12, w: 0.3, h: 0.07, d: 0.25, color: 0x455e40 },
      ],
    });

    // =====================================================
    // === AUTUMN FLORA — smooth low-poly deciduous ===
    // =====================================================
    this.registerSmooth({
      name: 'oak_autumn',
      parts: [
        // Thick trunk
        { type: 'cylinder', x: 0, y: 0.5, z: 0, params: [0.12, 1.0, 8], color: 0x5a3820 },
        // Rounded canopy — overlapping spheres for organic shape
        { type: 'icosahedron', x: 0, y: 1.5, z: 0, params: [0.55, 1], color: 0xcc6622 },
        { type: 'icosahedron', x: 0.2, y: 1.7, z: 0.1, params: [0.45, 1], color: 0xdd7733 },
        { type: 'icosahedron', x: -0.15, y: 1.8, z: -0.1, params: [0.4, 1], color: 0xbb4411 },
        { type: 'icosahedron', x: 0.05, y: 2.0, z: 0.05, params: [0.3, 1], color: 0xee8844 },
      ],
    });

    this.registerSmooth({
      name: 'oak_autumn_large',
      parts: [
        // Massive trunk
        { type: 'cylinder', x: 0, y: 0.7, z: 0, params: [0.16, 1.4, 8], color: 0x4a2e16 },
        // Wide rounded canopy — overlapping spheres
        { type: 'icosahedron', x: 0, y: 1.8, z: 0, params: [0.7, 1], color: 0xcc6622 },
        { type: 'icosahedron', x: 0.25, y: 2.1, z: 0.15, params: [0.55, 1], color: 0xdd7733 },
        { type: 'icosahedron', x: -0.2, y: 2.0, z: -0.1, params: [0.5, 1], color: 0xbb4411 },
        { type: 'icosahedron', x: 0.1, y: 2.4, z: 0, params: [0.4, 1], color: 0xee8844 },
        { type: 'icosahedron', x: -0.05, y: 2.65, z: 0.05, params: [0.25, 1], color: 0xcc5522 },
      ],
    });

    this.registerSmooth({
      name: 'birch_autumn',
      parts: [
        // Slender white trunk
        { type: 'cylinder', x: 0, y: 0.7, z: 0, params: [0.05, 1.4, 8], color: 0xddccbb },
        // Golden leaf clusters — overlapping spheres for airy canopy
        { type: 'icosahedron', x: 0, y: 1.6, z: 0, params: [0.38, 1], color: 0xddaa22 },
        { type: 'icosahedron', x: 0.12, y: 1.85, z: 0.08, params: [0.3, 1], color: 0xeebb33 },
        { type: 'icosahedron', x: -0.08, y: 2.0, z: -0.05, params: [0.22, 1], color: 0xccaa22 },
      ],
    });

    this.register({
      name: 'rock_mossy',
      cubes: [
        { x: 0, y: 0.15, z: 0, w: 0.6, h: 0.35, d: 0.5, color: 0x666655 },
        { x: 0.12, y: 0.3, z: 0.08, w: 0.3, h: 0.2, d: 0.25, color: 0x777766 },
        { x: -0.1, y: 0.25, z: 0.05, w: 0.25, h: 0.12, d: 0.2, color: 0x558833 },
        { x: 0.05, y: 0.35, z: -0.08, w: 0.15, h: 0.08, d: 0.15, color: 0x668844 },
      ],
    });

    this.register({
      name: 'rock_cluster',
      cubes: [
        { x: 0, y: 0.15, z: 0, w: 0.5, h: 0.3, d: 0.45, color: 0x666655 },
        { x: 0.3, y: 0.12, z: 0.2, w: 0.35, h: 0.25, d: 0.3, color: 0x777766 },
        { x: -0.25, y: 0.1, z: -0.15, w: 0.3, h: 0.22, d: 0.28, color: 0x5a5a4a },
        { x: 0.15, y: 0.3, z: -0.1, w: 0.2, h: 0.15, d: 0.2, color: 0x888877 },
        { x: -0.05, y: 0.35, z: 0.12, w: 0.18, h: 0.08, d: 0.18, color: 0x558833 },
      ],
    });

    this.register({
      name: 'bush_autumn',
      cubes: [
        { x: 0, y: 0.1, z: 0, w: 0.5, h: 0.3, d: 0.45, color: 0xcc7733 },
        { x: 0.12, y: 0.2, z: 0.08, w: 0.3, h: 0.25, d: 0.3, color: 0xdd5522 },
        { x: -0.1, y: 0.18, z: -0.1, w: 0.25, h: 0.22, d: 0.2, color: 0xbb6633 },
        { x: 0.05, y: 0.32, z: 0, w: 0.2, h: 0.12, d: 0.2, color: 0xee7744 },
      ],
    });

    this.register({
      name: 'undergrowth_autumn',
      cubes: [
        { x: 0, y: 0.04, z: 0, w: 0.7, h: 0.08, d: 0.6, color: 0x8a6530 },
        { x: 0.2, y: 0.06, z: 0.15, w: 0.25, h: 0.06, d: 0.2, color: 0xcc7733 },
        { x: -0.15, y: 0.05, z: -0.1, w: 0.3, h: 0.07, d: 0.25, color: 0xaa5522 },
        // Fallen leaves
        { x: 0.3, y: 0.02, z: -0.2, w: 0.08, h: 0.02, d: 0.06, color: 0xdd6622 },
        { x: -0.25, y: 0.02, z: 0.25, w: 0.06, h: 0.02, d: 0.08, color: 0xcc5511 },
      ],
    });

    // =====================================================
    // === SPRING FLORA — smooth low-poly ===
    // =====================================================
    this.registerSmooth({
      name: 'tree_spring',
      parts: [
        // Trunk
        { type: 'cylinder', x: 0, y: 0.5, z: 0, params: [0.09, 1.0, 8], color: 0x6b4226 },
        // Lush green canopy — sphere clusters for round, full shape
        { type: 'icosahedron', x: 0, y: 1.4, z: 0, params: [0.5, 1], color: 0x339933 },
        { type: 'icosahedron', x: 0.18, y: 1.65, z: 0.1, params: [0.4, 1], color: 0x44aa44 },
        { type: 'icosahedron', x: -0.12, y: 1.75, z: -0.08, params: [0.35, 1], color: 0x55bb55 },
        { type: 'icosahedron', x: 0.05, y: 1.95, z: 0.05, params: [0.25, 1], color: 0x66cc66 },
      ],
    });

    this.registerSmooth({
      name: 'tree_spring_blossom',
      parts: [
        // Trunk
        { type: 'cylinder', x: 0, y: 0.45, z: 0, params: [0.08, 0.9, 8], color: 0x6b4226 },
        // Cherry blossom canopy — sphere clusters for fluffy blossoms
        { type: 'icosahedron', x: 0, y: 1.25, z: 0, params: [0.45, 1], color: 0xffaacc },
        { type: 'icosahedron', x: 0.15, y: 1.5, z: 0.1, params: [0.38, 1], color: 0xff99bb },
        { type: 'icosahedron', x: -0.1, y: 1.6, z: -0.08, params: [0.3, 1], color: 0xffbbdd },
        { type: 'icosahedron', x: 0.05, y: 1.8, z: 0, params: [0.2, 1], color: 0xffd0e0 },
      ],
    });

    this.registerSmooth({
      name: 'willow_spring',
      parts: [
        // Thick trunk
        { type: 'cylinder', x: 0, y: 0.6, z: 0, params: [0.12, 1.2, 8], color: 0x5a4530 },
        // Wide rounded canopy — sphere cluster
        { type: 'icosahedron', x: 0, y: 1.55, z: 0, params: [0.6, 1], color: 0x55aa44 },
        { type: 'icosahedron', x: 0.15, y: 1.75, z: 0.1, params: [0.45, 1], color: 0x66bb55 },
        // Drooping curtain branches — tall thin cylinders
        { type: 'cylinder', x: 0.5, y: 0.8, z: 0, params: [0.04, 1.0, 6], color: 0x77cc66 },
        { type: 'cylinder', x: -0.5, y: 0.85, z: 0, params: [0.04, 0.9, 6], color: 0x66bb55 },
        { type: 'cylinder', x: 0, y: 0.8, z: 0.5, params: [0.04, 0.95, 6], color: 0x77cc66 },
        { type: 'cylinder', x: 0, y: 0.85, z: -0.45, params: [0.04, 0.85, 6], color: 0x66bb55 },
        { type: 'cylinder', x: 0.35, y: 0.85, z: 0.35, params: [0.03, 0.8, 6], color: 0x88dd77 },
        { type: 'cylinder', x: -0.35, y: 0.9, z: -0.3, params: [0.03, 0.75, 6], color: 0x77cc66 },
      ],
    });

    this.register({
      name: 'rock_plain',
      cubes: [
        { x: 0, y: 0.12, z: 0, w: 0.45, h: 0.28, d: 0.4, color: 0x888877 },
        { x: 0.1, y: 0.22, z: 0.08, w: 0.2, h: 0.18, d: 0.2, color: 0x999988 },
      ],
    });

    this.register({
      name: 'boulder_mossy',
      cubes: [
        { x: 0, y: 0.25, z: 0, w: 0.7, h: 0.5, d: 0.6, color: 0x778877 },
        { x: 0.1, y: 0.5, z: 0.08, w: 0.4, h: 0.3, d: 0.35, color: 0x889988 },
        { x: -0.1, y: 0.55, z: -0.05, w: 0.35, h: 0.15, d: 0.3, color: 0x558844 },
        { x: 0.2, y: 0.35, z: -0.15, w: 0.2, h: 0.15, d: 0.2, color: 0x669944 },
      ],
    });

    this.register({
      name: 'bush_spring',
      cubes: [
        { x: 0, y: 0.12, z: 0, w: 0.45, h: 0.35, d: 0.4, color: 0x339933 },
        { x: 0.1, y: 0.2, z: 0.08, w: 0.3, h: 0.25, d: 0.28, color: 0x44aa44 },
        { x: -0.08, y: 0.22, z: -0.05, w: 0.22, h: 0.2, d: 0.2, color: 0x55bb55 },
        // Wildflowers
        { x: 0.18, y: 0.35, z: 0, w: 0.08, h: 0.08, d: 0.08, color: 0xffdd44 },
        { x: -0.12, y: 0.3, z: 0.12, w: 0.07, h: 0.07, d: 0.07, color: 0xff88cc },
        { x: 0.05, y: 0.33, z: -0.15, w: 0.06, h: 0.06, d: 0.06, color: 0xaaddff },
      ],
    });

    this.register({
      name: 'undergrowth_spring',
      cubes: [
        { x: 0, y: 0.04, z: 0, w: 0.7, h: 0.08, d: 0.6, color: 0x44aa44 },
        { x: 0.2, y: 0.06, z: 0.15, w: 0.25, h: 0.06, d: 0.2, color: 0x55bb55 },
        { x: -0.15, y: 0.05, z: -0.1, w: 0.3, h: 0.05, d: 0.25, color: 0x339933 },
        // Tiny wildflowers
        { x: 0.25, y: 0.08, z: -0.2, w: 0.04, h: 0.04, d: 0.04, color: 0xff88aa },
        { x: -0.3, y: 0.07, z: 0.2, w: 0.04, h: 0.04, d: 0.04, color: 0xffdd44 },
        { x: 0.1, y: 0.08, z: 0.25, w: 0.04, h: 0.04, d: 0.04, color: 0xaaddff },
      ],
    });

    // =====================================================
    // === STRUCTURES — detailed with depth ===
    // =====================================================
    this.register({
      name: 'house_small',
      cubes: [
        // Foundation
        { x: 0, y: 0.06, z: 0, w: 1.1, h: 0.12, d: 0.9, color: 0x777766 },
        // Walls — varying stone/plaster tones
        { x: 0, y: 0.5, z: 0, w: 1.0, h: 0.8, d: 0.8, color: 0xccbb99 },
        { x: 0, y: 0.5, z: 0.02, w: 0.98, h: 0.78, d: 0.76, color: 0xd4c4a4 },
        // Roof — layered tiles
        { x: 0, y: 1.08, z: 0, w: 1.2, h: 0.12, d: 1.0, color: 0x994422 },
        { x: 0, y: 1.22, z: 0, w: 1.0, h: 0.1, d: 0.85, color: 0x883322 },
        { x: 0, y: 1.35, z: 0, w: 0.7, h: 0.08, d: 0.7, color: 0x773322 },
        { x: 0, y: 1.45, z: 0, w: 0.3, h: 0.06, d: 0.5, color: 0x773322 },
        // Door
        { x: 0, y: 0.32, z: 0.41, w: 0.22, h: 0.48, d: 0.03, color: 0x553322 },
        { x: 0, y: 0.54, z: 0.42, w: 0.18, h: 0.04, d: 0.02, color: 0x442211 },
        // Window
        { x: 0.3, y: 0.55, z: 0.41, w: 0.15, h: 0.18, d: 0.02, color: 0x88aacc },
        { x: 0.3, y: 0.55, z: 0.42, w: 0.17, h: 0.02, d: 0.02, color: 0x553322 },
        // Chimney
        { x: 0.3, y: 1.35, z: -0.15, w: 0.14, h: 0.3, d: 0.14, color: 0x885544 },
        { x: 0.3, y: 1.5, z: -0.15, w: 0.16, h: 0.04, d: 0.16, color: 0x775544 },
      ],
    });

    this.register({
      name: 'house_large',
      cubes: [
        // Foundation
        { x: 0, y: 0.08, z: 0, w: 1.4, h: 0.15, d: 1.1, color: 0x666655 },
        // Ground floor
        { x: 0, y: 0.55, z: 0, w: 1.3, h: 0.9, d: 1.0, color: 0xccbb99 },
        // Timber framing accents
        { x: 0.55, y: 0.55, z: 0.01, w: 0.04, h: 0.9, d: 0.04, color: 0x5a3820 },
        { x: -0.55, y: 0.55, z: 0.01, w: 0.04, h: 0.9, d: 0.04, color: 0x5a3820 },
        // Second floor — slight overhang
        { x: 0, y: 1.25, z: 0, w: 1.4, h: 0.7, d: 1.05, color: 0xbbaa88 },
        // Roof
        { x: 0, y: 1.8, z: 0, w: 1.6, h: 0.12, d: 1.25, color: 0x884422 },
        { x: 0, y: 1.95, z: 0, w: 1.2, h: 0.1, d: 1.0, color: 0x773322 },
        { x: 0, y: 2.08, z: 0, w: 0.7, h: 0.08, d: 0.8, color: 0x773322 },
        { x: 0, y: 2.18, z: 0, w: 0.25, h: 0.06, d: 0.5, color: 0x663322 },
        // Door
        { x: 0, y: 0.33, z: 0.51, w: 0.26, h: 0.5, d: 0.03, color: 0x553322 },
        // Windows
        { x: 0.35, y: 0.6, z: 0.51, w: 0.15, h: 0.2, d: 0.02, color: 0x88aacc },
        { x: -0.35, y: 0.6, z: 0.51, w: 0.15, h: 0.2, d: 0.02, color: 0x88aacc },
        { x: 0.35, y: 1.35, z: 0.53, w: 0.18, h: 0.22, d: 0.02, color: 0x88aacc },
        // Chimney
        { x: -0.4, y: 2.0, z: -0.2, w: 0.16, h: 0.4, d: 0.16, color: 0x885544 },
      ],
    });

    // Mosque — dome + minaret with crescent
    this.registerSmooth({
      name: 'mosque',
      parts: [
        // Main body (wide rectangular base)
        { type: 'cylinder', x: 0, y: 0.6, z: 0, params: [0.6, 1.2, 4], color: 0xddccbb, scaleX: 1.2, scaleZ: 1.4 },
        // Main dome
        { type: 'cone', x: 0, y: 1.6, z: 0, params: [0, 0.55, 0.8, 12], color: 0x888888 },
        // Dome tip (small sphere-like)
        { type: 'cone', x: 0, y: 2.1, z: 0, params: [0, 0.08, 0.15, 8], color: 0xddaa22 },
        // Crescent on dome (thin torus approximation — small tilted ring)
        { type: 'torus', x: 0, y: 2.25, z: 0, params: [0.06, 0.012, 8, 16], color: 0xddaa22 },
        // Minaret tower (tall thin cylinder)
        { type: 'cylinder', x: 0.5, y: 1.2, z: 0.5, params: [0.12, 2.4, 8], color: 0xccbbaa },
        // Minaret balcony (wider ring)
        { type: 'cylinder', x: 0.5, y: 2.0, z: 0.5, params: [0.18, 0.08, 8], color: 0xbbaa99 },
        // Minaret cone top
        { type: 'cone', x: 0.5, y: 2.65, z: 0.5, params: [0, 0.12, 0.5, 8], color: 0x888888 },
        // Minaret crescent
        { type: 'torus', x: 0.5, y: 2.95, z: 0.5, params: [0.04, 0.01, 8, 16], color: 0xddaa22 },
        // Entrance arch
        { type: 'cylinder', x: 0, y: 0.5, z: -0.65, params: [0.2, 0.5, 8], color: 0xccbbaa, scaleX: 0.6 },
      ],
    });

    // Windmill — uses smooth parts for tower and torus for wheel hub
    this.registerSmooth({
      name: 'windmill',
      parts: [
        // Stone base — wide cylinder
        { type: 'cylinder', x: 0, y: 0.4, z: 0, params: [0.43, 0.8, 8], color: 0xbbaa99 },
        // Tower — tapered cylinders
        { type: 'cylinder', x: 0, y: 1.2, z: 0, params: [0.3, 0.9, 8], color: 0xccbbaa },
        { type: 'cylinder', x: 0, y: 1.8, z: 0, params: [0.25, 0.4, 8], color: 0xbbaa99 },
        // Cap — cone
        { type: 'cone', x: 0, y: 2.2, z: 0, params: [0, 0.32, 0.3, 8], color: 0x664433 },
        // Wheel hub — torus
        { type: 'torus', x: 0, y: 2.1, z: 0.35, params: [0.08, 0.03, 6, 8], color: 0x555555 },
        // Blade arms (cross cylinders)
        { type: 'cylinder', x: 0, y: 2.1, z: 0.35, params: [0.02, 1.3, 4], color: 0xccbbaa },
        { type: 'cylinder', x: 0, y: 2.1, z: 0.35, params: [0.02, 1.3, 4], color: 0xccbbaa, scaleX: 0.01, scaleZ: 1.0 },
      ],
    });

    this.register({
      name: 'fence_segment',
      cubes: [
        { x: -0.4, y: 0.25, z: 0, w: 0.07, h: 0.5, d: 0.07, color: 0x6b5030 },
        { x: 0.4, y: 0.25, z: 0, w: 0.07, h: 0.5, d: 0.07, color: 0x6b5030 },
        { x: 0, y: 0.35, z: 0, w: 0.84, h: 0.04, d: 0.03, color: 0x7a5c3a },
        { x: 0, y: 0.18, z: 0, w: 0.84, h: 0.04, d: 0.03, color: 0x7a5c3a },
        // Cap on posts
        { x: -0.4, y: 0.52, z: 0, w: 0.09, h: 0.04, d: 0.09, color: 0x5a4020 },
        { x: 0.4, y: 0.52, z: 0, w: 0.09, h: 0.04, d: 0.09, color: 0x5a4020 },
      ],
    });

    this.register({
      name: 'lamp_post',
      cubes: [
        { x: 0, y: 0.06, z: 0, w: 0.18, h: 0.12, d: 0.18, color: 0x3a3a3a },
        { x: 0, y: 0.7, z: 0, w: 0.05, h: 1.2, d: 0.05, color: 0x4a4a4a },
        // Arm
        { x: 0.08, y: 1.35, z: 0, w: 0.2, h: 0.04, d: 0.04, color: 0x4a4a4a },
        // Lantern housing
        { x: 0.15, y: 1.42, z: 0, w: 0.14, h: 0.16, d: 0.14, color: 0x3a3a3a },
        // Glass glow
        { x: 0.15, y: 1.42, z: 0, w: 0.1, h: 0.12, d: 0.1, color: 0xffcc66 },
      ],
    });

    this.register({
      name: 'bridge_segment',
      cubes: [
        { x: 0, y: 0.08, z: 0, w: 1.2, h: 0.1, d: 0.8, color: 0x7a5c3a },
        { x: 0, y: 0.04, z: 0, w: 1.1, h: 0.06, d: 0.7, color: 0x6b4f30 },
        { x: -0.55, y: 0.35, z: 0, w: 0.05, h: 0.45, d: 0.05, color: 0x6b5030 },
        { x: 0.55, y: 0.35, z: 0, w: 0.05, h: 0.45, d: 0.05, color: 0x6b5030 },
        { x: -0.55, y: 0.55, z: 0, w: 0.03, h: 0.03, d: 0.8, color: 0x7a5c3a },
        { x: 0.55, y: 0.55, z: 0, w: 0.03, h: 0.03, d: 0.8, color: 0x7a5c3a },
      ],
    });

    this.register({
      name: 'cabin_distant',
      cubes: [
        { x: 0, y: 0.3, z: 0, w: 0.75, h: 0.6, d: 0.55, color: 0x7a5c3a },
        { x: 0, y: 0.75, z: 0, w: 0.85, h: 0.12, d: 0.65, color: 0x773322 },
        { x: 0, y: 0.9, z: 0, w: 0.55, h: 0.08, d: 0.45, color: 0x663322 },
        // Porch
        { x: 0, y: 0.15, z: 0.35, w: 0.6, h: 0.06, d: 0.2, color: 0x6b4f30 },
      ],
    });

    // =====================================================
    // === MOUNTAINS — layered, organic shapes ===
    // =====================================================
    this.register({
      name: 'mountain_snow',
      cubes: [
        // Broad base
        { x: 0, y: 0.5, z: 0, w: 3.5, h: 1.0, d: 3.0, color: 0x556677 },
        { x: 0.3, y: 0.6, z: 0.2, w: 2.8, h: 0.8, d: 2.5, color: 0x5a6a7a },
        // Mid slopes — asymmetric
        { x: -0.2, y: 1.5, z: 0.1, w: 2.2, h: 1.2, d: 2.0, color: 0x667788 },
        { x: 0.3, y: 1.8, z: -0.2, w: 1.8, h: 1.0, d: 1.6, color: 0x708090 },
        // Upper peak
        { x: 0.1, y: 2.8, z: 0, w: 1.2, h: 0.9, d: 1.0, color: 0x7a8a9a },
        { x: 0, y: 3.5, z: 0.1, w: 0.7, h: 0.6, d: 0.6, color: 0x8899aa },
        // Snow cap — irregular
        { x: 0.05, y: 4.0, z: 0, w: 0.5, h: 0.35, d: 0.45, color: 0xddeeff },
        { x: -0.1, y: 3.8, z: 0.15, w: 0.3, h: 0.2, d: 0.3, color: 0xeef5ff },
      ],
    });

    this.register({
      name: 'mountain_autumn',
      cubes: [
        { x: 0, y: 0.5, z: 0, w: 3.5, h: 1.0, d: 3.0, color: 0x7a6645 },
        { x: 0.3, y: 0.6, z: 0.2, w: 2.8, h: 0.8, d: 2.5, color: 0x8a7755 },
        { x: -0.2, y: 1.5, z: 0.1, w: 2.2, h: 1.2, d: 2.0, color: 0x8a7755 },
        { x: 0.3, y: 1.8, z: -0.2, w: 1.8, h: 1.0, d: 1.6, color: 0x998866 },
        { x: 0.1, y: 2.8, z: 0, w: 1.2, h: 0.9, d: 1.0, color: 0xaa9977 },
        { x: 0, y: 3.5, z: 0.1, w: 0.7, h: 0.6, d: 0.6, color: 0x998866 },
        // Forest patches on slopes
        { x: -0.8, y: 1.2, z: 0.6, w: 0.5, h: 0.3, d: 0.4, color: 0xcc6622 },
        { x: 0.7, y: 1.5, z: -0.5, w: 0.4, h: 0.25, d: 0.35, color: 0xdd7733 },
      ],
    });

    this.register({
      name: 'hill_gentle',
      cubes: [
        { x: 0, y: 0.4, z: 0, w: 4.0, h: 0.8, d: 3.5, color: 0x558844 },
        { x: 0.3, y: 0.8, z: 0.2, w: 3.0, h: 0.6, d: 2.5, color: 0x669955 },
        { x: 0.1, y: 1.2, z: 0, w: 2.0, h: 0.4, d: 1.8, color: 0x77aa66 },
        { x: 0.2, y: 1.5, z: 0.1, w: 1.0, h: 0.3, d: 0.9, color: 0x88bb77 },
        // Tree patches on top
        { x: 0.5, y: 1.6, z: 0.3, w: 0.3, h: 0.25, d: 0.3, color: 0x447733 },
        { x: -0.3, y: 1.4, z: -0.2, w: 0.25, h: 0.2, d: 0.25, color: 0x558844 },
      ],
    });

    // =====================================================
    // === CITY MODELS — dark_city biome ===
    // =====================================================
    this.register({
      name: 'city_building_small',
      cubes: [
        // Main body
        { x: 0, y: 0.8, z: 0, w: 1.2, h: 1.6, d: 1.0, color: 0x444450 },
        { x: 0, y: 0.8, z: 0, w: 1.15, h: 1.55, d: 0.95, color: 0x505060 },
        // Windows (rows)
        { x: 0.3, y: 0.8, z: 0.51, w: 0.15, h: 0.12, d: 0.02, color: 0x88aacc },
        { x: -0.3, y: 0.8, z: 0.51, w: 0.15, h: 0.12, d: 0.02, color: 0x88aacc },
        { x: 0.3, y: 1.2, z: 0.51, w: 0.15, h: 0.12, d: 0.02, color: 0xaaccee },
        { x: -0.3, y: 1.2, z: 0.51, w: 0.15, h: 0.12, d: 0.02, color: 0x88aacc },
        // Rooftop AC unit
        { x: 0.3, y: 1.65, z: -0.2, w: 0.25, h: 0.1, d: 0.2, color: 0x555555 },
      ],
    });

    this.register({
      name: 'city_building_tall',
      cubes: [
        // Main tower
        { x: 0, y: 1.5, z: 0, w: 1.0, h: 3.0, d: 0.8, color: 0x3a3a48 },
        { x: 0, y: 1.5, z: 0, w: 0.95, h: 2.95, d: 0.75, color: 0x484858 },
        // Windows (strips)
        { x: 0, y: 1.0, z: 0.41, w: 0.6, h: 0.08, d: 0.02, color: 0x88aacc },
        { x: 0, y: 1.5, z: 0.41, w: 0.6, h: 0.08, d: 0.02, color: 0xaaccee },
        { x: 0, y: 2.0, z: 0.41, w: 0.6, h: 0.08, d: 0.02, color: 0x88aacc },
        { x: 0, y: 2.5, z: 0.41, w: 0.6, h: 0.08, d: 0.02, color: 0x99bbdd },
        // Roof detail
        { x: 0, y: 3.05, z: 0, w: 1.05, h: 0.08, d: 0.85, color: 0x333340 },
        // Antenna
        { x: 0, y: 3.3, z: 0, w: 0.03, h: 0.5, d: 0.03, color: 0x666666 },
      ],
    });

    this.register({
      name: 'city_skyscraper',
      cubes: [
        // Base
        { x: 0, y: 0.5, z: 0, w: 1.5, h: 1.0, d: 1.2, color: 0x353545 },
        // Tower
        { x: 0, y: 2.5, z: 0, w: 1.0, h: 4.0, d: 0.8, color: 0x2a2a3a },
        // Glass strips
        { x: 0, y: 1.5, z: 0.41, w: 0.7, h: 0.06, d: 0.02, color: 0x6688aa },
        { x: 0, y: 2.0, z: 0.41, w: 0.7, h: 0.06, d: 0.02, color: 0x88aacc },
        { x: 0, y: 2.5, z: 0.41, w: 0.7, h: 0.06, d: 0.02, color: 0x6688aa },
        { x: 0, y: 3.0, z: 0.41, w: 0.7, h: 0.06, d: 0.02, color: 0x88aacc },
        { x: 0, y: 3.5, z: 0.41, w: 0.7, h: 0.06, d: 0.02, color: 0x6688aa },
        { x: 0, y: 4.0, z: 0.41, w: 0.7, h: 0.06, d: 0.02, color: 0x88aacc },
        // Crown
        { x: 0, y: 4.55, z: 0, w: 1.05, h: 0.1, d: 0.85, color: 0x404055 },
        // Spire
        { x: 0, y: 4.9, z: 0, w: 0.06, h: 0.6, d: 0.06, color: 0x888888 },
      ],
    });

    this.register({
      name: 'neon_sign',
      cubes: [
        // Post
        { x: 0, y: 0.6, z: 0, w: 0.06, h: 1.2, d: 0.06, color: 0x444444 },
        // Sign frame
        { x: 0, y: 1.3, z: 0, w: 0.8, h: 0.4, d: 0.05, color: 0x333333 },
        // Neon glow — bright accent
        { x: 0, y: 1.3, z: 0.03, w: 0.7, h: 0.3, d: 0.02, color: 0xff00ff },
        // Secondary glow
        { x: 0.15, y: 1.35, z: 0.04, w: 0.2, h: 0.1, d: 0.01, color: 0x00ffff },
      ],
    });

    this.register({
      name: 'street_lamp_neon',
      cubes: [
        // Pole
        { x: 0, y: 0.08, z: 0, w: 0.2, h: 0.15, d: 0.2, color: 0x333333 },
        { x: 0, y: 1.0, z: 0, w: 0.06, h: 1.8, d: 0.06, color: 0x444444 },
        // Arm
        { x: 0.15, y: 1.9, z: 0, w: 0.3, h: 0.04, d: 0.04, color: 0x444444 },
        // Light housing
        { x: 0.25, y: 1.85, z: 0, w: 0.15, h: 0.08, d: 0.15, color: 0x333333 },
        // Neon glow
        { x: 0.25, y: 1.82, z: 0, w: 0.12, h: 0.03, d: 0.12, color: 0xff66cc },
      ],
    });

    this.register({
      name: 'factory_chimney',
      cubes: [
        // Base
        { x: 0, y: 0.4, z: 0, w: 0.6, h: 0.8, d: 0.6, color: 0x665544 },
        // Stack
        { x: 0, y: 1.5, z: 0, w: 0.35, h: 1.8, d: 0.35, color: 0x775544 },
        { x: 0, y: 2.5, z: 0, w: 0.3, h: 0.8, d: 0.3, color: 0x886655 },
        // Top ring
        { x: 0, y: 2.95, z: 0, w: 0.38, h: 0.08, d: 0.38, color: 0x555555 },
        // Smoke puff (decorative)
        { x: 0.1, y: 3.1, z: 0.05, w: 0.2, h: 0.15, d: 0.2, color: 0x999999 },
      ],
    });

    // =====================================================
    // === INDUSTRIAL MODELS ===
    // =====================================================
    this.register({
      name: 'warehouse',
      cubes: [
        // Main body — wide, low
        { x: 0, y: 0.6, z: 0, w: 1.8, h: 1.2, d: 1.4, color: 0x6a6060 },
        // Corrugated roof
        { x: 0, y: 1.3, z: 0, w: 2.0, h: 0.15, d: 1.6, color: 0x555050 },
        { x: 0, y: 1.45, z: 0, w: 1.6, h: 0.1, d: 1.2, color: 0x504a4a },
        // Loading bay door
        { x: 0, y: 0.35, z: 0.71, w: 0.6, h: 0.65, d: 0.03, color: 0x444040 },
        // Side windows
        { x: 0.5, y: 0.8, z: 0.71, w: 0.2, h: 0.15, d: 0.02, color: 0x778899 },
        { x: -0.5, y: 0.8, z: 0.71, w: 0.2, h: 0.15, d: 0.02, color: 0x778899 },
      ],
    });

    this.register({
      name: 'factory_building',
      cubes: [
        // Main block
        { x: 0, y: 1.0, z: 0, w: 1.4, h: 2.0, d: 1.2, color: 0x5a5555 },
        // Second block (attached)
        { x: 0.5, y: 0.7, z: 0, w: 0.8, h: 1.4, d: 1.0, color: 0x656060 },
        // Roof
        { x: 0, y: 2.1, z: 0, w: 1.5, h: 0.1, d: 1.3, color: 0x4a4545 },
        // Chimney
        { x: -0.4, y: 2.5, z: -0.3, w: 0.2, h: 0.8, d: 0.2, color: 0x6a5a4a },
        // Window strips
        { x: 0, y: 1.2, z: 0.61, w: 0.8, h: 0.1, d: 0.02, color: 0x889999 },
        { x: 0, y: 1.6, z: 0.61, w: 0.8, h: 0.1, d: 0.02, color: 0x778888 },
      ],
    });

    this.register({
      name: 'storage_tank',
      cubes: [
        // Cylindrical approximation with boxes
        { x: 0, y: 0.5, z: 0, w: 0.8, h: 1.0, d: 0.8, color: 0x778888 },
        { x: 0, y: 0.5, z: 0, w: 0.7, h: 1.05, d: 0.7, color: 0x88999a },
        // Top dome
        { x: 0, y: 1.05, z: 0, w: 0.6, h: 0.15, d: 0.6, color: 0x889999 },
        // Supports
        { x: 0.3, y: 0.1, z: 0.3, w: 0.06, h: 0.2, d: 0.06, color: 0x555555 },
        { x: -0.3, y: 0.1, z: -0.3, w: 0.06, h: 0.2, d: 0.06, color: 0x555555 },
        // Pipe
        { x: 0.45, y: 0.7, z: 0, w: 0.2, h: 0.06, d: 0.06, color: 0x666666 },
      ],
    });

    this.register({
      name: 'crane',
      cubes: [
        // Base
        { x: 0, y: 0.2, z: 0, w: 0.6, h: 0.4, d: 0.6, color: 0x666655 },
        // Tower
        { x: 0, y: 2.0, z: 0, w: 0.2, h: 3.6, d: 0.2, color: 0xddaa22 },
        // Boom arm
        { x: 0.8, y: 3.8, z: 0, w: 2.0, h: 0.1, d: 0.1, color: 0xddaa22 },
        // Counter weight
        { x: -0.5, y: 3.7, z: 0, w: 0.3, h: 0.2, d: 0.2, color: 0x555555 },
        // Cable
        { x: 1.2, y: 3.2, z: 0, w: 0.02, h: 0.6, d: 0.02, color: 0x888888 },
        // Hook
        { x: 1.2, y: 2.85, z: 0, w: 0.08, h: 0.1, d: 0.08, color: 0x777777 },
      ],
    });

    this.register({
      name: 'shipping_container',
      cubes: [
        { x: 0, y: 0.3, z: 0, w: 0.8, h: 0.6, d: 1.5, color: 0xcc4422 },
        // Door side
        { x: 0, y: 0.3, z: 0.76, w: 0.78, h: 0.58, d: 0.02, color: 0xbb3311 },
        // Corrugation lines
        { x: 0, y: 0.2, z: 0, w: 0.82, h: 0.02, d: 1.5, color: 0xaa3311 },
        { x: 0, y: 0.4, z: 0, w: 0.82, h: 0.02, d: 1.5, color: 0xaa3311 },
      ],
    });

    // =====================================================
    // === SUBURBAN MODELS ===
    // =====================================================
    this.register({
      name: 'park_bench',
      cubes: [
        // Seat
        { x: 0, y: 0.25, z: 0, w: 0.8, h: 0.04, d: 0.25, color: 0x7a5c3a },
        // Back
        { x: 0, y: 0.4, z: -0.1, w: 0.8, h: 0.2, d: 0.03, color: 0x7a5c3a },
        // Legs
        { x: -0.3, y: 0.12, z: 0, w: 0.04, h: 0.25, d: 0.04, color: 0x444444 },
        { x: 0.3, y: 0.12, z: 0, w: 0.04, h: 0.25, d: 0.04, color: 0x444444 },
        // Armrests
        { x: -0.35, y: 0.32, z: -0.03, w: 0.04, h: 0.12, d: 0.04, color: 0x444444 },
        { x: 0.35, y: 0.32, z: -0.03, w: 0.04, h: 0.12, d: 0.04, color: 0x444444 },
      ],
    });

    this.register({
      name: 'garden_hedge',
      cubes: [
        { x: 0, y: 0.2, z: 0, w: 0.8, h: 0.4, d: 0.3, color: 0x336633 },
        { x: 0, y: 0.22, z: 0, w: 0.75, h: 0.38, d: 0.28, color: 0x448844 },
        // Slight trim variation
        { x: 0.2, y: 0.35, z: 0, w: 0.15, h: 0.08, d: 0.25, color: 0x3a7a3a },
      ],
    });

    this.register({
      name: 'suburban_house',
      cubes: [
        // Foundation
        { x: 0, y: 0.08, z: 0, w: 1.3, h: 0.15, d: 1.1, color: 0x888877 },
        // Walls
        { x: 0, y: 0.6, z: 0, w: 1.2, h: 0.9, d: 1.0, color: 0xddddcc },
        // Roof
        { x: 0, y: 1.2, z: 0, w: 1.4, h: 0.12, d: 1.2, color: 0x556677 },
        { x: 0, y: 1.35, z: 0, w: 1.1, h: 0.1, d: 1.0, color: 0x4a5a6a },
        { x: 0, y: 1.48, z: 0, w: 0.6, h: 0.08, d: 0.7, color: 0x4a5a6a },
        // Door
        { x: 0, y: 0.35, z: 0.51, w: 0.22, h: 0.48, d: 0.02, color: 0x664422 },
        // Windows
        { x: 0.35, y: 0.6, z: 0.51, w: 0.18, h: 0.2, d: 0.02, color: 0xaaddff },
        { x: -0.35, y: 0.6, z: 0.51, w: 0.18, h: 0.2, d: 0.02, color: 0xaaddff },
        // Garage
        { x: 0.45, y: 0.3, z: 0.51, w: 0.3, h: 0.45, d: 0.02, color: 0x888888 },
      ],
    });

    this.register({
      name: 'playground',
      cubes: [
        // Swing frame
        { x: -0.2, y: 0.5, z: 0, w: 0.04, h: 1.0, d: 0.04, color: 0xcc3333 },
        { x: 0.2, y: 0.5, z: 0, w: 0.04, h: 1.0, d: 0.04, color: 0xcc3333 },
        // Top bar
        { x: 0, y: 1.0, z: 0, w: 0.5, h: 0.04, d: 0.04, color: 0xcc3333 },
        // Swing seat
        { x: 0, y: 0.3, z: 0, w: 0.15, h: 0.02, d: 0.08, color: 0x333333 },
        // Chains
        { x: -0.06, y: 0.65, z: 0, w: 0.01, h: 0.7, d: 0.01, color: 0x888888 },
        { x: 0.06, y: 0.65, z: 0, w: 0.01, h: 0.7, d: 0.01, color: 0x888888 },
        // Slide nearby
        { x: 0.5, y: 0.3, z: 0.2, w: 0.15, h: 0.04, d: 0.6, color: 0x3399ff },
        { x: 0.5, y: 0.5, z: -0.1, w: 0.04, h: 0.4, d: 0.04, color: 0x3399ff },
      ],
    });

    // =====================================================
    // === VILLAGE MODELS ===
    // =====================================================
    this.register({
      name: 'barn',
      cubes: [
        // Foundation
        { x: 0, y: 0.08, z: 0, w: 1.6, h: 0.15, d: 1.2, color: 0x666655 },
        // Walls — red barn
        { x: 0, y: 0.7, z: 0, w: 1.5, h: 1.2, d: 1.1, color: 0x993322 },
        // White trim
        { x: 0, y: 1.3, z: 0, w: 1.52, h: 0.04, d: 1.12, color: 0xddddcc },
        // Roof
        { x: 0, y: 1.5, z: 0, w: 1.7, h: 0.12, d: 1.3, color: 0x664433 },
        { x: 0, y: 1.65, z: 0, w: 1.3, h: 0.1, d: 1.0, color: 0x553322 },
        { x: 0, y: 1.78, z: 0, w: 0.6, h: 0.08, d: 0.8, color: 0x553322 },
        // Barn door
        { x: 0, y: 0.4, z: 0.56, w: 0.5, h: 0.7, d: 0.03, color: 0x553322 },
        // Door handle
        { x: 0.15, y: 0.4, z: 0.57, w: 0.04, h: 0.08, d: 0.01, color: 0xddddcc },
        // Hay loft window
        { x: 0, y: 1.1, z: 0.56, w: 0.2, h: 0.15, d: 0.02, color: 0x332211 },
      ],
    });

    this.register({
      name: 'hay_bale',
      cubes: [
        { x: 0, y: 0.15, z: 0, w: 0.4, h: 0.3, d: 0.35, color: 0xccaa55 },
        { x: 0, y: 0.15, z: 0, w: 0.38, h: 0.28, d: 0.33, color: 0xddbb66 },
        // Binding
        { x: 0, y: 0.15, z: 0, w: 0.42, h: 0.02, d: 0.36, color: 0x886633 },
      ],
    });

    this.register({
      name: 'farm_field',
      cubes: [
        // Plowed rows
        { x: 0, y: 0.03, z: 0, w: 1.5, h: 0.06, d: 1.0, color: 0x6a5530 },
        { x: 0, y: 0.05, z: 0.15, w: 1.4, h: 0.02, d: 0.08, color: 0x5a4520 },
        { x: 0, y: 0.05, z: -0.15, w: 1.4, h: 0.02, d: 0.08, color: 0x5a4520 },
        // Crop rows
        { x: 0, y: 0.08, z: 0.05, w: 1.3, h: 0.06, d: 0.05, color: 0x558833 },
        { x: 0, y: 0.08, z: -0.25, w: 1.3, h: 0.06, d: 0.05, color: 0x669944 },
        { x: 0, y: 0.08, z: 0.3, w: 1.3, h: 0.04, d: 0.05, color: 0x558833 },
      ],
    });

    this.register({
      name: 'well',
      cubes: [
        // Stone base
        { x: 0, y: 0.2, z: 0, w: 0.5, h: 0.4, d: 0.5, color: 0x888877 },
        // Inner dark
        { x: 0, y: 0.22, z: 0, w: 0.35, h: 0.38, d: 0.35, color: 0x222222 },
        // Roof supports
        { x: -0.2, y: 0.6, z: 0, w: 0.04, h: 0.6, d: 0.04, color: 0x6b5030 },
        { x: 0.2, y: 0.6, z: 0, w: 0.04, h: 0.6, d: 0.04, color: 0x6b5030 },
        // Roof
        { x: 0, y: 0.95, z: 0, w: 0.55, h: 0.06, d: 0.4, color: 0x773322 },
        { x: 0, y: 1.02, z: 0, w: 0.4, h: 0.04, d: 0.3, color: 0x663322 },
        // Crossbar
        { x: 0, y: 0.85, z: 0, w: 0.5, h: 0.03, d: 0.03, color: 0x6b5030 },
        // Bucket
        { x: 0, y: 0.5, z: 0, w: 0.08, h: 0.1, d: 0.08, color: 0x7a5c3a },
      ],
    });

    // =====================================================
    // === TUNNEL MODELS ===
    // =====================================================
    this.register({
      name: 'tunnel_support',
      cubes: [
        // Left pillar
        { x: -0.3, y: 1.0, z: 0, w: 0.15, h: 2.0, d: 0.15, color: 0x555550 },
        // Right pillar
        { x: 0.3, y: 1.0, z: 0, w: 0.15, h: 2.0, d: 0.15, color: 0x555550 },
        // Cross beam
        { x: 0, y: 2.05, z: 0, w: 0.8, h: 0.12, d: 0.15, color: 0x5a5a55 },
        // Base plates
        { x: -0.3, y: 0.03, z: 0, w: 0.25, h: 0.06, d: 0.25, color: 0x444440 },
        { x: 0.3, y: 0.03, z: 0, w: 0.25, h: 0.06, d: 0.25, color: 0x444440 },
      ],
    });

    this.register({
      name: 'tunnel_light',
      cubes: [
        // Wall bracket
        { x: 0, y: 0.5, z: 0, w: 0.06, h: 0.12, d: 0.04, color: 0x555555 },
        // Light housing
        { x: 0, y: 0.55, z: 0.03, w: 0.1, h: 0.08, d: 0.06, color: 0x444444 },
        // Glow
        { x: 0, y: 0.55, z: 0.06, w: 0.06, h: 0.04, d: 0.02, color: 0xffaa44 },
      ],
    });

    this.register({
      name: 'pipe_segment',
      cubes: [
        // Main pipe
        { x: 0, y: 0.4, z: 0, w: 0.12, h: 0.12, d: 1.5, color: 0x777766 },
        // Joint rings
        { x: 0, y: 0.4, z: -0.5, w: 0.16, h: 0.16, d: 0.05, color: 0x666655 },
        { x: 0, y: 0.4, z: 0.5, w: 0.16, h: 0.16, d: 0.05, color: 0x666655 },
        // Bracket
        { x: 0, y: 0.25, z: 0, w: 0.04, h: 0.2, d: 0.04, color: 0x555544 },
      ],
    });

    this.register({
      name: 'underground_structure',
      cubes: [
        // Small bunker
        { x: 0, y: 0.4, z: 0, w: 0.8, h: 0.8, d: 0.6, color: 0x4a4a45 },
        // Roof
        { x: 0, y: 0.85, z: 0, w: 0.9, h: 0.08, d: 0.7, color: 0x3a3a35 },
        // Door
        { x: 0, y: 0.25, z: 0.31, w: 0.2, h: 0.4, d: 0.02, color: 0x555550 },
        // Ventilation pipe
        { x: 0.25, y: 1.1, z: 0, w: 0.08, h: 0.4, d: 0.08, color: 0x666660 },
        // Rusted detail
        { x: -0.25, y: 0.5, z: 0.31, w: 0.12, h: 0.1, d: 0.02, color: 0x8a6644 },
      ],
    });

    // =====================================================
    // === POLAR / ICE MODELS ===
    // =====================================================
    this.registerSmooth({
      name: 'frozen_pine',
      parts: [
        { type: 'cylinder', x: 0, y: 0.4, z: 0, params: [0.06, 0.8, 8], color: 0x3a3040 },
        // Ice-encrusted cones + flattened dodecahedron frost caps
        { type: 'cone', x: 0, y: 1.1, z: 0, params: [0, 0.6, 0.6, 8], color: 0xbbd0ee },
        { type: 'cone', x: 0, y: 1.45, z: 0, params: [0, 0.45, 0.5, 8], color: 0xccddef },
        { type: 'cone', x: 0, y: 1.75, z: 0, params: [0, 0.3, 0.35, 8], color: 0xddeeff },
        { type: 'dodecahedron', x: 0, y: 1.3, z: 0, params: [0.5, 0], color: 0xddeeff, scaleY: 0.3 },
        { type: 'dodecahedron', x: 0, y: 1.65, z: 0, params: [0.35, 0], color: 0xeef5ff, scaleY: 0.3 },
        { type: 'dodecahedron', x: 0, y: 1.95, z: 0, params: [0.18, 0], color: 0xeef5ff, scaleY: 0.35 },
      ],
    });

    this.register({
      name: 'ice_crystal',
      cubes: [
        { x: 0, y: 0.5, z: 0, w: 0.15, h: 1.0, d: 0.15, color: 0xaaccee },
        { x: 0.1, y: 0.35, z: 0.1, w: 0.12, h: 0.7, d: 0.12, color: 0xbbddff },
        { x: -0.12, y: 0.3, z: -0.08, w: 0.1, h: 0.6, d: 0.1, color: 0x99bbdd },
        { x: 0.05, y: 0.7, z: -0.12, w: 0.08, h: 0.5, d: 0.08, color: 0xcceeFF },
        { x: -0.08, y: 0.6, z: 0.15, w: 0.06, h: 0.4, d: 0.06, color: 0xddeeff },
      ],
    });

    // Igloo — sphere dome instead of stacked boxes
    this.registerSmooth({
      name: 'igloo',
      parts: [
        // Dome — flattened sphere
        { type: 'sphere', x: 0, y: 0.3, z: 0, params: [0.55, 10, 8], color: 0xeeeeff, scaleY: 0.7 },
        // Inner dome shade
        { type: 'sphere', x: 0, y: 0.28, z: 0, params: [0.5, 8, 6], color: 0xdde8f5, scaleY: 0.65 },
        // Entrance tunnel
        { type: 'cylinder', x: 0, y: 0.2, z: 0.55, params: [0.18, 0.35, 8], color: 0xdde8f5, scaleZ: 1.5 },
        // Entrance opening (dark)
        { type: 'cylinder', x: 0, y: 0.18, z: 0.7, params: [0.12, 0.25, 6], color: 0x334455 },
      ],
    });

    this.register({
      name: 'polar_rock',
      cubes: [
        { x: 0, y: 0.2, z: 0, w: 0.7, h: 0.4, d: 0.6, color: 0x556677 },
        { x: 0.1, y: 0.35, z: 0.08, w: 0.4, h: 0.25, d: 0.35, color: 0x667788 },
        { x: -0.1, y: 0.4, z: -0.05, w: 0.3, h: 0.15, d: 0.25, color: 0xddeeff },
      ],
    });

    this.register({
      name: 'ice_pillar',
      cubes: [
        { x: 0, y: 0.8, z: 0, w: 0.3, h: 1.6, d: 0.3, color: 0xaaccee },
        { x: 0.05, y: 1.0, z: 0.05, w: 0.22, h: 1.2, d: 0.22, color: 0xbbddff },
        { x: -0.03, y: 0.4, z: 0, w: 0.35, h: 0.4, d: 0.35, color: 0x99bbdd },
        { x: 0, y: 1.65, z: 0, w: 0.18, h: 0.3, d: 0.18, color: 0xddeeff },
      ],
    });

    this.register({
      name: 'icicle_cluster',
      cubes: [
        { x: 0, y: 0.3, z: 0, w: 0.06, h: 0.6, d: 0.06, color: 0xbbddff },
        { x: 0.1, y: 0.2, z: 0.05, w: 0.05, h: 0.4, d: 0.05, color: 0xaaccee },
        { x: -0.08, y: 0.25, z: -0.06, w: 0.04, h: 0.5, d: 0.04, color: 0xcceeFF },
        { x: 0.06, y: 0.15, z: -0.1, w: 0.05, h: 0.3, d: 0.05, color: 0xddeeff },
        { x: -0.12, y: 0.18, z: 0.08, w: 0.04, h: 0.35, d: 0.04, color: 0xbbddff },
      ],
    });

    this.register({
      name: 'snow_drift',
      cubes: [
        { x: 0, y: 0.1, z: 0, w: 1.2, h: 0.2, d: 0.8, color: 0xeef5ff },
        { x: 0.2, y: 0.15, z: 0.1, w: 0.8, h: 0.15, d: 0.6, color: 0xddeeff },
        { x: -0.15, y: 0.08, z: -0.1, w: 0.5, h: 0.1, d: 0.4, color: 0xffffff },
      ],
    });

    this.register({
      name: 'mountain_ice',
      cubes: [
        { x: 0, y: 0.5, z: 0, w: 3.5, h: 1.0, d: 3.0, color: 0x667788 },
        { x: 0.2, y: 1.5, z: 0.1, w: 2.5, h: 1.2, d: 2.2, color: 0x778899 },
        { x: 0, y: 2.6, z: 0, w: 1.5, h: 1.0, d: 1.3, color: 0x8899aa },
        { x: 0, y: 3.4, z: 0, w: 0.8, h: 0.6, d: 0.7, color: 0xaabbcc },
        { x: 0, y: 3.9, z: 0, w: 0.5, h: 0.3, d: 0.4, color: 0xddeeff },
        { x: -0.2, y: 3.5, z: 0.15, w: 0.4, h: 0.25, d: 0.35, color: 0xeef5ff },
      ],
    });

    // =====================================================
    // === HOT AIR BALLOON ===
    // =====================================================
    this.registerSmooth({
      name: 'hot_air_balloon',
      parts: [
        // Balloon envelope
        { type: 'sphere', x: 0, y: 2.5, z: 0, params: [0.8, 10, 8], color: 0xdd4444 },
        { type: 'sphere', x: 0, y: 2.5, z: 0, params: [0.75, 10, 8], color: 0xeeaa33 },
        // Basket
        { type: 'cylinder', x: 0, y: 1.2, z: 0, params: [0.25, 0.3, 8], color: 0x8a6530 },
        // Ropes (thin cylinders)
        { type: 'cylinder', x: 0.15, y: 1.7, z: 0, params: [0.01, 0.7, 4], color: 0x887766 },
        { type: 'cylinder', x: -0.15, y: 1.7, z: 0, params: [0.01, 0.7, 4], color: 0x887766 },
        { type: 'cylinder', x: 0, y: 1.7, z: 0.15, params: [0.01, 0.7, 4], color: 0x887766 },
      ],
    });

    // =====================================================
    // === CONSTRUCTION MODELS ===
    // =====================================================
    this.register({
      name: 'construction_scaffold',
      cubes: [
        // Vertical poles
        { x: -0.3, y: 0.7, z: -0.3, w: 0.05, h: 1.4, d: 0.05, color: 0x888888 },
        { x: 0.3, y: 0.7, z: -0.3, w: 0.05, h: 1.4, d: 0.05, color: 0x888888 },
        { x: -0.3, y: 0.7, z: 0.3, w: 0.05, h: 1.4, d: 0.05, color: 0x888888 },
        { x: 0.3, y: 0.7, z: 0.3, w: 0.05, h: 1.4, d: 0.05, color: 0x888888 },
        // Platforms
        { x: 0, y: 0.5, z: 0, w: 0.7, h: 0.04, d: 0.7, color: 0x7a5c3a },
        { x: 0, y: 1.0, z: 0, w: 0.7, h: 0.04, d: 0.7, color: 0x7a5c3a },
        // Cross braces
        { x: 0, y: 0.75, z: -0.3, w: 0.65, h: 0.03, d: 0.03, color: 0x888888 },
        { x: 0, y: 0.75, z: 0.3, w: 0.65, h: 0.03, d: 0.03, color: 0x888888 },
      ],
    });

    this.register({
      name: 'construction_site',
      cubes: [
        // Partially built wall
        { x: 0, y: 0.4, z: 0, w: 1.0, h: 0.8, d: 0.15, color: 0xbbaa88 },
        { x: 0.3, y: 0.7, z: 0, w: 0.3, h: 0.4, d: 0.15, color: 0xbbaa88 },
        // Foundation
        { x: 0, y: 0.05, z: 0, w: 1.4, h: 0.1, d: 1.0, color: 0x888877 },
        // Pile of bricks
        { x: 0.5, y: 0.1, z: 0.3, w: 0.3, h: 0.2, d: 0.2, color: 0xcc7744 },
        // Orange safety barrier
        { x: -0.6, y: 0.3, z: 0, w: 0.04, h: 0.6, d: 0.04, color: 0xff6600 },
        { x: -0.6, y: 0.55, z: 0, w: 0.5, h: 0.04, d: 0.03, color: 0xff6600 },
      ],
    });

    // =====================================================
    // === AUTUMN FOREST EXTRAS ===
    // =====================================================
    this.registerSmooth({
      name: 'maple_autumn',
      parts: [
        { type: 'cylinder', x: 0, y: 0.5, z: 0, params: [0.1, 1.0, 8], color: 0x5a3820 },
        // Vivid red canopy — overlapping spheres
        { type: 'icosahedron', x: 0, y: 1.4, z: 0, params: [0.55, 1], color: 0xdd3322 },
        { type: 'icosahedron', x: 0.18, y: 1.65, z: 0.08, params: [0.45, 1], color: 0xee5533 },
        { type: 'icosahedron', x: -0.1, y: 1.75, z: -0.08, params: [0.35, 1], color: 0xcc2211 },
        { type: 'icosahedron', x: 0.05, y: 1.95, z: 0, params: [0.22, 1], color: 0xff4422 },
      ],
    });

    this.register({
      name: 'log_pile',
      cubes: [
        { x: 0, y: 0.08, z: 0, w: 0.6, h: 0.15, d: 0.4, color: 0x6b4226 },
        { x: 0, y: 0.18, z: 0, w: 0.55, h: 0.1, d: 0.35, color: 0x7a5030 },
        { x: 0.05, y: 0.25, z: 0, w: 0.4, h: 0.08, d: 0.3, color: 0x6b4226 },
      ],
    });

    this.register({
      name: 'mushroom_cluster',
      cubes: [
        // Stems
        { x: 0, y: 0.06, z: 0, w: 0.04, h: 0.12, d: 0.04, color: 0xddccaa },
        { x: 0.08, y: 0.05, z: 0.05, w: 0.03, h: 0.1, d: 0.03, color: 0xddccaa },
        // Caps
        { x: 0, y: 0.14, z: 0, w: 0.1, h: 0.04, d: 0.1, color: 0xcc4422 },
        { x: 0.08, y: 0.12, z: 0.05, w: 0.08, h: 0.03, d: 0.08, color: 0xdd5533 },
      ],
    });

    // =====================================================
    // === SPRING MEADOW EXTRAS ===
    // =====================================================
    this.register({
      name: 'wildflower_patch',
      cubes: [
        { x: 0, y: 0.04, z: 0, w: 0.8, h: 0.08, d: 0.6, color: 0x55aa44 },
        { x: 0.15, y: 0.1, z: 0.1, w: 0.06, h: 0.06, d: 0.06, color: 0xff6688 },
        { x: -0.2, y: 0.1, z: -0.1, w: 0.06, h: 0.06, d: 0.06, color: 0xffdd44 },
        { x: 0.25, y: 0.09, z: -0.15, w: 0.05, h: 0.05, d: 0.05, color: 0xaa88ff },
        { x: -0.1, y: 0.1, z: 0.2, w: 0.06, h: 0.06, d: 0.06, color: 0xffaadd },
        { x: 0.05, y: 0.09, z: -0.25, w: 0.05, h: 0.05, d: 0.05, color: 0x66ccff },
      ],
    });

    this.register({
      name: 'stream_bridge',
      cubes: [
        // Wooden deck
        { x: 0, y: 0.15, z: 0, w: 0.8, h: 0.06, d: 0.5, color: 0x7a5c3a },
        // Rails
        { x: -0.35, y: 0.3, z: 0, w: 0.04, h: 0.3, d: 0.04, color: 0x6b4f30 },
        { x: 0.35, y: 0.3, z: 0, w: 0.04, h: 0.3, d: 0.04, color: 0x6b4f30 },
        { x: -0.35, y: 0.42, z: 0, w: 0.03, h: 0.03, d: 0.5, color: 0x6b4f30 },
        { x: 0.35, y: 0.42, z: 0, w: 0.03, h: 0.03, d: 0.5, color: 0x6b4f30 },
      ],
    });

    this.register({
      name: 'beehive',
      cubes: [
        { x: 0, y: 0.15, z: 0, w: 0.2, h: 0.3, d: 0.2, color: 0xddaa44 },
        { x: 0, y: 0.2, z: 0, w: 0.22, h: 0.15, d: 0.22, color: 0xccaa33 },
        { x: 0, y: 0.32, z: 0, w: 0.18, h: 0.06, d: 0.18, color: 0xbb9922 },
      ],
    });

    this.register({
      name: 'cottage',
      cubes: [
        // Foundation
        { x: 0, y: 0.06, z: 0, w: 1.0, h: 0.12, d: 0.8, color: 0x888877 },
        // Walls — whitewashed
        { x: 0, y: 0.45, z: 0, w: 0.9, h: 0.7, d: 0.7, color: 0xeeddcc },
        // Thatched roof
        { x: 0, y: 0.95, z: 0, w: 1.05, h: 0.15, d: 0.85, color: 0x998855 },
        { x: 0, y: 1.1, z: 0, w: 0.8, h: 0.12, d: 0.7, color: 0x887744 },
        { x: 0, y: 1.22, z: 0, w: 0.5, h: 0.08, d: 0.5, color: 0x887744 },
        // Door
        { x: 0, y: 0.28, z: 0.36, w: 0.2, h: 0.4, d: 0.02, color: 0x553322 },
        // Window with flower box
        { x: 0.3, y: 0.5, z: 0.36, w: 0.15, h: 0.15, d: 0.02, color: 0x88aacc },
        { x: 0.3, y: 0.4, z: 0.37, w: 0.18, h: 0.04, d: 0.04, color: 0x6b4f30 },
        { x: 0.3, y: 0.42, z: 0.39, w: 0.1, h: 0.03, d: 0.02, color: 0xff6688 },
      ],
    });

    // =====================================================
    // === ARCTIC COAST MODELS ===
    // =====================================================
    this.register({
      name: 'ice_berg',
      cubes: [
        { x: 0, y: 0.4, z: 0, w: 1.2, h: 0.8, d: 1.0, color: 0xaaccee },
        { x: 0.1, y: 0.8, z: 0.05, w: 0.8, h: 0.5, d: 0.7, color: 0xbbddff },
        { x: 0, y: 1.1, z: 0, w: 0.5, h: 0.3, d: 0.4, color: 0xddeeff },
        // Submerged base
        { x: 0, y: 0.05, z: 0, w: 1.4, h: 0.1, d: 1.2, color: 0x5588aa },
      ],
    });

    this.register({
      name: 'frozen_wreck',
      cubes: [
        // Ship hull
        { x: 0, y: 0.25, z: 0, w: 0.6, h: 0.5, d: 1.5, color: 0x6a5540 },
        { x: 0, y: 0.3, z: 0.4, w: 0.5, h: 0.4, d: 0.3, color: 0x5a4530 },
        // Mast
        { x: 0, y: 0.8, z: 0, w: 0.06, h: 0.8, d: 0.06, color: 0x5a4530 },
        // Ice encrustation
        { x: -0.2, y: 0.35, z: 0.3, w: 0.3, h: 0.2, d: 0.3, color: 0xbbddff },
        { x: 0.2, y: 0.3, z: -0.5, w: 0.25, h: 0.15, d: 0.25, color: 0xaaccee },
      ],
    });

    this.register({
      name: 'aurora_pole',
      cubes: [
        { x: 0, y: 1.0, z: 0, w: 0.06, h: 2.0, d: 0.06, color: 0x556677 },
        // Glowing tip
        { x: 0, y: 2.05, z: 0, w: 0.1, h: 0.1, d: 0.1, color: 0x44ffaa },
      ],
    });

    // =====================================================
    // === OCEAN / WATER MODELS — ocean biome ===
    // =====================================================
    this.registerSmooth({
      name: 'coral_branch',
      parts: [
        // Trunk
        { type: 'cylinder', x: 0, y: 0.4, z: 0, params: [0.06, 0.8, 6], color: 0xdd6644 },
        // Branch arms
        { type: 'cylinder', x: 0.15, y: 0.7, z: 0, params: [0.04, 0.5, 6], color: 0xee7755 },
        { type: 'cylinder', x: -0.12, y: 0.65, z: 0.08, params: [0.04, 0.45, 6], color: 0xff8866 },
        // Blob tips
        { type: 'dodecahedron', x: 0, y: 0.9, z: 0, params: [0.12, 0], color: 0xff9977 },
        { type: 'dodecahedron', x: 0.15, y: 1.0, z: 0, params: [0.1, 0], color: 0xffaa88 },
        { type: 'dodecahedron', x: -0.12, y: 0.95, z: 0.08, params: [0.09, 0], color: 0xffbb99 },
      ],
    });

    this.register({
      name: 'coral_fan',
      cubes: [
        // Base stem
        { x: 0, y: 0.08, z: 0, w: 0.06, h: 0.15, d: 0.06, color: 0x884466 },
        // Fan blades — flat boxes
        { x: 0, y: 0.3, z: 0, w: 0.5, h: 0.35, d: 0.04, color: 0xaa55aa },
        { x: 0.05, y: 0.35, z: 0.02, w: 0.4, h: 0.25, d: 0.03, color: 0xcc66bb },
        { x: -0.03, y: 0.4, z: -0.01, w: 0.3, h: 0.15, d: 0.03, color: 0xdd77cc },
      ],
    });

    this.registerSmooth({
      name: 'seaweed_tall',
      parts: [
        // Stacked thin cylinders with offset for swaying look
        { type: 'cylinder', x: 0, y: 0.3, z: 0, params: [0.03, 0.6, 6], color: 0x226633 },
        { type: 'cylinder', x: 0.04, y: 0.8, z: 0.02, params: [0.025, 0.5, 6], color: 0x338844 },
        { type: 'cylinder', x: -0.03, y: 1.2, z: -0.02, params: [0.02, 0.4, 6], color: 0x44aa55 },
        { type: 'cylinder', x: 0.02, y: 1.5, z: 0.03, params: [0.015, 0.3, 6], color: 0x55bb66 },
      ],
    });

    this.register({
      name: 'sea_ruin_pillar',
      cubes: [
        // Stone column
        { x: 0, y: 0.6, z: 0, w: 0.3, h: 1.2, d: 0.3, color: 0x667766 },
        { x: 0, y: 0.6, z: 0, w: 0.28, h: 1.15, d: 0.28, color: 0x778877 },
        // Crumbled top
        { x: 0.05, y: 1.25, z: 0.03, w: 0.2, h: 0.12, d: 0.18, color: 0x889988 },
        { x: -0.08, y: 1.2, z: -0.05, w: 0.15, h: 0.08, d: 0.15, color: 0x778877 },
        // Moss accents
        { x: 0.1, y: 0.5, z: 0.16, w: 0.12, h: 0.15, d: 0.03, color: 0x448844 },
        { x: -0.12, y: 0.8, z: -0.14, w: 0.1, h: 0.1, d: 0.03, color: 0x336633 },
      ],
    });

    this.register({
      name: 'sea_ruin_arch',
      cubes: [
        // Left pillar
        { x: -0.4, y: 0.5, z: 0, w: 0.25, h: 1.0, d: 0.25, color: 0x667766 },
        // Right pillar
        { x: 0.4, y: 0.5, z: 0, w: 0.25, h: 1.0, d: 0.25, color: 0x778877 },
        // Crossbeam
        { x: 0, y: 1.05, z: 0, w: 1.1, h: 0.15, d: 0.22, color: 0x6a7a6a },
        // Moss
        { x: 0.2, y: 1.15, z: 0, w: 0.3, h: 0.05, d: 0.2, color: 0x448844 },
        // Broken chunk
        { x: 0.5, y: 0.1, z: 0.15, w: 0.18, h: 0.12, d: 0.15, color: 0x778877 },
      ],
    });

    this.registerSmooth({
      name: 'sea_dome',
      parts: [
        // Large teal dome
        { type: 'sphere', x: 0, y: 0.6, z: 0, params: [1.0, 12, 10], color: 0x448888, scaleY: 0.7 },
        // Inner glow layer
        { type: 'sphere', x: 0, y: 0.55, z: 0, params: [0.9, 10, 8], color: 0x55aaaa, scaleY: 0.65 },
        // Base ring
        { type: 'torus', x: 0, y: 0.15, z: 0, params: [0.95, 0.08, 8, 16], color: 0x667766 },
      ],
    });

    this.register({
      name: 'sea_lantern',
      cubes: [
        // Thin stick
        { x: 0, y: 0.3, z: 0, w: 0.04, h: 0.6, d: 0.04, color: 0x556655 },
        // Glowing cyan cube
        { x: 0, y: 0.65, z: 0, w: 0.12, h: 0.12, d: 0.12, color: 0x44dddd },
        // Glow halo
        { x: 0, y: 0.65, z: 0, w: 0.16, h: 0.08, d: 0.16, color: 0x66eeee },
      ],
    });

    this.register({
      name: 'sunken_ship',
      cubes: [
        // Hull
        { x: 0, y: 0.25, z: 0, w: 0.7, h: 0.5, d: 1.8, color: 0x5a4530 },
        { x: 0, y: 0.15, z: 0, w: 0.8, h: 0.3, d: 1.6, color: 0x4a3520 },
        // Deck
        { x: 0, y: 0.52, z: 0, w: 0.6, h: 0.04, d: 1.5, color: 0x6b5540 },
        // Broken mast
        { x: 0, y: 0.7, z: 0.2, w: 0.06, h: 0.6, d: 0.06, color: 0x5a4530 },
        // Coral accents on hull
        { x: 0.3, y: 0.3, z: -0.5, w: 0.15, h: 0.12, d: 0.15, color: 0xdd6644 },
        { x: -0.25, y: 0.25, z: 0.6, w: 0.12, h: 0.1, d: 0.12, color: 0xee7755 },
        // Kelp growing on deck
        { x: 0.15, y: 0.6, z: -0.3, w: 0.04, h: 0.2, d: 0.04, color: 0x338844 },
      ],
    });

    // =====================================================
    // === SNOW / FROST MODELS — frozen_waste biome ===
    // =====================================================
    this.registerSmooth({
      name: 'snow_covered_tree',
      parts: [
        // Pine trunk
        { type: 'cylinder', x: 0, y: 0.5, z: 0, params: [0.08, 1.0, 8], color: 0x4a2e16 },
        // Small green cones barely visible
        { type: 'cone', x: 0, y: 1.2, z: 0, params: [0, 0.6, 0.5, 8], color: 0x2a5530 },
        { type: 'cone', x: 0, y: 1.6, z: 0, params: [0, 0.4, 0.4, 8], color: 0x2a5530 },
        // Heavy white snow blobs covering most of the tree
        { type: 'dodecahedron', x: 0, y: 1.3, z: 0, params: [0.6, 0], color: 0xffffff, scaleY: 0.4 },
        { type: 'dodecahedron', x: 0.1, y: 1.7, z: 0.05, params: [0.45, 0], color: 0xf0f5ff, scaleY: 0.4 },
        { type: 'dodecahedron', x: -0.05, y: 2.0, z: 0, params: [0.3, 0], color: 0xffffff, scaleY: 0.45 },
      ],
    });

    this.register({
      name: 'frozen_lake_slab',
      cubes: [
        // Wide flat translucent-blue slab
        { x: 0, y: 0.04, z: 0, w: 2.0, h: 0.08, d: 1.5, color: 0x88bbdd },
        { x: 0, y: 0.06, z: 0, w: 1.8, h: 0.04, d: 1.3, color: 0xaaddee },
        // Frost cracks
        { x: 0.3, y: 0.09, z: -0.2, w: 0.6, h: 0.01, d: 0.02, color: 0xcceeFF },
        { x: -0.4, y: 0.09, z: 0.3, w: 0.5, h: 0.01, d: 0.02, color: 0xddeeff },
      ],
    });

    this.registerSmooth({
      name: 'frost_crystal_large',
      parts: [
        // Tall central spire
        { type: 'icosahedron', x: 0, y: 0.8, z: 0, params: [0.25, 1], color: 0xccddff, scaleY: 2.5 },
        // Side spires
        { type: 'icosahedron', x: 0.15, y: 0.5, z: 0.1, params: [0.18, 1], color: 0xddeeff, scaleY: 2.0 },
        { type: 'icosahedron', x: -0.12, y: 0.45, z: -0.08, params: [0.15, 1], color: 0xeef5ff, scaleY: 1.8 },
        // Small shard
        { type: 'icosahedron', x: 0.08, y: 0.35, z: -0.15, params: [0.1, 1], color: 0xffffff, scaleY: 1.5 },
      ],
    });

    this.register({
      name: 'snow_wall',
      cubes: [
        // Thick elongated snow drift
        { x: 0, y: 0.2, z: 0, w: 2.0, h: 0.4, d: 0.6, color: 0xf0f5ff },
        { x: 0.1, y: 0.3, z: 0, w: 1.6, h: 0.3, d: 0.5, color: 0xffffff },
        { x: -0.2, y: 0.35, z: 0, w: 1.0, h: 0.15, d: 0.4, color: 0xeef5ff },
      ],
    });

    // =====================================================
    // === STORM MODELS — thunderstorm biome ===
    // =====================================================
    this.register({
      name: 'fallen_tree',
      cubes: [
        // Sideways trunk
        { x: 0, y: 0.15, z: 0, w: 0.2, h: 0.2, d: 1.8, color: 0x5a3820 },
        // Root ball (upturned)
        { x: 0, y: 0.3, z: 0.95, w: 0.4, h: 0.4, d: 0.3, color: 0x4a2e16 },
        { x: 0, y: 0.25, z: 0.9, w: 0.35, h: 0.2, d: 0.2, color: 0x6a5540 },
        // Broken branch stubs
        { x: 0.1, y: 0.3, z: -0.3, w: 0.06, h: 0.15, d: 0.06, color: 0x5a3820 },
        { x: -0.08, y: 0.28, z: 0.2, w: 0.05, h: 0.12, d: 0.05, color: 0x6b4226 },
        { x: 0.05, y: 0.3, z: -0.6, w: 0.04, h: 0.1, d: 0.04, color: 0x5a3820 },
      ],
    });

    this.register({
      name: 'storm_debris',
      cubes: [
        // Scattered planks
        { x: 0, y: 0.02, z: 0, w: 0.5, h: 0.03, d: 0.1, color: 0x7a5c3a },
        { x: 0.2, y: 0.02, z: 0.15, w: 0.35, h: 0.03, d: 0.08, color: 0x6b4f30 },
        { x: -0.15, y: 0.02, z: -0.2, w: 0.4, h: 0.03, d: 0.06, color: 0x7a5c3a },
        // Small rocks
        { x: 0.3, y: 0.05, z: -0.1, w: 0.12, h: 0.1, d: 0.1, color: 0x666655 },
        { x: -0.25, y: 0.04, z: 0.2, w: 0.1, h: 0.08, d: 0.08, color: 0x777766 },
        { x: 0.1, y: 0.03, z: 0.25, w: 0.08, h: 0.06, d: 0.08, color: 0x555544 },
      ],
    });

    // =====================================================
    // === SAKURA / JAPANESE BIOME MODELS ===
    // =====================================================

    // Sakura tree — twisted trunk with full pink canopy
    this.registerSmooth({
      name: 'sakura_tree',
      parts: [
        // Twisted trunk
        { type: 'cylinder', x: 0, y: 0.5, z: 0, params: [0.06, 1.0, 8], color: 0x5a3825 },
        { type: 'cylinder', x: 0.05, y: 0.9, z: 0.03, params: [0.05, 0.4, 6], color: 0x5a3825, scaleX: 0.8 },
        // Main blossom clusters — soft pink icosahedrons
        { type: 'icosahedron', x: 0, y: 1.4, z: 0, params: [0.5, 1], color: 0xffb8d0 },
        { type: 'icosahedron', x: 0.25, y: 1.6, z: 0.15, params: [0.4, 1], color: 0xffa0c0 },
        { type: 'icosahedron', x: -0.2, y: 1.7, z: -0.1, params: [0.35, 1], color: 0xffc8dc },
        { type: 'icosahedron', x: 0.1, y: 1.9, z: 0.05, params: [0.25, 1], color: 0xffd4e6 },
        { type: 'icosahedron', x: -0.15, y: 1.3, z: 0.2, params: [0.3, 1], color: 0xffaabb },
      ],
    });

    // Large sakura tree — majestic spreading canopy
    this.registerSmooth({
      name: 'sakura_tree_large',
      parts: [
        // Thick trunk
        { type: 'cylinder', x: 0, y: 0.7, z: 0, params: [0.1, 1.4, 8], color: 0x4a2818 },
        // Branch hint
        { type: 'cylinder', x: 0.15, y: 1.2, z: 0.1, params: [0.04, 0.6, 6], color: 0x5a3825, scaleX: 0.6 },
        { type: 'cylinder', x: -0.12, y: 1.1, z: -0.08, params: [0.04, 0.5, 6], color: 0x5a3825, scaleX: 0.6 },
        // Massive blossom canopy
        { type: 'icosahedron', x: 0, y: 1.8, z: 0, params: [0.7, 1], color: 0xffb0c8 },
        { type: 'icosahedron', x: 0.35, y: 2.0, z: 0.2, params: [0.55, 1], color: 0xff99b8 },
        { type: 'icosahedron', x: -0.3, y: 2.1, z: -0.15, params: [0.5, 1], color: 0xffc0d8 },
        { type: 'icosahedron', x: 0.15, y: 2.4, z: 0, params: [0.35, 1], color: 0xffd8e8 },
        { type: 'icosahedron', x: -0.2, y: 1.6, z: 0.3, params: [0.45, 1], color: 0xffaacc },
        { type: 'icosahedron', x: 0.3, y: 1.5, z: -0.25, params: [0.4, 1], color: 0xffbbdd },
      ],
    });

    // Torii gate — traditional red gate
    this.registerSmooth({
      name: 'torii_gate',
      parts: [
        // Two vertical pillars
        { type: 'cylinder', x: -0.4, y: 0.8, z: 0, params: [0.06, 1.6, 8], color: 0xcc2222 },
        { type: 'cylinder', x: 0.4, y: 0.8, z: 0, params: [0.06, 1.6, 8], color: 0xcc2222 },
        // Top beam (kasagi) — slightly curved
        { type: 'cylinder', x: 0, y: 1.65, z: 0, params: [0.04, 1.1, 4], color: 0xbb1111, scaleX: 0.3, scaleZ: 10.0 },
        // Lower beam (nuki)
        { type: 'cylinder', x: 0, y: 1.35, z: 0, params: [0.03, 0.8, 4], color: 0xcc2222, scaleX: 0.3, scaleZ: 8.0 },
      ],
    });

    // Stone lantern (ishidoro) — Japanese garden light
    this.registerSmooth({
      name: 'stone_lantern',
      parts: [
        // Base
        { type: 'cylinder', x: 0, y: 0.05, z: 0, params: [0.12, 0.1, 6], color: 0x888880 },
        // Shaft
        { type: 'cylinder', x: 0, y: 0.35, z: 0, params: [0.05, 0.5, 6], color: 0x999990 },
        // Light box
        { type: 'cylinder', x: 0, y: 0.65, z: 0, params: [0.1, 0.12, 4], color: 0xaaaaaa },
        // Roof cap
        { type: 'cone', x: 0, y: 0.78, z: 0, params: [0, 0.14, 0.15, 4], color: 0x777770 },
      ],
    });

    // Bamboo cluster
    this.registerSmooth({
      name: 'bamboo_cluster',
      parts: [
        { type: 'cylinder', x: 0, y: 0.8, z: 0, params: [0.03, 1.6, 6], color: 0x558833 },
        { type: 'cylinder', x: 0.1, y: 0.7, z: 0.08, params: [0.025, 1.4, 6], color: 0x669944 },
        { type: 'cylinder', x: -0.08, y: 0.65, z: 0.05, params: [0.03, 1.3, 6], color: 0x4a7728 },
        { type: 'cylinder', x: 0.05, y: 0.9, z: -0.07, params: [0.025, 1.8, 6], color: 0x558833 },
        // Leaf tufts at top
        { type: 'icosahedron', x: 0, y: 1.6, z: 0, params: [0.15, 0], color: 0x447722 },
        { type: 'icosahedron', x: 0.1, y: 1.4, z: 0.08, params: [0.12, 0], color: 0x558833 },
        { type: 'icosahedron', x: 0.05, y: 1.8, z: -0.07, params: [0.13, 0], color: 0x4a7728 },
      ],
    });

    // Zen rock garden stone
    this.register({
      name: 'zen_rock',
      cubes: [
        { x: 0, y: 0.1, z: 0, w: 0.3, h: 0.2, d: 0.25, color: 0x707068 },
        { x: 0.05, y: 0.2, z: 0.02, w: 0.2, h: 0.12, d: 0.18, color: 0x7a7a72 },
      ],
    });

    // Wooden bridge (small)
    this.register({
      name: 'wooden_bridge',
      cubes: [
        // Deck
        { x: 0, y: 0.3, z: 0, w: 0.6, h: 0.04, d: 0.3, color: 0x7a5c3a },
        // Rails
        { x: -0.28, y: 0.4, z: 0, w: 0.04, h: 0.15, d: 0.3, color: 0x6b4f30 },
        { x: 0.28, y: 0.4, z: 0, w: 0.04, h: 0.15, d: 0.3, color: 0x6b4f30 },
        // Supports
        { x: -0.2, y: 0.15, z: -0.12, w: 0.04, h: 0.3, d: 0.04, color: 0x6b4f30 },
        { x: 0.2, y: 0.15, z: -0.12, w: 0.04, h: 0.3, d: 0.04, color: 0x6b4f30 },
        { x: -0.2, y: 0.15, z: 0.12, w: 0.04, h: 0.3, d: 0.04, color: 0x6b4f30 },
        { x: 0.2, y: 0.15, z: 0.12, w: 0.04, h: 0.3, d: 0.04, color: 0x6b4f30 },
      ],
    });

    // =====================================================
    // === SWAMP BIOME MODELS ===
    // =====================================================

    // Swamp tree — gnarly trunk with hanging moss
    this.registerSmooth({
      name: 'swamp_tree',
      parts: [
        { type: 'cylinder', x: 0, y: 0.6, z: 0, params: [0.08, 1.2, 6], color: 0x3a3020 },
        { type: 'cylinder', x: 0.08, y: 1.0, z: 0.05, params: [0.04, 0.6, 6], color: 0x3a3020, scaleX: 0.7 },
        // Sparse dark canopy
        { type: 'icosahedron', x: 0, y: 1.4, z: 0, params: [0.4, 1], color: 0x2a4a1a },
        { type: 'icosahedron', x: 0.2, y: 1.5, z: 0.1, params: [0.3, 1], color: 0x1e3a12 },
        // Hanging moss (elongated cones pointing down)
        { type: 'cone', x: 0.15, y: 1.0, z: 0.15, params: [0.08, 0.4, 4], color: 0x556633, scaleY: -1 },
        { type: 'cone', x: -0.1, y: 1.05, z: -0.1, params: [0.06, 0.35, 4], color: 0x667744, scaleY: -1 },
        { type: 'cone', x: 0.2, y: 1.1, z: -0.05, params: [0.07, 0.3, 4], color: 0x556633, scaleY: -1 },
      ],
    });

    // Swamp log
    this.register({
      name: 'swamp_log',
      cubes: [
        { x: 0, y: 0.06, z: 0, w: 0.8, h: 0.12, d: 0.12, color: 0x3a3020 },
        { x: 0.1, y: 0.04, z: 0.05, w: 0.15, h: 0.06, d: 0.15, color: 0x445522 },
      ],
    });

    // Swamp mushroom
    this.registerSmooth({
      name: 'swamp_mushroom_large',
      parts: [
        { type: 'cylinder', x: 0, y: 0.15, z: 0, params: [0.04, 0.3, 6], color: 0x8a7755 },
        { type: 'cone', x: 0, y: 0.35, z: 0, params: [0.2, 0.05, 0.12, 8], color: 0x884422, scaleY: 0.5 },
      ],
    });

    // =====================================================
    // === LAVENDER / MEADOW MODELS ===
    // =====================================================

    // Lavender bush
    this.register({
      name: 'lavender_bush',
      cubes: [
        // Green base
        { x: 0, y: 0.08, z: 0, w: 0.2, h: 0.12, d: 0.2, color: 0x556633 },
        // Purple flower spikes
        { x: -0.05, y: 0.2, z: 0, w: 0.04, h: 0.15, d: 0.04, color: 0x8855aa },
        { x: 0.05, y: 0.22, z: 0.04, w: 0.04, h: 0.18, d: 0.04, color: 0x9966bb },
        { x: 0, y: 0.18, z: -0.05, w: 0.04, h: 0.13, d: 0.04, color: 0x7744aa },
        { x: 0.08, y: 0.2, z: -0.03, w: 0.04, h: 0.16, d: 0.04, color: 0x8855aa },
      ],
    });

    // Sunflower
    this.registerSmooth({
      name: 'sunflower',
      parts: [
        { type: 'cylinder', x: 0, y: 0.4, z: 0, params: [0.02, 0.8, 6], color: 0x448822 },
        { type: 'cylinder', x: 0, y: 0.85, z: 0, params: [0.1, 0.04, 8], color: 0xffcc00 },
        { type: 'cylinder', x: 0, y: 0.85, z: 0, params: [0.05, 0.05, 8], color: 0x663300 },
      ],
    });

    // Old stone wall
    this.register({
      name: 'stone_wall_ruin',
      cubes: [
        { x: 0, y: 0.25, z: 0, w: 0.8, h: 0.5, d: 0.12, color: 0x888877 },
        { x: -0.25, y: 0.55, z: 0, w: 0.3, h: 0.15, d: 0.12, color: 0x999988 },
        { x: 0.15, y: 0.4, z: 0, w: 0.15, h: 0.08, d: 0.12, color: 0x777766 },
      ],
    });

    // =====================================================
    // === MOUNTAIN PASS MODELS ===
    // =====================================================

    // Mountain pine (short, wind-bent)
    this.registerSmooth({
      name: 'mountain_pine',
      parts: [
        { type: 'cylinder', x: 0, y: 0.4, z: 0, params: [0.05, 0.8, 6], color: 0x4a3520 },
        { type: 'cone', x: 0.05, y: 1.0, z: 0, params: [0, 0.35, 0.7, 8], color: 0x2a5525 },
        { type: 'cone', x: 0.03, y: 1.3, z: 0, params: [0, 0.25, 0.5, 8], color: 0x2a5525 },
      ],
    });

    // Prayer flags (colorful strips between posts)
    this.register({
      name: 'prayer_flags',
      cubes: [
        // Two posts
        { x: -0.3, y: 0.3, z: 0, w: 0.03, h: 0.6, d: 0.03, color: 0x6b4f30 },
        { x: 0.3, y: 0.3, z: 0, w: 0.03, h: 0.6, d: 0.03, color: 0x6b4f30 },
        // Flags (small colored blocks strung between)
        { x: -0.15, y: 0.55, z: 0, w: 0.1, h: 0.06, d: 0.01, color: 0xcc3333 },
        { x: 0, y: 0.54, z: 0, w: 0.1, h: 0.06, d: 0.01, color: 0xffcc00 },
        { x: 0.15, y: 0.56, z: 0, w: 0.1, h: 0.06, d: 0.01, color: 0x3366cc },
        { x: -0.08, y: 0.53, z: 0, w: 0.08, h: 0.05, d: 0.01, color: 0x33aa55 },
        { x: 0.08, y: 0.55, z: 0, w: 0.08, h: 0.05, d: 0.01, color: 0xffffff },
      ],
    });

    // Mountain cairn (stacked stones)
    this.registerSmooth({
      name: 'mountain_cairn',
      parts: [
        { type: 'cylinder', x: 0, y: 0.06, z: 0, params: [0.15, 0.12, 6], color: 0x777770 },
        { type: 'cylinder', x: 0, y: 0.16, z: 0, params: [0.11, 0.08, 6], color: 0x888880 },
        { type: 'cylinder', x: 0, y: 0.24, z: 0, params: [0.08, 0.06, 6], color: 0x999990 },
        { type: 'cylinder', x: 0, y: 0.3, z: 0, params: [0.05, 0.05, 6], color: 0xaaaaaa },
      ],
    });

    // =====================================================
    // === JUNGLE / AMAZON MODELS ===
    // =====================================================

    // Giant jungle tree — massive trunk, wide canopy
    this.registerSmooth({
      name: 'jungle_tree',
      parts: [
        // Thick trunk
        { type: 'cylinder', x: 0, y: 1.0, z: 0, params: [0.15, 2.0, 8], color: 0x3d2b1a },
        // Buttress roots
        { type: 'cone', x: 0.15, y: 0.2, z: 0, params: [0.08, 0.5, 4], color: 0x3d2b1a, scaleX: 0.5 },
        { type: 'cone', x: -0.1, y: 0.2, z: 0.12, params: [0.07, 0.45, 4], color: 0x4a3522, scaleX: 0.5 },
        { type: 'cone', x: 0, y: 0.2, z: -0.14, params: [0.07, 0.4, 4], color: 0x3d2b1a, scaleX: 0.5 },
        // Dense canopy layers
        { type: 'icosahedron', x: 0, y: 2.2, z: 0, params: [0.9, 1], color: 0x1a4a12 },
        { type: 'icosahedron', x: 0.3, y: 2.4, z: 0.2, params: [0.7, 1], color: 0x225518 },
        { type: 'icosahedron', x: -0.2, y: 2.5, z: -0.15, params: [0.6, 1], color: 0x1e4a14 },
        { type: 'icosahedron', x: 0.1, y: 2.7, z: -0.2, params: [0.5, 1], color: 0x2a5a1e },
      ],
    });

    // Towering jungle tree — very tall emergent tree
    this.registerSmooth({
      name: 'jungle_tree_tall',
      parts: [
        // Very tall trunk
        { type: 'cylinder', x: 0, y: 2.0, z: 0, params: [0.2, 4.0, 8], color: 0x3a2818 },
        // Mid branches
        { type: 'cylinder', x: 0.25, y: 2.5, z: 0, params: [0.04, 0.8, 5], color: 0x3a2818 },
        { type: 'cylinder', x: -0.2, y: 2.8, z: 0.15, params: [0.04, 0.7, 5], color: 0x3a2818 },
        // Buttress roots
        { type: 'cone', x: 0.2, y: 0.3, z: 0, params: [0.1, 0.7, 4], color: 0x3a2818, scaleX: 0.4 },
        { type: 'cone', x: -0.15, y: 0.3, z: 0.15, params: [0.1, 0.6, 4], color: 0x4a3522, scaleX: 0.4 },
        // Huge canopy — spread wide
        { type: 'icosahedron', x: 0, y: 4.2, z: 0, params: [1.2, 1], color: 0x1a4a12, scaleY: 0.6 },
        { type: 'icosahedron', x: 0.5, y: 4.0, z: 0.3, params: [0.8, 1], color: 0x225518, scaleY: 0.55 },
        { type: 'icosahedron', x: -0.4, y: 4.3, z: -0.3, params: [0.9, 1], color: 0x1e4a14, scaleY: 0.6 },
        { type: 'icosahedron', x: 0.2, y: 4.5, z: -0.4, params: [0.7, 1], color: 0x2a5a1e, scaleY: 0.5 },
        // Hanging vines from canopy
        { type: 'cone', x: 0.4, y: 3.2, z: 0.2, params: [0.03, 1.2, 4], color: 0x446622, scaleY: -1 },
        { type: 'cone', x: -0.3, y: 3.4, z: -0.2, params: [0.02, 1.0, 4], color: 0x558833, scaleY: -1 },
        { type: 'cone', x: 0.1, y: 3.1, z: -0.4, params: [0.025, 0.9, 4], color: 0x446622, scaleY: -1 },
      ],
    });

    // Jungle vine — dangling from trees
    this.registerSmooth({
      name: 'jungle_vine',
      parts: [
        // Vertical vine strands
        { type: 'cylinder', x: 0, y: 0.8, z: 0, params: [0.015, 1.6, 4], color: 0x3a6622 },
        { type: 'cylinder', x: 0.08, y: 0.6, z: 0.05, params: [0.012, 1.2, 4], color: 0x448833 },
        { type: 'cylinder', x: -0.06, y: 0.7, z: -0.04, params: [0.013, 1.4, 4], color: 0x3a7728 },
        // Leaf clusters along vines
        { type: 'dodecahedron', x: 0.02, y: 1.2, z: 0.03, params: [0.08, 0], color: 0x2a6618, scaleY: 0.4 },
        { type: 'dodecahedron', x: -0.04, y: 0.6, z: -0.02, params: [0.07, 0], color: 0x337722, scaleY: 0.4 },
        { type: 'dodecahedron', x: 0.06, y: 0.3, z: 0.04, params: [0.06, 0], color: 0x2a6618, scaleY: 0.35 },
      ],
    });

    // Giant leaf — broad tropical leaf on stem
    this.registerSmooth({
      name: 'giant_leaf',
      parts: [
        // Stem
        { type: 'cylinder', x: 0, y: 0.4, z: 0, params: [0.02, 0.8, 4], color: 0x336622 },
        // Large flat leaf (squashed sphere)
        { type: 'sphere', x: 0, y: 0.85, z: 0, params: [0.4, 8, 6], color: 0x228822, scaleY: 0.1 },
        { type: 'sphere', x: 0.15, y: 0.9, z: 0.1, params: [0.25, 6, 4], color: 0x2a9928, scaleY: 0.08 },
      ],
    });

    // Jungle fern — low-growing ground cover
    this.registerSmooth({
      name: 'jungle_fern',
      parts: [
        // Frond stems fanning out
        { type: 'cone', x: 0.15, y: 0.3, z: 0, params: [0.01, 0.6, 4], color: 0x337722, scaleX: 2 },
        { type: 'cone', x: -0.12, y: 0.28, z: 0.1, params: [0.01, 0.55, 4], color: 0x2a6618, scaleX: 2 },
        { type: 'cone', x: 0, y: 0.25, z: -0.14, params: [0.01, 0.5, 4], color: 0x338828, scaleX: 2 },
        { type: 'cone', x: -0.08, y: 0.3, z: -0.08, params: [0.01, 0.5, 4], color: 0x2a7722, scaleX: 2 },
        // Leaf blobs at tips
        { type: 'dodecahedron', x: 0.25, y: 0.45, z: 0, params: [0.1, 0], color: 0x228822, scaleY: 0.3 },
        { type: 'dodecahedron', x: -0.2, y: 0.42, z: 0.15, params: [0.09, 0], color: 0x2a9928, scaleY: 0.3 },
        { type: 'dodecahedron', x: 0, y: 0.4, z: -0.22, params: [0.08, 0], color: 0x228822, scaleY: 0.3 },
      ],
    });

    // Jungle mushroom — large tropical mushroom
    this.registerSmooth({
      name: 'jungle_mushroom',
      parts: [
        { type: 'cylinder', x: 0, y: 0.2, z: 0, params: [0.05, 0.4, 6], color: 0x9a8866 },
        { type: 'sphere', x: 0, y: 0.5, z: 0, params: [0.2, 8, 6], color: 0xcc5533, scaleY: 0.45 },
        { type: 'sphere', x: 0, y: 0.52, z: 0, params: [0.15, 6, 4], color: 0xdd7744, scaleY: 0.3 },
      ],
    });

    // Jungle ruins — overgrown stone blocks
    this.register({
      name: 'jungle_ruins',
      cubes: [
        // Base blocks
        { x: 0, y: 0.25, z: 0, w: 0.8, h: 0.5, d: 0.6, color: 0x6a6a5a },
        { x: 0.2, y: 0.6, z: 0.05, w: 0.5, h: 0.3, d: 0.45, color: 0x7a7a6a },
        { x: -0.15, y: 0.55, z: -0.1, w: 0.35, h: 0.2, d: 0.35, color: 0x6a6a5a },
        // Moss patches
        { x: 0.3, y: 0.52, z: 0.2, w: 0.2, h: 0.04, d: 0.2, color: 0x336622 },
        { x: -0.2, y: 0.35, z: 0.15, w: 0.15, h: 0.03, d: 0.15, color: 0x448833 },
        // Vine on side
        { x: 0.42, y: 0.35, z: 0, w: 0.03, h: 0.5, d: 0.03, color: 0x446622 },
      ],
    });

    // =====================================================
    // === CAVE MODELS — stalactites, stalagmites, crystals ===
    // =====================================================

    // Stalactite — hanging from ceiling (spawned inverted at height)
    this.registerSmooth({
      name: 'stalactite',
      parts: [
        // Main cone pointing down
        { type: 'cone', x: 0, y: 0.6, z: 0, params: [0.15, 1.2, 6], color: 0x6a5842, scaleY: -1 },
        // Smaller side drips
        { type: 'cone', x: 0.12, y: 0.7, z: 0.05, params: [0.06, 0.5, 5], color: 0x7a6852, scaleY: -1 },
        { type: 'cone', x: -0.08, y: 0.65, z: -0.08, params: [0.05, 0.4, 5], color: 0x6a5842, scaleY: -1 },
        // Base attachment blob
        { type: 'sphere', x: 0, y: 1.15, z: 0, params: [0.2, 6, 6], color: 0x5a4832, scaleY: 0.5 },
      ],
    });

    // Stalagmite — growing up from ground
    this.registerSmooth({
      name: 'stalagmite',
      parts: [
        // Main cone pointing up
        { type: 'cone', x: 0, y: 0.5, z: 0, params: [0.18, 1.0, 6], color: 0x6a5842 },
        // Secondary spike
        { type: 'cone', x: 0.1, y: 0.35, z: 0.06, params: [0.08, 0.7, 5], color: 0x7a6852 },
        { type: 'cone', x: -0.07, y: 0.3, z: -0.05, params: [0.06, 0.5, 5], color: 0x5a4832 },
        // Base blob
        { type: 'sphere', x: 0, y: 0.08, z: 0, params: [0.22, 6, 6], color: 0x5a4832, scaleY: 0.35 },
      ],
    });

    // Cave crystal — glowing mineral cluster
    this.registerSmooth({
      name: 'cave_crystal',
      parts: [
        // Crystal shards at angles
        { type: 'cone', x: 0, y: 0.4, z: 0, params: [0.06, 0.8, 4], color: 0x44bbcc },
        { type: 'cone', x: 0.1, y: 0.3, z: 0.05, params: [0.04, 0.6, 4], color: 0x55ccdd },
        { type: 'cone', x: -0.08, y: 0.25, z: -0.06, params: [0.05, 0.5, 4], color: 0x33aabb },
        { type: 'cone', x: 0.05, y: 0.35, z: -0.08, params: [0.035, 0.55, 4], color: 0x44bbcc },
        // Base rock
        { type: 'dodecahedron', x: 0, y: 0.08, z: 0, params: [0.12, 0], color: 0x4a4038, scaleY: 0.5 },
      ],
    });

    // Cave pillar — stalactite meets stalagmite, full column
    this.registerSmooth({
      name: 'cave_pillar',
      parts: [
        // Thick column
        { type: 'cylinder', x: 0, y: 1.0, z: 0, params: [0.2, 2.0, 7], color: 0x6a5842 },
        // Bulges
        { type: 'sphere', x: 0.05, y: 0.5, z: 0, params: [0.28, 6, 6], color: 0x5a4832, scaleY: 0.6 },
        { type: 'sphere', x: -0.03, y: 1.5, z: 0.04, params: [0.25, 6, 6], color: 0x7a6852, scaleY: 0.55 },
        // Top and bottom flare
        { type: 'cone', x: 0, y: 2.1, z: 0, params: [0.3, 0.3, 6], color: 0x5a4832, scaleY: 0.4 },
        { type: 'cone', x: 0, y: -0.05, z: 0, params: [0.3, 0.3, 6], color: 0x5a4832, scaleY: -0.4 },
      ],
    });

    // Cave puddle — flat reflective pool on ground
    this.registerSmooth({
      name: 'cave_puddle',
      parts: [
        { type: 'cylinder', x: 0, y: 0.01, z: 0, params: [0.4, 0.02, 8], color: 0x334455 },
        { type: 'cylinder', x: 0.1, y: 0.015, z: 0.05, params: [0.25, 0.015, 8], color: 0x445566 },
      ],
    });

    // Cave mushroom — bioluminescent
    this.registerSmooth({
      name: 'cave_mushroom',
      parts: [
        { type: 'cylinder', x: 0, y: 0.12, z: 0, params: [0.03, 0.25, 6], color: 0x887766 },
        { type: 'sphere', x: 0, y: 0.3, z: 0, params: [0.12, 8, 6], color: 0x55ddaa, scaleY: 0.45 },
        // Small neighbor
        { type: 'cylinder', x: 0.08, y: 0.08, z: 0.06, params: [0.02, 0.15, 5], color: 0x887766 },
        { type: 'sphere', x: 0.08, y: 0.2, z: 0.06, params: [0.07, 6, 4], color: 0x44cc88, scaleY: 0.4 },
      ],
    });
  }
}

