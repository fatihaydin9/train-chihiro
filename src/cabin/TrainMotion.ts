import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';

/**
 * Subtle train vibration/sway applied to the camera rig.
 * Amplitudes are deliberately small to avoid VR sickness.
 * Moves rig (not camera) so WebXR headset tracking works relative to rig.
 */
export class TrainMotion implements Updatable {
  private lastJitterTime = 0;
  private jitterX = 0;
  private jitterY = 0;

  constructor(private rig: THREE.Group) {}

  update(_dt: number, elapsed: number): void {
    // Lateral sway (slow, gentle)
    const swayX = Math.sin(elapsed * 0.7) * 0.015;

    // Vertical bounce (faster, subtle)
    const bounceY = Math.sin(elapsed * 2.5) * 0.008;

    // Micro-jitter: random ±1.5mm every 50ms
    if (elapsed - this.lastJitterTime > 0.05) {
      this.lastJitterTime = elapsed;
      this.jitterX = (Math.random() - 0.5) * 0.003;
      this.jitterY = (Math.random() - 0.5) * 0.003;
    }

    this.rig.position.x = swayX + this.jitterX;
    this.rig.position.y = bounceY + this.jitterY;

    // Pitch (nod forward/back)
    const pitch = Math.sin(elapsed * 1.2) * 0.003;

    // Roll (lean side to side)
    const roll = Math.sin(elapsed * 0.9) * 0.002;

    this.rig.rotation.x = pitch;
    this.rig.rotation.z = roll;
  }
}
