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

    // Daytime from 0.21 (dawn start) to 0.79 (dusk end)
    const isDaytime = this.timeOfDay > 0.21 && this.timeOfDay < 0.79;

    this.eventBus.emit('daytime:tick', {
      timeOfDay: this.timeOfDay,
      isDaytime,
    });
  }
}
