import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { GROUND_Y } from '../utils/constants';

const BIRD_COUNT = 24;
const FLOCK_RADIUS = 8;
const FLOCK_HEIGHT = 25;
const ORBIT_SPEED = 0.3;
const WING_SPEED = 6.0;
const DRIFT_SPEED = 2.0;

/**
 * Cinematic bird flocks circling in the distance.
 * Uses Points for performance — each bird is a small dark shape.
 */
export class BirdFlock implements Updatable {
  private flocks: FlockGroup[] = [];

  constructor(private scene: THREE.Scene) {
    // Create 3 flocks at different positions
    this.flocks.push(
      this.createFlock(-40, GROUND_Y + FLOCK_HEIGHT, -60),
      this.createFlock(50, GROUND_Y + FLOCK_HEIGHT + 5, -120),
      this.createFlock(-20, GROUND_Y + FLOCK_HEIGHT + 10, -180),
    );
  }

  private createFlock(x: number, y: number, z: number): FlockGroup {
    const positions = new Float32Array(BIRD_COUNT * 3);
    const phases = new Float32Array(BIRD_COUNT);
    const radii = new Float32Array(BIRD_COUNT);

    for (let i = 0; i < BIRD_COUNT; i++) {
      phases[i] = Math.random() * Math.PI * 2;
      radii[i] = FLOCK_RADIUS * (0.3 + Math.random() * 0.7);
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x222222,
      size: 0.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });

    const points = new THREE.Points(geo, mat);
    points.position.set(x, y, z);
    points.frustumCulled = false;
    this.scene.add(points);

    return { points, phases, radii, centerX: x, centerY: y, centerZ: z };
  }

  update(_dt: number, elapsed: number): void {
    for (const flock of this.flocks) {
      const positions = flock.points.geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < BIRD_COUNT; i++) {
        const phase = flock.phases[i];
        const radius = flock.radii[i];
        const t = elapsed * ORBIT_SPEED + phase;

        // Circular orbit with vertical bobbing (wing flap)
        const x = Math.cos(t) * radius;
        const wingBob = Math.sin(elapsed * WING_SPEED + phase * 3) * 0.3;
        const y = Math.sin(t * 0.5) * 2 + wingBob;
        const z = Math.sin(t) * radius;

        positions.setXYZ(i, x, y, z);
      }

      positions.needsUpdate = true;

      // Drift the whole flock slowly
      flock.points.position.z += _dt * DRIFT_SPEED;

      // Recycle flock when it drifts past
      if (flock.points.position.z > 50) {
        flock.points.position.z = -200 - Math.random() * 100;
        flock.points.position.x = (Math.random() - 0.5) * 100;
      }
    }
  }
}

interface FlockGroup {
  points: THREE.Points;
  phases: Float32Array;
  radii: Float32Array;
  centerX: number;
  centerY: number;
  centerZ: number;
}
