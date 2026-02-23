import * as THREE from 'three';
import { CHUNK_DEPTH, GROUND_Y } from '../utils/constants';
import type { BiomeColorConfig } from '../biome/types';

const WALL_DISTANCE = 6;   // ±6m from center
const WALL_HEIGHT = 8;
const LIGHT_INTERVAL = 5;  // meters between lights
const LIGHT_COUNT = Math.floor(CHUNK_DEPTH / LIGHT_INTERVAL);

/**
 * Per-chunk overlay: walls + ceiling + scattered lights for underground biome.
 */
export class TunnelOverlay {
  readonly group = new THREE.Group();
  private wallLeft: THREE.Mesh;
  private wallRight: THREE.Mesh;
  private ceiling: THREE.Mesh;
  private lights: THREE.InstancedMesh;

  private wallMat: THREE.MeshStandardMaterial;

  constructor() {
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0x282825, roughness: 0.95, metalness: 0.0 });

    // Left wall
    this.wallLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, WALL_HEIGHT, CHUNK_DEPTH),
      this.wallMat,
    );
    this.wallLeft.position.set(-WALL_DISTANCE, GROUND_Y + WALL_HEIGHT / 2, 0);
    this.group.add(this.wallLeft);

    // Right wall
    this.wallRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, WALL_HEIGHT, CHUNK_DEPTH),
      this.wallMat,
    );
    this.wallRight.position.set(WALL_DISTANCE, GROUND_Y + WALL_HEIGHT / 2, 0);
    this.group.add(this.wallRight);

    // Ceiling
    this.ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_DISTANCE * 2 + 0.5, 0.3, CHUNK_DEPTH),
      this.wallMat,
    );
    this.ceiling.position.set(0, GROUND_Y + WALL_HEIGHT, 0);
    this.group.add(this.ceiling);

    // Tunnel lights: InstancedMesh of small emissive cubes
    const lightGeo = new THREE.BoxGeometry(0.15, 0.1, 0.1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    this.lights = new THREE.InstancedMesh(lightGeo, lightMat, LIGHT_COUNT * 2);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < LIGHT_COUNT; i++) {
      const z = -CHUNK_DEPTH / 2 + i * LIGHT_INTERVAL + LIGHT_INTERVAL / 2;
      const y = GROUND_Y + WALL_HEIGHT * 0.6;

      // Left wall light
      dummy.position.set(-WALL_DISTANCE + 0.3, y, z);
      dummy.updateMatrix();
      this.lights.setMatrixAt(i * 2, dummy.matrix);

      // Right wall light
      dummy.position.set(WALL_DISTANCE - 0.3, y, z);
      dummy.updateMatrix();
      this.lights.setMatrixAt(i * 2 + 1, dummy.matrix);
    }
    this.lights.instanceMatrix.needsUpdate = true;
    this.group.add(this.lights);

    // Start hidden
    this.group.visible = false;
  }

  setActive(visible: boolean): void {
    this.group.visible = visible;
  }

  reconfigure(wallColor: BiomeColorConfig): void {
    this.wallMat.color.setRGB(wallColor.r, wallColor.g, wallColor.b);
  }

  dispose(): void {
    this.wallLeft.geometry.dispose();
    this.wallRight.geometry.dispose();
    this.ceiling.geometry.dispose();
    this.lights.geometry.dispose();
    (this.lights.material as THREE.Material).dispose();
    this.wallMat.dispose();
  }
}
