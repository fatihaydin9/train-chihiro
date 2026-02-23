import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import { CABIN_HEIGHT, CABIN_FLOOR_Y, CABIN_WIDTH } from '../utils/constants';

export class StoveLight implements Updatable {
  readonly light: THREE.PointLight;
  private monitorLight: THREE.PointLight;
  private kitchenLight: THREE.PointLight;
  private baseIntensity = 2.5;

  constructor(scene: THREE.Scene) {
    // Main overhead warm light at ceiling
    this.light = new THREE.PointLight(0xffeecc, this.baseIntensity, 8, 1.5);
    this.light.position.set(0, CABIN_FLOOR_Y + CABIN_HEIGHT - 0.15, 0);
    scene.add(this.light);

    // Dim blue-green monitor glow at control desk
    this.monitorLight = new THREE.PointLight(0x22aaaa, 0.5, 3, 2);
    this.monitorLight.position.set(0.05, CABIN_FLOOR_Y + 0.95, -2.65);
    scene.add(this.monitorLight);

    // Warm kitchen light above stove/counter area
    const kitchenX = -CABIN_WIDTH / 2 + 0.06 + 0.275 + 0.15;
    this.kitchenLight = new THREE.PointLight(0xFFDDAA, 1.5, 4, 2);
    this.kitchenLight.position.set(kitchenX, CABIN_FLOOR_Y + CABIN_HEIGHT - 0.3, 1.35);
    scene.add(this.kitchenLight);
  }

  update(_dt: number, elapsed: number): void {
    // Flickering effect — multiple sine waves for organic look
    const flicker =
      Math.sin(elapsed * 8.0) * 0.05 +
      Math.sin(elapsed * 13.0) * 0.03 +
      Math.sin(elapsed * 21.0) * 0.02;
    this.light.intensity = this.baseIntensity + flicker;

    // Subtle monitor flicker
    this.monitorLight.intensity = 0.5 + Math.sin(elapsed * 3.0) * 0.05;

    // Gentle kitchen light warmth variation
    this.kitchenLight.intensity = 1.5 + Math.sin(elapsed * 2.0) * 0.1;
  }
}
