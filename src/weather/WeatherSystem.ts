import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import type { WeatherType } from '../biome/types';
import { ParticleEmitter } from './ParticleEmitter';
import { WEATHER_CONFIGS } from './types';

export class WeatherSystem implements Updatable {
  private currentEmitter: ParticleEmitter | null = null;
  private nextEmitter: ParticleEmitter | null = null;
  private currentType: WeatherType | null = null;
  private windStrength = 0;
  private crossfadeT = 0;
  private isCrossfading = false;

  constructor(
    private scene: THREE.Scene,
    private eventBus: EventBus,
    private camera?: THREE.Camera,
  ) {
    this.eventBus.on('biome:transition-tick', (config) => {
      this.windStrength = config.windStrength;

      const desiredType = config.weatherType;
      if (desiredType !== this.currentType) {
        this.startCrossfade(desiredType, config.weatherIntensity);
      }

      if (this.isCrossfading && this.currentEmitter && this.nextEmitter) {
        // Smoothly transition between old and new weather
        this.crossfadeT = Math.min(this.crossfadeT + 0.01, 1);
        this.currentEmitter.setOpacity((1 - this.crossfadeT) * config.weatherIntensity);
        this.nextEmitter.setOpacity(this.crossfadeT * config.weatherIntensity);

        if (this.crossfadeT >= 1) {
          this.finishCrossfade();
        }
      } else if (this.currentEmitter) {
        this.currentEmitter.setOpacity(config.weatherIntensity);
      }
    });
  }

  private startCrossfade(type: WeatherType, intensity: number): void {
    if (this.nextEmitter) {
      this.finishCrossfade();
    }

    const config = WEATHER_CONFIGS[type];
    if (!config) return;

    const emitter = new ParticleEmitter(config);
    this.scene.add(emitter.points);
    this.currentType = type;

    if (!this.currentEmitter) {
      emitter.setOpacity(intensity);
      this.currentEmitter = emitter;
    } else {
      emitter.setOpacity(0);
      this.nextEmitter = emitter;
      this.crossfadeT = 0;
      this.isCrossfading = true;
    }
  }

  private finishCrossfade(): void {
    if (this.currentEmitter) {
      this.scene.remove(this.currentEmitter.points);
      this.currentEmitter.dispose();
    }
    this.currentEmitter = this.nextEmitter;
    this.nextEmitter = null;
    this.isCrossfading = false;
  }

  update(_dt: number, elapsed: number): void {
    if (this.camera) {
      const cx = this.camera.position.x;
      const cz = this.camera.position.z;
      if (this.currentEmitter) {
        this.currentEmitter.points.position.x = cx;
        this.currentEmitter.points.position.z = cz;
      }
      if (this.nextEmitter) {
        this.nextEmitter.points.position.x = cx;
        this.nextEmitter.points.position.z = cz;
      }
    }
    this.currentEmitter?.update(elapsed, this.windStrength);
    this.nextEmitter?.update(elapsed, this.windStrength);
  }
}
