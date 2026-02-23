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
    // Lateral sway (slow, very gentle)
    const swayX = Math.sin(elapsed * 0.5) * 0.006;

    // Vertical bounce (subtle)
    const bounceY = Math.sin(elapsed * 1.8) * 0.003;

    // Micro-jitter: very subtle ±0.5mm every 120ms (smooth, not jarring)
    if (elapsed - this.lastJitterTime > 0.12) {
      this.lastJitterTime = elapsed;
      this.jitterX = (Math.random() - 0.5) * 0.001;
      this.jitterY = (Math.random() - 0.5) * 0.001;
    }

    this.rig.position.x = swayX + this.jitterX;
    this.rig.position.y = bounceY + this.jitterY;

    // Pitch (very subtle nod)
    const pitch = Math.sin(elapsed * 0.8) * 0.001;

    // Roll (barely perceptible lean)
    const roll = Math.sin(elapsed * 0.6) * 0.0008;

    this.rig.rotation.x = pitch;
    this.rig.rotation.z = roll;
  }
}
