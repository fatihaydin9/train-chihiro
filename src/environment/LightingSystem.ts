import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { smoothstep } from '../utils/math';

export class LightingSystem implements Updatable {
  private ambient: THREE.AmbientLight;
  private directional: THREE.DirectionalLight;

  // Day/night state
  private timeOfDay = 0.35;
  private dayNightInfluence = 1.0;

  // Biome base values
  private biomeAmbientColor = new THREE.Color(55 / 255, 60 / 255, 70 / 255);
  private biomeAmbientIntensity = 0.25;
  private biomeDirectionalColor = new THREE.Color(80 / 255, 85 / 255, 100 / 255);
  private biomeDirectionalIntensity = 0.2;

  // Lightning flash — realistic multi-phase
  private lightningLight: THREE.PointLight;
  private isStormBiome = false;
  private lightningCooldown = 5;
  // Phase-based lightning: each strike is a sequence of flash phases
  private lightningPhases: { intensity: number; duration: number }[] = [];
  private lightningPhaseIndex = -1;
  private lightningPhaseTimer = 0;

  constructor(scene: THREE.Scene, private eventBus: EventBus) {
    this.ambient = new THREE.AmbientLight(0x8899bb, 0.5);
    scene.add(this.ambient);

    this.directional = new THREE.DirectionalLight(0xffcc88, 1.5);
    this.directional.position.set(-20, 8, -10);
    this.directional.castShadow = true;

    this.directional.shadow.mapSize.set(1024, 1024);
    this.directional.shadow.camera.near = 0.5;
    this.directional.shadow.camera.far = 120;
    this.directional.shadow.camera.left = -50;
    this.directional.shadow.camera.right = 50;
    this.directional.shadow.camera.top = 30;
    this.directional.shadow.camera.bottom = -10;
    this.directional.shadow.bias = -0.002;

    scene.add(this.directional);

    // Lightning: ambient-style sky illumination from above
    this.lightningLight = new THREE.PointLight(0xddeeff, 0, 500, 1.2);
    this.lightningLight.position.set(0, 150, -40);
    scene.add(this.lightningLight);

    this.eventBus.on('biome:transition-tick', (config) => {
      // Storm biomes get lightning
      const wt = config.weatherType;
      this.isStormBiome = wt === 'storm' || (wt === 'rain' && config.weatherIntensity > 0.8);
      this.biomeAmbientColor.setRGB(
        config.ambientColor.r,
        config.ambientColor.g,
        config.ambientColor.b,
      );
      this.biomeAmbientIntensity = config.ambientIntensity;
      this.biomeDirectionalColor.setRGB(
        config.directionalColor.r,
        config.directionalColor.g,
        config.directionalColor.b,
      );
      this.biomeDirectionalIntensity = config.directionalIntensity;
      this.dayNightInfluence = config.dayNightInfluence;
    });

    this.eventBus.on('daytime:tick', (data) => {
      this.timeOfDay = data.timeOfDay;
    });
  }

