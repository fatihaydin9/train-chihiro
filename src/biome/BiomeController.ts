import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { BIOME_DEFINITIONS, BIOME_ORDER } from './BiomeData';
import { BiomeLerper } from './BiomeLerper';
import { BIOME_TRANSITION_DURATION, DAY_CYCLE_DURATION } from '../utils/constants';

export class BiomeController implements Updatable {
  private currentIndex: number;
  private timer = 0;
  private transitioning = false;
  private transitionTimer = 0;
  private lerper: BiomeLerper;
  private biomeDuration = DAY_CYCLE_DURATION; // one full day/night per biome

  constructor(private eventBus: EventBus) {
    this.lerper = new BiomeLerper();
    // Always start at index 0 (ocean) — the iconic water crossing
    this.currentIndex = 0;
  }

  update(dt: number, _elapsed: number): void {
    this.timer += dt;

    if (!this.transitioning && this.timer >= this.biomeDuration) {
      this.transitioning = true;
      this.transitionTimer = 0;
    }

    if (!this.transitioning) {
      // Emit current biome at progress 1 (fully settled)
      const current = BIOME_ORDER[this.currentIndex];
      const config = BIOME_DEFINITIONS[current];
      this.eventBus.emit('biome:transition-tick', {
        ...config,
        transitionProgress: 1,
        fromBiome: current,
        toBiome: current,
      });
    } else {
      this.transitionTimer += dt;
      const t = Math.min(this.transitionTimer / BIOME_TRANSITION_DURATION, 1);

      const fromName = BIOME_ORDER[this.currentIndex];
      const nextIndex = (this.currentIndex + 1) % BIOME_ORDER.length;
      const toName = BIOME_ORDER[nextIndex];
      const from = BIOME_DEFINITIONS[fromName];
      const to = BIOME_DEFINITIONS[toName];

      const blended = this.lerper.blend(from, to, t);
      blended.fromBiome = fromName;
      blended.toBiome = toName;
      blended.transitionProgress = t;

      this.eventBus.emit('biome:transition-tick', blended);

      if (t >= 1) {
        this.currentIndex = nextIndex;
        this.transitioning = false;
        this.timer = 0;
        this.eventBus.emit('biome:changed', { biome: toName });
      }
    }
  }
}
