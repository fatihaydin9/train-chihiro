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
  private crossfadeProgress = 1;
  private windStrength = 0;

  constructor(
    private scene: THREE.Scene,
    private eventBus: EventBus,
  ) {
    this.eventBus.on('biome:transition-tick', (config) => {
      this.windStrength = config.windStrength;

      const desiredType = config.weatherType;
      if (desiredType !== this.currentType) {
        this.startCrossfade(desiredType, config.weatherIntensity);
      }

      // During crossfade, blend opacities
      if (this.currentEmitter && this.nextEmitter) {
        const t = config.transitionProgress;
        this.currentEmitter.setOpacity((1 - t) * config.weatherIntensity);
        this.nextEmitter.setOpacity(t * config.weatherIntensity);

        if (t >= 1) {
          this.finishCrossfade();
        }
      } else if (this.currentEmitter) {
        this.currentEmitter.setOpacity(config.weatherIntensity);
      }
    });
  }

  private startCrossfade(type: WeatherType, intensity: number): void {
    if (this.nextEmitter) {
      // Already crossfading — finish previous
      this.finishCrossfade();
    }

    const config = WEATHER_CONFIGS[type];
    if (!config) return;

    this.nextEmitter = new ParticleEmitter(config);
    this.nextEmitter.setOpacity(0);
    this.scene.add(this.nextEmitter.points);
    this.currentType = type;
  }

  private finishCrossfade(): void {
    if (this.currentEmitter) {
      this.scene.remove(this.currentEmitter.points);
      this.currentEmitter.dispose();
    }
    this.currentEmitter = this.nextEmitter;
    this.nextEmitter = null;
  }

  update(_dt: number, elapsed: number): void {
    this.currentEmitter?.update(elapsed, this.windStrength);
    this.nextEmitter?.update(elapsed, this.windStrength);
  }
}
