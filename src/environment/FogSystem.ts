import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { lerp } from '../utils/math';

const TUNNEL_DENSITY = 0.06;

export class FogSystem implements Updatable {
  private fog: THREE.FogExp2;

  // Day/night state
  private timeOfDay = 0.35;
  private isTunnel = false;

  // Biome base values (thunderstorm defaults)
  private biomeFogColor = new THREE.Color(60 / 255, 65 / 255, 70 / 255);
  private biomeFogFar = 60;

  constructor(scene: THREE.Scene, private eventBus: EventBus) {
    // Convert initial fogFar to exponential density
    const initialDensity = 2.5 / 60;
    this.fog = new THREE.FogExp2(0x3c4146, initialDensity);
    scene.fog = this.fog;

    this.eventBus.on('biome:transition-tick', (config) => {
      this.biomeFogColor.setRGB(
        config.fogColor.r * 0.85 + 0.05,
        config.fogColor.g * 0.85 + 0.08,
        config.fogColor.b * 0.85 + 0.1,
      );
      this.biomeFogFar = config.fogFar;
      this.isTunnel = config.isTunnel;
    });

    this.eventBus.on('daytime:tick', (data) => {
      this.timeOfDay = data.timeOfDay;
    });
  }

  update(_dt: number, _elapsed: number): void {
    // Tunnel: very dense fog
    if (this.isTunnel) {
      this.fog.color.setRGB(0.02, 0.02, 0.03);
      this.fog.density = TUNNEL_DENSITY;
      return;
    }

    // Base density from biome fogFar (softened)
    const baseDensity = 1.8 / this.biomeFogFar;

    // Day factor using same transition windows as SkySystem/LightingSystem
    const t = this.timeOfDay;
    let dayFactor: number;
    if (t < 0.21) dayFactor = 0;
    else if (t < 0.29) dayFactor = Math.min(1, (t - 0.21) / 0.08);
    else if (t < 0.71) dayFactor = 1;
    else if (t < 0.79) dayFactor = Math.max(0, 1 - (t - 0.71) / 0.08);
    else dayFactor = 0;

    // Darken fog color at night — very dark
    const nightFogColor = new THREE.Color(
      this.biomeFogColor.r * 0.02,
      this.biomeFogColor.g * 0.02,
      this.biomeFogColor.b * 0.03,
    );
    this.fog.color.lerpColors(nightFogColor, this.biomeFogColor, dayFactor);

    // Night density × 2.0, day density × 1.0
    const nightDensity = baseDensity * 2.0;
    const dayDensity = baseDensity * 1.0;
    this.fog.density = lerp(nightDensity, dayDensity, dayFactor);
  }
}