  update(dt: number, _elapsed: number): void {
    // --- Realistic lightning: multi-phase flash sequence ---
    if (this.isStormBiome) {
      this.lightningCooldown -= dt;
      if (this.lightningCooldown <= 0 && this.lightningPhaseIndex < 0) {
        // Start a new strike — random position in sky
        this.lightningLight.position.x = (Math.random() - 0.5) * 150;
        this.lightningLight.position.z = -30 - Math.random() * 60;

        // Build a realistic flash sequence:
        // 1) brief bright flash  2) dim pause  3) main bright flash  4) slow fade
        const mainBrightness = 3 + Math.random() * 2;
        this.lightningPhases = [
          { intensity: mainBrightness * 0.5, duration: 0.06 },  // initial flash
          { intensity: 0.2, duration: 0.08 + Math.random() * 0.06 }, // brief dark
          { intensity: mainBrightness, duration: 0.12 },         // main flash
          { intensity: mainBrightness * 0.6, duration: 0.10 },   // sustain
          { intensity: 0.1, duration: 0.25 + Math.random() * 0.2 }, // slow fade
          { intensity: 0, duration: 0 },                         // end
        ];
        // Occasionally add a third re-flash
        if (Math.random() < 0.3) {
          this.lightningPhases.splice(5, 0,
            { intensity: mainBrightness * 0.35, duration: 0.08 },
            { intensity: 0.05, duration: 0.15 },
          );
        }
        this.lightningPhaseIndex = 0;
        this.lightningPhaseTimer = this.lightningPhases[0].duration;
        this.lightningCooldown = 5 + Math.random() * 12; // 5-17s between strikes
      }
    }

    if (this.lightningPhaseIndex >= 0) {
      this.lightningPhaseTimer -= dt;
      const phases = this.lightningPhases;
      const idx = this.lightningPhaseIndex;

      if (this.lightningPhaseTimer <= 0 && idx < phases.length - 1) {
        // Advance to next phase
        this.lightningPhaseIndex++;
        if (this.lightningPhaseIndex >= phases.length) {
          // Strike finished
          this.lightningPhaseIndex = -1;
          this.lightningLight.intensity = 0;
        } else {
          this.lightningPhaseTimer = phases[this.lightningPhaseIndex].duration;
        }
      }

      if (this.lightningPhaseIndex >= 0 && this.lightningPhaseIndex < phases.length - 1) {
        // Smooth interpolation between current and next phase intensity
        const cur = phases[this.lightningPhaseIndex];
        const nxt = phases[Math.min(this.lightningPhaseIndex + 1, phases.length - 1)];
        const progress = cur.duration > 0 ? 1 - this.lightningPhaseTimer / cur.duration : 1;
        // Ease-out for natural decay
        const eased = 1 - (1 - progress) * (1 - progress);
        this.lightningLight.intensity = cur.intensity + (nxt.intensity - cur.intensity) * eased;
      }
    } else {
      this.lightningLight.intensity = 0;
    }

    const t = this.timeOfDay;
    const influence = this.dayNightInfluence;

    // Sun factor based on timeOfDay — matching SkySystem transition windows
    // 0.0–0.20: night(0) | 0.20–0.40: sunrise(0→1) | 0.40–0.60: day(1)
    // 0.60–0.80: sunset(1→0) | 0.80–1.0: night(0)
    let sunFactor: number;
    if (t < 0.20) {
      sunFactor = 0;
    } else if (t < 0.40) {
      sunFactor = smoothstep(0, 1, (t - 0.20) / 0.20);
    } else if (t < 0.60) {
      sunFactor = 1;
    } else if (t < 0.80) {
      sunFactor = 1 - smoothstep(0, 1, (t - 0.60) / 0.20);
    } else {
      sunFactor = 0;
    }

    // Blend sun intensity between full day and moonlight based on day/night
    const dayIntensity = this.biomeDirectionalIntensity * 1.1;
    const nightIntensity = 0.1;
    const rawIntensity = nightIntensity + (dayIntensity - nightIntensity) * sunFactor;
    this.directional.intensity = nightIntensity + (rawIntensity - nightIntensity) * influence;

    // Sun position follows arc with gentler easing
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const rawSin = Math.sin(angle);
    const easedSin = rawSin >= 0 ? Math.pow(rawSin, 0.7) : -Math.pow(-rawSin, 0.7);
    const sx = Math.cos(angle) * 50;
    const sy = Math.max(easedSin * 50, 1);
    this.directional.position.set(sx, sy, -20);

    // Sun color: warm during day, orange at dawn/dusk, cool blue at night
    if (sunFactor > 0.5) {
      this.directional.color.copy(this.biomeDirectionalColor);
      this.directional.color.multiplyScalar(0.9);
      this.directional.color.r += 0.1;
      this.directional.color.g += 0.05;
      // Extra warmth near dawn/dusk (sunFactor 0.5-0.7)
      if (sunFactor < 0.75) {
        const warmth = 1 - (sunFactor - 0.5) / 0.25;
        this.directional.color.r += warmth * 0.2;
        this.directional.color.g += warmth * 0.05;
        this.directional.color.b -= warmth * 0.1;
      }
    } else {
      // Cool moonlight
      const nightColor = new THREE.Color(0.35, 0.4, 0.55);
      this.directional.color.lerpColors(nightColor, this.biomeDirectionalColor, sunFactor * 2);
    }

    // Ambient: dimmer at night
    const ambientFactor = 0.2 + sunFactor * 0.8;
    const rawAmbientIntensity = this.biomeAmbientIntensity * 0.4 * ambientFactor;
    this.ambient.intensity = rawAmbientIntensity * influence + rawAmbientIntensity * 0.3 * (1 - influence);

    this.ambient.color.copy(this.biomeAmbientColor);
    if (sunFactor < 0.5) {
      this.ambient.color.lerp(new THREE.Color(0.08, 0.12, 0.25), (1 - sunFactor * 2) * influence);
    }
  }
}
