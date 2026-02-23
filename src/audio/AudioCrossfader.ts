import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import type { AudioSystem } from './AudioSystem';
import type { AmbientAudioLayer } from './AmbientAudioLayer';
import type { ResourceManager } from '../core/ResourceManager';
import type { WeatherType } from '../biome/types';

export class AudioCrossfader implements Updatable {
  private currentLayer: AmbientAudioLayer | null = null;
  private nextLayer: AmbientAudioLayer | null = null;
  private currentWeather: WeatherType | null = null;
  private weatherLayers: Map<WeatherType, AmbientAudioLayer> = new Map();

  constructor(
    private audioSystem: AudioSystem,
    private resources: ResourceManager,
    private eventBus: EventBus,
  ) {
    this.eventBus.on('biome:transition-tick', (config) => {
      const targetWeather = config.weatherType;

      if (targetWeather !== this.currentWeather) {
        this.currentWeather = targetWeather;
        const layer = this.weatherLayers.get(targetWeather);
        if (layer && layer !== this.currentLayer) {
          this.nextLayer = layer;
        }
      }

      // Crossfade volumes based on transition progress
      if (this.currentLayer && this.nextLayer) {
        const t = config.transitionProgress;
        this.currentLayer.setVolume((1 - t) * 0.3);
        this.nextLayer.setVolume(t * 0.3);

        if (t >= 1) {
          this.currentLayer.setVolume(0);
          this.currentLayer = this.nextLayer;
          this.nextLayer = null;
        }
      }
    });
  }

  registerWeatherLayer(type: WeatherType, layer: AmbientAudioLayer): void {
    this.weatherLayers.set(type, layer);
    if (!this.currentLayer) {
      this.currentLayer = layer;
      this.currentWeather = type;
    }
  }

  update(_dt: number, _elapsed: number): void {
    // All updates driven by event subscription
  }
}
