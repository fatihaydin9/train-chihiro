import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { DAY_CYCLE_DURATION } from '../utils/constants';

/**
 * Advances timeOfDay from 0 to 1 over DAY_CYCLE_DURATION seconds.
 * Emits 'daytime:tick' each frame with current time and whether it's daytime.
 */
export class DayNightCycle implements Updatable {
  private timeOfDay = 0.45; // Start mid-day — overcast storm hides it anyway

  constructor(private eventBus: EventBus) {}

  update(dt: number, _elapsed: number): void {
    this.timeOfDay += dt / DAY_CYCLE_DURATION;
    if (this.timeOfDay >= 1) this.timeOfDay -= 1;

    // Daytime from 0.20 (dawn start) to 0.80 (dusk end) — 60% of cycle
    const isDaytime = this.timeOfDay > 0.20 && this.timeOfDay < 0.80;

    this.eventBus.emit('daytime:tick', {
      timeOfDay: this.timeOfDay,
      isDaytime,
    });
  }
}
