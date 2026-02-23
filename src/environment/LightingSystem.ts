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

    this.eventBus.on('biome:transition-tick', (config) => {
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

  update(_dt: number, _elapsed: number): void {
    const t = this.timeOfDay;
    const influence = this.dayNightInfluence;

    // Sun intensity follows a smoothstepped sine curve
    const sinVal = Math.sin(t * Math.PI * 2 - Math.PI / 2);
    const sunFactor = smoothstep(-0.1, 0.2, sinVal);

    // Blend sun intensity between full day and moonlight based on day/night
    const dayIntensity = this.biomeDirectionalIntensity * 1.1;
    const nightIntensity = 0.1;
    const rawIntensity = nightIntensity + (dayIntensity - nightIntensity) * sunFactor;
    this.directional.intensity = nightIntensity + (rawIntensity - nightIntensity) * influence;

    // Sun position follows arc
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const sx = Math.cos(angle) * 50;
    const sy = Math.max(Math.sin(angle) * 50, 1);
    this.directional.position.set(sx, sy, -20);

    // Sun color: warm during day, cool blue at night
    if (sunFactor > 0.5) {
      this.directional.color.copy(this.biomeDirectionalColor);
      this.directional.color.multiplyScalar(0.9);
      this.directional.color.r += 0.1;
      this.directional.color.g += 0.05;
    } else {
      // Cool moonlight
      const nightColor = new THREE.Color(0.4, 0.45, 0.6);
      this.directional.color.lerpColors(nightColor, this.biomeDirectionalColor, sunFactor * 2);
    }

    // Ambient: dimmer at night
    const ambientFactor = 0.2 + sunFactor * 0.8;
    const rawAmbientIntensity = this.biomeAmbientIntensity * 0.4 * ambientFactor;
    this.ambient.intensity = rawAmbientIntensity * influence + rawAmbientIntensity * 0.3 * (1 - influence);

    this.ambient.color.copy(this.biomeAmbientColor);
    if (sunFactor < 0.5) {
      this.ambient.color.lerp(new THREE.Color(0.15, 0.15, 0.3), (1 - sunFactor * 2) * influence);
    }
  }
}
